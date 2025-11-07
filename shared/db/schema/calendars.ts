// filepath: /home/luisrcap/projects/WhatCEM_Powerchat/shared/db/schema/calendars.ts
import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";
import { users, companies } from "./base";

export const googleCalendarTokens = pgTable("google_calendar_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  tokenType: text("token_type"),
  expiryDate: timestamp("expiry_date"),
  scope: text("scope"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertGoogleCalendarTokenSchema = createInsertSchema(googleCalendarTokens).pick({
  userId: true,
  companyId: true,
  accessToken: true,
  refreshToken: true,
  idToken: true,
  tokenType: true,
  expiryDate: true,
  scope: true
});

export const zohoCalendarTokens = pgTable("zoho_calendar_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenType: text("token_type"),
  expiresIn: integer("expires_in"),
  scope: text("scope"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertZohoCalendarTokenSchema = createInsertSchema(zohoCalendarTokens).pick({
  userId: true,
  companyId: true,
  accessToken: true,
  refreshToken: true,
  tokenType: true,
  expiresIn: true,
  scope: true
});

export const calendlyCalendarTokens = pgTable("calendly_calendar_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenType: text("token_type"),
  expiresIn: integer("expires_in"),
  scope: text("scope"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertCalendlyCalendarTokenSchema = createInsertSchema(calendlyCalendarTokens).pick({
  userId: true,
  companyId: true,
  accessToken: true,
  refreshToken: true,
  tokenType: true,
  expiresIn: true,
  scope: true
});

export type GoogleCalendarToken = typeof googleCalendarTokens.$inferSelect;
export type InsertGoogleCalendarToken = z.infer<typeof insertGoogleCalendarTokenSchema>;

export type ZohoCalendarToken = typeof zohoCalendarTokens.$inferSelect;
export type InsertZohoCalendarToken = z.infer<typeof insertZohoCalendarTokenSchema>;

export type CalendlyCalendarToken = typeof calendlyCalendarTokens.$inferSelect;
export type InsertCalendlyCalendarToken = z.infer<typeof insertCalendlyCalendarTokenSchema>;
