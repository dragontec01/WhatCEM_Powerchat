// filepath: /home/luisrcap/projects/WhatCEM_Powerchat/shared/db/schema/api.ts
import { pgTable, serial, integer, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";
import { companies, users } from "./base";

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  permissions: jsonb("permissions").default('["messages:send", "channels:read"]'),
  isActive: boolean("is_active").notNull().default(true),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  rateLimitPerMinute: integer("rate_limit_per_minute").default(60),
  rateLimitPerHour: integer("rate_limit_per_hour").default(1000),
  rateLimitPerDay: integer("rate_limit_per_day").default(10000),
  allowedIps: jsonb("allowed_ips").default('[]'),
  webhookUrl: text("webhook_url"),
  metadata: jsonb("metadata").default('{}'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertApiKeySchema = createInsertSchema(apiKeys).pick({
  companyId: true,
  userId: true,
  name: true,
  keyHash: true,
  keyPrefix: true,
  permissions: true,
  isActive: true,
  expiresAt: true,
  rateLimitPerMinute: true,
  rateLimitPerHour: true,
  rateLimitPerDay: true,
  allowedIps: true,
  webhookUrl: true,
  metadata: true
});

export const apiUsage = pgTable("api_usage", {
  id: serial("id").primaryKey(),
  apiKeyId: integer("api_key_id").notNull().references(() => apiKeys.id, { onDelete: 'cascade' }),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  statusCode: integer("status_code").notNull(),
  requestSize: integer("request_size"),
  responseSize: integer("response_size"),
  duration: integer("duration"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  requestId: text("request_id").unique(),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").default('{}'),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertApiUsageSchema = createInsertSchema(apiUsage).pick({
  apiKeyId: true,
  companyId: true,
  endpoint: true,
  method: true,
  statusCode: true,
  requestSize: true,
  responseSize: true,
  duration: true,
  ipAddress: true,
  userAgent: true,
  requestId: true,
  errorMessage: true,
  metadata: true
});

export const apiRateLimits = pgTable("api_rate_limits", {
  id: serial("id").primaryKey(),
  apiKeyId: integer("api_key_id").notNull().references(() => apiKeys.id, { onDelete: 'cascade' }),
  windowType: text("window_type").notNull(),
  windowStart: timestamp("window_start").notNull(),
  requestCount: integer("request_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertApiRateLimitSchema = createInsertSchema(apiRateLimits).pick({
  apiKeyId: true,
  windowType: true,
  windowStart: true,
  requestCount: true
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

export type ApiUsage = typeof apiUsage.$inferSelect;
export type InsertApiUsage = z.infer<typeof insertApiUsageSchema>;

export type ApiRateLimit = typeof apiRateLimits.$inferSelect;
export type InsertApiRateLimit = z.infer<typeof insertApiRateLimitSchema>;
