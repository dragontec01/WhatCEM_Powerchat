// filepath: /home/luisrcap/projects/WhatCEM_Powerchat/shared/db/schema/flows.ts
import { pgTable, serial, integer, text, timestamp, jsonb, boolean, numeric, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";
import { companies, users, contacts, conversations } from "./base";
import { channelConnections } from "./assigns";

export const flowNodeTypes = z.enum([
  'start',
  'message',
  'condition',
  'input',
  'api_call',
  'delay',
  'end',
  'attachment',
  'template',
  'contact_property',
  'trigger',
  'image',
  'video',
  'audio',
  'document',
  'wait',
  'whatsapp_interactive_buttons',
  'whatsapp_interactive_list',
  'whatsapp_cta_url',
  'whatsapp_location_request',
  'whatsapp_poll',
  'whatsapp_flows',
  'follow_up',
  'translation',
  'webhook',
  'http_request',
  'shopify',
  'woocommerce',
  'typebot',
  'flowise',
  'n8n',
  'google_sheets',
  'data_capture',
  'bot_disable',
  'bot_reset'
]);

export const flowStatusTypes = z.enum([
  'draft',
  'active',
  'inactive',
  'archived'
]);

const calendarNodeTypes = ['google_calendar_event', 'google_calendar_availability'] as const;
const aiNodeTypes = ['ai_assistant'] as const;
const pipelineNodeTypes = ['update_pipeline_stage'] as const;

export const updatedFlowNodeTypes = [
  ...flowNodeTypes.options,
  ...calendarNodeTypes,
  ...aiNodeTypes,
  ...pipelineNodeTypes
];

export const flows = pgTable("flows", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  companyId: integer("company_id").references(() => companies.id),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status", { enum: flowStatusTypes.options as [string, ...string[]] }).notNull().default('draft'),
  nodes: jsonb("nodes").notNull().default([]),
  edges: jsonb("edges").notNull().default([]),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertFlowSchema = createInsertSchema(flows).pick({
  userId: true,
  companyId: true,
  name: true,
  description: true,
  status: true,
  nodes: true,
  edges: true,
  version: true,
});

export const flowAssignments = pgTable("flow_assignments", {
  id: serial("id").primaryKey(),
  flowId: integer("flow_id").notNull().references(() => flows.id),
  channelId: integer("channel_id").notNull().references(() => channelConnections.id),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertFlowAssignmentSchema = createInsertSchema(flowAssignments).pick({
  flowId: true,
  channelId: true,
  isActive: true,
});

export const flowSessions = pgTable("flow_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  flowId: integer("flow_id").notNull().references(() => flows.id),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  contactId: integer("contact_id").notNull().references(() => contacts.id),
  companyId: integer("company_id").references(() => companies.id),
  status: text("status", { enum: ['active', 'waiting', 'paused', 'completed', 'failed', 'abandoned', 'timeout'] }).notNull().default('active'),

  currentNodeId: text("current_node_id"),
  triggerNodeId: text("trigger_node_id").notNull(),
  executionPath: jsonb("execution_path").notNull().default([]),
  branchingHistory: jsonb("branching_history").notNull().default([]),

  sessionData: jsonb("session_data").notNull().default({}),
  nodeStates: jsonb("node_states").notNull().default({}),
  waitingContext: jsonb("waiting_context"),

  startedAt: timestamp("started_at").notNull().defaultNow(),
  lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
  pausedAt: timestamp("paused_at"),
  resumedAt: timestamp("resumed_at"),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"),

  totalDurationMs: integer("total_duration_ms"),
  nodeExecutionCount: integer("node_execution_count").default(0),
  userInteractionCount: integer("user_interaction_count").default(0),
  errorCount: integer("error_count").default(0),
  lastErrorMessage: text("last_error_message"),

  checkpointData: jsonb("checkpoint_data"),
  debugInfo: jsonb("debug_info"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertFlowSessionSchema = createInsertSchema(flowSessions).pick({
  sessionId: true,
  flowId: true,
  conversationId: true,
  contactId: true,
  companyId: true,
  status: true,
  currentNodeId: true,
  triggerNodeId: true,
  executionPath: true,
  branchingHistory: true,
  sessionData: true,
  nodeStates: true,
  waitingContext: true,
  expiresAt: true
});

export const flowExecutions = pgTable("flow_executions", {
  id: serial("id").primaryKey(),
  executionId: text("execution_id").notNull().unique(),
  flowId: integer("flow_id").notNull().references(() => flows.id),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  contactId: integer("contact_id").notNull().references(() => contacts.id),
  companyId: integer("company_id").references(() => companies.id),
  status: text("status", { enum: ['running', 'waiting', 'completed', 'failed', 'abandoned'] }).notNull().default('running'),
  triggerNodeId: text("trigger_node_id").notNull(),
  currentNodeId: text("current_node_id"),
  executionPath: jsonb("execution_path").notNull().default([]),
  contextData: jsonb("context_data").notNull().default({}),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
  totalDurationMs: integer("total_duration_ms"),
  completionRate: numeric("completion_rate", { precision: 5, scale: 2 }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const flowSessionVariables = pgTable("flow_session_variables", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => flowSessions.sessionId),
  variableKey: text("variable_key").notNull(),
  variableValue: jsonb("variable_value").notNull(),
  variableType: text("variable_type", { enum: ['string', 'number', 'boolean', 'object', 'array'] }).notNull().default('string'),
  scope: text("scope", { enum: ['global', 'flow', 'node', 'user', 'session'] }).notNull().default('session'),
  nodeId: text("node_id"),
  isEncrypted: boolean("is_encrypted").default(false),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertFlowSessionVariableSchema = createInsertSchema(flowSessionVariables).pick({
  sessionId: true,
  variableKey: true,
  variableValue: true,
  variableType: true,
  scope: true,
  nodeId: true,
  isEncrypted: true,
  expiresAt: true
});

export const flowSessionCursors = pgTable("flow_session_cursors", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => flowSessions.sessionId),
  currentNodeId: text("current_node_id").notNull(),
  previousNodeId: text("previous_node_id"),
  nextPossibleNodes: jsonb("next_possible_nodes").notNull().default([]),
  branchConditions: jsonb("branch_conditions").notNull().default({}),
  loopState: jsonb("loop_state"),
  waitingForInput: boolean("waiting_for_input").default(false),
  inputExpectedType: text("input_expected_type"),
  inputValidationRules: jsonb("input_validation_rules"),
  timeoutAt: timestamp("timeout_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertFlowSessionCursorSchema = createInsertSchema(flowSessionCursors).pick({
  sessionId: true,
  currentNodeId: true,
  previousNodeId: true,
  nextPossibleNodes: true,
  branchConditions: true,
  loopState: true,
  waitingForInput: true,
  inputExpectedType: true,
  inputValidationRules: true,
  timeoutAt: true
});

export const flowStepExecutions = pgTable("flow_step_executions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").references(() => flowSessions.sessionId),
  flowExecutionId: integer("flow_execution_id").references(() => flowExecutions.id),
  nodeId: text("node_id").notNull(),
  nodeType: text("node_type").notNull(),
  stepOrder: integer("step_order").notNull(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  durationMs: integer("duration_ms"),
  status: text("status", { enum: ['running', 'completed', 'failed', 'skipped', 'waiting', 'timeout'] }).notNull().default('running'),
  inputData: jsonb("input_data"),
  outputData: jsonb("output_data"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const followUpSchedules = pgTable("follow_up_schedules", {
  id: serial("id").primaryKey(),
  scheduleId: text("schedule_id").notNull().unique(),
  sessionId: text("session_id").references(() => flowSessions.sessionId),
  flowId: integer("flow_id").notNull().references(() => flows.id),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  contactId: integer("contact_id").notNull().references(() => contacts.id),
  companyId: integer("company_id").references(() => companies.id),
  nodeId: text("node_id").notNull(),

  messageType: text("message_type", {
    enum: ['text', 'image', 'video', 'audio', 'document', 'reaction']
  }).notNull().default('text'),
  messageContent: text("message_content"),
  mediaUrl: text("media_url"),
  caption: text("caption"),
  templateId: integer("template_id"),

  triggerEvent: text("trigger_event", {
    enum: ['conversation_start', 'node_execution', 'specific_datetime', 'relative_delay']
  }).notNull().default('conversation_start'),
  triggerNodeId: text("trigger_node_id"),
  delayAmount: integer("delay_amount"),
  delayUnit: text("delay_unit", { enum: ['minutes', 'hours', 'days', 'weeks'] }),
  scheduledFor: timestamp("scheduled_for"),
  specificDatetime: timestamp("specific_datetime"),
  timezone: text("timezone").default('UTC'),

  status: text("status", {
    enum: ['scheduled', 'sent', 'failed', 'cancelled', 'expired']
  }).notNull().default('scheduled'),
  sentAt: timestamp("sent_at"),
  failedReason: text("failed_reason"),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),

  channelType: text("channel_type").notNull(),
  channelConnectionId: integer("channel_connection_id").references(() => channelConnections.id),

  variables: jsonb("variables").default({}),
  executionContext: jsonb("execution_context").default({}),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at")
});

export const insertFollowUpScheduleSchema = createInsertSchema(followUpSchedules).pick({
  scheduleId: true,
  sessionId: true,
  flowId: true,
  conversationId: true,
  contactId: true,
  companyId: true,
  nodeId: true,
  messageType: true,
  messageContent: true,
  mediaUrl: true,
  caption: true,
  templateId: true,
  triggerEvent: true,
  triggerNodeId: true,
  delayAmount: true,
  delayUnit: true,
  scheduledFor: true,
  specificDatetime: true,
  timezone: true,
  status: true,
  maxRetries: true,
  channelType: true,
  channelConnectionId: true,
  variables: true,
  executionContext: true,
  expiresAt: true
});

export const followUpTemplates = pgTable("follow_up_templates", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  description: text("description"),
  messageType: text("message_type", {
    enum: ['text', 'image', 'video', 'audio', 'document', 'reaction']
  }).notNull().default('text'),
  content: text("content").notNull(),
  mediaUrl: text("media_url"),
  caption: text("caption"),
  defaultDelayAmount: integer("default_delay_amount").default(24),
  defaultDelayUnit: text("default_delay_unit", { enum: ['minutes', 'hours', 'days', 'weeks'] }).default('hours'),
  variables: jsonb("variables").default([]),
  category: text("category").default('general'),
  isActive: boolean("is_active").default(true),
  usageCount: integer("usage_count").default(0),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  uniqueCompanyName: unique().on(table.companyId, table.name)
}));

export const insertFollowUpTemplateSchema = createInsertSchema(followUpTemplates).pick({
  companyId: true,
  name: true,
  description: true,
  messageType: true,
  content: true,
  mediaUrl: true,
  caption: true,
  defaultDelayAmount: true,
  defaultDelayUnit: true,
  variables: true,
  category: true,
  isActive: true,
  createdBy: true
});

export const followUpExecutionLog = pgTable("follow_up_execution_log", {
  id: serial("id").primaryKey(),
  scheduleId: text("schedule_id").notNull().references(() => followUpSchedules.scheduleId),
  executionAttempt: integer("execution_attempt").notNull().default(1),
  status: text("status", { enum: ['success', 'failed', 'retry'] }).notNull(),
  messageId: text("message_id"),
  errorMessage: text("error_message"),
  executionDurationMs: integer("execution_duration_ms"),
  executedAt: timestamp("executed_at").notNull().defaultNow(),

  responseReceived: boolean("response_received").default(false),
  responseAt: timestamp("response_at"),
  responseContent: text("response_content")
});

export const insertFollowUpExecutionLogSchema = createInsertSchema(followUpExecutionLog).pick({
  scheduleId: true,
  executionAttempt: true,
  status: true,
  messageId: true,
  errorMessage: true,
  executionDurationMs: true,
  responseReceived: true,
  responseAt: true,
  responseContent: true
});

export const extendedFlowNodeTypes = z.enum(updatedFlowNodeTypes as [string, ...string[]]);
export type ExtendedFlowNodeType = z.infer<typeof extendedFlowNodeTypes>;

export type Flow = typeof flows.$inferSelect;
export type InsertFlow = z.infer<typeof insertFlowSchema>;

export type FlowAssignment = typeof flowAssignments.$inferSelect;
export type InsertFlowAssignment = z.infer<typeof insertFlowAssignmentSchema>;

export type FlowNodeType = z.infer<typeof flowNodeTypes>;
export type FlowStatus = z.infer<typeof flowStatusTypes>;

export type FlowSession = typeof flowSessions.$inferSelect;
export type InsertFlowSession = z.infer<typeof insertFlowSessionSchema>;

export type FlowSessionVariable = typeof flowSessionVariables.$inferSelect;
export type InsertFlowSessionVariable = z.infer<typeof insertFlowSessionVariableSchema>;

export type FlowSessionCursor = typeof flowSessionCursors.$inferSelect;
export type InsertFlowSessionCursor = z.infer<typeof insertFlowSessionCursorSchema>;

export type FlowExecution = typeof flowExecutions.$inferSelect;
export type FlowStepExecution = typeof flowStepExecutions.$inferSelect;

export type FollowUpSchedule = typeof followUpSchedules.$inferSelect;
export type InsertFollowUpSchedule = z.infer<typeof insertFollowUpScheduleSchema>;

export type FollowUpTemplate = typeof followUpTemplates.$inferSelect;
export type InsertFollowUpTemplate = z.infer<typeof insertFollowUpTemplateSchema>;

export type FollowUpExecutionLog = typeof followUpExecutionLog.$inferSelect;
export type InsertFollowUpExecutionLog = z.infer<typeof insertFollowUpExecutionLogSchema>;
