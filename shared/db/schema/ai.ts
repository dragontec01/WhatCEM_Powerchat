import { pgTable, serial, text, boolean, jsonb, timestamp, integer, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";
import { companies, conversations } from "./base";
import { flows } from "./index";

export const systemAiCredentials = pgTable("system_ai_credentials", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(),
  apiKeyEncrypted: text("api_key_encrypted").notNull(),
  displayName: text("display_name"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  usageLimitMonthly: integer("usage_limit_monthly"),
  usageCountCurrent: integer("usage_count_current").default(0),
  lastValidatedAt: timestamp("last_validated_at"),
  validationStatus: text("validation_status").default("pending"),
  validationError: text("validation_error"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertSystemAiCredentialSchema = createInsertSchema(systemAiCredentials).pick({
  provider: true,
  apiKeyEncrypted: true,
  displayName: true,
  description: true,
  isActive: true,
  isDefault: true,
  usageLimitMonthly: true,
  metadata: true
});

export const companyAiCredentials = pgTable("company_ai_credentials", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  provider: text("provider").notNull(),
  apiKeyEncrypted: text("api_key_encrypted").notNull(),
  displayName: text("display_name"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  usageLimitMonthly: integer("usage_limit_monthly"),
  usageCountCurrent: integer("usage_count_current").default(0),
  lastValidatedAt: timestamp("last_validated_at"),
  validationStatus: text("validation_status").default("pending"),
  validationError: text("validation_error"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertCompanyAiCredentialSchema = createInsertSchema(companyAiCredentials).pick({
  companyId: true,
  provider: true,
  apiKeyEncrypted: true,
  displayName: true,
  description: true,
  isActive: true,
  usageLimitMonthly: true,
  metadata: true
});

export const aiCredentialUsage = pgTable("ai_credential_usage", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  credentialType: text("credential_type").notNull(),
  credentialId: integer("credential_id"),
  provider: text("provider").notNull(),
  model: text("model"),
  tokensInput: integer("tokens_input").default(0),
  tokensOutput: integer("tokens_output").default(0),
  tokensTotal: integer("tokens_total").default(0),
  costEstimated: numeric("cost_estimated", { precision: 10, scale: 6 }).default("0.00"),
  requestCount: integer("request_count").default(1),
  conversationId: integer("conversation_id").references(() => conversations.id, { onDelete: 'set null' }),
  flowId: integer("flow_id").references(() => flows.id, { onDelete: 'set null' }),
  nodeId: text("node_id"),
  usageDate: date("usage_date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertAiCredentialUsageSchema = createInsertSchema(aiCredentialUsage).pick({
  companyId: true,
  credentialType: true,
  credentialId: true,
  provider: true,
  model: true,
  tokensInput: true,
  tokensOutput: true,
  tokensTotal: true,
  costEstimated: true,
  requestCount: true,
  conversationId: true,
  flowId: true,
  nodeId: true,
  usageDate: true
});

export const companyAiPreferences = pgTable("company_ai_preferences", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }).unique(),
  defaultProvider: text("default_provider").default("openai"),
  credentialPreference: text("credential_preference").default("auto"),
  fallbackEnabled: boolean("fallback_enabled").default(true),
  usageAlertsEnabled: boolean("usage_alerts_enabled").default(true),
  usageAlertThreshold: integer("usage_alert_threshold").default(80),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertCompanyAiPreferencesSchema = createInsertSchema(companyAiPreferences).pick({
  companyId: true,
  defaultProvider: true,
  credentialPreference: true,
  fallbackEnabled: true,
  usageAlertsEnabled: true,
  usageAlertThreshold: true,
  metadata: true
});

export type SystemAiCredential = typeof systemAiCredentials.$inferSelect;
export type InsertSystemAiCredential = z.infer<typeof insertSystemAiCredentialSchema>;

export type CompanyAiCredential = typeof companyAiCredentials.$inferSelect;
export type InsertCompanyAiCredential = z.infer<typeof insertCompanyAiCredentialSchema>;

export type AiCredentialUsage = typeof aiCredentialUsage.$inferSelect;
export type InsertAiCredentialUsage = z.infer<typeof insertAiCredentialUsageSchema>;

export type CompanyAiPreferences = typeof companyAiPreferences.$inferSelect;
export type InsertCompanyAiPreferences = z.infer<typeof insertCompanyAiPreferencesSchema>;