import type { Express, Request } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { ensureTables } from "./dynamo-setup";
import { api } from "@shared/routes";
import { z } from "zod";
import { isAuthenticated, isAdminEmail } from "./auth";

function userId(req: Request): string {
  return req.session.impersonatedUserId ?? (req.user as Express.User).id;
}

function requireAdmin(req: Request, res: any, next: any) {
  if (!isAdminEmail((req.user as Express.User).email)) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  await ensureTables();

  storage.backfillUniqueIndexes().catch((err) => {
    console.error("Backfill failed:", err.message);
  });

  storage.backfillOpportunityUniqueIndexes().catch((err) => {
    console.error("Opportunity backfill failed:", err.message);
  });

  app.get(api.properties.list.path, isAuthenticated, async (req, res) => {
    try {
      const propertiesList = await storage.getProperties(userId(req));
      res.status(200).json(propertiesList);
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Internal Server Error",
      });
    }
  });

  app.get(api.properties.search.path, isAuthenticated, async (req, res) => {
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

  app.post(api.properties.create.path, isAuthenticated, async (req, res) => {
    try {
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
      const property = await storage.createProperty(input, userId(req));
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

  app.post("/api/properties/from-url", isAuthenticated, async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ message: "A valid URL is required" });
      }

      const lambdaRes = await fetch(
        "https://tiui4gsyaup4x2zong3evcnzvm0hposx.lambda-url.us-east-1.on.aws/scrape-url",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        }
      );

      if (!lambdaRes.ok) {
        const text = await lambdaRes.text();
        throw new Error(`Scraper returned ${lambdaRes.status}: ${text}`);
      }

      const data = await lambdaRes.json();
      const body = { ...data };

      if (typeof body.price === "string") body.price = Number(body.price.replace(/[^0-9.]/g, ""));
      if (typeof body.daysOnMarket === "string") body.daysOnMarket = Number(body.daysOnMarket);
      if (typeof body.num_beds === "string") body.num_beds = Number(body.num_beds);
      if (body.num_bed !== undefined && body.num_beds === undefined) body.num_beds = body.num_bed;

      const input = api.properties.create.input.parse(body);
      const property = await storage.createProperty(input, userId(req));
      res.status(201).json(property);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Internal Server Error" });
    }
  });

  app.delete(api.properties.delete.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteProperty(id, userId(req));
    res.status(200).json({ message: "Property removed" });
  });

  app.get(api.properties.get.path, isAuthenticated, async (req, res) => {
    const property = await storage.getProperty(Number(req.params.id), userId(req));
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }
    res.status(200).json(property);
  });

  app.get(api.calls.list.path, isAuthenticated, async (req, res) => {
    const callsList = await storage.getCalls(userId(req));
    res.status(200).json(callsList);
  });

  const DAILY_CALL_LIMIT = 50;

  app.post(api.calls.callAll.path, isAuthenticated, async (req, res) => {
    try {
      const uid = userId(req);
      if (!isAdminEmail((req.user as Express.User).email)) {
        const todayCount = await storage.countCallsToday(uid);
        if (todayCount >= DAILY_CALL_LIMIT) {
          return res.status(429).json({ message: `Daily call limit of ${DAILY_CALL_LIMIT} reached. Limit resets at midnight.` });
        }
      }
      const allProperties = await storage.getProperties(uid);
      let initiated = 0;
      let errors = 0;

      await Promise.all(
        allProperties.map(async (property) => {
          if (!property.uniqueIndex) return;
          try {
            const newCall = await storage.createCall({
              propertyId: property.id,
              propertyUniqueIndex: property.uniqueIndex,
            }, uid);
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

  app.post(api.calls.create.path, isAuthenticated, async (req, res) => {
    try {
      const uid = userId(req);
      if (!isAdminEmail((req.user as Express.User).email)) {
        const todayCount = await storage.countCallsToday(uid);
        if (todayCount >= DAILY_CALL_LIMIT) {
          return res.status(429).json({ message: `Daily call limit of ${DAILY_CALL_LIMIT} reached. Limit resets at midnight.` });
        }
      }
      const uniqueIndex = req.params.unique_index;
      const property = await storage.getPropertyByUniqueIndex(uniqueIndex);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      const questions = typeof req.body?.questions === "string" && req.body.questions.trim()
        ? req.body.questions.trim()
        : undefined;

      const newCall = await storage.createCall({
        propertyId: property.id,
        propertyUniqueIndex: uniqueIndex,
      }, uid);

      const lambdaResponse = await fetch(
        "https://zywrcov6gl5hx5urwlykshhowa0rnopp.lambda-url.us-east-1.on.aws/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ property_id: property.id, call_id: newCall.id, ...(questions ? { questions } : {}) }),
        },
      );

      const responseText = await lambdaResponse.text();
      let lambdaResult: unknown;
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

  app.get(api.opportunities.list.path, isAuthenticated, async (req, res) => {
    try {
      const list = await storage.getOpportunities(userId(req));
      res.status(200).json(list);
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Internal Server Error",
      });
    }
  });

  app.post(api.opportunities.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.opportunities.create.input.parse(req.body);
      const opportunity = await storage.createOpportunity(input, userId(req));
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

  app.patch(api.opportunities.update.path, isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id;
      const input = api.opportunities.update.input.parse(req.body);
      const updated = await storage.updateOpportunity(id, input, userId(req));
      if (!updated) return res.status(404).json({ message: "Opportunity not found" });
      res.status(200).json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Internal Server Error" });
    }
  });

  app.delete(api.opportunities.delete.path, isAuthenticated, async (req, res) => {
    const id = req.params.id;
    await storage.deleteOpportunity(id, userId(req));
    res.status(200).json({ message: "Opportunity removed" });
  });

  app.post(api.opportunities.activate.path, isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id;
      const updated = await storage.activateOpportunity(id, userId(req));
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

  app.get("/api/admin/users", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.map((u) => ({ id: u.id, email: u.email })));
    } catch (err) {
      res.status(500).json({ message: err instanceof Error ? err.message : "Internal Server Error" });
    }
  });

  app.post("/api/admin/impersonate/:userId", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const target = await storage.getUserById(req.params.userId);
      if (!target) return res.status(404).json({ message: "User not found" });
      req.session.impersonatedUserId = target.id;
      res.json({ id: target.id, email: target.email });
    } catch (err) {
      res.status(500).json({ message: err instanceof Error ? err.message : "Internal Server Error" });
    }
  });

  app.post("/api/admin/stop-impersonate", isAuthenticated, async (req, res) => {
    delete req.session.impersonatedUserId;
    res.json({ message: "Stopped impersonating" });
  });

  return httpServer;
}
