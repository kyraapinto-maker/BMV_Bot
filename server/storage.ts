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
} from "@shared/schema";

export interface IStorage {
  getProperties(): Promise<Property[]>;
  getProperty(id: number): Promise<Property | undefined>;
  getPropertyByUniqueIndex(uniqueIndex: string): Promise<Property | undefined>;
  getCalls(): Promise<CallWithProperty[]>;
  createCall(call: InsertCall): Promise<Call>;
  createProperty(property: InsertProperty): Promise<Property>;
  deleteProperty(id: number): Promise<void>;
  backfillUniqueIndexes(): Promise<void>;
  getOpportunities(): Promise<Opportunity[]>;
  createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity>;
  deleteOpportunity(id: number): Promise<void>;
  activateOpportunity(id: number): Promise<Opportunity>;
  backfillOpportunityUniqueIndexes(): Promise<void>;
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

function toProperty(item: Record<string, any>): Property {
  return {
    id: item.id,
    address: item.address,
    postcode: item.postcode ?? null,
    price: item.price,
    num_beds: item.num_beds ?? null,
    daysOnMarket: item.daysOnMarket ?? null,
    link: item.link,
    needsWork: item.needsWork ?? true,
    uniqueIndex: item.uniqueIndex ?? null,
  };
}

function toCall(item: Record<string, any>): Call {
  return {
    id: item.id,
    propertyId: item.propertyId,
    propertyUniqueIndex: item.propertyUniqueIndex ?? null,
    status: item.status ?? null,
    result: item.result ?? null,
    offeredPrice: item.offeredPrice ?? null,
    comment: item.comment ?? null,
    viewingDate: item.viewingDate ? new Date(item.viewingDate) : null,
    summary: item.summary ?? null,
    transcript: item.transcript ?? null,
    elevenlabsConversationId: item.elevenlabsConversationId ?? null,
    createdAt: item.createdAt ? new Date(item.createdAt) : null,
  };
}

function toOpportunity(item: Record<string, any>): Opportunity {
  return {
    id: item.id,
    uniqueIndex: item.uniqueIndex ?? null,
    name: item.name,
    phone: item.phone,
    email: item.email,
    address: item.address,
    availability: item.availability,
    knowledgeBase: item.knowledgeBase ?? null,
    active: item.active ?? false,
    createdAt: item.createdAt ? new Date(item.createdAt) : null,
  };
}

export class DynamoStorage implements IStorage {
  async getProperties(): Promise<Property[]> {
    const result = await docClient.send(new ScanCommand({ TableName: TABLES.properties }));
    const items = (result.Items ?? []).map(toProperty);
    return items.sort((a, b) => b.id - a.id);
  }

  async getProperty(id: number): Promise<Property | undefined> {
    const result = await docClient.send(new GetCommand({
      TableName: TABLES.properties,
      Key: { id },
    }));
    return result.Item ? toProperty(result.Item) : undefined;
  }

  async getPropertyByUniqueIndex(uniqueIndex: string): Promise<Property | undefined> {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLES.properties,
      FilterExpression: "uniqueIndex = :ui",
      ExpressionAttributeValues: { ":ui": uniqueIndex },
    }));
    return result.Items?.[0] ? toProperty(result.Items[0]) : undefined;
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const id = await nextId("properties");
    const item = {
      id,
      address: property.address,
      postcode: property.postcode ?? null,
      price: property.price,
      num_beds: property.num_beds ?? null,
      daysOnMarket: property.daysOnMarket ?? null,
      link: property.link,
      needsWork: property.needsWork ?? true,
      uniqueIndex: nanoid(10),
    };
    await docClient.send(new PutCommand({ TableName: TABLES.properties, Item: item }));
    return toProperty(item);
  }

  async deleteProperty(id: number): Promise<void> {
    const calls = await this.getCalls();
    for (const call of calls.filter(c => c.propertyId === id)) {
      await docClient.send(new DeleteCommand({ TableName: TABLES.calls, Key: { id: call.id } }));
    }
    await docClient.send(new DeleteCommand({ TableName: TABLES.properties, Key: { id } }));
  }

  async backfillUniqueIndexes(): Promise<void> {
    const props = await this.getProperties();
    for (const prop of props.filter(p => !p.uniqueIndex)) {
      await docClient.send(new UpdateCommand({
        TableName: TABLES.properties,
        Key: { id: prop.id },
        UpdateExpression: "SET uniqueIndex = :ui",
        ExpressionAttributeValues: { ":ui": nanoid(10) },
      }));
    }
    if (props.filter(p => !p.uniqueIndex).length > 0) {
      console.log(`Backfilled uniqueIndex for ${props.filter(p => !p.uniqueIndex).length} properties`);
    }
  }

  async getCalls(): Promise<CallWithProperty[]> {
    const callsResult = await docClient.send(new ScanCommand({ TableName: TABLES.calls }));
    const callItems = callsResult.Items ?? [];

    const propertyIds = [...new Set(callItems.map((c: any) => c.propertyId))];
    const propertyMap = new Map<number, Property>();
    for (const pid of propertyIds) {
      const prop = await this.getProperty(pid as number);
      if (prop) propertyMap.set(pid as number, prop);
    }

    const result: CallWithProperty[] = callItems
      .map((item: any) => {
        const call = toCall(item);
        const property = propertyMap.get(call.propertyId);
        if (!property) return null;
        return { ...call, property };
      })
      .filter(Boolean) as CallWithProperty[];

    return result.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  }

  async createCall(call: InsertCall): Promise<Call> {
    const id = await nextId("calls");
    const item = {
      id,
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

  async getOpportunities(): Promise<Opportunity[]> {
    const result = await docClient.send(new ScanCommand({ TableName: TABLES.opportunities }));
    const items = (result.Items ?? []).map(toOpportunity);
    return items.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  }

  async createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity> {
    const id = await nextId("opportunities");
    const item = {
      id,
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

  async deleteOpportunity(id: number): Promise<void> {
    await docClient.send(new DeleteCommand({ TableName: TABLES.opportunities, Key: { id } }));
  }

  async activateOpportunity(id: number): Promise<Opportunity> {
    const all = await this.getOpportunities();
    for (const opp of all) {
      await docClient.send(new UpdateCommand({
        TableName: TABLES.opportunities,
        Key: { id: opp.id },
        UpdateExpression: "SET active = :v",
        ExpressionAttributeValues: { ":v": opp.id === id },
      }));
    }
    const result = await docClient.send(new GetCommand({
      TableName: TABLES.opportunities,
      Key: { id },
    }));
    return toOpportunity(result.Item!);
  }

  async backfillOpportunityUniqueIndexes(): Promise<void> {
    const opps = await this.getOpportunities();
    for (const opp of opps.filter(o => !o.uniqueIndex)) {
      await docClient.send(new UpdateCommand({
        TableName: TABLES.opportunities,
        Key: { id: opp.id },
        UpdateExpression: "SET uniqueIndex = :ui",
        ExpressionAttributeValues: { ":ui": nanoid(10) },
      }));
    }
  }
}

export const storage = new DynamoStorage();
