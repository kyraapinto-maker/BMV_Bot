import { db } from "./db";
import {
  properties,
  calls,
  type InsertProperty,
  type Property,
  type InsertCall,
  type Call,
  type CallWithProperty,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getProperties(): Promise<Property[]>;
  getProperty(id: number): Promise<Property | undefined>;
  getCalls(): Promise<CallWithProperty[]>;
  createCall(call: InsertCall): Promise<Call>;
  createProperty(property: InsertProperty): Promise<Property>;
  deleteProperty(id: number): Promise<void>;
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
    console.log("Creating property", property);
    try {
      const [newProperty] = await db
        .insert(properties)
        .values(property)
        .returning();
      return newProperty;
    } catch (err) {
      console.error("Error creating property:", err);
    }
    throw new Error("Failed to create property");
  }

  async deleteProperty(id: number): Promise<void> {
    await db.delete(properties).where(eq(properties.id, id));
  }
}

export const storage = new DatabaseStorage();
