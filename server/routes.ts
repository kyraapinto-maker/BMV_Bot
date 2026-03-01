import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
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
      link: "https://rightmove.co.uk/property/1",
      needsWork: true
    });
    await storage.createProperty({
      address: "45 Long Road, Manchester",
      postcode: "M1 1AA",
      price: 180000,
      daysOnMarket: 200,
      link: "https://zoopla.co.uk/property/2",
      needsWork: true
    });
    await storage.createProperty({
      address: "70 High Street, Birmingham",
      postcode: "B1 1BB",
      price: 310000,
      daysOnMarket: 95,
      link: "https://rightmove.co.uk/property/3",
      needsWork: true
    });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Seed on startup
  seedDatabase().catch(console.error);

  app.get(api.properties.list.path, async (req, res) => {
    const propertiesList = await storage.getProperties();
    res.status(200).json(propertiesList);
  });

  app.get(api.properties.get.path, async (req, res) => {
    const property = await storage.getProperty(Number(req.params.id));
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    res.status(200).json(property);
  });

  app.get(api.calls.list.path, async (req, res) => {
    const callsList = await storage.getCalls();
    res.status(200).json(callsList);
  });

  app.post(api.calls.create.path, async (req, res) => {
    try {
      const propertyId = Number(req.params.id);
      
      const property = await storage.getProperty(propertyId);
      if (!property) {
        return res.status(404).json({ message: 'Property not found' });
      }

      // Simulate a call using our "voice agent"
      // Wait for 1.5s to simulate the "call"
      await new Promise(resolve => setTimeout(resolve, 1500));

      const results = ['viewing_booked', 'no_answer', 'not_interested'];
      const randomResult = results[Math.floor(Math.random() * results.length)];
      
      const viewingDate = randomResult === 'viewing_booked' 
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
        : null;

      const callData = {
        propertyId,
        status: 'completed',
        result: randomResult,
        viewingDate
      };

      const newCall = await storage.createCall(callData);
      res.status(201).json(newCall);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  return httpServer;
}
