import { db } from "./db";
import {
  properties,
  calls,
  opportunities,
  type InsertProperty,
  type Property,
  type InsertCall,
  type Call,
  type CallWithProperty,
  type InsertOpportunity,
  type Opportunity,
} from "@shared/schema";
import { eq, desc, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface IStorage {
  getProperties(): Promise<Property[]>;
  getProperty(id: number): Promise<Property | undefined>;
  getCalls(): Promise<CallWithProperty[]>;
  createCall(call: InsertCall): Promise<Call>;
  createProperty(property: InsertProperty): Promise<Property>;
  deleteProperty(id: number): Promise<void>;
  backfillUniqueIndexes(): Promise<void>;
  getOpportunities(): Promise<Opportunity[]>;
  createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity>;
  deleteOpportunity(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getProperties(): Promise<Property[]> {
    return await db.select().from(properties);
  }

  async getProperty(id: number): Promise<Property | undefined> {
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, id));
    return property;
  }

  async getCalls(): Promise<CallWithProperty[]> {
    const records = await db.query.calls.findMany({
      with: {
        property: true,
      },
      orderBy: [desc(calls.createdAt)],
    });
    return records;
  }

  async createCall(call: InsertCall): Promise<Call> {
    const [newCall] = await db.insert(calls).values(call).returning();
    return newCall;
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    try {
      const [newProperty] = await db
        .insert(properties)
        .values({
          address: property.address,
          postcode: property.postcode,
          price: property.price,
          num_beds: property.num_beds,
          daysOnMarket: property.daysOnMarket,
          link: property.link,
          needsWork: property.needsWork,
          uniqueIndex: nanoid(10),
        })
        .returning();
      return newProperty;
    } catch (err) {
      console.error("Error creating property:", err);
      throw new Error("Failed to create property");
    }
  }

  async deleteProperty(id: number): Promise<void> {
    await db.delete(properties).where(eq(properties.id, id));
  }

  async getOpportunities(): Promise<Opportunity[]> {
    return await db.select().from(opportunities).orderBy(desc(opportunities.createdAt));
  }

  async createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity> {
    const [newOpportunity] = await db.insert(opportunities).values(opportunity).returning();
    return newOpportunity;
  }

  async deleteOpportunity(id: number): Promise<void> {
    await db.delete(opportunities).where(eq(opportunities.id, id));
  }

  async backfillUniqueIndexes(): Promise<void> {
    const rows = await db
      .select({ id: properties.id })
      .from(properties)
      .where(isNull(properties.uniqueIndex));

    for (const row of rows) {
      await db
        .update(properties)
        .set({ uniqueIndex: nanoid(10) })
        .where(eq(properties.id, row.id));
    }

    if (rows.length > 0) {
      console.log(`Backfilled uniqueIndex for ${rows.length} properties`);
    }
  }
}

export const storage = new DatabaseStorage();
