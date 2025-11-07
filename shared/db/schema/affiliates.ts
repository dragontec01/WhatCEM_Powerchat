// filepath: /home/luisrcap/projects/WhatCEM_Powerchat/shared/db/schema/affiliates.ts
import { pgTable, serial, integer, text, timestamp, jsonb, pgEnum, boolean, numeric, date, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";
import { companies, users } from "./base";
import { plans, paymentTransactions } from "./billing";

export const affiliateStatusEnum = pgEnum("affiliate_status", ["pending", "active", "suspended", "rejected"]);
export const affiliateApplicationStatusEnum = pgEnum("affiliate_application_status", ["pending", "approved", "rejected", "under_review"]);
export const commissionTypeEnum = pgEnum("commission_type", ["percentage", "fixed", "tiered"]);
export const payoutStatusEnum = pgEnum("payout_status", ["pending", "processing", "completed", "failed", "cancelled"]);
export const referralStatusEnum = pgEnum("referral_status", ["pending", "converted", "expired", "cancelled"]);

export const affiliateApplications = pgTable("affiliate_applications", {
  id: serial("id").primaryKey(),

  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),

  company: text("company"),
  website: text("website"),
  country: text("country").notNull(),

  marketingChannels: text("marketing_channels").array().notNull(),
  expectedMonthlyReferrals: text("expected_monthly_referrals").notNull(),
  experience: text("experience").notNull(),
  motivation: text("motivation").notNull(),

  status: affiliateApplicationStatusEnum("status").notNull().default("pending"),
  agreeToTerms: boolean("agree_to_terms").notNull().default(false),

  reviewedBy: integer("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  rejectionReason: text("rejection_reason"),

  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertAffiliateApplicationSchema = createInsertSchema(affiliateApplications).pick({
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  company: true,
  website: true,
  country: true,
  marketingChannels: true,
  expectedMonthlyReferrals: true,
  experience: true,
  motivation: true,
  status: true,
  agreeToTerms: true,
  reviewedBy: true,
  reviewedAt: true,
  reviewNotes: true,
  rejectionReason: true,
  submittedAt: true
});

export const affiliates = pgTable("affiliates", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),

  affiliateCode: text("affiliate_code").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  website: text("website"),

  status: affiliateStatusEnum("status").notNull().default("pending"),
  approvedBy: integer("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),

  defaultCommissionRate: numeric("default_commission_rate", { precision: 5, scale: 2 }).default("0.00"),
  commissionType: commissionTypeEnum("commission_type").default("percentage"),

  businessName: text("business_name"),
  taxId: text("tax_id"),
  address: jsonb("address"),

  paymentDetails: jsonb("payment_details"),

  totalReferrals: integer("total_referrals").default(0),
  successfulReferrals: integer("successful_referrals").default(0),
  totalEarnings: numeric("total_earnings", { precision: 12, scale: 2 }).default("0.00"),
  pendingEarnings: numeric("pending_earnings", { precision: 12, scale: 2 }).default("0.00"),
  paidEarnings: numeric("paid_earnings", { precision: 12, scale: 2 }).default("0.00"),

  notes: text("notes"),
  metadata: jsonb("metadata").default('{}'),
  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertAffiliateSchema = createInsertSchema(affiliates).pick({
  companyId: true,
  userId: true,
  affiliateCode: true,
  name: true,
  email: true,
  phone: true,
  website: true,
  status: true,
  approvedBy: true,
  approvedAt: true,
  rejectionReason: true,
  defaultCommissionRate: true,
  commissionType: true,
  businessName: true,
  taxId: true,
  address: true,
  paymentDetails: true,
  notes: true,
  metadata: true,
  isActive: true
});

export const affiliateCommissionStructures = pgTable("affiliate_commission_structures", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }),
  affiliateId: integer("affiliate_id").references(() => affiliates.id, { onDelete: "cascade" }),
  planId: integer("plan_id").references(() => plans.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  commissionType: commissionTypeEnum("commission_type").notNull().default("percentage"),
  commissionValue: numeric("commission_value", { precision: 10, scale: 2 }).notNull(),

  tierRules: jsonb("tier_rules"),

  minimumPayout: numeric("minimum_payout", { precision: 10, scale: 2 }).default("0.00"),
  maximumPayout: numeric("maximum_payout", { precision: 10, scale: 2 }),
  recurringCommission: boolean("recurring_commission").default(false),
  recurringMonths: integer("recurring_months").default(0),

  validFrom: timestamp("valid_from").defaultNow(),
  validUntil: timestamp("valid_until"),

  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertAffiliateCommissionStructureSchema = createInsertSchema(affiliateCommissionStructures).pick({
  companyId: true,
  affiliateId: true,
  planId: true,
  name: true,
  commissionType: true,
  commissionValue: true,
  tierRules: true,
  minimumPayout: true,
  maximumPayout: true,
  recurringCommission: true,
  recurringMonths: true,
  validFrom: true,
  validUntil: true,
  isActive: true
});

export const affiliateReferrals = pgTable("affiliate_referrals", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }),
  affiliateId: integer("affiliate_id").references(() => affiliates.id, { onDelete: "cascade" }),

  referralCode: text("referral_code").notNull(),
  referredCompanyId: integer("referred_company_id").references(() => companies.id, { onDelete: "set null" }),
  referredUserId: integer("referred_user_id").references(() => users.id, { onDelete: "set null" }),
  referredEmail: text("referred_email"),

  status: referralStatusEnum("status").notNull().default("pending"),
  convertedAt: timestamp("converted_at"),
  conversionValue: numeric("conversion_value", { precision: 12, scale: 2 }).default("0.00"),

  commissionStructureId: integer("commission_structure_id").references(() => affiliateCommissionStructures.id, { onDelete: "set null" }),
  commissionAmount: numeric("commission_amount", { precision: 12, scale: 2 }).default("0.00"),
  commissionRate: numeric("commission_rate", { precision: 5, scale: 2 }).default("0.00"),

  sourceUrl: text("source_url"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),

  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  countryCode: text("country_code"),

  expiresAt: timestamp("expires_at"),

  metadata: jsonb("metadata").default('{}'),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertAffiliateReferralSchema = createInsertSchema(affiliateReferrals).pick({
  companyId: true,
  affiliateId: true,
  referralCode: true,
  referredCompanyId: true,
  referredUserId: true,
  referredEmail: true,
  status: true,
  convertedAt: true,
  conversionValue: true,
  commissionStructureId: true,
  commissionAmount: true,
  commissionRate: true,
  sourceUrl: true,
  utmSource: true,
  utmMedium: true,
  utmCampaign: true,
  utmContent: true,
  utmTerm: true,
  userAgent: true,
  ipAddress: true,
  countryCode: true,
  expiresAt: true,
  metadata: true
});

export const affiliatePayouts = pgTable("affiliate_payouts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }),
  affiliateId: integer("affiliate_id").references(() => affiliates.id, { onDelete: "cascade" }),

  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  status: payoutStatusEnum("status").notNull().default("pending"),

  paymentMethod: text("payment_method"),
  paymentReference: text("payment_reference"),
  externalTransactionId: text("external_transaction_id"),

  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),

  processedBy: integer("processed_by").references(() => users.id, { onDelete: "set null" }),
  processedAt: timestamp("processed_at"),
  failureReason: text("failure_reason"),

  referralIds: integer("referral_ids").array(),

  notes: text("notes"),
  metadata: jsonb("metadata").default('{}'),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertAffiliatePayoutSchema = createInsertSchema(affiliatePayouts).pick({
  companyId: true,
  affiliateId: true,
  amount: true,
  currency: true,
  status: true,
  paymentMethod: true,
  paymentReference: true,
  externalTransactionId: true,
  periodStart: true,
  periodEnd: true,
  processedBy: true,
  processedAt: true,
  failureReason: true,
  referralIds: true,
  notes: true,
  metadata: true
});

export const affiliateAnalytics = pgTable("affiliate_analytics", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }),
  affiliateId: integer("affiliate_id").references(() => affiliates.id, { onDelete: "cascade" }),

  date: date("date").notNull(),
  periodType: text("period_type").notNull().default("daily"),

  clicks: integer("clicks").default(0),
  uniqueClicks: integer("unique_clicks").default(0),
  impressions: integer("impressions").default(0),

  referrals: integer("referrals").default(0),
  conversions: integer("conversions").default(0),
  conversionRate: numeric("conversion_rate", { precision: 5, scale: 2 }).default("0.00"),

  revenue: numeric("revenue", { precision: 12, scale: 2 }).default("0.00"),
  commissionEarned: numeric("commission_earned", { precision: 12, scale: 2 }).default("0.00"),
  averageOrderValue: numeric("average_order_value", { precision: 10, scale: 2 }).default("0.00"),

  topCountries: jsonb("top_countries").default('[]'),
  topSources: jsonb("top_sources").default('[]'),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertAffiliateAnalyticsSchema = createInsertSchema(affiliateAnalytics).pick({
  affiliateId: true,
  date: true,
  periodType: true,
  clicks: true,
  uniqueClicks: true,
  impressions: true,
  referrals: true,
  conversions: true,
  conversionRate: true,
  revenue: true,
  commissionEarned: true,
  averageOrderValue: true,
  topCountries: true,
  topSources: true
});

export const affiliateClicks = pgTable("affiliate_clicks", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }),
  affiliateId: integer("affiliate_id").references(() => affiliates.id, { onDelete: "cascade" }),
  referralId: integer("referral_id").references(() => affiliateReferrals.id, { onDelete: "set null" }),

  clickedUrl: text("clicked_url").notNull(),
  landingPage: text("landing_page"),

  sessionId: text("session_id"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  countryCode: text("country_code"),
  city: text("city"),

  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),

  referrerUrl: text("referrer_url"),
  referrerDomain: text("referrer_domain"),

  deviceType: text("device_type"),
  browser: text("browser"),
  os: text("os"),

  converted: boolean("converted").default(false),
  convertedAt: timestamp("converted_at"),

  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertAffiliateClickSchema = createInsertSchema(affiliateClicks).pick({
  companyId: true,
  affiliateId: true,
  referralId: true,
  clickedUrl: true,
  landingPage: true,
  sessionId: true,
  userAgent: true,
  ipAddress: true,
  countryCode: true,
  city: true,
  utmSource: true,
  utmMedium: true,
  utmCampaign: true,
  utmContent: true,
  utmTerm: true,
  referrerUrl: true,
  referrerDomain: true,
  deviceType: true,
  browser: true,
  os: true,
  converted: true,
  convertedAt: true
});

export const affiliateRelationships = pgTable("affiliate_relationships", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }),
  parentAffiliateId: integer("parent_affiliate_id").references(() => affiliates.id, { onDelete: "cascade" }),
  childAffiliateId: integer("child_affiliate_id").references(() => affiliates.id, { onDelete: "cascade" }),

  level: integer("level").notNull().default(1),
  commissionPercentage: numeric("commission_percentage", { precision: 5, scale: 2 }).default("0.00"),

  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertAffiliateRelationshipSchema = createInsertSchema(affiliateRelationships).pick({
  companyId: true,
  parentAffiliateId: true,
  childAffiliateId: true,
  level: true,
  commissionPercentage: true,
  isActive: true
});

