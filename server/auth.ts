import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { registerSchema } from "@shared/schema";
import type { User } from "@shared/schema";
import { z } from "zod";
import { docClient, TABLES } from "./db";
import { GetCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      passwordHash: string;
      createdAt: Date | null;
    }
  }
}

const SALT_ROUNDS = 12;

class DynamoSessionStore extends session.Store {
  async get(sid: string, callback: (err: any, session?: any) => void) {
    try {
      const result = await docClient.send(
        new GetCommand({ TableName: TABLES.sessions, Key: { sid } })
      );
      if (!result.Item) return callback(null, null);
      if (result.Item.expires && result.Item.expires < Date.now()) {
        return callback(null, null);
      }
      callback(null, JSON.parse(result.Item.data));
    } catch (err) {
      callback(err);
    }
  }

  async set(sid: string, sessionData: any, callback: (err?: any) => void) {
    try {
      const maxAge = sessionData.cookie?.maxAge ?? 7 * 24 * 60 * 60 * 1000;
      const expires = Date.now() + maxAge;
      await docClient.send(
        new PutCommand({
          TableName: TABLES.sessions,
          Item: { sid, data: JSON.stringify(sessionData), expires },
        })
      );
      callback();
    } catch (err) {
      callback(err);
    }
  }

  async destroy(sid: string, callback: (err?: any) => void) {
    try {
      await docClient.send(
        new DeleteCommand({ TableName: TABLES.sessions, Key: { sid } })
      );
      callback();
    } catch (err) {
      callback(err);
    }
  }

  async touch(sid: string, sessionData: any, callback: (err?: any) => void) {
    return this.set(sid, sessionData, callback);
  }
}

async function seedAdminUser() {
  const email = process.env.ADMIN_EMAIL || "admin@bobthecaller.com";
  const password = process.env.ADMIN_PASSWORD || "Admin1234!";
  try {
    const existing = await storage.getUserByEmail(email);
    if (!existing) {
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      await storage.createUser(email, passwordHash);
      console.log(`[auth] Admin user created: ${email}`);
    }
  } catch (err) {
    console.error("[auth] Failed to seed admin user:", err);
  }
}

export function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET environment variable must be set in production");
  }

  app.set("trust proxy", 1);

  app.use(
    session({
      store: new DynamoSessionStore(),
      secret: sessionSecret || "propscout-dev-session-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email.toLowerCase().trim());
        if (!user) return done(null, false, { message: "Invalid email or password" });
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return done(null, false, { message: "Invalid email or password" });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user ?? false);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password } = registerSchema.parse(req.body);
      const normalizedEmail = email.toLowerCase().trim();
      const existing = await storage.getUserByEmail(normalizedEmail);
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const user = await storage.createUser(normalizedEmail, passwordHash);
      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Login after registration failed" });
        res.status(201).json({ id: user.id, email: user.email });
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Internal Server Error" });
    }
  });

  app.post("/api/auth/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      "local",
      (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
        if (err) return next(err);
        if (!user) return res.status(401).json({ message: info?.message || "Invalid credentials" });
        req.login(user, (loginErr) => {
          if (loginErr) return next(loginErr);
          res.status(200).json({ id: user.id, email: user.email });
        });
      }
    )(req, res, next);
  });

  app.post("/api/auth/logout", (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.status(200).json({ id: req.user.id, email: req.user.email });
  });

  seedAdminUser();
}

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ message: "Authentication required" });
}
