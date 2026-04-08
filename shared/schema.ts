import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Trade categories for contractors and inspection items
export const TRADE_CATEGORIES = [
  'plumbing',
  'electrical', 
  'hvac',
  'gas',
  'roofing',
  'pest_control',
  'fire_safety',
  'general',
] as const;

export type TradeCategory = typeof TRADE_CATEGORIES[number];

// Human-readable trade category labels
export const TRADE_CATEGORY_LABELS: Record<TradeCategory, string> = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  hvac: 'HVAC (Heating/Cooling)',
  gas: 'Gas Fitting',
  roofing: 'Roofing',
  pest_control: 'Pest Control',
  fire_safety: 'Fire Safety',
  general: 'General Maintenance',
};

// Inspection types - distinguishes who can perform the inspection
export const INSPECTION_TYPES = ['visual', 'professional'] as const;
export type InspectionType = typeof INSPECTION_TYPES[number];

// Human-readable inspection type labels
export const INSPECTION_TYPE_LABELS: Record<InspectionType, string> = {
  visual: 'Visual Inspection',
  professional: 'Professional Inspection',
};

// Professional inspection keywords - items containing these require licensed trade professionals
export const PROFESSIONAL_INSPECTION_KEYWORDS = [
  // Electrical
  'circuit breaker', 'rcd', 'switchboard', 'earthing', 'bonding', 'thermal scan', 
  'electrical test', 'load test', 'wiring test', 'meter box',
  // Gas
  'combustion', 'gas pressure', 'leak test', 'regulator', 'flue', 'gas appliance test',
  'gas safety', 'pilot light', 'thermocouple',
  // Plumbing
  'tpr valve', 'pressure relief', 'anode', 'backflow', 'tempering valve',
  'hot water test', 'water pressure test',
  // Fire/Safety
  'decibel test', 'sprinkler test', 'fire panel', 'booster pump', 'extinguisher service',
  'emergency light test', 'exit sign test',
  // Pool
  'barrier certification', 'pool pump', 'chlorinator', 'pool fence certification',
  // HVAC
  'refrigerant', 'hvac service', 'duct cleaning', 'furnace service', 'ac service',
  // General professional
  'safety certificate', 'compliance test', 'licensed', 'certified inspection',
] as const;

// Onboarding state type for tracking user progress
export interface OnboardingState {
  currentStep: number;
  completed: boolean;
  dismissed: boolean;
  completedAt: string | null;
  completedSteps: string[];
  setupTasks: {
    agencyBranding: boolean;
    firstProperty: boolean;
    firstRoom: boolean;
    firstInspection: boolean;
  };
}

// Users table for multi-tenant access
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  propertyCount: integer("property_count").default(1),
  role: text("role").notNull(), // 'super_admin', 'agency_admin', 'property_manager', 'property_owner'
  userType: text("user_type").notNull(), // 'agency', 'maintenance_company', 'private'
  agencyId: integer("agency_id"),
  isActive: boolean("is_active").default(true),
  tosAccepted: boolean("tos_accepted").default(false),
  tosAcceptedAt: timestamp("tos_accepted_at"),
  onboardingState: jsonb("onboarding_state").$type<OnboardingState>(),
  // Stripe / subscription fields
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status").default("pending"), // pending, active, report_only, promo, canceled
  subscriptionPlan: text("subscription_plan"), // monthly, report_only, promo
  subscriptionTier: text("subscription_tier"), // my_home, property_owner, agency, portfolio, enterprise
  channel: text("channel").default("residential"), // residential, commercial
  promoCodeUsed: text("promo_code_used"),
  setupFeePaid: boolean("setup_fee_paid").default(false),
  emailVerified: boolean("email_verified").default(false),
  emailVerifiedAt: timestamp("email_verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Promo codes for competitions, free access etc.
export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description"),
  grantType: text("grant_type").notNull().default("full_access"), // full_access, report_only
  durationMonths: integer("duration_months"), // null = permanent
  maxUses: integer("max_uses"), // null = unlimited
  usedCount: integer("used_count").default(0),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({ id: true, usedCount: true, createdAt: true });
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoCode = typeof promoCodes.$inferSelect;

// Password reset tokens for secure password recovery
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  tokenHash: text("token_hash").notNull(), // bcrypt hash of the token
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"), // null if not used yet
  createdAt: timestamp("created_at").defaultNow(),
});

