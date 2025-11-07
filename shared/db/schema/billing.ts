import { pgTable, serial, text, integer, boolean, timestamp, jsonb, numeric, date, pgEnum, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";
import { companies, users } from "./base";

export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  maxUsers: integer("max_users").notNull().default(5),
  maxContacts: integer("max_contacts").notNull().default(1000),
  maxChannels: integer("max_channels").notNull().default(3),
  maxFlows: integer("max_flows").notNull().default(1),
  maxCampaigns: integer("max_campaigns").notNull().default(5),
  maxCampaignRecipients: integer("max_campaign_recipients").notNull().default(1000),
  campaignFeatures: jsonb("campaign_features").notNull().default(["basic_campaigns"]),
  isActive: boolean("is_active").notNull().default(true),
  isFree: boolean("is_free").notNull().default(false),
  hasTrialPeriod: boolean("has_trial_period").notNull().default(false),
  trialDays: integer("trial_days").default(0),
  features: jsonb("features").notNull().default([]),
  billingInterval: text("billing_interval", { enum: ['lifetime', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semi_annual', 'annual', 'biennial', 'custom'] }).default("monthly"),
  customDurationDays: integer("custom_duration_days"),
  gracePeriodDays: integer("grace_period_days").default(3),
  maxDunningAttempts: integer("max_dunning_attempts").default(3),
  softLimitPercentage: integer("soft_limit_percentage").default(80),
  allowPausing: boolean("allow_pausing").default(true),
  pauseMaxDays: integer("pause_max_days").default(90),
  aiTokensIncluded: integer("ai_tokens_included").default(0),
  aiTokensMonthlyLimit: integer("ai_tokens_monthly_limit"),
  aiTokensDailyLimit: integer("ai_tokens_daily_limit"),
  aiOverageEnabled: boolean("ai_overage_enabled").default(false),
  aiOverageRate: numeric("ai_overage_rate", { precision: 10, scale: 6 }).default("0.000000"),
  aiOverageBlockEnabled: boolean("ai_overage_block_enabled").default(false),
  aiBillingEnabled: boolean("ai_billing_enabled").default(false),

  discountType: text("discount_type", { enum: ['none', 'percentage', 'fixed_amount'] }).default('none'),
  discountValue: numeric("discount_value", { precision: 10, scale: 2 }).default("0"),
  discountDuration: text("discount_duration", { enum: ['permanent', 'first_month', 'first_year', 'limited_time'] }).default('permanent'),
  discountStartDate: timestamp("discount_start_date"),
  discountEndDate: timestamp("discount_end_date"),
  originalPrice: numeric("original_price", { precision: 10, scale: 2 }),

  storageLimit: integer("storage_limit").default(1024), // in MB
  bandwidthLimit: integer("bandwidth_limit").default(10240), // monthly bandwidth in MB
  fileUploadLimit: integer("file_upload_limit").default(25), // max file size per upload in MB
  totalFilesLimit: integer("total_files_limit").default(1000), // max number of files

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertPlanSchema = createInsertSchema(plans).pick({
  name: true,
  description: true,
  price: true,
  maxUsers: true,
  maxContacts: true,
  maxChannels: true,
  maxFlows: true,
  maxCampaigns: true,
  maxCampaignRecipients: true,
  campaignFeatures: true,
  isActive: true,
  isFree: true,
  hasTrialPeriod: true,
  trialDays: true,
  features: true,
  billingInterval: true,
  customDurationDays: true,
  gracePeriodDays: true,
  maxDunningAttempts: true,
  softLimitPercentage: true,
  allowPausing: true,
  pauseMaxDays: true,
  aiTokensIncluded: true,
  aiTokensMonthlyLimit: true,
  aiTokensDailyLimit: true,
  aiOverageEnabled: true,
  aiOverageRate: true,
  aiOverageBlockEnabled: true,
  aiBillingEnabled: true,
  discountType: true,
  discountValue: true,
  discountDuration: true,
  discountStartDate: true,
  discountEndDate: true,
  originalPrice: true,
  storageLimit: true,
  bandwidthLimit: true,
  fileUploadLimit: true,
  totalFilesLimit: true
});

export const planAiProviderConfigs = pgTable("plan_ai_provider_configs", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull().references(() => plans.id, { onDelete: 'cascade' }),
  provider: text("provider").notNull(),

  tokensMonthlyLimit: integer("tokens_monthly_limit"),
  tokensDailyLimit: integer("tokens_daily_limit"),

  customPricingEnabled: boolean("custom_pricing_enabled").default(false),
  inputTokenRate: numeric("input_token_rate", { precision: 10, scale: 8 }),
  outputTokenRate: numeric("output_token_rate", { precision: 10, scale: 8 }),

  enabled: boolean("enabled").default(true),
  priority: integer("priority").default(0),

  metadata: jsonb("metadata").default('{}'),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => [
  unique().on(table.planId, table.provider)
]);

export const insertPlanAiProviderConfigSchema = createInsertSchema(planAiProviderConfigs).pick({
  planId: true,
  provider: true,
  tokensMonthlyLimit: true,
  tokensDailyLimit: true,
  customPricingEnabled: true,
  inputTokenRate: true,
  outputTokenRate: true,
  enabled: true,
  priority: true,
  metadata: true
});

export const planAiUsageTracking = pgTable("plan_ai_usage_tracking", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  planId: integer("plan_id").notNull().references(() => plans.id, { onDelete: 'cascade' }),
  provider: text("provider").notNull(),

  tokensUsedMonthly: integer("tokens_used_monthly").default(0),
  tokensUsedDaily: integer("tokens_used_daily").default(0),
  requestsMonthly: integer("requests_monthly").default(0),
  requestsDaily: integer("requests_daily").default(0),
  costMonthly: numeric("cost_monthly", { precision: 10, scale: 6 }).default("0.000000"),
  costDaily: numeric("cost_daily", { precision: 10, scale: 6 }).default("0.000000"),

  overageTokensMonthly: integer("overage_tokens_monthly").default(0),
  overageCostMonthly: numeric("overage_cost_monthly", { precision: 10, scale: 6 }).default("0.000000"),

  usageMonth: integer("usage_month").notNull(),
  usageYear: integer("usage_year").notNull(),
  usageDate: date("usage_date").notNull(),

  monthlyLimitReached: boolean("monthly_limit_reached").default(false),
  dailyLimitReached: boolean("daily_limit_reached").default(false),
  monthlyWarningSent: boolean("monthly_warning_sent").default(false),
  dailyWarningSent: boolean("daily_warning_sent").default(false),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => [
  unique().on(table.companyId, table.planId, table.provider, table.usageYear, table.usageMonth, table.usageDate)
]);

export const insertPlanAiUsageTrackingSchema = createInsertSchema(planAiUsageTracking).pick({
  companyId: true,
  planId: true,
  provider: true,
  tokensUsedMonthly: true,
  tokensUsedDaily: true,
  requestsMonthly: true,
  requestsDaily: true,
  costMonthly: true,
  costDaily: true,
  overageTokensMonthly: true,
  overageCostMonthly: true,
  usageMonth: true,
  usageYear: true,
  usageDate: true,
  monthlyLimitReached: true,
  dailyLimitReached: true,
  monthlyWarningSent: true,
  dailyWarningSent: true
});

export const planAiBillingEvents = pgTable("plan_ai_billing_events", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  planId: integer("plan_id").notNull().references(() => plans.id, { onDelete: 'cascade' }),
  provider: text("provider").notNull(),

  eventType: text("event_type").notNull(),
  eventData: jsonb("event_data").notNull().default('{}'),

  tokensConsumed: integer("tokens_consumed").default(0),
  costAmount: numeric("cost_amount", { precision: 10, scale: 6 }).default("0.000000"),
  billingPeriodStart: date("billing_period_start"),
  billingPeriodEnd: date("billing_period_end"),

  processed: boolean("processed").default(false),
  processedAt: timestamp("processed_at"),

  createdAt: timestamp("created_at").notNull().defaultNow(),

  metadata: jsonb("metadata").default('{}')
});

export const insertPlanAiBillingEventSchema = createInsertSchema(planAiBillingEvents).pick({
  companyId: true,
  planId: true,
  provider: true,
  eventType: true,
  eventData: true,
  tokensConsumed: true,
  costAmount: true,
  billingPeriodStart: true,
  billingPeriodEnd: true,
  processed: true,
  processedAt: true,
  metadata: true
});

export const paymentTransactions = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  planId: integer("plan_id").references(() => plans.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  status: text("status", { enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'] }).notNull().default('pending'),
  paymentMethod: text("payment_method", { enum: ['stripe', 'mercadopago', 'paypal', 'moyasar', 'mpesa', 'bank_transfer', 'other'] }).notNull(),
  // Provider identifiers and links
  paymentIntentId: text("payment_intent_id"),
  externalTransactionId: text("external_transaction_id"),
  receiptUrl: text("receipt_url"),
  // Flexible metadata blob used widely across the codebase
  metadata: jsonb("metadata"),
  // Recurring billing support
  isRecurring: boolean("is_recurring").default(false),
  subscriptionPeriodStart: timestamp("subscription_period_start"),
  subscriptionPeriodEnd: timestamp("subscription_period_end"),
  prorationAmount: numeric("proration_amount", { precision: 10, scale: 2 }).default("0"),
  dunningAttempt: integer("dunning_attempt").default(0),
  // Discount/coupon/affiliate credits
  originalAmount: numeric("original_amount", { precision: 10, scale: 2 }),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).default("0"),
  couponCodeId: integer("coupon_code_id"),
  affiliateCreditApplied: numeric("affiliate_credit_applied", { precision: 10, scale: 2 }).default("0"),
  discountDetails: jsonb("discount_details").default('{}'),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions).pick({
  companyId: true,
  planId: true,
  amount: true,
  currency: true,
  status: true,
  paymentMethod: true,
  paymentIntentId: true,
  externalTransactionId: true,
  receiptUrl: true,
  metadata: true,
  isRecurring: true,
  subscriptionPeriodStart: true,
  subscriptionPeriodEnd: true,
  prorationAmount: true,
  dunningAttempt: true,
  originalAmount: true,
  discountAmount: true,
  couponCodeId: true,
  affiliateCreditApplied: true,
  discountDetails: true
});

export const couponCodes = pgTable("coupon_codes", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }),

  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),

  discountType: text("discount_type", { enum: ['percentage', 'fixed_amount'] }).notNull(),
  discountValue: numeric("discount_value", { precision: 10, scale: 2 }).notNull(),

  usageLimit: integer("usage_limit"),
  usageLimitPerUser: integer("usage_limit_per_user").default(1),
  currentUsageCount: integer("current_usage_count").default(0),

  startDate: timestamp("start_date").notNull().defaultNow(),
  endDate: timestamp("end_date"),

  applicablePlanIds: integer("applicable_plan_ids").array(),
  minimumPlanValue: numeric("minimum_plan_value", { precision: 10, scale: 2 }),

  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  metadata: jsonb("metadata").default({}),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertCouponCodeSchema = createInsertSchema(couponCodes).pick({
  companyId: true,
  code: true,
  name: true,
  description: true,
  discountType: true,
  discountValue: true,
  usageLimit: true,
  usageLimitPerUser: true,
  startDate: true,
  endDate: true,
  applicablePlanIds: true,
  minimumPlanValue: true,
  isActive: true,
  createdBy: true,
  metadata: true
});

export const couponUsage = pgTable("coupon_usage", {
  id: serial("id").primaryKey(),
  couponId: integer("coupon_id").references(() => couponCodes.id, { onDelete: "cascade" }),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),

  planId: integer("plan_id").references(() => plans.id, { onDelete: "set null" }),
  originalAmount: numeric("original_amount", { precision: 10, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).notNull(),
  finalAmount: numeric("final_amount", { precision: 10, scale: 2 }).notNull(),

  paymentTransactionId: integer("payment_transaction_id").references(() => paymentTransactions.id, { onDelete: "set null" }),

  usageContext: jsonb("usage_context").default({}),

  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertCouponUsageSchema = createInsertSchema(couponUsage).pick({
  couponId: true,
  companyId: true,
  userId: true,
  planId: true,
  originalAmount: true,
  discountAmount: true,
  finalAmount: true,
  paymentTransactionId: true,
  usageContext: true
});

export const subscriptionEvents = pgTable("subscription_events", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  eventType: text("event_type").notNull(),
  eventData: jsonb("event_data").notNull().default('{}'),
  previousStatus: text("previous_status"),
  newStatus: text("new_status"),
  triggeredBy: text("triggered_by"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertSubscriptionEventSchema = createInsertSchema(subscriptionEvents).pick({
  companyId: true,
  eventType: true,
  eventData: true,
  previousStatus: true,
  newStatus: true,
  triggeredBy: true
});

export const subscriptionUsageTracking = pgTable("subscription_usage_tracking", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  metricName: text("metric_name").notNull(),
  currentUsage: integer("current_usage").notNull().default(0),
  limitValue: integer("limit_value").notNull(),
  softLimitReached: boolean("soft_limit_reached").default(false),
  hardLimitReached: boolean("hard_limit_reached").default(false),
  lastWarningSent: timestamp("last_warning_sent"),
  resetPeriod: text("reset_period").default("monthly"),
  lastReset: timestamp("last_reset").defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => [
  unique().on(table.companyId, table.metricName)
]);

export const insertSubscriptionUsageTrackingSchema = createInsertSchema(subscriptionUsageTracking).pick({
  companyId: true,
  metricName: true,
  currentUsage: true,
  limitValue: true,
  softLimitReached: true,
  hardLimitReached: true,
  lastWarningSent: true,
  resetPeriod: true,
  lastReset: true
});

export const dunningManagement = pgTable("dunning_management", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  paymentTransactionId: integer("payment_transaction_id").references(() => paymentTransactions.id),
  attemptNumber: integer("attempt_number").notNull().default(1),
  attemptDate: timestamp("attempt_date").notNull().defaultNow(),
  attemptType: text("attempt_type").notNull(),
  status: text("status").notNull().default("pending"),
  responseData: jsonb("response_data"),
  nextAttemptDate: timestamp("next_attempt_date"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertDunningManagementSchema = createInsertSchema(dunningManagement).pick({
  companyId: true,
  paymentTransactionId: true,
  attemptNumber: true,
  attemptDate: true,
  attemptType: true,
  status: true,
  responseData: true,
  nextAttemptDate: true
});

export const subscriptionPlanChanges = pgTable("subscription_plan_changes", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  fromPlanId: integer("from_plan_id").references(() => plans.id),
  toPlanId: integer("to_plan_id").notNull().references(() => plans.id),
  changeType: text("change_type").notNull(),
  effectiveDate: timestamp("effective_date").notNull().defaultNow(),
  prorationAmount: numeric("proration_amount", { precision: 10, scale: 2 }).default("0"),
  prorationDays: integer("proration_days").default(0),
  billingCycleReset: boolean("billing_cycle_reset").default(false),
  changeReason: text("change_reason"),
  processed: boolean("processed").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertSubscriptionPlanChangeSchema = createInsertSchema(subscriptionPlanChanges).pick({
  companyId: true,
  fromPlanId: true,
  toPlanId: true,
  changeType: true,
  effectiveDate: true,
  prorationAmount: true,
  prorationDays: true,
  billingCycleReset: true,
  changeReason: true,
  processed: true
});

export const subscriptionNotifications = pgTable("subscription_notifications", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  notificationType: text("notification_type").notNull(),
  status: text("status").notNull().default("pending"),
  scheduledFor: timestamp("scheduled_for").notNull(),
  sentAt: timestamp("sent_at"),
  notificationData: jsonb("notification_data").notNull().default('{}'),
  deliveryMethod: text("delivery_method").default("email"),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertSubscriptionNotificationSchema = createInsertSchema(subscriptionNotifications).pick({
  companyId: true,
  notificationType: true,
  status: true,
  scheduledFor: true,
  sentAt: true,
  notificationData: true,
  deliveryMethod: true,
  retryCount: true,
  maxRetries: true
});

export type CouponCode = typeof couponCodes.$inferSelect;
export type InsertCouponCode = z.infer<typeof insertCouponCodeSchema>;

export type CouponUsage = typeof couponUsage.$inferSelect;
export type InsertCouponUsage = z.infer<typeof insertCouponUsageSchema>;

export type SubscriptionEvent = typeof subscriptionEvents.$inferSelect;
export type InsertSubscriptionEvent = z.infer<typeof insertSubscriptionEventSchema>;

export type SubscriptionUsageTracking = typeof subscriptionUsageTracking.$inferSelect;
export type InsertSubscriptionUsageTracking = z.infer<typeof insertSubscriptionUsageTrackingSchema>;

export type DunningManagement = typeof dunningManagement.$inferSelect;
export type InsertDunningManagement = z.infer<typeof insertDunningManagementSchema>;

export type SubscriptionPlanChange = typeof subscriptionPlanChanges.$inferSelect;
export type InsertSubscriptionPlanChange = z.infer<typeof insertSubscriptionPlanChangeSchema>;

export type SubscriptionNotification = typeof subscriptionNotifications.$inferSelect;
export type InsertSubscriptionNotification = z.infer<typeof insertSubscriptionNotificationSchema>;

export type Plan = typeof plans.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;

export type PlanAiProviderConfig = typeof planAiProviderConfigs.$inferSelect;
export type InsertPlanAiProviderConfig = z.infer<typeof insertPlanAiProviderConfigSchema>;

export type PlanAiUsageTracking = typeof planAiUsageTracking.$inferSelect;
export type InsertPlanAiUsageTracking = z.infer<typeof insertPlanAiUsageTrackingSchema>;

export type PlanAiBillingEvent = typeof planAiBillingEvents.$inferSelect;
export type InsertPlanAiBillingEvent = z.infer<typeof insertPlanAiBillingEventSchema>;

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type InsertPaymentTransaction = z.infer<typeof insertPaymentTransactionSchema>;
