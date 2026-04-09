import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { ensureTables } from "./dynamo-setup";
import { api } from "@shared/routes";
import { z } from "zod";

async function seedDatabase() {
  const existingProperties = await storage.getProperties();
  if (existingProperties.length === 0) {
    await storage.createProperty({
      address: "123 Fake St, London",
      postcode: "E1 6AN",
      price: 250000,
      daysOnMarket: 120,
      num_beds: 2,
      link: "https://rightmove.co.uk/property/1",
    });
    await storage.createProperty({
      address: "45 Long Road, Manchester",
      postcode: "M1 1AA",
      price: 180000,
      daysOnMarket: 200,
      num_beds: 3,
      link: "https://zoopla.co.uk/property/2",
    });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  await ensureTables();

  seedDatabase().catch((err) => {
    console.error("Seeding failed:", err.message);
  });

  storage.backfillUniqueIndexes().catch((err) => {
    console.error("Backfill failed:", err.message);
  });

  storage.backfillOpportunityUniqueIndexes().catch((err) => {
    console.error("Opportunity backfill failed:", err.message);
  });

  app.get(api.properties.list.path, async (req, res) => {
    try {
      const propertiesList = await storage.getProperties();
      res.status(200).json(propertiesList);
    } catch (error) {
      res.status(500).json({
        message:
          error instanceof Error ? error.message : "Internal Server Error",
      });
    }
  });

  app.get(api.properties.search.path, async (req, res) => {
    const postcode = req.query.postcode as string;
    if (!postcode) {
      return res.status(400).json({ message: "Postcode is required" });
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const results = [
      {
        address: `Modernization Project, ${postcode}`,
        postcode: postcode,
        price: 200000 + Math.floor(Math.random() * 100000),
        daysOnMarket: Math.floor(Math.random() * 200),
        num_beds: 2 + Math.floor(Math.random() * 2),
        link: "https://rightmove.co.uk/property/s1",
      },
      {
        address: `Probate Sale, ${postcode}`,
        postcode: postcode,
        price: 150000 + Math.floor(Math.random() * 100000),
        daysOnMarket: Math.floor(Math.random() * 300),
        num_beds: 3 + Math.floor(Math.random() * 2),
        link: "https://zoopla.co.uk/property/s2",
      },
    ];
    res.status(200).json(results);
  });

  app.post(api.properties.create.path, async (req, res) => {
    try {
      // Ensure num_beds is mapped correctly from possible num_bed or num_beds
      const body = { ...req.body };
      if (body.num_bed !== undefined && body.num_beds === undefined) {
        body.num_beds = body.num_bed;
      }
      if (typeof body.price === "string") {
        body.price = Number(body.price.replace(/[^0-9.]/g, ""));
      }
      if (typeof body.daysOnMarket === "string") {
        body.daysOnMarket = Number(body.daysOnMarket);
      }
      if (typeof body.num_beds === "string") {
        body.num_beds = Number(body.num_beds);
      }

      const input = api.properties.create.input.parse(body);
      const property = await storage.createProperty(input);
      res.status(201).json(property);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      res.status(500).json({
        message: err instanceof Error ? err.message : "Internal Server Error",
      });
    }
  });

  app.delete(api.properties.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteProperty(id);
    res.status(200).json({ message: "Property removed" });
  });

  app.get(api.properties.get.path, async (req, res) => {
    const property = await storage.getProperty(Number(req.params.id));
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }
    res.status(200).json(property);
  });

  app.get(api.calls.list.path, async (req, res) => {
    const callsList = await storage.getCalls();
    res.status(200).json(callsList);
  });

  app.post(api.calls.callAll.path, async (req, res) => {
    try {
      const allProperties = await storage.getProperties();
      let initiated = 0;
      let errors = 0;

      await Promise.all(
        allProperties.map(async (property) => {
          if (!property.uniqueIndex) return;
          try {
            const newCall = await storage.createCall({
              propertyId: property.id,
              propertyUniqueIndex: property.uniqueIndex,
            });
            await fetch(
              "https://zywrcov6gl5hx5urwlykshhowa0rnopp.lambda-url.us-east-1.on.aws/",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ property_id: property.id, call_id: newCall.id }),
              }
            );
            initiated++;
          } catch {
            errors++;
          }
        })
      );

      res.status(200).json({ initiated, errors });
    } catch (err) {
      res.status(500).json({
        message: err instanceof Error ? err.message : "Internal Server Error",
      });
    }
  });

  app.post(api.calls.create.path, async (req, res) => {
    try {
      const uniqueIndex = req.params.unique_index;
      const property = await storage.getPropertyByUniqueIndex(uniqueIndex);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      const newCall = await storage.createCall({
        propertyId: property.id,
        propertyUniqueIndex: uniqueIndex,
      });

      const lambdaResponse = await fetch(
        "https://zywrcov6gl5hx5urwlykshhowa0rnopp.lambda-url.us-east-1.on.aws/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ property_id: property.id, call_id: newCall.id }),
        },
      );

      const responseText = await lambdaResponse.text();
      let lambdaResult: any;
      try {
        lambdaResult = JSON.parse(responseText);
      } catch {
        lambdaResult = { message: responseText };
      }

      res.status(201).json({ call: newCall, lambda: lambdaResult });
    } catch (err) {
      res.status(500).json({
        message: err instanceof Error ? err.message : "Internal Server Error",
      });
    }
  });

  app.get(api.opportunities.list.path, async (req, res) => {
    try {
      const list = await storage.getOpportunities();
      res.status(200).json(list);
    } catch (error) {
      res.status(500).json({
        message:
          error instanceof Error ? error.message : "Internal Server Error",
      });
    }
  });

  app.post(api.opportunities.create.path, async (req, res) => {
    try {
      const input = api.opportunities.create.input.parse(req.body);
      const opportunity = await storage.createOpportunity(input);
      res.status(201).json(opportunity);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      res.status(500).json({
        message: err instanceof Error ? err.message : "Internal Server Error",
      });
    }
  });

  app.delete(api.opportunities.delete.path, async (req, res) => {
    const id = req.params.id as any;
    await storage.deleteOpportunity(id);
    res.status(200).json({ message: "Opportunity removed" });
  });

  app.post(api.opportunities.activate.path, async (req, res) => {
    try {
      const id = req.params.id as any;
      const updated = await storage.activateOpportunity(id);
      if (!updated) {
        return res.status(404).json({ message: "Opportunity not found" });
      }
      res.status(200).json(updated);
    } catch (err) {
      res.status(500).json({
        message: err instanceof Error ? err.message : "Internal Server Error",
      });
    }
  });

  return httpServer;
}
