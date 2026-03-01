import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  address: text("address").notNull(),
  postcode: text("postcode"),
  price: integer("price").notNull(),
  numBeds: integer("num_beds"),
  daysOnMarket: integer("days_on_market"),
  link: text("link").notNull(),
  needsWork: boolean("needs_work").default(true),
});

export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  status: text("status").notNull(), 
  result: text("result"), 
  offeredPrice: integer("offered_price"),
  comment: text("comment"),
  viewingDate: timestamp("viewing_date"),
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

export const insertPropertySchema = createInsertSchema(properties).omit({ id: true });
export const insertCallSchema = createInsertSchema(calls).omit({ id: true, createdAt: true });

export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;

export type Call = typeof properties.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;

export type PropertyWithCalls = Property & { calls: any[] };
export type CallWithProperty = any & { property: Property };
