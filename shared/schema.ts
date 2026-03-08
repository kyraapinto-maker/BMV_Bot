import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  decimal,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  address: text("address").notNull(),
  postcode: text("postcode"),
  price: integer("price").notNull(),
  num_beds: integer("num_beds"),
  daysOnMarket: integer("days_on_market"),
  link: text("link").notNull(),
  needsWork: boolean("needs_work").default(true),
  uniqueIndex: text("unique_index")
});

export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id")
    .references(() => properties.id, { onDelete: "cascade" })
    .notNull(),
  propertyUniqueIndex: text("property_unique_index"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  uniqueIndex: text("unique_index"),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  address: text("address").notNull(),
  availability: text("availability").notNull(),
  knowledgeBase: text("knowledge_base"),
  active: boolean("active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const propertiesRelations = relations(properties, ({ many }) => ({
  calls: many(calls),
}));

export const callsRelations = relations(calls, ({ one }) => ({
  property: one(properties, {
    fields: [calls.propertyId],
    references: [properties.id],
  }),
}));

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
});
export const insertCallSchema = createInsertSchema(calls).omit({
  id: true,
  createdAt: true,
});
export const insertOpportunitySchema = createInsertSchema(opportunities).omit({
  id: true,
  createdAt: true,
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;

export type Call = typeof calls.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;

export type Opportunity = typeof opportunities.$inferSelect;
export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;

export type PropertyWithCalls = Property & { calls: Call[] };
export type CallWithProperty = Call & { property: Property };