export const affiliateEarningsBalance = pgTable("affiliate_earnings_balance", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }),
  affiliateId: integer("affiliate_id").references(() => affiliates.id, { onDelete: "cascade" }),

  totalEarned: numeric("total_earned", { precision: 12, scale: 2 }).default("0.00"),
  availableBalance: numeric("available_balance", { precision: 12, scale: 2 }).default("0.00"),
  appliedToPlans: numeric("applied_to_plans", { precision: 12, scale: 2 }).default("0.00"),
  pendingPayout: numeric("pending_payout", { precision: 12, scale: 2 }).default("0.00"),
  paidOut: numeric("paid_out", { precision: 12, scale: 2 }).default("0.00"),

  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  uniqueCompanyAffiliate: unique().on(table.companyId, table.affiliateId)
}));

export const insertAffiliateEarningsBalanceSchema = createInsertSchema(affiliateEarningsBalance).pick({
  companyId: true,
  affiliateId: true,
  totalEarned: true,
  availableBalance: true,
  appliedToPlans: true,
  pendingPayout: true,
  paidOut: true
});

export const affiliateEarningsTransactions = pgTable("affiliate_earnings_transactions", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }),
  affiliateId: integer("affiliate_id").references(() => affiliates.id, { onDelete: "cascade" }),

  transactionType: text("transaction_type", { enum: ['earned', 'applied_to_plan', 'payout', 'adjustment'] }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  balanceAfter: numeric("balance_after", { precision: 12, scale: 2 }).notNull(),

  referralId: integer("referral_id").references(() => affiliateReferrals.id, { onDelete: "set null" }),
  paymentTransactionId: integer("payment_transaction_id").references(() => paymentTransactions.id, { onDelete: "set null" }),
  payoutId: integer("payout_id").references(() => affiliatePayouts.id, { onDelete: "set null" }),

  description: text("description"),
  metadata: jsonb("metadata").default({}),

  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertAffiliateEarningsTransactionSchema = createInsertSchema(affiliateEarningsTransactions).pick({
  companyId: true,
  affiliateId: true,
  transactionType: true,
  amount: true,
  balanceAfter: true,
  referralId: true,
  paymentTransactionId: true,
  payoutId: true,
  description: true,
  metadata: true
});

export type AffiliateRelationship = typeof affiliateRelationships.$inferSelect;
export type InsertAffiliateRelationship = z.infer<typeof insertAffiliateRelationshipSchema>;

export type AffiliateEarningsBalance = typeof affiliateEarningsBalance.$inferSelect;
export type InsertAffiliateEarningsBalance = z.infer<typeof insertAffiliateEarningsBalanceSchema>;

export type AffiliateEarningsTransaction = typeof affiliateEarningsTransactions.$inferSelect;
export type InsertAffiliateEarningsTransaction = z.infer<typeof insertAffiliateEarningsTransactionSchema>;
