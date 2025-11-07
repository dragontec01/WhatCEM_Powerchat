import { pgTable, serial, text, boolean, timestamp, jsonb, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";
import { companies } from "./base";

export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertAppSettingsSchema = createInsertSchema(appSettings).pick({
  key: true,
  value: true
});

export const companySettings = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  key: text("key").notNull(),
  value: jsonb("value").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertCompanySettingsSchema = createInsertSchema(companySettings).pick({
  companyId: true,
  key: true,
  value: true
});

export const languages = pgTable("languages", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  nativeName: text("native_name").notNull(),
  flagIcon: text("flag_icon"),
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  direction: text("direction").default("ltr"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertLanguageSchema = createInsertSchema(languages).pick({
  code: true,
  name: true,
  nativeName: true,
  flagIcon: true,
  isActive: true,
  isDefault: true,
  direction: true
});

export const translationNamespaces = pgTable("translation_namespaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertNamespaceSchema = createInsertSchema(translationNamespaces).pick({
  name: true,
  description: true
});

export const translationKeys = pgTable("translation_keys", {
  id: serial("id").primaryKey(),
  namespaceId: integer("namespace_id").references(() => translationNamespaces.id),
  key: text("key").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertKeySchema = createInsertSchema(translationKeys).pick({
  namespaceId: true,
  key: true,
  description: true
});

export const translations = pgTable("translations", {
  id: serial("id").primaryKey(),
  keyId: integer("key_id").notNull().references(() => translationKeys.id),
  languageId: integer("language_id").notNull().references(() => languages.id),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertTranslationSchema = createInsertSchema(translations).pick({
  keyId: true,
  languageId: true,
  value: true
});

export const updateStatus = pgEnum('update_status', ['pending', 'downloading', 'validating', 'applying', 'completed', 'failed', 'rolled_back']);

export const systemUpdates = pgTable("system_updates", {
  id: serial("id").primaryKey(),
  version: text("version").notNull(),
  releaseNotes: text("release_notes"),
  downloadUrl: text("download_url").notNull(),
  packageHash: text("package_hash"),
  packageSize: integer("package_size"),
  status: updateStatus("status").notNull().default('pending'),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  rollbackData: jsonb("rollback_data"),
  migrationScripts: jsonb("migration_scripts").default('[]'),
  backupPath: text("backup_path"),
  progressPercentage: integer("progress_percentage").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertSystemUpdateSchema = createInsertSchema(systemUpdates).pick({
  version: true,
  releaseNotes: true,
  downloadUrl: true,
  packageHash: true,
  packageSize: true,
  status: true,
  scheduledAt: true,
  startedAt: true,
  completedAt: true,
  errorMessage: true,
  rollbackData: true,
  migrationScripts: true,
  backupPath: true,
  progressPercentage: true
});

export type UpdateStatus = typeof updateStatus.enumValues[number];

export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = typeof appSettings.$inferInsert;

export type CompanySetting = typeof companySettings.$inferSelect;
export type InsertCompanySetting = typeof companySettings.$inferInsert;

export type Language = typeof languages.$inferSelect;
export type InsertLanguage = z.infer<typeof insertLanguageSchema>;

export type TranslationNamespace = typeof translationNamespaces.$inferSelect;
export type InsertTranslationNamespace = z.infer<typeof insertNamespaceSchema>;

export type TranslationKey = typeof translationKeys.$inferSelect;
export type InsertTranslationKey = z.infer<typeof insertKeySchema>;

export type Translation = typeof translations.$inferSelect;
export type InsertTranslation = z.infer<typeof insertTranslationSchema>;

export type SystemUpdate = typeof systemUpdates.$inferSelect;
export type InsertSystemUpdate = z.infer<typeof insertSystemUpdateSchema>;