// Real estate agencies
export const agencies = pgTable("agencies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  website: text("website"),
  branding: jsonb("branding"), // logo, colors, etc.
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Properties managed by agencies
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  agencyId: integer("agency_id").notNull(),
  ownerId: integer("owner_id"), // property owner user id
  managerId: integer("manager_id"), // assigned property manager
  name: text("name").notNull(),
  address: text("address").notNull(),
  country: text("country"), // auto-detected from address, determines compliance standards
  latitude: text("latitude"), // GPS coordinates
  longitude: text("longitude"), // GPS coordinates
  propertyType: text("property_type").notNull(), // 'apartment', 'house', 'commercial'
  unitNumber: text("unit_number"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  squareFootage: integer("square_footage"),
  yearBuilt: integer("year_built"),
  numberOfLevels: integer("number_of_levels").default(1),
  specialInstructions: text("special_instructions"),
  lastInspectionDate: timestamp("last_inspection_date"),
  nextInspectionDate: timestamp("next_inspection_date"),
  inspectionFrequencyDays: integer("inspection_frequency_days").default(90), // default quarterly
  reportRecipients: jsonb("report_recipients").$type<{
    ownerEmail: boolean;
    managerEmail: boolean;
    additionalEmails: string[];
  }>().default({ ownerEmail: true, managerEmail: false, additionalEmails: [] }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Maintenance task templates
export const maintenanceTemplates = pgTable("maintenance_templates", {
  id: serial("id").primaryKey(),
  agencyId: integer("agency_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // 'plumbing', 'hvac', 'electrical', 'exterior', 'safety'
  frequency: text("frequency").notNull(), // 'monthly', 'quarterly', 'biannual', 'annual'
  frequencyDays: integer("frequency_days").notNull(), // days between maintenance
  priority: text("priority").notNull(), // 'low', 'medium', 'high', 'critical'
  estimatedDuration: integer("estimated_duration"), // minutes
  instructions: text("instructions"),
  checklistItems: jsonb("checklist_items"), // array of checklist items
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Maintenance tasks (scheduled and completed)
export const maintenanceTasks = pgTable("maintenance_tasks", {
  id: serial("id").primaryKey(),
  agencyId: integer("agency_id").notNull(),
  propertyId: integer("property_id").notNull(),
  templateId: integer("template_id"),
  assignedTo: integer("assigned_to"), // property manager id
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  priority: text("priority").notNull(),
  status: text("status").notNull(), // 'scheduled', 'pending', 'in_progress', 'completed', 'cancelled'
  scheduledDate: timestamp("scheduled_date").notNull(),
  completedDate: timestamp("completed_date"),
  dueDate: timestamp("due_date").notNull(),
  estimatedDuration: integer("estimated_duration"),
  actualDuration: integer("actual_duration"),
  notes: text("notes"),
  checklistItems: jsonb("checklist_items"),
  completionPhotos: jsonb("completion_photos"), // array of photo URLs
  cost: integer("cost"), // in cents
  serviceProviderId: integer("service_provider_id"),
  ownerNotified: boolean("owner_notified").default(false),
  ownerNotificationDate: timestamp("owner_notification_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notification logs for tracking communications
export const notificationLogs = pgTable("notification_logs", {
  id: serial("id").primaryKey(),
  agencyId: integer("agency_id").notNull(),
  recipientId: integer("recipient_id").notNull(), // user id
  type: text("type").notNull(), // 'maintenance_reminder', 'completion_notice', 'overdue_alert'
  channel: text("channel").notNull(), // 'email', 'sms', 'push'
  subject: text("subject"),
  message: text("message").notNull(),
  taskId: integer("task_id"),
  propertyId: integer("property_id"),
  status: text("status").notNull(), // 'sent', 'delivered', 'opened', 'failed'
  sentAt: timestamp("sent_at").defaultNow(),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
});

// Service providers / Contractors for maintenance work
export const serviceProviders = pgTable("service_providers", {
  id: serial("id").primaryKey(),
  agencyId: integer("agency_id").notNull(),
  propertyId: integer("property_id"), // optional: if null, available for all properties in agency
  name: text("name").notNull(),
  contactName: text("contact_name"), // contact person name
  email: text("email"),
  phone: text("phone").notNull(),
  tradeCategory: text("trade_category").notNull(), // 'plumbing', 'electrical', 'hvac', 'gas', 'roofing', 'pest_control', 'fire_safety', 'general'
  specialties: jsonb("specialties"), // array of specific specialties within the trade
  licenseNumber: text("license_number"), // trade license number
  notes: text("notes"), // additional notes about the contractor
  rating: integer("rating"), // 1-5 stars
  isPreferred: boolean("is_preferred").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Property rooms for detailed inspection management
export const propertyRooms = pgTable("property_rooms", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  roomName: text("room_name").notNull(),
  roomType: text("room_type").notNull(), // 'bedroom', 'bathroom', 'kitchen', 'living_room', 'laundry', 'garage', 'exterior', 'roof', 'basement'
  floor: integer("floor").default(1),
  description: text("description"),
  materialType: text("material_type"), // For roof: 'tile', 'metal', for other rooms: null
  lastInspectionDate: timestamp("last_inspection_date"),
  nextInspectionDate: timestamp("next_inspection_date"),
  inspectionFrequencyDays: integer("inspection_frequency_days").default(90), // default quarterly
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Inspection items for each room
export const inspectionItems = pgTable("inspection_items", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  inspectionPeriodId: integer("inspection_period_id").references(() => inspectionPeriods.id, { onDelete: 'set null' }),
  category: text("category").notNull(), // 'plumbing', 'electrical', 'structural', 'hvac', 'fixtures', 'general', 'pest_control'
  itemName: text("item_name").notNull(),
  description: text("description"),
  frequency: text("frequency").notNull(), // 'monthly', 'quarterly', 'biannual', 'annual'
  priority: text("priority").notNull(), // 'low', 'medium', 'high', 'critical'
  checklistPoints: jsonb("checklist_points"), // array of specific things to check
  complianceStandard: text("compliance_standard"), // e.g., 'AS 3500 - 5 year flexi hose replacement', 'AS 3786 - 10 year smoke detector'
  complianceYears: real("compliance_years"), // e.g., 5 for flexi hoses, 10 for smoke detectors, 0.5 for 6-month RCD testing
  photoRequired: boolean("photo_required").default(false), // requires photo evidence
  photoUrl: text("photo_url"), // URL to inspection photo
  lastReplacementDate: timestamp("last_replacement_date"), // when item was last replaced
  nextReplacementDue: timestamp("next_replacement_due"), // calculated based on complianceYears
  isCompleted: boolean("is_completed").default(false),
  completedDate: timestamp("completed_date"),
  condition: text("condition"), // 'good', 'average', 'poor' - visual condition rating
  notes: text("notes"), // inspection notes for potential issues
  lastInspectedDate: timestamp("last_inspected_date"), // when item was last visually inspected
  nextInspectionDate: timestamp("next_inspection_date"), // when next visual inspection is due
  inspectionIntervalMonths: integer("inspection_interval_months"), // interval in months (from visual inspection interval)
  visualInspectionInterval: text("visual_inspection_interval"), // original interval string from spreadsheet (e.g., "12 months", "Monthly")
  professionalServiceInterval: text("professional_service_interval"), // professional service interval from spreadsheet
  legalRequirement: text("legal_requirement"), // legal requirement from spreadsheet
  isNotApplicable: boolean("is_not_applicable").default(false), // marked as N/A (e.g., no gas = gas inspection N/A)
  notApplicableReason: text("not_applicable_reason"), // optional reason why N/A
  // Trade assignment - links technical items to specific contractors
  tradeCategory: text("trade_category"), // 'plumbing', 'electrical', 'hvac', 'gas', etc. - for filtering contractors
  assignedContractorId: integer("assigned_contractor_id"), // reference to service_providers - who to call for this item
  contractorNotes: text("contractor_notes"), // specific notes for the contractor (e.g., "PTR valve is at cylinder not outlets")
  
  // Inspection type - visual (anyone can check) vs professional (requires licensed trade)
  inspectionType: text("inspection_type").default('visual'), // 'visual' or 'professional'
  
  // Certificate linkage - only applies to professional inspection items
  linkedCertificateId: integer("linked_certificate_id"), // reference to compliance_certificates
  certificateExpiryDate: timestamp("certificate_expiry_date"), // cached expiry date for quick filtering
  certificateCoveredAt: timestamp("certificate_covered_at"), // when certificate coverage was applied
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Inspection item snapshots - tracks history of condition/issues over time
export const inspectionItemSnapshots = pgTable("inspection_item_snapshots", {
  id: serial("id").primaryKey(),
  inspectionItemId: integer("inspection_item_id").notNull().references(() => inspectionItems.id, { onDelete: 'cascade' }),
  inspectedById: integer("inspected_by_id").notNull(), // user who performed inspection
  inspectedAt: timestamp("inspected_at").notNull().defaultNow(),
  condition: text("condition"), // 'good', 'average', 'poor'
  issueDescription: text("issue_description"), // detailed description of any issues found
  photoUrl: text("photo_url"), // photo evidence at time of inspection
  notes: text("notes"), // any additional notes
  // Deterioration tracking
  deteriorationSeverity: text("deterioration_severity"), // 'none', 'minor', 'moderate', 'severe'
  previousCondition: text("previous_condition"), // condition from previous snapshot for comparison
  // Context
  inspectionPeriodId: integer("inspection_period_id"), // links to inspection period if applicable
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity logs for audit trail
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  agencyId: integer("agency_id").notNull(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(), // 'created', 'updated', 'completed', 'cancelled'
  entityType: text("entity_type").notNull(), // 'property', 'task', 'notification'
  entityId: integer("entity_id").notNull(),
  details: jsonb("details"), // additional context
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Property templates for quick setup
export const PROPERTY_TEMPLATE_TYPES = ['residential_house', 'apartment', 'townhouse', 'commercial', 'custom'] as const;
export type PropertyTemplateType = typeof PROPERTY_TEMPLATE_TYPES[number];

export const propertyTemplates = pgTable("property_templates", {
  id: serial("id").primaryKey(),
  agencyId: integer("agency_id"), // null for system templates
  name: text("name").notNull(),
  description: text("description"),
  templateType: text("template_type").notNull(), // 'residential_house', 'apartment', 'commercial', 'custom'
  propertyType: text("property_type").notNull(), // matches property propertyType
  isSystem: boolean("is_system").default(false), // system templates can't be edited
  rooms: jsonb("rooms").$type<{
    roomName: string;
    roomType: string;
    inspectionItems: {
      itemName: string;
      category: string;
      priority: string;
      inspectionType: string;
      complianceStandard?: string;
      photoRequired?: boolean;
      tradeCategory?: string;
    }[];
  }[]>().notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export const insertAgencySchema = createInsertSchema(agencies).omit({
  id: true,
  createdAt: true,
});

// Address validation helper - checks for basic address structure
const addressSchema = z.string()
  .min(10, "Address must be at least 10 characters")
  .max(500, "Address is too long")
  .refine(
    (addr) => /\d+/.test(addr),
    { message: "Address should include a street number" }
  )
  .refine(
    (addr) => addr.trim().split(/[\s,]+/).length >= 3,
    { message: "Please provide a complete address (e.g., 123 Main St, City, State)" }
  );

// Phone number validation - flexible for international formats
const phoneSchema = z.string()
  .min(8, "Phone number is too short")
  .max(20, "Phone number is too long")
  .refine(
    (phone) => /^[+]?[\d\s\-().]+$/.test(phone),
    { message: "Phone number contains invalid characters" }
  )
  .refine(
    (phone) => phone.replace(/\D/g, '').length >= 8,
    { message: "Phone number must have at least 8 digits" }
  )
  .optional()
  .nullable();

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
}).extend({
  // Address validation
  address: addressSchema,
  // Transform ISO date strings to Date objects
  lastInspectionDate: z.union([z.date(), z.string().transform((str) => str ? new Date(str) : null), z.null()]).optional(),
  nextInspectionDate: z.union([z.date(), z.string().transform((str) => str ? new Date(str) : null), z.null()]).optional(),
  // Report recipients validation with normalization
  reportRecipients: z.object({
    ownerEmail: z.boolean(),
    managerEmail: z.boolean(),
    additionalEmails: z.array(z.string().email("Invalid email address"))
  }).transform((data) => ({
    ownerEmail: data.ownerEmail,
    managerEmail: data.managerEmail,
    // Normalize and deduplicate additional emails
    additionalEmails: Array.from(new Set(
      data.additionalEmails.map(email => email.trim().toLowerCase())
    ))
  })).refine(
    (data) => data.ownerEmail || data.managerEmail || data.additionalEmails.length > 0,
    { message: "At least one email recipient is required" }
  ).optional(),
});

export const insertMaintenanceTemplateSchema = createInsertSchema(maintenanceTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertMaintenanceTaskSchema = createInsertSchema(maintenanceTasks).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationLogSchema = createInsertSchema(notificationLogs).omit({
  id: true,
  sentAt: true,
});

export const insertServiceProviderSchema = createInsertSchema(serviceProviders).omit({
  id: true,
  createdAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export const insertPropertyTemplateSchema = createInsertSchema(propertyTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertPropertyRoomSchema = createInsertSchema(propertyRooms).omit({
  id: true,
  createdAt: true,
}).extend({
  // Transform ISO date strings to Date objects
  lastInspectionDate: z.union([z.date(), z.string().transform((str) => str ? new Date(str) : null), z.null()]).optional(),
  nextInspectionDate: z.union([z.date(), z.string().transform((str) => str ? new Date(str) : null), z.null()]).optional(),
});

const dateOrString = z.union([z.date(), z.string().transform((str) => str ? new Date(str) : null), z.null()]).optional();

export const insertInspectionItemSchema = createInsertSchema(inspectionItems).omit({
  id: true,
  createdAt: true,
}).extend({
  completedDate: dateOrString,
  lastInspectedDate: dateOrString,
  nextInspectionDate: dateOrString,
  lastReplacementDate: dateOrString,
  nextReplacementDue: dateOrString,
  certificateExpiryDate: dateOrString,
  certificateCoveredAt: dateOrString,
});

export const insertInspectionItemSnapshotSchema = createInsertSchema(inspectionItemSnapshots).omit({
  id: true,
  createdAt: true,
}).extend({
  inspectedAt: z.union([z.date(), z.string().transform((str) => str ? new Date(str) : null), z.null()]).optional(),
});

// Inferred types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type Agency = typeof agencies.$inferSelect;
export type InsertAgency = z.infer<typeof insertAgencySchema>;
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type MaintenanceTemplate = typeof maintenanceTemplates.$inferSelect;
export type InsertMaintenanceTemplate = z.infer<typeof insertMaintenanceTemplateSchema>;
export type MaintenanceTask = typeof maintenanceTasks.$inferSelect;
export type InsertMaintenanceTask = z.infer<typeof insertMaintenanceTaskSchema>;
export type NotificationLog = typeof notificationLogs.$inferSelect;
export type InsertNotificationLog = z.infer<typeof insertNotificationLogSchema>;
export type ServiceProvider = typeof serviceProviders.$inferSelect;
export type InsertServiceProvider = z.infer<typeof insertServiceProviderSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type PropertyTemplate = typeof propertyTemplates.$inferSelect;
export type InsertPropertyTemplate = z.infer<typeof insertPropertyTemplateSchema>;
export type PropertyRoom = typeof propertyRooms.$inferSelect;
export type InsertPropertyRoom = z.infer<typeof insertPropertyRoomSchema>;
export type InspectionItem = typeof inspectionItems.$inferSelect;
export type InsertInspectionItem = z.infer<typeof insertInspectionItemSchema>;
export type InspectionItemSnapshot = typeof inspectionItemSnapshots.$inferSelect;
export type InsertInspectionItemSnapshot = z.infer<typeof insertInspectionItemSnapshotSchema>;

// Inspection Periods for tracking periodic inspections (quarterly, monthly, etc.)
export const inspectionPeriods = pgTable("inspection_periods", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  periodName: text("period_name").notNull(), // "March 2025", "Q1 2025", etc.
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  frequency: text("frequency").notNull(), // 'monthly', 'quarterly', 'biannual', 'annual'
  status: text("status").notNull().default('pending'), // 'pending', 'in_progress', 'completed', 'overdue'
  completionDate: timestamp("completion_date"),
  completedAt: timestamp("completed_at"), // when user marked as complete (may differ from completionDate)
  completionPercentage: real("completion_percentage"), // percentage at time of completion
  completedBy: integer("completed_by"), // user who completed the inspection
  totalItems: integer("total_items").default(0),
  completedItems: integer("completed_items").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Inspection Reports for completed inspections
export const inspectionReports = pgTable("inspection_reports", {
  id: serial("id").primaryKey(),
  inspectionPeriodId: integer("inspection_period_id").notNull().references(() => inspectionPeriods.id, { onDelete: 'cascade' }),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  reportUrl: text("report_url"), // URL to stored PDF/HTML report
  summaryJson: jsonb("summary_json").$type<{
    totalItems: number;
    completedItems: number;
    completionPercentage: number;
    roomsSummary: Array<{
      roomName: string;
      roomType: string;
      totalItems: number;
      completedItems: number;
      items: Array<{
        itemName: string;
        category: string;
        isCompleted: boolean;
        photoUrl?: string;
        notes?: string;
        complianceStandard?: string;
      }>;
    }>;
    recommendations: string[];
    overallStatus: string;
  }>(),
  recipientsJson: jsonb("recipients_json").$type<{
    sentTo: string[];
    sentAt: string;
    deliveryStatus: Record<string, string>;
  }>(),
  generatedAt: timestamp("generated_at").defaultNow(),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Notification Preferences
export const userNotificationPreferences = pgTable("user_notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  emailOverdueAlerts: boolean("email_overdue_alerts").default(true),
  emailWeeklyDigest: boolean("email_weekly_digest").default(true),
  emailDueSoonAlerts: boolean("email_due_soon_alerts").default(true),
  leadDays: integer("lead_days").default(7), // days before due date to send alerts
  preferredDeliveryTime: text("preferred_delivery_time").default('09:00'), // HH:MM format
  timezone: text("timezone").default('UTC'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Compliance Certificates table
export const complianceCertificates = pgTable("compliance_certificates", {
  id: serial("id").primaryKey(),
  agencyId: integer("agency_id").notNull(),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: 'cascade' }),
  certificateType: text("certificate_type").notNull(), // pool_compliance, gas_inspection, electrical_test_tag, smoke_alarm, etc.
  certificateName: text("certificate_name").notNull(),
  issueDate: timestamp("issue_date").notNull(),
  expiryDate: timestamp("expiry_date").notNull(),
  reminderDays: integer("reminder_days").default(30).notNull(), // Days before expiry to send reminder
  nextInspectionDate: timestamp("next_inspection_date"),
  inspectionFrequencyMonths: integer("inspection_frequency_months").default(12), // How often to re-inspect
  certifyingBody: text("certifying_body"),
  certificateNumber: text("certificate_number"),
  fileUrl: text("file_url"), // URL to uploaded certificate file
  notes: text("notes"),
  status: text("status").default("active").notNull(), // active, expired, pending
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInspectionPeriodSchema = createInsertSchema(inspectionPeriods).omit({
  id: true,
  createdAt: true,
}).extend({
  // Transform ISO date strings to Date objects
  startDate: z.union([z.date(), z.string().transform((str) => new Date(str))]),
  endDate: z.union([z.date(), z.string().transform((str) => new Date(str))]),
  dueDate: z.union([z.date(), z.string().transform((str) => new Date(str))]),
  completionDate: z.union([z.date(), z.string().transform((str) => str ? new Date(str) : null), z.null()]).optional(),
  completedAt: z.union([z.date(), z.string().transform((str) => str ? new Date(str) : null), z.null()]).optional(),
});

export const insertInspectionReportSchema = createInsertSchema(inspectionReports).omit({
  id: true,
  createdAt: true,
  generatedAt: true,
}).extend({
  sentAt: z.union([z.date(), z.string().transform((str) => str ? new Date(str) : null), z.null()]).optional(),
});

export const insertUserNotificationPreferencesSchema = createInsertSchema(userNotificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertComplianceCertificateSchema = createInsertSchema(complianceCertificates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Transform ISO date strings to Date objects - these are required
  issueDate: z.union([z.date(), z.string().transform((str) => new Date(str))]),
  expiryDate: z.union([z.date(), z.string().transform((str) => new Date(str))]),
  nextInspectionDate: z.union([z.date(), z.string().transform((str) => str ? new Date(str) : null), z.null()]).optional(),
}).refine(
  (data) => {
    const issueDate = data.issueDate instanceof Date ? data.issueDate : new Date(data.issueDate);
    const expiryDate = data.expiryDate instanceof Date ? data.expiryDate : new Date(data.expiryDate);
    return expiryDate > issueDate;
  },
  { message: "Expiry date must be after the issue date", path: ["expiryDate"] }
);

export type InspectionPeriod = typeof inspectionPeriods.$inferSelect;
export type InsertInspectionPeriod = z.infer<typeof insertInspectionPeriodSchema>;
export type InspectionReport = typeof inspectionReports.$inferSelect;
export type InsertInspectionReport = z.infer<typeof insertInspectionReportSchema>;
export type UserNotificationPreferences = typeof userNotificationPreferences.$inferSelect;
export type InsertUserNotificationPreferences = z.infer<typeof insertUserNotificationPreferencesSchema>;
export type ComplianceCertificate = typeof complianceCertificates.$inferSelect;
export type InsertComplianceCertificate = z.infer<typeof insertComplianceCertificateSchema>;

// Certificate submission status values
// pending - just received, awaiting processing
// processing - AI parsing in progress
// pending_address_review - address match score is in uncertain range (0.85-0.92), needs manual review
// approved - address validated and certificate linked to inspection items
// rejected_address_mismatch - address doesn't match property (match score < 0.85 or city/postcode mismatch)
// rejected_no_address - no address could be extracted from certificate
// rejected - manually rejected by user
export const CERTIFICATE_SUBMISSION_STATUSES = [
  'pending',
  'processing', 
  'pending_address_review',
  'approved',
  'rejected_address_mismatch',
  'rejected_no_address',
  'rejected',
] as const;

export type CertificateSubmissionStatus = typeof CERTIFICATE_SUBMISSION_STATUSES[number];

// Certificate Email Submissions - tracks certificates received via email
export const certificateSubmissions = pgTable("certificate_submissions", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  agencyId: integer("agency_id").notNull(),
  senderEmail: text("sender_email").notNull(),
  senderName: text("sender_name"),
  subject: text("subject"),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
  certificateType: text("certificate_type"), // smoke_alarm, gas, electrical, etc. - can be null if not yet classified
  fileUrl: text("file_url"), // URL to stored attachment
  fileName: text("file_name"),
  fileSize: integer("file_size"), // in bytes
  status: text("status").default("pending").notNull(), // See CERTIFICATE_SUBMISSION_STATUSES
  processedAt: timestamp("processed_at"),
  processedBy: integer("processed_by").references(() => users.id),
  linkedCertificateId: integer("linked_certificate_id").references(() => complianceCertificates.id), // Links to created certificate if processed
  notes: text("notes"),
  // Address validation fields
  extractedAddress: text("extracted_address"), // Address extracted from certificate by AI
  addressMatchScore: real("address_match_score"), // 0.0-1.0 similarity score
  addressComparisonNotes: text("address_comparison_notes"), // Details about the address comparison
});

export const insertCertificateSubmissionSchema = createInsertSchema(certificateSubmissions).omit({
  id: true,
  receivedAt: true,
  processedAt: true,
}).extend({
  receivedAt: z.union([z.date(), z.string().transform((str) => new Date(str))]).optional(),
});

export type CertificateSubmission = typeof certificateSubmissions.$inferSelect;
export type InsertCertificateSubmission = z.infer<typeof insertCertificateSubmissionSchema>;

// User feedback for beta testing
export const userFeedback = pgTable("user_feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  agencyId: integer("agency_id"),
  type: text("type").notNull(), // 'bug', 'suggestion', 'praise'
  message: text("message").notNull(),
  sentiment: text("sentiment"), // 'positive', 'neutral', 'negative'
  pageUrl: text("page_url"),
  userAgent: text("user_agent"),
  status: text("status").default('new'), // 'new', 'reviewed', 'resolved'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserFeedbackSchema = createInsertSchema(userFeedback).omit({
  id: true,
  createdAt: true,
});

export type UserFeedback = typeof userFeedback.$inferSelect;
export type InsertUserFeedback = z.infer<typeof insertUserFeedbackSchema>;

// Email verification tokens - OTP codes sent to verify user email addresses
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  token: text("token").notNull(), // 6-digit OTP
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;

// Certificate verification tokens - for contractor SMS verification
export const certificateVerifications = pgTable("certificate_verifications", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").references(() => certificateSubmissions.id, { onDelete: 'cascade' }),
  contractorId: integer("contractor_id").references(() => serviceProviders.id),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  agencyId: integer("agency_id").notNull(),
  verificationCode: text("verification_code").notNull(), // 6-digit code sent via SMS
  phoneNumber: text("phone_number").notNull(), // Phone number the code was sent to
  certificateType: text("certificate_type").notNull(),
  certificateData: jsonb("certificate_data"), // Stores the form data submitted by contractor
  status: text("status").default("pending").notNull(), // pending, verified, expired, failed
  attemptCount: integer("attempt_count").default(0), // Number of verification attempts
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(), // Verification code expires after 15 minutes
  verifiedAt: timestamp("verified_at"),
});

export const insertCertificateVerificationSchema = createInsertSchema(certificateVerifications).omit({
  id: true,
  createdAt: true,
  verifiedAt: true,
}).extend({
  expiresAt: z.union([z.date(), z.string().transform((str) => new Date(str))]),
});

export type CertificateVerification = typeof certificateVerifications.$inferSelect;
export type InsertCertificateVerification = z.infer<typeof insertCertificateVerificationSchema>;

// Auth schemas
export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const registerSchema = insertUserSchema.omit({ agencyId: true }).extend({
  confirmPassword: z.string().optional(),
});

export const signupSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  userType: z.enum(['agency', 'maintenance_company', 'private']),
  role: z.string(),
  // agencyId intentionally excluded — server always creates a fresh agency on signup
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;
