import { docClient, TABLES } from "./db";
import {
  PutCommand,
  GetCommand,
  DeleteCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { nanoid } from "nanoid";
import type {
  InsertProperty,
  Property,
  InsertCall,
  Call,
  CallWithProperty,
  InsertOpportunity,
  Opportunity,
  User,
} from "@shared/schema";

export interface IStorage {
  getProperties(userId: string): Promise<Property[]>;
  getProperty(id: number, userId: string): Promise<Property | undefined>;
  getPropertyByUniqueIndex(uniqueIndex: string): Promise<Property | undefined>;
  getCalls(userId: string): Promise<CallWithProperty[]>;
  createCall(call: InsertCall, userId: string): Promise<Call>;
  createProperty(property: InsertProperty, userId: string): Promise<Property>;
  deleteProperty(id: number, userId: string): Promise<void>;
  backfillUniqueIndexes(): Promise<void>;
  getOpportunities(userId: string): Promise<Opportunity[]>;
  createOpportunity(opportunity: InsertOpportunity, userId: string): Promise<Opportunity>;
  deleteOpportunity(id: number | string, userId: string): Promise<void>;
  updateOpportunity(id: number | string, data: Partial<InsertOpportunity>, userId: string): Promise<Opportunity | undefined>;
  activateOpportunity(id: number | string, userId: string): Promise<Opportunity>;
  backfillOpportunityUniqueIndexes(): Promise<void>;
  createUser(email: string, passwordHash: string): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
}

async function nextId(counterName: string): Promise<number> {
  const result = await docClient.send(new UpdateCommand({
    TableName: TABLES.counters,
    Key: { counterName },
    UpdateExpression: "SET #v = #v + :inc",
    ExpressionAttributeNames: { "#v": "value" },
    ExpressionAttributeValues: { ":inc": 1 },
    ReturnValues: "UPDATED_NEW",
  }));
  return result.Attributes!.value as number;
}

function toProperty(item: Record<string, unknown>): Property {
  return {
    id: item.id as number,
    address: item.address as string,
    postcode: (item.postcode as string) ?? null,
    price: item.price as number,
    num_beds: (item.num_beds as number) ?? null,
    daysOnMarket: (item.daysOnMarket as number) ?? null,
    link: item.link as string,
    needsWork: (item.needsWork as boolean) ?? false,
    uniqueIndex: (item.uniqueIndex as string) ?? null,
  };
}

function toCall(item: Record<string, unknown>): Call {
  return {
    id: item.id as number,
    propertyId: item.propertyId as number,
    propertyUniqueIndex: (item.propertyUniqueIndex as string) ?? null,
    status: (item.status as string) ?? null,
    result: (item.result as string) ?? null,
    connection: (item.connection as string) ?? null,
    nextAction: ((item.nextAction ?? item.next_action) as string) ?? null,
    offeredPrice: (item.offeredPrice as number) ?? null,
    comment: (item.comment as string) ?? null,
    viewingDate: item.viewingDate ? new Date(item.viewingDate as string) : null,
    summary: (item.summary as string) ?? null,
    transcript: (item.transcript as string) ?? null,
    elevenlabsConversationId: (item.elevenlabsConversationId as string) ?? null,
    createdAt: item.createdAt ? new Date(item.createdAt as string) : null,
  };
}

function toOpportunity(item: Record<string, unknown>): Opportunity {
  return {
    id: item.id as string,
    uniqueIndex: (item.uniqueIndex as string) ?? null,
    name: item.name as string,
    phone: item.phone as string,
    email: item.email as string,
    address: item.address as string,
    availability: item.availability as string,
    knowledgeBase: (item.knowledgeBase as string) ?? null,
    active: (item.active as boolean) ?? false,
    createdAt: item.createdAt ? new Date(item.createdAt as string) : null,
  };
}

export class DynamoStorage implements IStorage {
  async getProperties(userId: string): Promise<Property[]> {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLES.properties,
      FilterExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": userId },
    }));
    const items = (result.Items ?? []).map(toProperty);
    return items.sort((a, b) => b.id - a.id);
  }

  async getProperty(id: number, userId: string): Promise<Property | undefined> {
    const result = await docClient.send(new GetCommand({
      TableName: TABLES.properties,
      Key: { id },
    }));
    if (!result.Item || result.Item.userId !== userId) return undefined;
    return toProperty(result.Item);
  }

  async getPropertyByUniqueIndex(uniqueIndex: string): Promise<Property | undefined> {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLES.properties,
      FilterExpression: "uniqueIndex = :ui",
      ExpressionAttributeValues: { ":ui": uniqueIndex },
    }));
    return result.Items?.[0] ? toProperty(result.Items[0]) : undefined;
  }

  async createProperty(property: InsertProperty, userId: string): Promise<Property> {
    const id = await nextId("properties");
    const item = {
      id,
      userId,
      address: property.address,
      postcode: property.postcode ?? null,
      price: property.price,
      num_beds: property.num_beds ?? null,
      daysOnMarket: property.daysOnMarket ?? null,
      link: property.link,
      needsWork: property.needsWork ?? false,
      uniqueIndex: nanoid(10),
    };
    await docClient.send(new PutCommand({ TableName: TABLES.properties, Item: item }));
    return toProperty(item);
  }

  async deleteProperty(id: number, userId: string): Promise<void> {
    const prop = await this.getProperty(id, userId);
    if (!prop) return;
    const callsResult = await docClient.send(new ScanCommand({
      TableName: TABLES.calls,
      FilterExpression: "propertyId = :pid",
      ExpressionAttributeValues: { ":pid": id },
    }));
    for (const call of callsResult.Items ?? []) {
      await docClient.send(new DeleteCommand({ TableName: TABLES.calls, Key: { id: call.id } }));
    }
    await docClient.send(new DeleteCommand({ TableName: TABLES.properties, Key: { id } }));
  }

  async backfillUniqueIndexes(): Promise<void> {
    const result = await docClient.send(new ScanCommand({ TableName: TABLES.properties }));
    const items = result.Items ?? [];
    const missing = items.filter(i => !i.uniqueIndex);
    for (const item of missing) {
      await docClient.send(new UpdateCommand({
        TableName: TABLES.properties,
        Key: { id: item.id },
        UpdateExpression: "SET uniqueIndex = :ui",
        ExpressionAttributeValues: { ":ui": nanoid(10) },
      }));
    }
    if (missing.length > 0) {
      console.log(`Backfilled uniqueIndex for ${missing.length} properties`);
    }
  }

  async getCalls(userId: string): Promise<CallWithProperty[]> {
    const callsResult = await docClient.send(new ScanCommand({
      TableName: TABLES.calls,
      FilterExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": userId },
    }));
    const callItems = callsResult.Items ?? [];

    const propertyIds = [...new Set(callItems.map((c) => c.propertyId as number))];
    const propertyMap = new Map<number, Property>();
    for (const pid of propertyIds) {
      const prop = await this.getProperty(pid, userId);
      if (prop) propertyMap.set(pid, prop);
    }

    const result: CallWithProperty[] = callItems
      .map((item) => {
        const call = toCall(item as Record<string, unknown>);
        const property = propertyMap.get(call.propertyId);
        if (!property) return null;
        return { ...call, property };
      })
      .filter((c): c is CallWithProperty => c !== null);

    return result.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  }

  async createCall(call: InsertCall, userId: string): Promise<Call> {
    const id = await nextId("calls");
    const item = {
      id,
      userId,
      propertyId: call.propertyId,
      propertyUniqueIndex: call.propertyUniqueIndex ?? null,
      status: call.status ?? "calling",
      result: call.result ?? null,
      offeredPrice: call.offeredPrice ?? null,
      comment: call.comment ?? null,
      viewingDate: call.viewingDate ? new Date(call.viewingDate).toISOString() : null,
      summary: call.summary ?? null,
      transcript: call.transcript ?? null,
      elevenlabsConversationId: call.elevenlabsConversationId ?? null,
      createdAt: new Date().toISOString(),
    };
    await docClient.send(new PutCommand({ TableName: TABLES.calls, Item: item }));
    return toCall(item);
  }

  async getOpportunities(userId: string): Promise<Opportunity[]> {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLES.opportunities,
      FilterExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": userId },
    }));
    const items = (result.Items ?? []).map(i => toOpportunity(i as Record<string, unknown>));
    return items.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  }

  async createOpportunity(opportunity: InsertOpportunity, userId: string): Promise<Opportunity> {
    const id = nanoid(10);
    const item = {
      id,
      userId,
      uniqueIndex: nanoid(10),
      name: opportunity.name,
      phone: opportunity.phone,
      email: opportunity.email,
      address: opportunity.address,
      availability: opportunity.availability,
      knowledgeBase: opportunity.knowledgeBase ?? null,
      active: opportunity.active ?? false,
      createdAt: new Date().toISOString(),
    };
    await docClient.send(new PutCommand({ TableName: TABLES.opportunities, Item: item }));
    return toOpportunity(item);
  }

  async deleteOpportunity(id: number | string, userId: string): Promise<void> {
    const targetId = String(id);
    const existing = await docClient.send(new GetCommand({ TableName: TABLES.opportunities, Key: { id: targetId } }));
    if (!existing.Item || existing.Item.userId !== userId) return;
    await docClient.send(new DeleteCommand({ TableName: TABLES.opportunities, Key: { id: targetId } }));
  }

  async updateOpportunity(id: number | string, data: Partial<InsertOpportunity>, userId: string): Promise<Opportunity | undefined> {
    const targetId = String(id);
    const existing = await docClient.send(new GetCommand({ TableName: TABLES.opportunities, Key: { id: targetId } }));
    if (!existing.Item || existing.Item.userId !== userId) return undefined;
    const fields = Object.entries(data).filter(([, v]) => v !== undefined);
    if (fields.length === 0) return toOpportunity(existing.Item as Record<string, unknown>);
    const setExpr = fields.map(([k], i) => `#f${i} = :v${i}`).join(", ");
    const exprNames: Record<string, string> = {};
    const exprValues: Record<string, unknown> = {};
    fields.forEach(([k, v], i) => {
      exprNames[`#f${i}`] = k;
      exprValues[`:v${i}`] = v;
    });
    await docClient.send(new UpdateCommand({
      TableName: TABLES.opportunities,
      Key: { id: targetId },
      UpdateExpression: `SET ${setExpr}`,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
    }));
    const updated = await docClient.send(new GetCommand({ TableName: TABLES.opportunities, Key: { id: targetId } }));
    return toOpportunity(updated.Item! as Record<string, unknown>);
  }

  async activateOpportunity(id: number | string, userId: string): Promise<Opportunity> {
    const all = await this.getOpportunities(userId);
    const targetId = String(id);
    for (const opp of all) {
      await docClient.send(new UpdateCommand({
        TableName: TABLES.opportunities,
        Key: { id: String(opp.id) },
        UpdateExpression: "SET active = :v",
        ExpressionAttributeValues: { ":v": String(opp.id) === targetId },
      }));
    }
    const result = await docClient.send(new GetCommand({
      TableName: TABLES.opportunities,
      Key: { id: targetId },
    }));
    return toOpportunity(result.Item! as Record<string, unknown>);
  }

  async backfillOpportunityUniqueIndexes(): Promise<void> {
    const result = await docClient.send(new ScanCommand({ TableName: TABLES.opportunities }));
    const items = result.Items ?? [];
    const missing = items.filter(i => !i.uniqueIndex);
    for (const item of missing) {
      await docClient.send(new UpdateCommand({
        TableName: TABLES.opportunities,
        Key: { id: String(item.id) },
        UpdateExpression: "SET uniqueIndex = :ui",
        ExpressionAttributeValues: { ":ui": nanoid(10) },
      }));
    }
  }

  async createUser(email: string, passwordHash: string): Promise<User> {
    const id = nanoid(16);
    const createdAt = new Date().toISOString();
    const item = { id, email, passwordHash, createdAt };
    await docClient.send(new PutCommand({ TableName: TABLES.users, Item: item }));
    return { id, email, passwordHash, createdAt: new Date(createdAt) };
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLES.users,
      FilterExpression: "email = :e",
      ExpressionAttributeValues: { ":e": email },
    }));
    if (!result.Items?.[0]) return undefined;
    const item = result.Items[0];
    return {
      id: String(item.id),
      email: String(item.email),
      passwordHash: String(item.passwordHash),
      createdAt: item.createdAt ? new Date(item.createdAt as string) : null,
    };
  }

  async getUserById(id: string): Promise<User | undefined> {
    const result = await docClient.send(new GetCommand({
      TableName: TABLES.users,
      Key: { id },
    }));
    if (!result.Item) return undefined;
    const item = result.Item;
    return {
      id: String(item.id),
      email: String(item.email),
      passwordHash: String(item.passwordHash),
      createdAt: item.createdAt ? new Date(item.createdAt as string) : null,
    };
  }

  async getAllUsers(): Promise<User[]> {
    const result = await docClient.send(new ScanCommand({ TableName: TABLES.users }));
    return (result.Items ?? []).map((item) => ({
      id: String(item.id),
      email: String(item.email),
      passwordHash: String(item.passwordHash),
      createdAt: item.createdAt ? new Date(item.createdAt as string) : null,
    }));
  }
}

export const storage = new DynamoStorage();
