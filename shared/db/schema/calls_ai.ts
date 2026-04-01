import { pgTable, serial, text, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";
import { companies } from "./base";
import { campaigns } from "./marketing";

export const callLogStatusTypes = z.enum([
  'initiated',
  'ringing',
  'in-progress',
  'completed',
  'failed',
  'busy',
  'no-answer'
]);

export const scheduledCallStatusTypes = z.enum([
  'pending',
  'called',
  'failed',
  'cancelled'
]);

export const callConfiguration = pgTable("call_configuration", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  systemPrompt: text("system_prompt"),
  greetingPrompt: text("greeting_prompt"),
  openaiApiKey: varchar("openai_api_key", { length: 255 }),
  twlAccountSid: varchar("twl_account_sid", { length: 255 }),
  twlAuthToken: varchar("twl_auth_token", { length: 255 }),
  twlPhoneNumber: varchar("twl_phone_number", { length: 50 }),
  voiceModel: varchar("voice_model", { length: 50 }).default("gpt-3.5-turbo"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertCallConfigurationSchema = createInsertSchema(callConfiguration).pick({
  companyId: true,
  systemPrompt: true,
  greetingPrompt: true,
  openaiApiKey: true,
  twlAccountSid: true,
  twlAuthToken: true,
  twlPhoneNumber: true,
  voiceModel: true
});

export const callLogs = pgTable("call_logs", {
  id: serial("id").primaryKey(),
  callConfigurationId: integer("call_configuration_id").notNull().references(() => callConfiguration.id),
  campaignId: integer("campaign_id").references(() => campaigns.id),
  phoneNumber: varchar("phone_number", { length: 50 }),
  callSid: varchar("call_sid", { length: 100 }).unique(),
  status: text("status", {
    enum: ['initiated', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer']
  }).default('initiated'),
  durationSeconds: integer("duration_seconds").default(0),
  transcript: text("transcript").default(""),
  summary: text("summary").default(""),
  analysis: text("analysis").default(""),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertCallLogSchema = createInsertSchema(callLogs).pick({
  callConfigurationId: true,
  campaignId: true,
  phoneNumber: true,
  callSid: true,
  status: true,
  durationSeconds: true,
  transcript: true,
  summary: true,
  analysis: true
});

export const scheduledCalls = pgTable("scheduled_calls", {
  id: serial("id").primaryKey(),
  callConfigurationId: integer("call_configuration_id").notNull().references(() => callConfiguration.id),
  campaignId: integer("campaign_id").references(() => campaigns.id),
  phoneNumber: varchar("phone_number", { length: 50 }).notNull(),
  contactName: varchar("contact_name", { length: 100 }),
  customInstructions: text("custom_instructions"),
  scheduledFor: timestamp("scheduled_for").notNull(),
  status: text("status", {
    enum: ['pending', 'called', 'failed', 'cancelled']
  }).default('pending'),
  callSid: varchar("call_sid", { length: 100 }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertScheduledCallSchema = createInsertSchema(scheduledCalls).pick({
  callConfigurationId: true,
  campaignId: true,
  phoneNumber: true,
  contactName: true,
  customInstructions: true,
  scheduledFor: true,
  status: true
});

export type CallConfiguration = typeof callConfiguration.$inferSelect;
export type InsertCallConfiguration = z.infer<typeof insertCallConfigurationSchema>;

export type CallLog = typeof callLogs.$inferSelect;
export type InsertCallLog = z.infer<typeof insertCallLogSchema>;

export type ScheduledCall = typeof scheduledCalls.$inferSelect;
export type InsertScheduledCall = z.infer<typeof insertScheduledCallSchema>;

export type CallLogStatus = z.infer<typeof callLogStatusTypes>;
export type ScheduledCallStatus = z.infer<typeof scheduledCallStatusTypes>;
