import { pgTable, serial, integer, text, timestamp, boolean, jsonb, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";
import { companies, users, contacts } from "./base";

export const dealStatusTypes = z.enum([
  'lead',
  'qualified',
  'contacted',
  'demo_scheduled',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost'
]);

export const dealPriorityTypes = z.enum([
  'low',
  'medium',
  'high'
]);

export const pipelineStages = pgTable("pipeline_stages", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  name: text("name").notNull(),
  color: text("color").notNull(),
  order: integer("order_num").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertPipelineStageSchema = createInsertSchema(pipelineStages).pick({
  companyId: true,
  name: true,
  color: true,
  order: true
});

export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  contactId: integer("contact_id").notNull().references(() => contacts.id),
  title: text("title").notNull(),
  stageId: integer("stage_id").references(() => pipelineStages.id),
  stage: text("stage", {
    enum: ['lead', 'qualified', 'contacted', 'demo_scheduled', 'proposal', 'negotiation', 'closed_won', 'closed_lost']
  }).notNull().default('lead'),
  value: integer("value"),
  priority: text("priority", { enum: ['low', 'medium', 'high'] }).default('medium'),
  dueDate: timestamp("due_date"),
  assignedToUserId: integer("assigned_to_user_id").references(() => users.id),
  description: text("description"),
  tags: text("tags").array(),
  status: text("status").default('active'),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertDealSchema = createInsertSchema(deals).pick({
  companyId: true,
  contactId: true,
  title: true,
  stageId: true,
  stage: true,
  value: true,
  priority: true,
  dueDate: true,
  assignedToUserId: true,
  description: true,
  tags: true,
  status: true,
  lastActivityAt: true
});

export const dealActivities = pgTable("deal_activities", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull().references(() => deals.id),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertDealActivitySchema = createInsertSchema(dealActivities).pick({
  dealId: true,
  userId: true,
  type: true,
  content: true,
  metadata: true
});

export type Deal = typeof deals.$inferSelect;
export type InsertDeal = z.infer<typeof insertDealSchema>;

export type DealActivity = typeof dealActivities.$inferSelect;
export type InsertDealActivity = z.infer<typeof insertDealActivitySchema>;

export type DealStatus = z.infer<typeof dealStatusTypes>;
export type DealPriority = z.infer<typeof dealPriorityTypes>;

export type PipelineStage = typeof pipelineStages.$inferSelect;
export type InsertPipelineStage = z.infer<typeof insertPipelineStageSchema>;
