import bcrypt from "bcrypt";
import {
  users, agencies, properties, maintenanceTemplates, maintenanceTasks,
  notificationLogs, serviceProviders, activityLogs, propertyRooms, inspectionItems,
  inspectionPeriods, complianceCertificates, passwordResetTokens,
  inspectionReports, userNotificationPreferences, userFeedback, certificateSubmissions,
  propertyTemplates, inspectionItemSnapshots,
  PROFESSIONAL_INSPECTION_KEYWORDS,
  type User, type InsertUser, type Agency, type InsertAgency,
  type Property, type InsertProperty, type MaintenanceTemplate, type InsertMaintenanceTemplate,
  type MaintenanceTask, type InsertMaintenanceTask, type NotificationLog, type InsertNotificationLog,
  type ServiceProvider, type InsertServiceProvider, type ActivityLog, type InsertActivityLog,
  type PropertyRoom, type InsertPropertyRoom, type InspectionItem, type InsertInspectionItem,
  type InspectionPeriod, type InsertInspectionPeriod,
  type InspectionReport, type InsertInspectionReport,
  type UserNotificationPreferences, type InsertUserNotificationPreferences,
  type ComplianceCertificate, type InsertComplianceCertificate,
  type PasswordResetToken, type InsertPasswordResetToken,
  type UserFeedback, type InsertUserFeedback,
  type CertificateSubmission, type InsertCertificateSubmission,
  type CertificateVerification, type InsertCertificateVerification,
  type PropertyTemplate, type InsertPropertyTemplate,
  type InspectionItemSnapshot, type InsertInspectionItemSnapshot,
  certificateVerifications
} from "@shared/schema";
import { getCountryCompliance, normalizeRoomType, type ComplianceStandard } from "@shared/compliance-standards";
import { resolveInspectionInterval } from "@shared/inspection-intervals";
import { db, DatabaseUnavailableError } from "./db";
import { eq, and, gte, lte, desc, inArray, count, sum, sql, isNull, isNotNull } from "drizzle-orm";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  getUsersByAgency(agencyId: number): Promise<User[]>;
  getAllUsers(): Promise<User[]>;

  // Password reset tokens
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  findValidResetToken(userId: number, tokenHash: string): Promise<PasswordResetToken | undefined>;
  getAllValidResetTokens(): Promise<PasswordResetToken[]>;
  markTokenAsUsed(tokenId: number): Promise<void>;
  deleteExpiredTokens(): Promise<void>;

  // Agency management
  getAgency(id: number): Promise<Agency | undefined>;
  createAgency(agency: InsertAgency): Promise<Agency>;
  updateAgency(id: number, updates: Partial<Agency>): Promise<Agency | undefined>;
  getAllAgencies(): Promise<Agency[]>;

  // Property management
  getProperty(id: number): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: number, updates: Partial<Property>): Promise<Property | undefined>;
  deleteProperty(id: number): Promise<void>;
  getPropertiesByAgency(agencyId: number): Promise<(Property & { agencyName?: string })[]>;
  getPropertiesByOwner(ownerId: number): Promise<Property[]>;
  getPropertiesByManager(managerId: number): Promise<Property[]>;
  getAllProperties(): Promise<Property[]>;

  // Property templates
  getPropertyTemplate(id: number): Promise<PropertyTemplate | undefined>;
  getPropertyTemplates(agencyId?: number): Promise<PropertyTemplate[]>;
  createPropertyTemplate(template: InsertPropertyTemplate): Promise<PropertyTemplate>;
  createPropertyFromTemplate(templateId: number, propertyData: InsertProperty): Promise<Property>;

  // Maintenance templates
  getMaintenanceTemplate(id: number): Promise<MaintenanceTemplate | undefined>;
  createMaintenanceTemplate(template: InsertMaintenanceTemplate): Promise<MaintenanceTemplate>;
  updateMaintenanceTemplate(id: number, updates: Partial<MaintenanceTemplate>): Promise<MaintenanceTemplate | undefined>;
  getMaintenanceTemplatesByAgency(agencyId: number): Promise<MaintenanceTemplate[]>;

  // Maintenance tasks
  getMaintenanceTask(id: number): Promise<MaintenanceTask | undefined>;
  createMaintenanceTask(task: InsertMaintenanceTask): Promise<MaintenanceTask>;
  updateMaintenanceTask(id: number, updates: Partial<MaintenanceTask>): Promise<MaintenanceTask | undefined>;
  getMaintenanceTasksByAgency(agencyId: number): Promise<MaintenanceTask[]>;
  getMaintenanceTasksByProperty(propertyId: number): Promise<MaintenanceTask[]>;
  getMaintenanceTasksByManager(managerId: number): Promise<MaintenanceTask[]>;
  getUpcomingTasks(agencyId: number, days?: number): Promise<MaintenanceTask[]>;
  getOverdueTasks(agencyId: number): Promise<MaintenanceTask[]>;

  // Notifications
  createNotificationLog(log: InsertNotificationLog): Promise<NotificationLog>;
  getNotificationLogsByAgency(agencyId: number): Promise<NotificationLog[]>;
  getNotificationLogsByRecipient(recipientId: number): Promise<NotificationLog[]>;

  // Service providers / Contractors
  getServiceProvider(id: number): Promise<ServiceProvider | undefined>;
  createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider>;
  updateServiceProvider(id: number, updates: Partial<ServiceProvider>): Promise<ServiceProvider | undefined>;
  deleteServiceProvider(id: number): Promise<void>;
  getServiceProvidersByAgency(agencyId: number): Promise<ServiceProvider[]>;
  getServiceProvidersByProperty(propertyId: number): Promise<ServiceProvider[]>;
  getServiceProvidersByTrade(agencyId: number, tradeCategory: string): Promise<ServiceProvider[]>;
  getContractorsForProperty(propertyId: number, agencyId: number): Promise<ServiceProvider[]>;

  // Activity logs
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogsByAgency(agencyId: number): Promise<ActivityLog[]>;
  getRecentActivity(agencyId: number, limit?: number): Promise<ActivityLog[]>;

  // Property rooms
  getPropertyRooms(propertyId: number): Promise<PropertyRoom[]>;
  getPropertyRoomById(id: number): Promise<PropertyRoom | undefined>;
  createPropertyRoom(room: InsertPropertyRoom): Promise<PropertyRoom>;
  createBulkPropertyRooms(propertyId: number, rooms: Array<{ roomName: string; roomType: string; floor?: number; description?: string }>): Promise<{ rooms: PropertyRoom[]; items: InspectionItem[]; errors?: string[] }>;
  updatePropertyRoom(id: number, updates: Partial<PropertyRoom>): Promise<PropertyRoom | undefined>;
  deletePropertyRoom(id: number): Promise<void>;
  generateStandardItemsForRoom(room: PropertyRoom, countryCode?: string): Promise<void>;
  getRoomCompletionForPeriod(periodId: number): Promise<{ totalRooms: number; completedRooms: number }>;

  // Inspection items
  getInspectionItems(roomId: number): Promise<InspectionItem[]>;
  getInspectionItemById(id: number): Promise<InspectionItem | undefined>;
  getAllInspectionItemsForProperty(propertyId: number): Promise<InspectionItem[]>;
  createInspectionItem(item: InsertInspectionItem): Promise<InspectionItem>;
  updateInspectionItem(id: number, updates: Partial<InspectionItem>): Promise<InspectionItem | undefined>;
  deleteInspectionItem(id: number): Promise<void>;
  bulkCheckInspectionItems(propertyId: number, itemName: string): Promise<InspectionItem[]>;
  createBulkInspectionItems(roomId: number, template: string, floor?: number): Promise<InspectionItem[]>;
  getDueInspectionItemsCount(agencyId: number): Promise<{ dueToday: number; overdue: number; total: number }>;
  auditAndFixInspectionIntervals(): Promise<{ 
    totalItems: number; 
    itemsFixed: number; 
    itemsByCountry: Record<string, { total: number; fixed: number }>;
    errors: string[];
  }>;

  // Inspection item snapshots (history tracking)
  createInspectionItemSnapshot(snapshot: InsertInspectionItemSnapshot): Promise<InspectionItemSnapshot>;
  getInspectionItemSnapshots(inspectionItemId: number): Promise<InspectionItemSnapshot[]>;
  getLatestSnapshot(inspectionItemId: number): Promise<InspectionItemSnapshot | undefined>;

  // Compliance certificates
  getComplianceCertificate(id: number): Promise<ComplianceCertificate | undefined>;
  createComplianceCertificate(certificate: InsertComplianceCertificate): Promise<ComplianceCertificate>;
  updateComplianceCertificate(id: number, updates: Partial<ComplianceCertificate>): Promise<ComplianceCertificate | undefined>;
  deleteComplianceCertificate(id: number): Promise<void>;
  getComplianceCertificatesByAgency(agencyId: number): Promise<ComplianceCertificate[]>;
  getComplianceCertificatesByProperty(propertyId: number): Promise<ComplianceCertificate[]>;
  getExpiringCertificates(agencyId: number, days?: number): Promise<ComplianceCertificate[]>;

  // Certificate email submissions
  getCertificateSubmission(id: number): Promise<CertificateSubmission | undefined>;
  createCertificateSubmission(submission: InsertCertificateSubmission): Promise<CertificateSubmission>;
  updateCertificateSubmission(id: number, updates: Partial<CertificateSubmission>): Promise<CertificateSubmission | undefined>;
  deleteCertificateSubmission(id: number): Promise<void>;
  getCertificateSubmissionsByProperty(propertyId: number): Promise<CertificateSubmission[]>;
  getCertificateSubmissionsByAgency(agencyId: number): Promise<CertificateSubmission[]>;
  getPendingCertificateSubmissions(agencyId: number): Promise<CertificateSubmission[]>;

  // Inspection periods
  getInspectionPeriods(propertyId: number): Promise<InspectionPeriod[]>;
  getInspectionPeriod(id: number): Promise<InspectionPeriod | undefined>;
  getInspectionItemsByPeriod(periodId: number): Promise<InspectionItem[]>;
  createInspectionPeriod(period: InsertInspectionPeriod): Promise<InspectionPeriod>;
  updateInspectionPeriod(id: number, updates: Partial<InspectionPeriod>): Promise<InspectionPeriod | undefined>;
  deleteInspectionPeriod(id: number): Promise<void>;
  getInspectionPeriodsWithCompletion(agencyId: number): Promise<Array<{
    propertyId: number;
    periods: Array<{
      id: number;
      periodName: string;
      startDate: Date;
      endDate: Date;
      dueDate: Date;
      status: string;
      completedItems: number;
      totalItems: number;
      completionRatio: number;
    }>;
  }>>;

  // Property access  
  getPropertyById(propertyId: number): Promise<Property | undefined>;

  // Inspection completion ratios
  getPropertyInspectionRatios(agencyId: number): Promise<{ propertyId: number; completedCount: number; totalCount: number; completionRatio: number; notInspectedCount: number }[]>;
  
  // Portfolio-level compliance aggregation across all properties
  getPortfolioComplianceData(agencyId: number): Promise<{
    totalItems: number;
    completedItems: number;
    overdueItems: number;
    dueSoonItems: number;
    compliantItems: number;
    notApplicableItems: number;
    notInspectedItems: number;
    overallComplianceRate: number;
  }>;

  // Inspection reports
  getInspectionReport(id: number): Promise<InspectionReport | undefined>;
  getInspectionReportByPeriod(periodId: number): Promise<InspectionReport | undefined>;
  createInspectionReport(report: InsertInspectionReport): Promise<InspectionReport>;
  updateInspectionReport(id: number, updates: Partial<InspectionReport>): Promise<InspectionReport | undefined>;

  // User notification preferences
  getUserNotificationPreferences(userId: number): Promise<UserNotificationPreferences | undefined>;
  createUserNotificationPreferences(prefs: InsertUserNotificationPreferences): Promise<UserNotificationPreferences>;
  updateUserNotificationPreferences(userId: number, updates: Partial<UserNotificationPreferences>): Promise<UserNotificationPreferences | undefined>;

  // Complete inspection with report generation
  completeInspectionPeriod(periodId: number, userId: number): Promise<{ period: InspectionPeriod; report: InspectionReport }>;

  // User feedback
  createUserFeedback(feedback: InsertUserFeedback): Promise<UserFeedback>;
  getUserFeedbackByAgency(agencyId: number): Promise<UserFeedback[]>;

  // Certificate verification methods
  createCertificateVerification(verification: InsertCertificateVerification): Promise<CertificateVerification>;
  getCertificateVerification(id: number): Promise<CertificateVerification | undefined>;
  updateCertificateVerification(id: number, updates: Partial<CertificateVerification>): Promise<CertificateVerification | undefined>;

  // Inspection type classification and certificate linkage
  classifyInspectionType(itemName: string, category: string): 'visual' | 'professional';
  backfillInspectionTypes(agencyId: number): Promise<{ updated: number; professional: number; visual: number }>;
  applyCertificateCoverage(certificateId: number, propertyId: number): Promise<{ updated: number; items: number[] }>;
  removeCertificateCoverage(certificateId: number): Promise<{ updated: number }>;
  getItemsCoveredByCertificate(certificateId: number): Promise<InspectionItem[]>;
  getProfessionalItemsForProperty(propertyId: number, category?: string): Promise<InspectionItem[]>;
}

export class DatabaseStorage implements IStorage {
  // Safe non-null database reference - DatabaseStorage is only constructed when db is available
  private get database() {
    if (!db) {
      throw new DatabaseUnavailableError('Database not available');
    }
    return db;
  }

  constructor() {
    this.initializeDatabase();
  }

  private async initializeDatabase() {
    try {
      // Seed database with initial data if empty
      const existingUsers = await this.database.select().from(users).limit(1);
      if (existingUsers.length === 0) {
        await this.seedData();
      }
    } catch (error) {
      console.error('Database initialization error:', error);
    }
  }

  private async seedData() {
    // Seed with super admin user (app owner)
    // IMPORTANT: Default passwords are hashed with bcrypt
    // Change these credentials immediately after first login in production
    const superAdminHashedPassword = await bcrypt.hash("admin123", 10);
    await this.database.insert(users).values({
      username: "superadmin",
      email: "owner@propertymaint.com",
      password: superAdminHashedPassword,
      firstName: "App",
      lastName: "Owner",
      role: "super_admin",
      agencyId: null,
      userType: "agency",
      isActive: true,
    });

    // Seed with demo agency and agency admin user
    const [agency] = await this.database.insert(agencies).values({
      name: "Elite Property Management",
      email: "admin@elitepm.com",
      phone: "+1-555-0123",
      address: "123 Business District, Melbourne VIC 3000",
      website: "https://elitepm.com",
      branding: { primaryColor: "#1976D2", logo: null },
      isActive: true,
    }).returning();

    const adminHashedPassword = await bcrypt.hash("password123", 10);
    await this.database.insert(users).values({
      username: "admin",
      email: "admin@elitepm.com",
      password: adminHashedPassword,
      firstName: "John",
      lastName: "Davidson",
      role: "agency_admin",
      agencyId: agency.id,
      userType: "agency",
      isActive: true,
    });

    // Seed maintenance templates
    await this.database.insert(maintenanceTemplates).values([
      {
        agencyId: agency.id,
        name: "Roof Inspection",
        description: "Quarterly roof and gutter inspection",
        category: "exterior",
        frequency: "quarterly",
        frequencyDays: 90,
        priority: "medium",
        estimatedDuration: 120,
        instructions: "Check roof condition, gutters, and drainage",
        checklistItems: ["Inspect roof tiles", "Check gutters", "Clear debris"],
        isActive: true,
      },
      {
        agencyId: agency.id,
        name: "HVAC Service",
        description: "Bi-annual heating and cooling system maintenance",
        category: "hvac",
        frequency: "biannual",
        frequencyDays: 180,
        priority: "high",
        estimatedDuration: 180,
        instructions: "Service HVAC system, replace filters",
        checklistItems: ["Replace filters", "Check thermostat", "Inspect ducts"],
        isActive: true,
      },
    ]);
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await this.database.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await this.database.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.database.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await this.database.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await this.database.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async getUsersByAgency(agencyId: number): Promise<User[]> {
    return await this.database.select().from(users)
      .where(and(eq(users.agencyId, agencyId), eq(users.isActive, true)));
  }

  async getAllUsers(): Promise<User[]> {
    return await this.database.select().from(users).orderBy(desc(users.createdAt));
  }

  // Password reset token methods
  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [newToken] = await this.database.insert(passwordResetTokens).values(token).returning();
    return newToken;
  }

  async findValidResetToken(userId: number, tokenHash: string): Promise<PasswordResetToken | undefined> {
    const [token] = await this.database.select().from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.userId, userId),
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gte(passwordResetTokens.expiresAt, new Date())
      ));
    return token || undefined;
  }

  async getAllValidResetTokens(): Promise<PasswordResetToken[]> {
    return await this.database.select().from(passwordResetTokens)
      .where(and(
        isNull(passwordResetTokens.usedAt),
        gte(passwordResetTokens.expiresAt, new Date())
      ));
  }

  async markTokenAsUsed(tokenId: number): Promise<void> {
    await this.database.update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, tokenId));
  }

  async deleteExpiredTokens(): Promise<void> {
    await this.database.delete(passwordResetTokens)
      .where(lte(passwordResetTokens.expiresAt, new Date()));
  }

  // Agency methods
  async getAgency(id: number): Promise<Agency | undefined> {
    const [agency] = await this.database.select().from(agencies).where(eq(agencies.id, id));
    return agency || undefined;
  }

  async createAgency(agency: InsertAgency): Promise<Agency> {
    const [newAgency] = await this.database.insert(agencies).values(agency).returning();
    return newAgency;
  }

  async updateAgency(id: number, updates: Partial<Agency>): Promise<Agency | undefined> {
    const [updatedAgency] = await this.database.update(agencies)
      .set(updates)
      .where(eq(agencies.id, id))
      .returning();
    return updatedAgency || undefined;
  }

  async getAllAgencies(): Promise<Agency[]> {
    return await this.database.select().from(agencies).where(eq(agencies.isActive, true));
  }

  // Property methods
  async getProperty(id: number): Promise<Property | undefined> {
    const [property] = await this.database.select().from(properties).where(eq(properties.id, id));
    return property || undefined;
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const [newProperty] = await this.database.insert(properties).values(property).returning();
    return newProperty;
  }

  async updateProperty(id: number, updates: Partial<Property>): Promise<Property | undefined> {
    const [updatedProperty] = await this.database.update(properties)
      .set(updates)
      .where(eq(properties.id, id))
      .returning();
    return updatedProperty || undefined;
  }

  async deleteProperty(id: number): Promise<void> {
    await this.database.update(properties)
      .set({ isActive: false })
      .where(eq(properties.id, id));
  }

  async getPropertiesByAgency(agencyId: number): Promise<(Property & { agencyName?: string })[]> {
    const result = await this.database.select({
      id: properties.id,
      agencyId: properties.agencyId,
      ownerId: properties.ownerId,
      managerId: properties.managerId,
      name: properties.name,
      address: properties.address,
      latitude: properties.latitude,
      longitude: properties.longitude,
      propertyType: properties.propertyType,
      unitNumber: properties.unitNumber,
      bedrooms: properties.bedrooms,
      bathrooms: properties.bathrooms,
      squareFootage: properties.squareFootage,
      yearBuilt: properties.yearBuilt,
      specialInstructions: properties.specialInstructions,
      lastInspectionDate: properties.lastInspectionDate,
      nextInspectionDate: properties.nextInspectionDate,
      inspectionFrequencyDays: properties.inspectionFrequencyDays,
      isActive: properties.isActive,
      createdAt: properties.createdAt,
      agencyName: agencies.name
    }).from(properties)
      .leftJoin(agencies, eq(properties.agencyId, agencies.id))
      .where(and(eq(properties.agencyId, agencyId), eq(properties.isActive, true)));
    
    // Get room-level inspection dates for each property
    const propertiesWithRoomInspections = await Promise.all(
      result.map(async (property) => {
        // Get all rooms for this property
        const rooms = await this.database.select({
          lastInspectionDate: propertyRooms.lastInspectionDate,
          nextInspectionDate: propertyRooms.nextInspectionDate
        }).from(propertyRooms)
          .where(and(eq(propertyRooms.propertyId, property.id), eq(propertyRooms.isActive, true)));
        
        if (rooms.length > 0) {
          // Find the most recent inspection date from all rooms
          const roomLastInspections = rooms
            .map(room => room.lastInspectionDate)
            .filter(date => date !== null)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
            
          // Find the next upcoming inspection date from all rooms
          const roomNextInspections = rooms
            .map(room => room.nextInspectionDate)
            .filter(date => date !== null)
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
          
          return {
            ...property,
            lastInspectionDate: roomLastInspections.length > 0 ? roomLastInspections[0] : property.lastInspectionDate,
            nextInspectionDate: roomNextInspections.length > 0 ? roomNextInspections[0] : property.nextInspectionDate
          };
        }
        
        return property;
      })
    );
    
    return propertiesWithRoomInspections as (Property & { agencyName?: string })[];
  }

  async getPropertiesByOwner(ownerId: number): Promise<Property[]> {
    return await this.database.select().from(properties)
      .where(and(eq(properties.ownerId, ownerId), eq(properties.isActive, true)));
  }

  async getPropertiesByManager(managerId: number): Promise<Property[]> {
    return await this.database.select().from(properties)
      .where(and(eq(properties.managerId, managerId), eq(properties.isActive, true)));
  }

  async getAllProperties(): Promise<Property[]> {
    return await this.database.select().from(properties)
      .where(eq(properties.isActive, true));
  }

  // Property template methods
  async getPropertyTemplate(id: number): Promise<PropertyTemplate | undefined> {
    const [template] = await this.database.select().from(propertyTemplates)
      .where(eq(propertyTemplates.id, id));
    return template || undefined;
  }

  async getPropertyTemplates(agencyId?: number): Promise<PropertyTemplate[]> {
    // Return system templates plus agency-specific templates
    if (agencyId) {
      return await this.database.select().from(propertyTemplates)
        .where(and(
          eq(propertyTemplates.isActive, true),
          sql`(${propertyTemplates.isSystem} = true OR ${propertyTemplates.agencyId} = ${agencyId})`
        ));
    }
    // Just return system templates
    return await this.database.select().from(propertyTemplates)
      .where(and(eq(propertyTemplates.isActive, true), eq(propertyTemplates.isSystem, true)));
  }

  async createPropertyTemplate(template: InsertPropertyTemplate): Promise<PropertyTemplate> {
    const [newTemplate] = await this.database.insert(propertyTemplates).values(template).returning();
    return newTemplate;
  }

  async createPropertyFromTemplate(templateId: number, propertyData: InsertProperty): Promise<Property> {
    const template = await this.getPropertyTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Create the property first
    const property = await this.createProperty(propertyData);

    // Create rooms and inspection items from template
    const templateRooms = template.rooms as Array<{
      roomName: string;
      roomType: string;
      inspectionItems: Array<{
        itemName: string;
        category: string;
        priority: string;
        inspectionType: string;
        complianceStandard?: string;
        photoRequired?: boolean;
        tradeCategory?: string;
      }>;
    }>;

    for (const roomTemplate of templateRooms) {
      // Create the room
      const room = await this.createPropertyRoom({
        propertyId: property.id,
        roomName: roomTemplate.roomName,
        roomType: roomTemplate.roomType,
      });

      // Create inspection items for this room
      for (const itemTemplate of roomTemplate.inspectionItems) {
        await this.createInspectionItem({
          roomId: room.id,
          itemName: itemTemplate.itemName,
          category: itemTemplate.category,
          priority: itemTemplate.priority,
          inspectionType: itemTemplate.inspectionType as 'visual' | 'professional',
          complianceStandard: itemTemplate.complianceStandard,
          photoRequired: itemTemplate.photoRequired,
          tradeCategory: itemTemplate.tradeCategory,
        });
      }
    }

    return property;
  }

  // Maintenance template methods
  async getMaintenanceTemplate(id: number): Promise<MaintenanceTemplate | undefined> {
    const [template] = await this.database.select().from(maintenanceTemplates)
      .where(eq(maintenanceTemplates.id, id));
    return template || undefined;
  }

  async createMaintenanceTemplate(template: InsertMaintenanceTemplate): Promise<MaintenanceTemplate> {
    const [newTemplate] = await this.database.insert(maintenanceTemplates).values(template).returning();
    return newTemplate;
  }

  async updateMaintenanceTemplate(id: number, updates: Partial<MaintenanceTemplate>): Promise<MaintenanceTemplate | undefined> {
    const [updatedTemplate] = await this.database.update(maintenanceTemplates)
      .set(updates)
      .where(eq(maintenanceTemplates.id, id))
      .returning();
    return updatedTemplate || undefined;
  }

  async getMaintenanceTemplatesByAgency(agencyId: number): Promise<MaintenanceTemplate[]> {
    return await this.database.select().from(maintenanceTemplates)
      .where(and(eq(maintenanceTemplates.agencyId, agencyId), eq(maintenanceTemplates.isActive, true)));
  }

  // Maintenance task methods
  async getMaintenanceTask(id: number): Promise<MaintenanceTask | undefined> {
    const [task] = await this.database.select().from(maintenanceTasks)
      .where(eq(maintenanceTasks.id, id));
    return task || undefined;
  }

  async createMaintenanceTask(task: InsertMaintenanceTask): Promise<MaintenanceTask> {
    const [newTask] = await this.database.insert(maintenanceTasks).values(task).returning();
    return newTask;
  }

  async updateMaintenanceTask(id: number, updates: Partial<MaintenanceTask>): Promise<MaintenanceTask | undefined> {
    const [updatedTask] = await this.database.update(maintenanceTasks)
      .set(updates)
      .where(eq(maintenanceTasks.id, id))
      .returning();
    return updatedTask || undefined;
  }

  async getMaintenanceTasksByAgency(agencyId: number): Promise<MaintenanceTask[]> {
    return await this.database.select().from(maintenanceTasks)
      .where(eq(maintenanceTasks.agencyId, agencyId));
  }

  async getMaintenanceTasksByProperty(propertyId: number): Promise<MaintenanceTask[]> {
    return await this.database.select().from(maintenanceTasks)
      .where(eq(maintenanceTasks.propertyId, propertyId));
  }

  async getMaintenanceTasksByManager(managerId: number): Promise<MaintenanceTask[]> {
    return await this.database.select().from(maintenanceTasks)
      .where(eq(maintenanceTasks.assignedTo, managerId));
  }

  async getUpcomingTasks(agencyId: number, days = 30): Promise<MaintenanceTask[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return await this.database.select().from(maintenanceTasks)
      .where(and(
        eq(maintenanceTasks.agencyId, agencyId),
        lte(maintenanceTasks.scheduledDate, futureDate),
        gte(maintenanceTasks.scheduledDate, new Date())
      ))
      .orderBy(maintenanceTasks.scheduledDate);
  }

  async getOverdueTasks(agencyId: number): Promise<MaintenanceTask[]> {
    return await this.database.select().from(maintenanceTasks)
      .where(and(
        eq(maintenanceTasks.agencyId, agencyId),
        lte(maintenanceTasks.dueDate, new Date()),
        eq(maintenanceTasks.status, 'scheduled')
      ));
  }

  // Notification methods
  async createNotificationLog(log: InsertNotificationLog): Promise<NotificationLog> {
    const [newLog] = await this.database.insert(notificationLogs).values(log).returning();
    return newLog;
  }

  async getNotificationLogsByAgency(agencyId: number): Promise<NotificationLog[]> {
    return await this.database.select().from(notificationLogs)
      .where(eq(notificationLogs.agencyId, agencyId))
      .orderBy(desc(notificationLogs.sentAt));
  }

  async getNotificationLogsByRecipient(recipientId: number): Promise<NotificationLog[]> {
    return await this.database.select().from(notificationLogs)
      .where(eq(notificationLogs.recipientId, recipientId))
      .orderBy(desc(notificationLogs.sentAt));
  }

  // Service provider methods
  async getServiceProvider(id: number): Promise<ServiceProvider | undefined> {
    const [provider] = await this.database.select().from(serviceProviders)
      .where(eq(serviceProviders.id, id));
    return provider || undefined;
  }

  async createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider> {
    const [newProvider] = await this.database.insert(serviceProviders).values(provider).returning();
    return newProvider;
  }

  async updateServiceProvider(id: number, updates: Partial<ServiceProvider>): Promise<ServiceProvider | undefined> {
    const [updatedProvider] = await this.database.update(serviceProviders)
      .set(updates)
      .where(eq(serviceProviders.id, id))
      .returning();
    return updatedProvider || undefined;
  }

  async getServiceProvidersByAgency(agencyId: number): Promise<ServiceProvider[]> {
    return await this.database.select().from(serviceProviders)
      .where(and(eq(serviceProviders.agencyId, agencyId), eq(serviceProviders.isActive, true)));
  }

  async deleteServiceProvider(id: number): Promise<void> {
    await this.database.update(serviceProviders)
      .set({ isActive: false })
      .where(eq(serviceProviders.id, id));
  }

  async getServiceProvidersByProperty(propertyId: number): Promise<ServiceProvider[]> {
    return await this.database.select().from(serviceProviders)
      .where(and(
        eq(serviceProviders.propertyId, propertyId),
        eq(serviceProviders.isActive, true)
      ));
  }

  async getServiceProvidersByTrade(agencyId: number, tradeCategory: string): Promise<ServiceProvider[]> {
    return await this.database.select().from(serviceProviders)
      .where(and(
        eq(serviceProviders.agencyId, agencyId),
        eq(serviceProviders.tradeCategory, tradeCategory),
        eq(serviceProviders.isActive, true)
      ));
  }

  async getContractorsForProperty(propertyId: number, agencyId: number): Promise<ServiceProvider[]> {
    // Get contractors that are either specific to this property OR available to all properties in the agency
    return await this.database.select().from(serviceProviders)
      .where(and(
        eq(serviceProviders.agencyId, agencyId),
        eq(serviceProviders.isActive, true),
        sql`(${serviceProviders.propertyId} = ${propertyId} OR ${serviceProviders.propertyId} IS NULL)`
      ));
  }

  // Activity log methods
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await this.database.insert(activityLogs).values(log).returning();
    return newLog;
  }

  async getActivityLogsByAgency(agencyId: number): Promise<ActivityLog[]> {
    return await this.database.select().from(activityLogs)
      .where(eq(activityLogs.agencyId, agencyId))
      .orderBy(desc(activityLogs.createdAt));
  }

  async getRecentActivity(agencyId: number, limit = 10): Promise<ActivityLog[]> {
    return await this.database.select().from(activityLogs)
      .where(eq(activityLogs.agencyId, agencyId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  // Property room methods
  async getPropertyRooms(propertyId: number): Promise<PropertyRoom[]> {
    return await this.database.select().from(propertyRooms)
      .where(and(eq(propertyRooms.propertyId, propertyId), eq(propertyRooms.isActive, true)))
      .orderBy(propertyRooms.roomName);
  }

  async getPropertyRoomById(id: number): Promise<PropertyRoom | undefined> {
    const [room] = await this.database.select().from(propertyRooms)
      .where(and(eq(propertyRooms.id, id), eq(propertyRooms.isActive, true)));
    return room || undefined;
  }

  async createPropertyRoom(room: InsertPropertyRoom): Promise<PropertyRoom> {
    const [newRoom] = await this.database.insert(propertyRooms).values(room).returning();
    return newRoom;
  }

  // Bulk create rooms with their inspection items (atomic transaction)
  async createBulkPropertyRooms(
    propertyId: number,
    rooms: Array<{
      roomName: string;
      roomType: string;
      floor?: number;
      description?: string;
      inspectionItems?: Array<{
        itemName: string;
        category: string;
        priority?: string;
        inspectionType?: 'visual' | 'professional';
        complianceStandard?: string;
        photoRequired?: boolean;
        tradeCategory?: string;
      }>;
    }>
  ): Promise<{ rooms: PropertyRoom[]; items: InspectionItem[]; errors: string[] }> {
    const createdRooms: PropertyRoom[] = [];
    const createdItems: InspectionItem[] = [];
    const errors: string[] = [];
    
    // Validate all rooms and items before starting transaction
    for (let i = 0; i < rooms.length; i++) {
      const roomData = rooms[i];
      if (!roomData.roomName || roomData.roomName.trim().length === 0) {
        errors.push(`Room ${i + 1}: roomName is required`);
      }
      if (!roomData.roomType || roomData.roomType.trim().length === 0) {
        errors.push(`Room ${i + 1}: roomType is required`);
      }
      if (roomData.inspectionItems) {
        for (let j = 0; j < roomData.inspectionItems.length; j++) {
          const item = roomData.inspectionItems[j];
          if (!item.itemName || item.itemName.trim().length === 0) {
            errors.push(`Room ${i + 1}, Item ${j + 1}: itemName is required`);
          }
          if (!item.category || item.category.trim().length === 0) {
            errors.push(`Room ${i + 1}, Item ${j + 1}: category is required`);
          }
        }
      }
    }
    
    if (errors.length > 0) {
      return { rooms: [], items: [], errors };
    }
    
    // Get existing rooms to handle duplicate names
    const existingRooms = await this.getPropertyRooms(propertyId);
    const existingNames = new Set(existingRooms.map(r => r.roomName));
    
    // Use transaction for atomic creation
    try {
      await this.database.transaction(async (tx) => {
        for (const roomData of rooms) {
          // Handle duplicate room names
          let finalName = roomData.roomName.trim();
          let counter = 1;
          while (existingNames.has(finalName)) {
            finalName = `${roomData.roomName.trim()} ${counter}`;
            counter++;
          }
          existingNames.add(finalName);
          
          // Create the room
          const [newRoom] = await tx.insert(propertyRooms).values({
            propertyId,
            roomName: finalName,
            roomType: roomData.roomType.trim(),
            floor: roomData.floor ?? 1,
            description: roomData.description?.trim(),
          }).returning();
          
          createdRooms.push(newRoom);
          
          // Create inspection items for this room
          if (roomData.inspectionItems && roomData.inspectionItems.length > 0) {
            for (const itemData of roomData.inspectionItems) {
              const inspectionType = itemData.inspectionType || 
                this.classifyInspectionType(itemData.itemName, itemData.category);
              
              const [newItem] = await tx.insert(inspectionItems).values({
                roomId: newRoom.id,
                itemName: itemData.itemName.trim(),
                category: itemData.category.trim(),
                priority: itemData.priority || 'medium',
                inspectionType,
                complianceStandard: itemData.complianceStandard?.trim(),
                photoRequired: itemData.photoRequired ?? false,
                tradeCategory: itemData.tradeCategory?.trim(),
              }).returning();
              
              createdItems.push(newItem);
            }
          }
        }
      });
    } catch (txError) {
      console.error('Bulk room creation transaction failed:', txError);
      throw new Error('Failed to create rooms - transaction rolled back');
    }
    
    return { rooms: createdRooms, items: createdItems, errors: [] };
  }

  async updatePropertyRoom(id: number, updates: Partial<PropertyRoom>): Promise<PropertyRoom | undefined> {
    const [updatedRoom] = await this.database.update(propertyRooms)
      .set(updates)
      .where(eq(propertyRooms.id, id))
      .returning();
    return updatedRoom || undefined;
  }

  async deletePropertyRoom(id: number): Promise<void> {
    await this.database.update(propertyRooms)
      .set({ isActive: false })
      .where(eq(propertyRooms.id, id));
  }

  // Inspection item methods
  async getInspectionItems(roomId: number): Promise<InspectionItem[]> {
    return await this.database.select().from(inspectionItems)
      .where(and(eq(inspectionItems.roomId, roomId), eq(inspectionItems.isActive, true)))
      .orderBy(inspectionItems.category, inspectionItems.itemName);
  }

  async getInspectionItemById(id: number): Promise<InspectionItem | undefined> {
    const [item] = await this.database.select().from(inspectionItems)
      .where(and(eq(inspectionItems.id, id), eq(inspectionItems.isActive, true)));
    return item || undefined;
  }

  async getAllInspectionItemsForProperty(propertyId: number): Promise<InspectionItem[]> {
    return await this.database.select({
      id: inspectionItems.id,
      roomId: inspectionItems.roomId,
      inspectionPeriodId: inspectionItems.inspectionPeriodId,
      category: inspectionItems.category,
      itemName: inspectionItems.itemName,
      description: inspectionItems.description,
      frequency: inspectionItems.frequency,
      priority: inspectionItems.priority,
      checklistPoints: inspectionItems.checklistPoints,
      isCompleted: inspectionItems.isCompleted,
      completedDate: inspectionItems.completedDate,
      condition: inspectionItems.condition,
      notes: inspectionItems.notes,
      photoUrl: inspectionItems.photoUrl,
      photoRequired: inspectionItems.photoRequired,
      complianceStandard: inspectionItems.complianceStandard,
      complianceYears: inspectionItems.complianceYears,
      lastReplacementDate: inspectionItems.lastReplacementDate,
      nextReplacementDue: inspectionItems.nextReplacementDue,
      lastInspectedDate: inspectionItems.lastInspectedDate,
      nextInspectionDate: inspectionItems.nextInspectionDate,
      inspectionIntervalMonths: inspectionItems.inspectionIntervalMonths,
      visualInspectionInterval: inspectionItems.visualInspectionInterval,
      professionalServiceInterval: inspectionItems.professionalServiceInterval,
      legalRequirement: inspectionItems.legalRequirement,
      inspectionType: inspectionItems.inspectionType,
      isNotApplicable: inspectionItems.isNotApplicable,
      notApplicableReason: inspectionItems.notApplicableReason,
      tradeCategory: inspectionItems.tradeCategory,
      assignedContractorId: inspectionItems.assignedContractorId,
      contractorNotes: inspectionItems.contractorNotes,
      linkedCertificateId: inspectionItems.linkedCertificateId,
      certificateExpiryDate: inspectionItems.certificateExpiryDate,
      certificateCoveredAt: inspectionItems.certificateCoveredAt,
      isActive: inspectionItems.isActive,
      createdAt: inspectionItems.createdAt,
    })
    .from(inspectionItems)
    .leftJoin(propertyRooms, eq(inspectionItems.roomId, propertyRooms.id))
    .where(and(
      eq(propertyRooms.propertyId, propertyId),
      eq(inspectionItems.isActive, true),
      eq(propertyRooms.isActive, true)
    ))
    .orderBy(inspectionItems.roomId, inspectionItems.category, inspectionItems.itemName);
  }

  async createInspectionItem(item: InsertInspectionItem): Promise<InspectionItem> {
    // If interval data is not already set, resolve it based on property country
    if (!item.inspectionIntervalMonths || !item.visualInspectionInterval) {
      // Get the room to find the property
      const room = await this.getPropertyRoomById(item.roomId);
      if (room) {
        const property = await this.getProperty(room.propertyId);
        if (property) {
          const countryCode = property.country || 'AU';
          const intervalData = resolveInspectionInterval(countryCode, item.itemName);
          
          // Apply interval data
          item = {
            ...item,
            inspectionIntervalMonths: item.inspectionIntervalMonths || intervalData.intervalMonths,
            visualInspectionInterval: item.visualInspectionInterval || intervalData.visualInspectionInterval,
            professionalServiceInterval: item.professionalServiceInterval || intervalData.professionalServiceInterval,
            legalRequirement: item.legalRequirement || intervalData.legalRequirement,
          };
        }
      }
    }
    
    // Ensure frequency is set (required field)
    if (!item.frequency) {
      const months = item.inspectionIntervalMonths || 12;
      if (months <= 1) item.frequency = 'monthly';
      else if (months <= 3) item.frequency = 'quarterly';
      else if (months <= 6) item.frequency = 'biannual';
      else item.frequency = 'annual';
    }
    
    // Ensure priority is set (required field)
    if (!item.priority) {
      item.priority = 'medium';
    }
    
    const [newItem] = await this.database.insert(inspectionItems).values(item).returning();
    return newItem;
  }

  async updateInspectionItem(id: number, updates: Partial<InspectionItem>): Promise<InspectionItem | undefined> {
    const [updatedItem] = await this.database.update(inspectionItems)
      .set(updates)
      .where(eq(inspectionItems.id, id))
      .returning();
    
    // If lastInspectedDate was updated, sync the room's lastInspectionDate
    if (updatedItem && updates.lastInspectedDate !== undefined) {
      await this.syncRoomInspectionDate(updatedItem.roomId);
    }
    
    return updatedItem || undefined;
  }
  
  // Helper to sync room's lastInspectionDate with the max of its items' lastInspectedDate
  async syncRoomInspectionDate(roomId: number): Promise<void> {
    // Get all inspection items for this room with their lastInspectedDate
    const roomItems = await this.database.select({
      lastInspectedDate: inspectionItems.lastInspectedDate,
    })
    .from(inspectionItems)
    .where(and(
      eq(inspectionItems.roomId, roomId),
      eq(inspectionItems.isActive, true),
      isNotNull(inspectionItems.lastInspectedDate)
    ));
    
    if (roomItems.length > 0) {
      // Find the most recent lastInspectedDate
      const mostRecent = roomItems
        .map(item => item.lastInspectedDate)
        .filter(date => date !== null)
        .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];
      
      if (mostRecent) {
        // Update the room's lastInspectionDate
        await this.database.update(propertyRooms)
          .set({ lastInspectionDate: mostRecent })
          .where(eq(propertyRooms.id, roomId));
      }
    }
  }

  async deleteInspectionItem(id: number): Promise<void> {
    await this.database.update(inspectionItems)
      .set({ isActive: false })
      .where(eq(inspectionItems.id, id));
  }

  // Inspection item snapshots (history tracking)
  async createInspectionItemSnapshot(snapshot: InsertInspectionItemSnapshot): Promise<InspectionItemSnapshot> {
    const [newSnapshot] = await this.database.insert(inspectionItemSnapshots).values(snapshot).returning();
    return newSnapshot;
  }

  async getInspectionItemSnapshots(inspectionItemId: number): Promise<InspectionItemSnapshot[]> {
    return await this.database.select().from(inspectionItemSnapshots)
      .where(eq(inspectionItemSnapshots.inspectionItemId, inspectionItemId))
      .orderBy(desc(inspectionItemSnapshots.inspectedAt));
  }

  async getLatestSnapshot(inspectionItemId: number): Promise<InspectionItemSnapshot | undefined> {
    const [snapshot] = await this.database.select().from(inspectionItemSnapshots)
      .where(eq(inspectionItemSnapshots.inspectionItemId, inspectionItemId))
      .orderBy(desc(inspectionItemSnapshots.inspectedAt))
      .limit(1);
    return snapshot || undefined;
  }

  async getDueInspectionItemsCount(agencyId: number): Promise<{ dueToday: number; overdue: number; total: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const agencyProperties = await this.getPropertiesByAgency(agencyId);
    const propertyIds = agencyProperties.map(p => p.id);

    if (propertyIds.length === 0) {
      return { dueToday: 0, overdue: 0, total: 0 };
    }

    const overduePropertyIds = new Set(
      agencyProperties
        .filter(p => p.nextInspectionDate && new Date(p.nextInspectionDate) < today)
        .map(p => p.id)
    );

    const rooms = await this.database.select()
      .from(propertyRooms)
      .where(and(
        inArray(propertyRooms.propertyId, propertyIds),
        eq(propertyRooms.isActive, true)
      ));

    if (rooms.length === 0) {
      return { dueToday: 0, overdue: 0, total: 0 };
    }

    const roomToPropertyMap = new Map(rooms.map(r => [r.id, r.propertyId]));
    const roomIds = rooms.map(r => r.id);

    const items = await this.database.select({
      roomId: inspectionItems.roomId,
      nextInspectionDate: inspectionItems.nextInspectionDate,
      lastInspectedDate: inspectionItems.lastInspectedDate,
      isNotApplicable: inspectionItems.isNotApplicable,
      isCompleted: inspectionItems.isCompleted,
    })
      .from(inspectionItems)
      .where(and(
        inArray(inspectionItems.roomId, roomIds),
        eq(inspectionItems.isActive, true)
      ));

    let dueToday = 0;
    let overdue = 0;

    for (const item of items) {
      if (item.isNotApplicable) continue;

      const propertyId = roomToPropertyMap.get(item.roomId);
      const propertyIsOverdue = propertyId ? overduePropertyIds.has(propertyId) : false;

      if (item.nextInspectionDate) {
        const dueDate = new Date(item.nextInspectionDate);
        dueDate.setHours(0, 0, 0, 0);

        if (dueDate.getTime() === today.getTime()) {
          dueToday++;
          continue;
        } else if (dueDate < today) {
          overdue++;
          continue;
        }
      }

      if (propertyIsOverdue && !item.isCompleted) {
        const prop = agencyProperties.find(p => p.id === propertyId);
        const propNextDate = prop?.nextInspectionDate ? new Date(prop.nextInspectionDate) : null;
        if (propNextDate) {
          const lastInsp = item.lastInspectedDate ? new Date(item.lastInspectedDate) : null;
          if (!lastInsp || lastInsp < propNextDate) {
            overdue++;
          }
        }
      }
    }

    return { dueToday, overdue, total: dueToday + overdue };
  }

  async auditAndFixInspectionIntervals(): Promise<{ 
    totalItems: number; 
    itemsFixed: number; 
    itemsByCountry: Record<string, { total: number; fixed: number }>;
    errors: string[];
  }> {
    console.log("🔍 Starting inspection interval audit...");
    const errors: string[] = [];
    const itemsByCountry: Record<string, { total: number; fixed: number }> = {};
    let totalItems = 0;
    let itemsFixed = 0;

    try {
      // Get all active inspection items with their room and property info
      const allItems = await this.database
        .select({
          item: inspectionItems,
          room: propertyRooms,
          property: properties,
        })
        .from(inspectionItems)
        .innerJoin(propertyRooms, eq(inspectionItems.roomId, propertyRooms.id))
        .innerJoin(properties, eq(propertyRooms.propertyId, properties.id))
        .where(eq(inspectionItems.isActive, true));

      console.log(`📋 Found ${allItems.length} active inspection items to audit`);
      totalItems = allItems.length;

      // Group items by country for reporting
      const itemsByCountryList = new Map<string, typeof allItems>();
      for (const row of allItems) {
        const country = row.property.country || 'AU'; // Default to AU if no country
        if (!itemsByCountryList.has(country)) {
          itemsByCountryList.set(country, []);
        }
        itemsByCountryList.get(country)!.push(row);
      }

      // Process each country's items
      for (const [country, countryItems] of itemsByCountryList) {
        console.log(`\n🌍 Processing ${countryItems.length} items for ${country}...`);
        itemsByCountry[country] = { total: countryItems.length, fixed: 0 };

        for (const { item, property } of countryItems) {
          try {
            // Get the correct interval for this item based on country
            const intervalData = resolveInspectionInterval(country, item.itemName);
            
            // Check if interval needs to be updated
            const needsUpdate = 
              item.inspectionIntervalMonths !== intervalData.intervalMonths ||
              item.visualInspectionInterval !== intervalData.visualInspectionInterval ||
              (intervalData.professionalServiceInterval && item.professionalServiceInterval !== intervalData.professionalServiceInterval) ||
              (intervalData.legalRequirement && item.legalRequirement !== intervalData.legalRequirement);

            if (needsUpdate) {
              // Build update object
              const updates: Partial<InspectionItem> = {
                inspectionIntervalMonths: intervalData.intervalMonths,
                visualInspectionInterval: intervalData.visualInspectionInterval,
              };

              if (intervalData.professionalServiceInterval) {
                updates.professionalServiceInterval = intervalData.professionalServiceInterval;
              }

              if (intervalData.legalRequirement) {
                updates.legalRequirement = intervalData.legalRequirement;
              }

              // Recalculate next inspection date if we have a last inspected date
              if (item.lastInspectedDate && intervalData.intervalMonths) {
                const lastDate = new Date(item.lastInspectedDate);
                const nextDate = new Date(lastDate);
                nextDate.setMonth(nextDate.getMonth() + intervalData.intervalMonths);
                updates.nextInspectionDate = nextDate;
              }

              await this.database
                .update(inspectionItems)
                .set(updates)
                .where(eq(inspectionItems.id, item.id));

              itemsFixed++;
              itemsByCountry[country].fixed++;
              
              console.log(`  ✅ Fixed: ${item.itemName} (ID: ${item.id}) - Set to ${intervalData.intervalMonths} months (${intervalData.visualInspectionInterval})`);
            }
          } catch (err) {
            const errorMsg = `Failed to update item ${item.id} (${item.itemName}): ${err instanceof Error ? err.message : 'Unknown error'}`;
            errors.push(errorMsg);
            console.error(`  ❌ ${errorMsg}`);
          }
        }
      }

      console.log(`\n✅ Audit complete: Fixed ${itemsFixed}/${totalItems} items`);
      
    } catch (err) {
      const errorMsg = `Audit failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(errorMsg);
    }

    return { totalItems, itemsFixed, itemsByCountry, errors };
  }

  async bulkCheckInspectionItems(propertyId: number, itemName: string): Promise<InspectionItem[]> {
    const now = new Date();
    
    // Get the property to access its country code
    const property = await this.getProperty(propertyId);
    const countryCode = property?.country || undefined;
    
    // Get all rooms for the property
    const rooms = await this.getPropertyRooms(propertyId);
    
    if (rooms.length === 0) {
      return [];
    }
    
    const allUpdatedItems: InspectionItem[] = [];
    
    // For each room, ensure standard items exist first, then mark the specific item as completed
    for (const room of rooms) {
      // Check if the room has any existing inspection items
      const existingRoomItems = await db
        .select()
        .from(inspectionItems)
        .where(
          and(
            eq(inspectionItems.roomId, room.id),
            eq(inspectionItems.isActive, true)
          )
        );
      
      // If room has no inspection items, auto-generate standard items first
      if (existingRoomItems.length === 0) {
        console.log(`Auto-generating standard items for room ${room.roomName} (${room.roomType}) before bulk check using ${countryCode || 'default'} standards`);
        await this.generateStandardItemsForRoom(room, countryCode);
      }
      
      // Now check if the specific item exists
      const existingSpecificItems = await db
        .select()
        .from(inspectionItems)
        .where(
          and(
            eq(inspectionItems.roomId, room.id),
            eq(inspectionItems.itemName, itemName),
            eq(inspectionItems.isActive, true)
          )
        );
      
      if (existingSpecificItems.length > 0) {
        // Calculate next inspection date based on frequency (default to 90 days if no frequency)
        const item = existingSpecificItems[0];
        const frequencyDays = item.frequency === 'monthly' ? 30 :
                              item.frequency === 'quarterly' ? 90 :
                              item.frequency === 'semi-annual' ? 180 :
                              item.frequency === 'annual' ? 365 : 90;
        const nextInspectionDate = new Date(now.getTime() + frequencyDays * 24 * 60 * 60 * 1000);
        
        // Update existing items with inspection dates
        const updated = await db
          .update(inspectionItems)
          .set({
            isCompleted: true,
            completedDate: now,
            lastInspectedDate: now,
            nextInspectionDate: nextInspectionDate
          })
          .where(
            and(
              eq(inspectionItems.roomId, room.id),
              eq(inspectionItems.itemName, itemName),
              eq(inspectionItems.isActive, true)
            )
          )
          .returning();
        
        allUpdatedItems.push(...updated);
        
        // Sync room's lastInspectionDate after bulk update
        await this.syncRoomInspectionDate(room.id);
      } else {
        // Only create new item if it makes sense for this room type
        if (this.shouldItemApplyToRoomType(itemName, room.roomType)) {
          // Default to quarterly (90 days) for new items
          const nextInspectionDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
          
          const newItem: InsertInspectionItem = {
            roomId: room.id,
            category: 'electrical', // Default category, could be made smarter
            itemName: itemName,
            description: `${itemName} inspection`,
            frequency: 'quarterly',
            priority: 'medium',
            isCompleted: true,
            completedDate: now,
            lastInspectedDate: now,
            nextInspectionDate: nextInspectionDate,
            notes: null,
            checklistPoints: [],
            isActive: true
          };
          
          const created = await this.createInspectionItem(newItem);
          allUpdatedItems.push(created);
          
          // Sync room's lastInspectionDate after creating new item
          await this.syncRoomInspectionDate(room.id);
        }
        // If item doesn't apply to this room type, skip it (don't create or update)
      }
    }
    
    return allUpdatedItems;
  }

  // Helper method to generate standard inspection items for a room
  async generateStandardItemsForRoom(room: PropertyRoom, countryCode?: string): Promise<void> {
    // Use country-specific compliance standards if countryCode is provided
    if (countryCode) {
      const countryCompliance = getCountryCompliance(countryCode);
      if (countryCompliance) {
        console.log(`Using ${countryCompliance.countryName} compliance standards for room ${room.roomName}`);
        
        // Normalize the room type for matching (e.g., master_bedroom → bedroom)
        const normalizedRoomType = normalizeRoomType(room.roomType);
        console.log(`Normalized room type: ${room.roomType} → ${normalizedRoomType}`);
        
        // Filter compliance standards applicable to this room type
        const applicableStandards = countryCompliance.standards.filter(standard => {
          if (!standard.applicableRooms) return true; // Property-level standard
          return standard.applicableRooms.includes(normalizedRoomType);
        });
        
        // Create inspection items from compliance standards
        for (const standard of applicableStandards) {
          // Resolve intervals based on country
          const intervalData = resolveInspectionInterval(countryCode, standard.itemName);
          
          const newItem: InsertInspectionItem = {
            roomId: room.id,
            category: standard.category,
            itemName: standard.itemName,
            description: standard.description || '',
            frequency: standard.frequency,
            priority: standard.priority,
            isCompleted: false,
            completedDate: null,
            notes: null,
            checklistPoints: standard.checklistPoints || [],
            photoRequired: standard.photoRequired,
            complianceStandard: standard.complianceStandard,
            complianceYears: standard.complianceYears,
            lastReplacementDate: null,
            nextReplacementDue: null,
            photoUrl: null,
            isActive: true,
            inspectionIntervalMonths: intervalData.intervalMonths,
            visualInspectionInterval: intervalData.visualInspectionInterval,
            professionalServiceInterval: intervalData.professionalServiceInterval || null,
            legalRequirement: intervalData.legalRequirement || null
          };
          
          await this.createInspectionItem(newItem);
        }
        
        // For exterior/structural rooms, use room-specific items instead of common items
        const exteriorRoomTypes = ['roof', 'gutters', 'pool', 'deck', 'patio', 'balcony', 'garden', 'courtyard', 'roof_terrace', 'outdoor', 'power_box'];
        
        if (exteriorRoomTypes.includes(room.roomType)) {
          // Use room-specific items for exterior rooms (these have the correct structural/outdoor items)
          const roomSpecificItems = this.getStandardInspectionItemsByRoomType(room.roomType);
          console.log(`🏠 Getting room-specific items for exterior room type: ${room.roomType}, found ${roomSpecificItems.length} items`);
          roomSpecificItems.forEach(item => console.log(`  - ${item.itemName}`));
          
          for (const item of roomSpecificItems) {
            // Resolve intervals based on country
            const intervalData = resolveInspectionInterval(countryCode, item.itemName);
            
            const newItem: InsertInspectionItem = {
              roomId: room.id,
              category: item.category,
              itemName: item.itemName,
              description: item.description,
              frequency: 'annual', // Default frequency
              priority: item.priority,
              isCompleted: false,
              completedDate: null,
              notes: null,
              checklistPoints: item.checklistPoints || [],
              photoRequired: item.photoRequired || false,
              complianceStandard: item.complianceStandard || null,
              complianceYears: item.complianceYears || null,
              lastReplacementDate: null,
              nextReplacementDue: null,
              photoUrl: null,
              isActive: true,
              inspectionType: item.inspectionType || 'visual',
              inspectionIntervalMonths: intervalData.intervalMonths,
              visualInspectionInterval: intervalData.visualInspectionInterval,
              professionalServiceInterval: intervalData.professionalServiceInterval || null,
              legalRequirement: intervalData.legalRequirement || null
            };
            
            await this.createInspectionItem(newItem);
          }
        } else {
          // Add common non-compliance items for interior rooms (lights, windows, etc.)
          const commonItems = this.getCommonItemsByRoomType(room.roomType);
          console.log(`🔍 Getting common items for room type: ${room.roomType}, found ${commonItems.length} items`);
          commonItems.forEach(item => console.log(`  - ${item.itemName}`));
          for (const item of commonItems) {
            // Resolve intervals based on country
            const intervalData = resolveInspectionInterval(countryCode, item.itemName);
            
            // Convert interval months to frequency string
            const getFrequencyFromMonths = (months: number): string => {
              if (months <= 1) return 'monthly';
              if (months <= 3) return 'quarterly';
              if (months <= 6) return 'biannual';
              return 'annual';
            };
            
            const newItem: InsertInspectionItem = {
              roomId: room.id,
              category: item.category,
              itemName: item.itemName,
              description: item.description,
              frequency: getFrequencyFromMonths(intervalData.intervalMonths),
              priority: item.priority,
              isCompleted: false,
              completedDate: null,
              notes: null,
              checklistPoints: item.checklistPoints || [],
              photoRequired: item.photoRequired || false,
              complianceStandard: null,
              complianceYears: null,
              lastReplacementDate: null,
              nextReplacementDue: null,
              photoUrl: null,
              isActive: true,
              inspectionIntervalMonths: intervalData.intervalMonths,
              visualInspectionInterval: intervalData.visualInspectionInterval,
              professionalServiceInterval: intervalData.professionalServiceInterval || null,
              legalRequirement: intervalData.legalRequirement || null
            };
            
            await this.createInspectionItem(newItem);
          }
        }
        
        return;
      }
    }
    
    // Fallback to Australian standards if no country code provided
    const standardItems = this.getStandardInspectionItemsByRoomType(room.roomType);
    const defaultCountry = 'AU';
    
    // Create all standard items for this room
    for (const item of standardItems) {
      // Resolve intervals based on default country (AU)
      const intervalData = resolveInspectionInterval(defaultCountry, item.itemName);
      
      const newItem: InsertInspectionItem = {
        roomId: room.id,
        category: item.category,
        itemName: item.itemName,
        description: item.description,
        frequency: 'annual',
        priority: item.priority,
        isCompleted: false,
        completedDate: null,
        notes: null,
        checklistPoints: item.checklistPoints || [],
        photoRequired: item.photoRequired || false,
        complianceStandard: item.complianceStandard || null,
        complianceYears: item.complianceYears || null,
        lastReplacementDate: null,
        nextReplacementDue: null,
        photoUrl: null,
        isActive: true,
        inspectionType: item.inspectionType || 'visual',
        inspectionIntervalMonths: intervalData.intervalMonths,
        visualInspectionInterval: intervalData.visualInspectionInterval,
        professionalServiceInterval: intervalData.professionalServiceInterval || null,
        legalRequirement: intervalData.legalRequirement || null
      };
      
      await this.createInspectionItem(newItem);
    }
  }
  
  // Helper method to get common (non-compliance) inspection items for a room
  getCommonItemsByRoomType(roomType: string): Array<{
    itemName: string;
    category: string;
    description: string;
    priority: string;
    checklistPoints?: string[];
    photoRequired?: boolean;
  }> {
    const commonItems = [
      { itemName: 'Light Switch', category: 'electrical', description: 'Check operation and condition of light switches', priority: 'medium' },
      { itemName: 'Power Points (GPO)', category: 'electrical', description: 'Test and inspect general power outlets', priority: 'medium' },
      { itemName: 'Windows', category: 'windows_doors', description: 'Inspect window condition, operation, locks, and seals', priority: 'medium' },
      { itemName: 'Window Furnishings', category: 'furnishings', description: 'Check condition of curtains, blinds, and window treatments', priority: 'low' }
    ];

    // Define bathroom-specific items once
    const bathroomItems = [
      ...commonItems,
      { 
        itemName: 'Silicone Inspection', 
        category: 'plumbing', 
        description: 'Inspect and replace deteriorated silicone around shower, bath, basin, and toilet', 
        priority: 'high',
        checklistPoints: [
          'Check silicone around shower screen/bath edges for cracks or mould',
          'Inspect basin silicone seal for water damage',
          'Check toilet base silicone for deterioration',
          'Remove and replace any cracked or mouldy silicone',
          'Ensure proper water seal to prevent leaks'
        ],
        photoRequired: true
      },
      { 
        itemName: 'Grout Inspection', 
        category: 'plumbing', 
        description: 'Inspect tile grout condition and repair damaged areas', 
        priority: 'high',
        checklistPoints: [
          'Check all wall and floor tile grout for cracks or missing sections',
          'Identify any water staining indicating leaks',
          'Clean mouldy grout with appropriate cleaner',
          'Re-grout damaged areas to prevent water ingress',
          'Check grout sealer condition in wet areas'
        ],
        photoRequired: true
      },
      { itemName: 'Shower/Bath Tiles', category: 'plumbing', description: 'Check grout and tiles for damage or leaks', priority: 'medium' },
      { itemName: 'Exhaust Fan', category: 'hvac', description: 'Test exhaust fan operation', priority: 'medium' }
    ];

    const roomSpecificCommonItems: { [key: string]: any[] } = {
      'kitchen': [
        ...commonItems,
        { itemName: 'Kitchen Tap & Flexi Hoses', category: 'plumbing', description: 'Inspect kitchen tap operation and flexi hose condition', priority: 'medium' },
        { itemName: 'Dishwasher Connection', category: 'plumbing', description: 'Check dishwasher hoses and connections', priority: 'medium' },
        { itemName: 'Rangehood', category: 'hvac', description: 'Test rangehood operation and check filters', priority: 'medium' }
      ],
      // All bathroom-type rooms get the same inspection items
      'bathroom': bathroomItems,
      'master_ensuite': bathroomItems,
      'main_bathroom': bathroomItems,
      'powder_room': bathroomItems,
      'toilet': bathroomItems,
      'laundry': [
        ...commonItems,
        { itemName: 'Laundry Tap & Flexi Hoses', category: 'plumbing', description: 'Inspect laundry tap operation and flexi hose condition', priority: 'medium' },
        { itemName: 'Dryer Vent', category: 'hvac', description: 'Check dryer vent for blockages', priority: 'medium' }
      ],
      'butler_pantry': [
        { itemName: 'Light Switch', category: 'electrical', description: 'Check operation and condition of light switches', priority: 'medium' },
        { itemName: 'Power Points (GPO)', category: 'electrical', description: 'Test and inspect general power outlets', priority: 'medium' },
        { itemName: 'Sink Tap & Flexi Hoses', category: 'plumbing', description: 'Inspect sink tap operation and flexi hose condition', priority: 'medium' },
        { itemName: 'Dishwasher Connection', category: 'plumbing', description: 'Check dishwasher hoses and connections if present', priority: 'medium' },
        { itemName: 'Benchtop & Splashback', category: 'general', description: 'Inspect benchtop surfaces for damage or wear', priority: 'low' },
        { itemName: 'Cabinetry & Storage', category: 'general', description: 'Check cabinet doors, hinges, and shelving condition', priority: 'low' }
      ],
      // Exterior/outdoor rooms should NOT have interior items like light switches or power points
      'roof': [],
      'gutters': [],
      'pool': [],
      'deck': [],
      'patio': [],
      'balcony': [],
      'garden': [],
      'courtyard': [],
      'roof_terrace': [],
      'power_box': []  // Power Box has its own specific items
    };

    return roomSpecificCommonItems[roomType] || commonItems;
  }

  // Helper method to get standard inspection items based on room type
  getStandardInspectionItemsByRoomType(roomType: string): Array<{
    itemName: string;
    category: string;
    description: string;
    priority: string;
    checklistPoints?: string[];
    photoRequired?: boolean;
    complianceStandard?: string;
    complianceYears?: number;
    inspectionType?: 'visual' | 'professional';
  }> {
    const commonItems = [
      { itemName: 'Light Switch', category: 'electrical', description: 'Check operation and condition of light switches', priority: 'medium' },
      { itemName: 'Power Points (GPO)', category: 'electrical', description: 'Test and inspect general power outlets', priority: 'medium' },
      { 
        itemName: 'Smoke Detector', 
        category: 'safety', 
        description: 'Test smoke detector functionality, battery, and verify age - Professional inspection required', 
        priority: 'critical',
        inspectionType: 'professional',
        complianceStandard: 'AS 3786 - Replace smoke alarms every 10 years',
        complianceYears: 10,
        photoRequired: true,
        checklistPoints: [
          'Press test button to verify alarm sounds',
          'Check battery level indicator',
          'Verify manufacture date on unit (replace if 10+ years old)',
          'Clean detector housing and vents',
          'Take photo showing manufacture date stamp'
        ]
      },
      { itemName: 'Windows', category: 'windows_doors', description: 'Inspect window condition, operation, locks, and seals', priority: 'medium' },
      { itemName: 'Window Furnishings', category: 'furnishings', description: 'Check condition of curtains, blinds, and window treatments', priority: 'low' },
      { itemName: 'Air Conditioning', category: 'hvac', description: 'Test air conditioning system operation and filters', priority: 'medium' }
    ];

    const roomSpecificItems: { [key: string]: any[] } = {
      // Bedrooms
      'master_bedroom': [...commonItems, 
        { itemName: 'Ceiling Fan', category: 'electrical', description: 'Check ceiling fan operation and stability', priority: 'medium' },
        { itemName: 'Window Locks', category: 'security', description: 'Ensure window locks are secure and functional', priority: 'medium' }
      ],
      'bedroom_1': commonItems,
      'bedroom_2': commonItems,
      'bedroom_3': commonItems,
      'bedroom_4': commonItems,
      'bedroom_5': commonItems,
      'guest_bedroom': commonItems,
      'kids_bedroom': commonItems,
      
      // Bathrooms
      'main_bathroom': [...commonItems,
        { 
          itemName: 'Vanity Tap & Flexi Hoses', 
          category: 'plumbing', 
          description: 'Check tap operation, leaks, and inspect flexi hose condition', 
          priority: 'high',
          complianceStandard: 'AS 3500 - Replace flexi hoses every 5 years',
          complianceYears: 5,
          photoRequired: true,
          checklistPoints: [
            'Check tap operation and flow',
            'Inspect for leaks around tap base',
            'Check flexi hose condition (no kinks, corrosion, or wear)',
            'Verify hose installation date or last replacement',
            'Take photo of flexi hoses with date stamp'
          ]
        },
        { 
          itemName: 'Toilet & Flexi Hose', 
          category: 'plumbing', 
          description: 'Test toilet flush, check for leaks, and inspect flexi hose', 
          priority: 'high',
          complianceStandard: 'AS 3500 - Replace flexi hoses every 5 years',
          complianceYears: 5,
          photoRequired: true,
          checklistPoints: [
            'Test flush mechanism',
            'Check for leaks at cistern and base',
            'Inspect toilet flexi hose condition',
            'Verify hose installation date',
            'Take photo of flexi hose connection'
          ]
        },
        { itemName: 'Shower', category: 'plumbing', description: 'Test shower pressure and temperature', priority: 'medium' },
        { itemName: 'Bath', category: 'plumbing', description: 'Check bath taps and drainage', priority: 'medium' },
        { itemName: 'Exhaust Fan', category: 'electrical', description: 'Test bathroom exhaust fan operation', priority: 'medium' }
      ],
      'master_ensuite': [...commonItems,
        { 
          itemName: 'Vanity Tap & Flexi Hoses', 
          category: 'plumbing', 
          description: 'Check tap operation, leaks, and inspect flexi hose condition', 
          priority: 'high',
          complianceStandard: 'AS 3500 - Replace flexi hoses every 5 years',
          complianceYears: 5,
          photoRequired: true,
          checklistPoints: [
            'Check tap operation and flow',
            'Inspect for leaks',
            'Check flexi hose condition',
            'Verify installation date',
            'Take photo with date stamp'
          ]
        },
        { 
          itemName: 'Toilet & Flexi Hose', 
          category: 'plumbing', 
          description: 'Test toilet flush, check for leaks, and inspect flexi hose', 
          priority: 'high',
          complianceStandard: 'AS 3500 - Replace flexi hoses every 5 years',
          complianceYears: 5,
          photoRequired: true
        },
        { itemName: 'Shower', category: 'plumbing', description: 'Test shower pressure and temperature', priority: 'medium' },
        { itemName: 'Exhaust Fan', category: 'electrical', description: 'Test bathroom exhaust fan operation', priority: 'medium' }
      ],
      'powder_room': [...commonItems,
        { 
          itemName: 'Vanity Tap & Flexi Hoses', 
          category: 'plumbing', 
          description: 'Check tap operation, leaks, and inspect flexi hose condition', 
          priority: 'high',
          complianceStandard: 'AS 3500 - Replace flexi hoses every 5 years',
          complianceYears: 5,
          photoRequired: true
        },
        { 
          itemName: 'Toilet & Flexi Hose', 
          category: 'plumbing', 
          description: 'Test toilet flush, check for leaks, and inspect flexi hose', 
          priority: 'high',
          complianceStandard: 'AS 3500 - Replace flexi hoses every 5 years',
          complianceYears: 5,
          photoRequired: true
        },
        { itemName: 'Exhaust Fan', category: 'electrical', description: 'Test bathroom exhaust fan operation', priority: 'medium' }
      ],

      // Kitchen
      'kitchen': [...commonItems,
        { 
          itemName: 'Kitchen Tap & Flexi Hoses', 
          category: 'plumbing', 
          description: 'Check kitchen tap operation, leaks, and inspect flexi hose condition', 
          priority: 'high',
          complianceStandard: 'AS 3500 - Replace flexi hoses every 5 years',
          complianceYears: 5,
          photoRequired: true,
          checklistPoints: [
            'Check tap operation and flow (hot & cold)',
            'Inspect for leaks around tap',
            'Check flexi hose condition under sink',
            'Verify hose installation date',
            'Take photo of flexi hoses'
          ]
        },
        { itemName: 'Dishwasher', category: 'appliance', description: 'Test dishwasher operation and drainage', priority: 'medium' },
        { itemName: 'Rangehood', category: 'electrical', description: 'Test rangehood fan and lights', priority: 'medium' },
        { 
          itemName: 'Gas Cooktop Connection',
          category: 'gas',
          description: 'Inspect gas cooktop bayonet and connections',
          priority: 'critical',
          complianceStandard: 'AS/NZS 5601 - Leak test every 5 years',
          complianceYears: 5,
          photoRequired: true,
          checklistPoints: [
            'Visual inspection of gas connections',
            'Check bayonet cap is secure',
            'Smell test for gas leaks',
            'Verify connection integrity',
            'Take photo of gas connections'
          ]
        }
      ],

      // Laundry
      'laundry': [...commonItems,
        { 
          itemName: 'Laundry Taps & Flexi Hoses', 
          category: 'plumbing', 
          description: 'Check laundry tap operation, leaks, and inspect flexi hoses', 
          priority: 'high',
          complianceStandard: 'AS 3500 - Replace flexi hoses every 5 years',
          complianceYears: 5,
          photoRequired: true,
          checklistPoints: [
            'Check hot and cold tap operation',
            'Inspect for leaks',
            'Check washing machine flexi hoses',
            'Verify hose installation dates',
            'Take photo of all flexi hoses'
          ]
        },
        { itemName: 'Drainage', category: 'plumbing', description: 'Check laundry drainage and floor waste', priority: 'medium' },
        { itemName: 'Dryer Vent', category: 'electrical', description: 'Check dryer vent operation and clearance', priority: 'medium' }
      ],

      // Living areas
      'living_room': [...commonItems,
        { itemName: 'Air Conditioning', category: 'electrical', description: 'Test air conditioning operation and filters', priority: 'medium' },
        {
          itemName: 'Gas Appliance Connection',
          category: 'gas',
          description: 'Inspect gas heater/fireplace bayonet and connections',
          priority: 'critical',
          complianceStandard: 'AS/NZS 5601 - Leak test every 5 years',
          complianceYears: 5,
          photoRequired: true,
          checklistPoints: [
            'Visual inspection of gas connections',
            'Check bayonet cap is secure',
            'Smell test for gas leaks',
            'Verify hose condition if present',
            'Take photo of gas connections'
          ]
        }
      ],
      'family_room': [...commonItems,
        { itemName: 'Air Conditioning', category: 'electrical', description: 'Test air conditioning operation and filters', priority: 'medium' },
        {
          itemName: 'Gas Appliance Connection',
          category: 'gas',
          description: 'Inspect gas heater/fireplace bayonet and connections',
          priority: 'critical',
          complianceStandard: 'AS/NZS 5601 - Leak test every 5 years',
          complianceYears: 5,
          photoRequired: true,
          checklistPoints: [
            'Visual inspection of gas connections',
            'Check bayonet cap is secure',
            'Smell test for gas leaks',
            'Verify hose condition if present',
            'Take photo of gas connections'
          ]
        }
      ],
      'lounge': [...commonItems,
        { itemName: 'Air Conditioning', category: 'electrical', description: 'Test air conditioning operation and filters', priority: 'medium' },
        {
          itemName: 'Gas Appliance Connection',
          category: 'gas',
          description: 'Inspect gas heater/fireplace bayonet and connections',
          priority: 'critical',
          complianceStandard: 'AS/NZS 5601 - Leak test every 5 years',
          complianceYears: 5,
          photoRequired: true,
          checklistPoints: [
            'Visual inspection of gas connections',
            'Check bayonet cap is secure',
            'Smell test for gas leaks',
            'Verify hose condition if present',
            'Take photo of gas connections'
          ]
        }
      ],
      
      // Butler Pantry / Scullery - No windows typically, just basic electrical + pantry-specific items
      'butler_pantry': [
        { itemName: 'Light Switch', category: 'electrical', description: 'Check operation and condition of light switches', priority: 'medium' },
        { itemName: 'Power Points (GPO)', category: 'electrical', description: 'Test and inspect general power outlets', priority: 'medium' },
        { 
          itemName: 'Sink & Tap', 
          category: 'plumbing', 
          description: 'Check sink drainage and tap operation, inspect flexi hoses', 
          priority: 'medium',
          checklistPoints: [
            'Test hot and cold water flow',
            'Check under sink for leaks',
            'Inspect flexi hose condition',
            'Test sink drainage speed',
            'Check tap washer condition'
          ]
        },
        { 
          itemName: 'Dishwasher Connection', 
          category: 'plumbing', 
          description: 'Check dishwasher water and drainage connections if present', 
          priority: 'medium',
          checklistPoints: [
            'Check inlet hose for damage or leaks',
            'Inspect outlet hose connection',
            'Verify isolation valve operation',
            'Check for water damage around connections'
          ]
        },
        { 
          itemName: 'Benchtop & Splashback', 
          category: 'general', 
          description: 'Inspect benchtop surfaces and splashback for damage', 
          priority: 'low',
          checklistPoints: [
            'Check for cracks, chips, or stains',
            'Inspect silicone seal around sink',
            'Check splashback tiles/material',
            'Verify bench stability'
          ]
        },
        { 
          itemName: 'Cabinetry & Storage', 
          category: 'general', 
          description: 'Check cabinet doors, drawers, and internal shelving', 
          priority: 'low',
          checklistPoints: [
            'Test door hinges and soft-close',
            'Check drawer runners',
            'Inspect internal shelf condition',
            'Verify handles and pulls secure'
          ]
        },
        { 
          itemName: 'Bar Fridge Connection', 
          category: 'electrical', 
          description: 'Check power outlet and space for bar fridge if applicable', 
          priority: 'low',
          checklistPoints: [
            'Verify power outlet operation',
            'Check ventilation space',
            'Inspect for water leaks if fridge present'
          ]
        }
      ],
      
      // Garage & Utility
      'garage': [...commonItems,
        {
          itemName: 'Safety Switch (RCD) Testing',
          category: 'safety',
          description: 'Test RCD at switchboard and verify circuit protection',
          priority: 'critical',
          complianceStandard: 'AS/NZS 3000 - Test RCD every 6 months (push-button)',
          complianceYears: 0.5,
          photoRequired: true,
          checklistPoints: [
            'Locate main switchboard RCD',
            'Press RCD test button',
            'Verify power disconnects immediately',
            'Check reset operates correctly',
            'Take photo of test button result',
            'Verify all circuits protected',
            'Note: Full electrician test every 2 years'
          ]
        },
        {
          itemName: 'Hot Water System PTR Valve',
          category: 'plumbing',
          description: 'Test pressure/temperature relief valve and check discharge',
          priority: 'critical',
          complianceStandard: 'AS 3500 - Service PTR valve every 5 years',
          complianceYears: 5,
          photoRequired: true,
          checklistPoints: [
            'Lift PTR valve lever to test operation',
            'Check water discharge from relief pipe',
            'Inspect for corrosion or leaks',
            'Verify discharge pipe termination is safe',
            'Take photo of valve and discharge pipe'
          ]
        },
        {
          itemName: 'Gas Appliance Connections',
          category: 'gas',
          description: 'Inspect gas bayonets and connections for leaks',
          priority: 'critical',
          complianceStandard: 'AS/NZS 5601 - Leak test every 5 years',
          complianceYears: 5,
          photoRequired: true,
          checklistPoints: [
            'Visual inspection of all gas connections',
            'Check bayonet caps are secure',
            'Smell test for gas leaks',
            'Verify hose condition if present',
            'Take photo of gas connections'
          ]
        }
      ],
      
      // Pool & Outdoor
      'pool': [
        {
          itemName: 'Pool Barrier Inspection',
          category: 'safety',
          description: 'Inspect pool fence, gates, and safety barriers',
          priority: 'critical',
          complianceStandard: 'AS 1926.1 - Annual pool barrier inspection',
          complianceYears: 1,
          photoRequired: true,
          checklistPoints: [
            'Check fence height (1200mm minimum)',
            'Test gate self-closing mechanism',
            'Verify gate latch operates correctly',
            'Ensure no climbable objects within 900mm',
            'Take photo of gate latch and compliance plate',
            'Check for gaps or damage in barrier'
          ]
        },
        {
          itemName: 'Pool Equipment',
          category: 'electrical',
          description: 'Inspect pool pump, filter, and electrical safety',
          priority: 'high'
        }
      ],
      
      'outdoor': [
        {
          itemName: 'Outdoor Gas Point',
          category: 'gas',
          description: 'Inspect outdoor BBQ gas bayonet and connections',
          priority: 'critical',
          complianceStandard: 'AS/NZS 5601 - Leak test every 5 years',
          complianceYears: 5,
          photoRequired: true,
          checklistPoints: [
            'Visual inspection of gas bayonet',
            'Check bayonet cap is secure',
            'Smell test for gas leaks',
            'Verify weatherproofing',
            'Take photo of gas connections'
          ]
        }
      ],
      
      // Fire Safety
      'hallway': [...commonItems,
        {
          itemName: 'Fire Extinguisher',
          category: 'safety',
          description: 'Inspect fire extinguisher condition and service date',
          priority: 'critical',
          complianceStandard: 'AS 1851 - Annual fire extinguisher service',
          complianceYears: 1,
          photoRequired: true,
          checklistPoints: [
            'Check pressure gauge in green zone',
            'Verify service tag is current (within 12 months)',
            'Inspect for physical damage or corrosion',
            'Ensure pin and tamper seal intact',
            'Check accessibility and signage',
            'Take photo of pressure gauge and service tag'
          ]
        }
      ],

      // Roof and structural items
      'roof': [
        { itemName: 'Screw and fastener condition', category: 'structural', description: 'Inspect all roof screws, bolts, and fasteners for looseness, corrosion, and proper sealing', priority: 'high' },
        { itemName: 'Overall sheet/tile condition', category: 'structural', description: 'Assess the general condition of roofing material sheets or tiles', priority: 'high' },
        { itemName: 'Ridge capping and profile defects', category: 'structural', description: 'Inspect ridge caps, flashings, and roof profile for defects', priority: 'critical' },
        { itemName: 'Edge and eave condition', category: 'structural', description: 'Check roof edges, eaves, and fascia boards for damage', priority: 'high' },
        { itemName: 'Roof ventilation', category: 'structural', description: 'Inspect roof vents and ventilation systems', priority: 'medium' },
        { itemName: 'Weatherproofing integrity', category: 'structural', description: 'Check overall weatherproofing and water resistance', priority: 'critical' }
      ],

      'gutters': [
        { itemName: 'Gutter alignment', category: 'structural', description: 'Check gutter slope and proper alignment for water flow', priority: 'high' },
        { itemName: 'Blockage clearing', category: 'maintenance', description: 'Clear debris and inspect for blockages', priority: 'medium' },
        { itemName: 'Leak detection', category: 'structural', description: 'Inspect joints, connections, and gutter body for leaks', priority: 'high' },
        { itemName: 'Bracket security', category: 'structural', description: 'Check gutter brackets and mounting security', priority: 'high' },
        { itemName: 'Downpipe condition', category: 'structural', description: 'Inspect downpipes and their connections', priority: 'medium' },
        { itemName: 'Overflow protection', category: 'safety', description: 'Check overflow outlets and water management', priority: 'medium' }
      ],

      // Garden/landscaping items
      'garden': [
        { itemName: 'Irrigation system', category: 'plumbing', description: 'Check sprinklers, drip lines, and timer operation', priority: 'medium' },
        { itemName: 'Garden bed edging', category: 'landscaping', description: 'Inspect bed edging and retaining borders', priority: 'low' },
        { itemName: 'Drainage', category: 'structural', description: 'Check garden drainage and water flow', priority: 'medium' },
        { itemName: 'Fencing and gates', category: 'structural', description: 'Inspect garden fencing and gate operation', priority: 'medium' },
        { itemName: 'Outdoor Lighting', category: 'electrical', description: 'Check garden lights, sensors, and wiring', priority: 'medium' },
        { itemName: 'Outdoor Power Outlets', category: 'electrical', description: 'Inspect garden power outlets for safety and weatherproofing', priority: 'high' }
      ],

      // Courtyard items
      'courtyard': [
        { itemName: 'Paving condition', category: 'structural', description: 'Inspect pavers for cracks, settling, or loose units', priority: 'medium' },
        { itemName: 'Drainage', category: 'structural', description: 'Check courtyard drainage and water runoff', priority: 'high' },
        { itemName: 'Retaining walls', category: 'structural', description: 'Inspect any retaining walls for cracks or movement', priority: 'high' },
        { itemName: 'Outdoor tap', category: 'plumbing', description: 'Check outdoor tap operation and hose connections', priority: 'low' },
        { itemName: 'Outdoor Lighting', category: 'electrical', description: 'Check courtyard lights, sensors, and wiring', priority: 'medium' },
        { itemName: 'Outdoor Power Outlets', category: 'electrical', description: 'Inspect courtyard power outlets for safety and weatherproofing', priority: 'high' }
      ],

      // Roof terrace items
      'roof_terrace': [
        { itemName: 'Waterproof membrane', category: 'structural', description: 'Inspect waterproof membrane for damage or deterioration', priority: 'critical' },
        { itemName: 'Drainage', category: 'structural', description: 'Check terrace drains are clear and functional', priority: 'high' },
        { itemName: 'Safety barriers', category: 'safety', description: 'Inspect balustrades, railings, and edge protection', priority: 'critical' },
        { itemName: 'Surface condition', category: 'structural', description: 'Check tiles, decking, or surface material condition', priority: 'medium' },
        { itemName: 'Outdoor furniture', category: 'general', description: 'Inspect any fixed outdoor furniture or planters', priority: 'low' },
        { itemName: 'Outdoor Lighting', category: 'electrical', description: 'Check terrace lights, sensors, and wiring', priority: 'medium' },
        { itemName: 'Outdoor Power Outlets', category: 'electrical', description: 'Inspect terrace power outlets for safety and weatherproofing', priority: 'high' }
      ],

      // Deck items
      'deck': [
        { itemName: 'Deck Boards', category: 'structural', description: 'Inspect deck boards for rot, warping, splitting, or loose boards', priority: 'high' },
        { itemName: 'Deck Frame', category: 'structural', description: 'Check deck frame, joists, and bearers for structural integrity', priority: 'critical' },
        { itemName: 'Deck Screws and Fasteners', category: 'structural', description: 'Inspect all screws and fasteners for corrosion or looseness', priority: 'high' },
        { itemName: 'Deck Railings', category: 'safety', description: 'Check railings for stability, height compliance, and damage', priority: 'critical' },
        { itemName: 'Outdoor Lighting', category: 'electrical', description: 'Check deck lights, sensors, and wiring', priority: 'medium' },
        { itemName: 'Outdoor Power Outlets', category: 'electrical', description: 'Inspect deck power outlets for safety and weatherproofing', priority: 'high' }
      ],

      // Patio items
      'patio': [
        { itemName: 'Patio Surface', category: 'structural', description: 'Inspect patio surface for cracks, uneven areas, or damage', priority: 'medium' },
        { itemName: 'Patio Drainage', category: 'structural', description: 'Check patio drainage and water runoff', priority: 'high' },
        { itemName: 'Patio Cover/Roof', category: 'structural', description: 'Inspect patio cover or pergola structure if present', priority: 'medium' },
        { itemName: 'Outdoor Lighting', category: 'electrical', description: 'Check patio lights, sensors, and wiring', priority: 'medium' },
        { itemName: 'Outdoor Power Outlets', category: 'electrical', description: 'Inspect patio power outlets for safety and weatherproofing', priority: 'high' }
      ],

      // Balcony items
      'balcony': [
        { itemName: 'Balcony Railings', category: 'safety', description: 'Inspect balustrades and railings for stability and height compliance', priority: 'critical' },
        { itemName: 'Balcony Structure', category: 'structural', description: 'Check balcony floor and supports', priority: 'critical' },
        { itemName: 'Balcony Drainage', category: 'structural', description: 'Inspect balcony drainage and water runoff', priority: 'high' },
        { itemName: 'Balcony Surface', category: 'structural', description: 'Check tiles or flooring for cracks or damage', priority: 'medium' },
        { itemName: 'Outdoor Lighting', category: 'electrical', description: 'Check balcony lights and wiring', priority: 'medium' },
        { itemName: 'Outdoor Power Outlets', category: 'electrical', description: 'Inspect balcony power outlets for safety and weatherproofing', priority: 'high' }
      ],

      // Power Box / Electrical Panel - Professional inspections only
      'power_box': [
        {
          itemName: 'Electrical Panel Safety Inspection',
          category: 'electrical',
          description: 'Full electrical panel inspection by licensed electrician - certificate required',
          priority: 'critical',
          inspectionType: 'professional' as const,
          photoRequired: true,
          checklistPoints: [
            'Inspect switchboard condition and labeling',
            'Test all circuit breakers for proper operation',
            'Check earthing and bonding connections',
            'Thermal scan for hot spots',
            'Verify main switch and isolators',
            'Issue Electrical Safety Certificate'
          ]
        },
        {
          itemName: 'RCD/Safety Switch Testing',
          category: 'electrical',
          description: 'Test all RCD/safety switches for proper operation - professional testing required',
          priority: 'critical',
          inspectionType: 'professional' as const,
          photoRequired: true,
          checklistPoints: [
            'Test each RCD using test button',
            'Verify RCD trips within 30 milliseconds',
            'Check all circuits protected by RCD',
            'Document test results with date and signature'
          ]
        },
        {
          itemName: 'Circuit Breaker Labeling',
          category: 'electrical',
          description: 'Verify all circuit breakers are properly labeled and legible',
          priority: 'high',
          inspectionType: 'visual' as const,
          checklistPoints: [
            'Check all breakers have clear labels',
            'Verify labels match actual circuits',
            'Update labels if needed',
            'Take photo of panel directory'
          ]
        },
        {
          itemName: 'Panel Condition Assessment',
          category: 'electrical',
          description: 'Visual assessment of electrical panel physical condition',
          priority: 'high',
          inspectionType: 'visual' as const,
          checklistPoints: [
            'Check for signs of overheating or burning',
            'Inspect for corrosion or moisture damage',
            'Verify panel door closes properly',
            'Check for proper clearance around panel'
          ]
        }
      ],

      // Default for other room types
      'default': commonItems
    };

    return roomSpecificItems[roomType] || roomSpecificItems['default'];
  }

  // Helper method to determine if an inspection item should apply to a specific room type
  shouldItemApplyToRoomType(itemName: string, roomType: string): boolean {
    // Define which items are appropriate for each room type
    const roomTypeRestrictions: { [key: string]: string[] } = {
      // Interior rooms that can have electrical and safety items
      'master_bedroom': ['Smoke Detector', 'Light Switch', 'Power Points (GPO)', 'Ceiling Fan', 'Window Locks', 'Air Conditioning', 'Windows', 'Window Furnishings'],
      'bedroom_1': ['Smoke Detector', 'Light Switch', 'Power Points (GPO)', 'Windows', 'Window Furnishings', 'Air Conditioning'],
      'bedroom_2': ['Smoke Detector', 'Light Switch', 'Power Points (GPO)', 'Windows', 'Window Furnishings', 'Air Conditioning'],
      'bedroom_3': ['Smoke Detector', 'Light Switch', 'Power Points (GPO)', 'Windows', 'Window Furnishings', 'Air Conditioning'],
      'bedroom_4': ['Smoke Detector', 'Light Switch', 'Power Points (GPO)', 'Windows', 'Window Furnishings', 'Air Conditioning'],
      'guest_bedroom': ['Smoke Detector', 'Light Switch', 'Power Points (GPO)', 'Windows', 'Window Furnishings', 'Air Conditioning'],
      'kids_bedroom': ['Smoke Detector', 'Light Switch', 'Power Points (GPO)', 'Windows', 'Window Furnishings', 'Air Conditioning'],
      
      'main_bathroom': ['Smoke Detector', 'Light Switch', 'Power Points (GPO)', 'Vanity Tap & Flexi Hoses', 'Toilet & Flexi Hose', 'Shower', 'Bath', 'Exhaust Fan', 'Windows', 'Air Conditioning'],
      'master_ensuite': ['Smoke Detector', 'Light Switch', 'Power Points (GPO)', 'Vanity Tap & Flexi Hoses', 'Toilet & Flexi Hose', 'Shower', 'Exhaust Fan', 'Windows', 'Air Conditioning'],
      'powder_room': ['Smoke Detector', 'Light Switch', 'Power Points (GPO)', 'Vanity Tap & Flexi Hoses', 'Toilet & Flexi Hose', 'Exhaust Fan', 'Air Conditioning'],
      
      'kitchen': ['Smoke Detector', 'Light Switch', 'Power Points (GPO)', 'Kitchen Tap & Flexi Hoses', 'Dishwasher', 'Rangehood', 'Gas Cooktop Connection', 'Windows', 'Window Furnishings', 'Air Conditioning'],
      'laundry': ['Smoke Detector', 'Light Switch', 'Power Points (GPO)', 'Laundry Taps & Flexi Hoses', 'Drainage', 'Dryer Vent', 'Windows', 'Air Conditioning'],
      
      'living_room': ['Smoke Detector', 'Light Switch', 'Power Points (GPO)', 'Air Conditioning', 'Gas Appliance Connection', 'Windows', 'Window Furnishings'],
      'family_room': ['Smoke Detector', 'Light Switch', 'Power Points (GPO)', 'Air Conditioning', 'Gas Appliance Connection', 'Windows', 'Window Furnishings'],
      'lounge': ['Smoke Detector', 'Light Switch', 'Power Points (GPO)', 'Air Conditioning', 'Gas Appliance Connection', 'Windows', 'Window Furnishings'],
      
      'garage': ['Smoke Detector', 'Light Switch', 'Power Points (GPO)', 'Safety Switch (RCD) Testing', 'Hot Water System PTR Valve', 'Gas Appliance Connections'],
      'butler_pantry': ['Light Switch', 'Power Points (GPO)', 'Sink & Tap', 'Dishwasher Connection', 'Benchtop & Splashback', 'Cabinetry & Storage', 'Bar Fridge Connection'],
      'outdoor': ['Outdoor Gas Point'],
      'hallway': ['Smoke Detector', 'Light Switch', 'Power Points (GPO)', 'Fire Extinguisher'],
      
      // Exterior/structural rooms - include outdoor electrical items
      'roof': ['Screw and fastener condition', 'Overall sheet/tile condition', 'Ridge capping and profile defects', 'Edge and eave condition', 'Roof ventilation', 'Weatherproofing integrity'],
      'gutters': ['Gutter alignment', 'Blockage clearing', 'Leak detection', 'Bracket security', 'Downpipe condition', 'Overflow protection'],
      'garden': ['Irrigation system', 'Garden bed edging', 'Drainage', 'Fencing and gates', 'Outdoor Lighting', 'Outdoor Power Outlets'],
      'courtyard': ['Paving condition', 'Drainage', 'Retaining walls', 'Outdoor tap', 'Outdoor Lighting', 'Outdoor Power Outlets'],
      'roof_terrace': ['Waterproof membrane', 'Drainage', 'Safety barriers', 'Surface condition', 'Outdoor furniture', 'Outdoor Lighting', 'Outdoor Power Outlets'],
      'deck': ['Deck Boards', 'Deck Frame', 'Deck Screws and Fasteners', 'Deck Railings', 'Outdoor Lighting', 'Outdoor Power Outlets'],
      'patio': ['Patio Surface', 'Patio Drainage', 'Outdoor Lighting', 'Outdoor Power Outlets'],
      'balcony': ['Balcony Railings', 'Balcony Structure', 'Outdoor Lighting', 'Outdoor Power Outlets'],
      'pool': ['Pool Pump', 'Pool Filter', 'Pool Chlorinator', 'Water Chemistry', 'Pool Safety Barriers', 'Pool Heater', 'Pool Lighting', 'Pool Surface and Tiles', 'Pool Skimmer and Returns', 'Pool Cleaner'],
      'power_box': ['Electrical Panel Safety Inspection', 'RCD/Safety Switch Testing', 'Circuit Breaker Labeling', 'Panel Condition Assessment']
    };

    // Get allowed items for this room type
    const allowedItems = roomTypeRestrictions[roomType];
    
    // If room type isn't defined, allow common interior items but not structural exterior items
    if (!allowedItems) {
      const exteriorStructuralItems = [
        'Screw and fastener condition', 'Overall sheet/tile condition', 'Ridge capping and profile defects',
        'Edge and eave condition', 'Roof ventilation', 'Weatherproofing integrity',
        'Gutter alignment', 'Blockage clearing', 'Leak detection', 'Bracket security', 
        'Downpipe condition', 'Overflow protection'
      ];
      return !exteriorStructuralItems.includes(itemName);
    }
    
    return allowedItems.includes(itemName);
  }

  async createBulkInspectionItems(roomId: number, template: string, floor?: number): Promise<InspectionItem[]> {
    let templates = this.getInspectionItemTemplates(template);
    
    // Floor-aware filtering: skip Window Restrictors on ground floor (floor 0) or basement (-1)
    if (floor !== undefined && floor <= 0) {
      templates = templates.filter(t => 
        !t.itemName?.toLowerCase().includes('window restrictor') &&
        !t.itemName?.toLowerCase().includes('window safety')
      );
    }
    
    // Calculate nextInspectionDate based on frequency
    const calculateNextDate = (frequency?: string): Date => {
      const now = new Date();
      switch (frequency) {
        case 'monthly': return new Date(now.setMonth(now.getMonth() + 1));
        case 'quarterly': return new Date(now.setMonth(now.getMonth() + 3));
        case 'biannual': return new Date(now.setMonth(now.getMonth() + 6));
        case 'annual': return new Date(now.setFullYear(now.getFullYear() + 1));
        default: return new Date(now.setMonth(now.getMonth() + 6)); // Default to 6 months
      }
    };
    
    const items: InsertInspectionItem[] = templates.map(tmpl => ({
      ...tmpl,
      roomId,
      nextInspectionDate: calculateNextDate(tmpl.frequency)
    }));

    const createdItems = await Promise.all(
      items.map(item => this.createInspectionItem(item))
    );

    return createdItems;
  }

  private getInspectionItemTemplates(template: string): Omit<InsertInspectionItem, 'roomId'>[] {
    // Roof-specific items for exterior structural maintenance
    if (template === 'roof') {
      return [
        {
          category: 'structural',
          itemName: 'Screw and fastener condition',
          description: 'Inspect all roof screws, bolts, and fasteners for looseness, corrosion, and proper sealing',
          frequency: 'biannual',
          priority: 'high',
          checklistPoints: [
            'Check screw tightness and security',
            'Look for rust or corrosion on fasteners',
            'Inspect rubber washers and seals',
            'Check for missing or loose screws',
            'Verify proper screw placement and spacing'
          ]
        },
        {
          category: 'structural',
          itemName: 'Overall sheet/tile condition',
          description: 'Assess the general condition of roofing material sheets or tiles',
          frequency: 'biannual',
          priority: 'high',
          checklistPoints: [
            'Check for cracked, broken, or missing tiles/sheets',
            'Look for signs of weathering or deterioration',
            'Inspect for holes or punctures',
            'Check alignment and overlapping',
            'Assess color fading or surface damage'
          ]
        },
        {
          category: 'structural',
          itemName: 'Ridge capping and profile defects',
          description: 'Inspect ridge caps, flashings, and roof profile for defects and proper installation',
          frequency: 'biannual',
          priority: 'critical',
          checklistPoints: [
            'Check ridge cap alignment and security',
            'Inspect flashing around chimneys and vents',
            'Look for gaps or misaligned profiles',
            'Check end caps and corner pieces',
            'Verify proper overlap and weatherproofing'
          ]
        },
        {
          category: 'structural',
          itemName: 'Structural sagging and deformation',
          description: 'Check for any sagging, bowing, or structural deformation in the roof',
          frequency: 'annual',
          priority: 'critical',
          checklistPoints: [
            'Look for visible sagging in roof lines',
            'Check for bowing or warping',
            'Inspect for uneven surfaces',
            'Check support beam condition (if visible)',
            'Assess overall structural integrity'
          ]
        },
        {
          category: 'general',
          itemName: 'Penetration sealing and weatherproofing',
          description: 'Inspect seals around roof penetrations like vents, antennas, and solar panels',
          frequency: 'biannual',
          priority: 'high',
          checklistPoints: [
            'Check seals around vent penetrations',
            'Inspect antenna and satellite dish mountings',
            'Look for gaps around pipe boots',
            'Check solar panel mounting seals',
            'Verify flashing condition around penetrations'
          ]
        },
        {
          category: 'general',
          itemName: 'Debris and vegetation removal',
          description: 'Check for and remove debris, leaves, moss, or vegetation growth',
          frequency: 'quarterly',
          priority: 'medium',
          checklistPoints: [
            'Remove leaves and organic debris',
            'Check for moss or algae growth',
            'Clear blocked areas around vents',
            'Remove any accumulated dirt or grime',
            'Check for bird nests or pest activity'
          ]
        },
        {
          category: 'structural',
          itemName: 'Edge and eave condition',
          description: 'Inspect roof edges, eaves, and overhangs for damage and proper attachment',
          frequency: 'biannual',
          priority: 'high',
          checklistPoints: [
            'Check eave and soffit condition',
            'Inspect fascia board security',
            'Look for edge lifting or damage',
            'Check overhang structural integrity',
            'Verify proper edge flashing'
          ]
        },
        {
          category: 'general',
          itemName: 'Ventilation and airflow',
          description: 'Check roof ventilation systems and ensure proper airflow',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Inspect roof vents for blockages',
            'Check whirlybird or turbine operation',
            'Verify ridge vent functionality',
            'Look for damaged vent covers',
            'Test airflow adequacy'
          ]
        }
      ];
    }

    // Gutter-specific items
    if (template === 'gutters') {
      return [
        {
          category: 'structural',
          itemName: 'Gutter alignment and fall',
          description: 'Check gutter slope and alignment for proper water flow',
          frequency: 'biannual',
          priority: 'high',
          checklistPoints: [
            'Verify proper slope toward downpipes',
            'Check for sagging or misaligned sections',
            'Inspect bracket security and spacing',
            'Look for separated joints',
            'Test water flow direction'
          ]
        },
        {
          category: 'general',
          itemName: 'Blockage and debris clearing',
          description: 'Remove debris and check for blockages in gutters and downpipes',
          frequency: 'quarterly',
          priority: 'high',
          checklistPoints: [
            'Clear leaves and debris from gutters',
            'Check downpipe flow and clearing',
            'Remove mud and sediment buildup',
            'Check for pest nests or blockages',
            'Test water flow after cleaning'
          ]
        },
        {
          category: 'structural',
          itemName: 'Leaks and joint integrity',
          description: 'Inspect gutter joints, seals, and potential leak points',
          frequency: 'biannual',
          priority: 'high',
          checklistPoints: [
            'Check joint sealing and security',
            'Look for rust or corrosion spots',
            'Inspect end caps and outlets',
            'Test for water leaks during rain',
            'Check downpipe connections'
          ]
        }
      ];
    }

    const baseItems = [
      // Plumbing Items
      {
        category: 'plumbing',
        itemName: 'Leaking taps and toilets',
        description: 'Check for water leaks from faucets, taps, and toilet seals',
        frequency: 'quarterly',
        priority: 'medium',
        checklistPoints: [
          'Check faucet handles for drips',
          'Inspect toilet base for water pooling',
          'Test flush mechanism',
          'Check water pressure'
        ]
      },
      {
        category: 'plumbing',
        itemName: 'Blocked drains',
        description: 'Inspect kitchen sinks, showers, and toilet drains for blockages',
        frequency: 'quarterly',
        priority: 'high',
        checklistPoints: [
          'Test water drainage speed',
          'Check for standing water',
          'Inspect drain covers',
          'Look for unusual odors'
        ]
      },
      {
        category: 'plumbing',
        itemName: 'Water pressure',
        description: 'Test and assess water pressure throughout the property',
        frequency: 'biannual',
        priority: 'medium',
        checklistPoints: [
          'Test hot water pressure',
          'Test cold water pressure',
          'Check shower head flow',
          'Inspect pressure relief valve'
        ]
      },
      {
        category: 'plumbing',
        itemName: 'Hot water system',
        description: 'Inspect hot water system functionality and safety',
        frequency: 'annual',
        priority: 'high',
        checklistPoints: [
          'Check water temperature consistency',
          'Inspect tank for leaks',
          'Test temperature relief valve',
          'Check gas/electric connections'
        ]
      },

      // Electrical Items - Note: Light Switch and Power Points (GPO) are defined in room-specific templates
      // Circuit breakers should only be in Power Box room type
      {
        category: 'safety',
        itemName: 'Smoke Detector',
        description: 'Test smoke detector operation and check battery - Professional inspection required',
        frequency: 'annual',
        priority: 'critical',
        inspectionType: 'professional',
        checklistPoints: [
          'Test alarm sound',
          'Check battery level',
          'Clean dust from sensors',
          'Verify mounting security',
          'Check expiry date (10 year replacement)'
        ]
      },

      // Structural Items
      {
        category: 'structural',
        itemName: 'Walls and ceilings',
        description: 'Inspect walls and ceilings for cracks, damage, or deterioration',
        frequency: 'annual',
        priority: 'medium',
        checklistPoints: [
          'Check for new cracks',
          'Look for water stains',
          'Inspect paint condition',
          'Check for sagging areas'
        ]
      },
      // Note: Windows item is defined in room-specific templates with more detailed checklists

      // HVAC Items
      {
        category: 'hvac',
        itemName: 'Air conditioning filters',
        description: 'Clean or replace HVAC system filters',
        frequency: 'quarterly',
        priority: 'high',
        checklistPoints: [
          'Remove and inspect filters',
          'Check filter condition',
          'Clean or replace as needed',
          'Test airflow after replacement'
        ]
      },
      {
        category: 'hvac',
        itemName: 'System performance',
        description: 'Test heating and cooling system performance',
        frequency: 'biannual',
        priority: 'high',
        checklistPoints: [
          'Test heating function',
          'Test cooling function',
          'Check thermostat accuracy',
          'Listen for unusual noises'
        ]
      },

      // General Items
      {
        category: 'general',
        itemName: 'Paint and surfaces',
        description: 'Inspect paint condition and surface wear',
        frequency: 'annual',
        priority: 'low',
        checklistPoints: [
          'Check for peeling paint',
          'Look for scuff marks',
          'Inspect wall damage',
          'Assess overall appearance'
        ]
      },
      {
        category: 'general',
        itemName: 'Flooring condition',
        description: 'Inspect flooring for damage, wear, or safety issues',
        frequency: 'biannual',
        priority: 'medium',
        checklistPoints: [
          'Check for loose tiles/boards',
          'Look for scratches or damage',
          'Inspect carpet condition',
          'Check for trip hazards'
        ]
      },

      // Pest Control Items
      {
        category: 'pest_control',
        itemName: 'Mould and moisture',
        description: 'Check for mould growth and moisture issues',
        frequency: 'quarterly',
        priority: 'high',
        checklistPoints: [
          'Inspect wet areas for mould',
          'Check ventilation adequacy',
          'Look for water damage signs',
          'Test exhaust fans'
        ]
      },
      {
        category: 'pest_control',
        itemName: 'Pest inspection',
        description: 'Check for signs of pest infestation',
        frequency: 'biannual',
        priority: 'medium',
        checklistPoints: [
          'Look for insect activity',
          'Check for rodent droppings',
          'Inspect entry points',
          'Check food storage areas'
        ]
      }
    ];

    // Room-specific inspection items
    const roomSpecificItems: { [key: string]: any[] } = {
      // Deck-specific items
      deck: [
        {
          category: 'structural',
          itemName: 'Deck Boards',
          description: 'Inspect deck boards for damage, warping, or loose fasteners',
          frequency: 'quarterly',
          priority: 'high',
          checklistPoints: [
            'Check for loose or protruding screws/nails',
            'Look for cracked or split boards',
            'Inspect for warping or cupping',
            'Check for rot or soft spots',
            'Test board stability when walked on'
          ]
        },
        {
          category: 'structural',
          itemName: 'Deck Frame',
          description: 'Inspect structural frame, joists, and support posts',
          frequency: 'biannual',
          priority: 'critical',
          checklistPoints: [
            'Check joist attachment to ledger board',
            'Inspect post and beam connections',
            'Look for sagging or bouncing',
            'Check for rot in structural members',
            'Verify proper flashing at house connection'
          ]
        },
        {
          category: 'structural',
          itemName: 'Deck Screws and Fasteners',
          description: 'Inspect all screws, bolts, and metal fasteners',
          frequency: 'quarterly',
          priority: 'high',
          checklistPoints: [
            'Tighten loose screws and bolts',
            'Check for rust or corrosion',
            'Replace missing or damaged fasteners',
            'Inspect joist hangers for security',
            'Check railing post attachments'
          ]
        },
        {
          category: 'safety',
          itemName: 'Deck Railings',
          description: 'Check railing height, stability, and balusters',
          frequency: 'quarterly',
          priority: 'critical',
          checklistPoints: [
            'Test railing stability by pushing',
            'Check baluster spacing (maximum 4 inches)',
            'Verify minimum railing height (36 inches)',
            'Inspect for loose connections',
            'Check gate operation and latching'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Outdoor Lighting',
          description: 'Inspect deck lighting fixtures and wiring',
          frequency: 'quarterly',
          priority: 'medium',
          checklistPoints: [
            'Test all deck lights are functional',
            'Check light fixtures for water damage',
            'Inspect wiring and connections',
            'Check for exposed wires or damaged cables',
            'Verify timer/sensor operation if applicable'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Outdoor Power Outlets',
          description: 'Inspect outdoor GPO/power outlets for safety',
          frequency: 'quarterly',
          priority: 'high',
          checklistPoints: [
            'Test outlet operation with tester',
            'Check GFCI/RCD protection is functional',
            'Inspect weatherproof covers',
            'Check for water ingress or corrosion',
            'Verify proper grounding'
          ]
        }
      ],

      // Pool-specific items
      pool: [
        {
          category: 'general',
          itemName: 'Pool Pump',
          description: 'Inspect pool pump operation, seals, and performance',
          frequency: 'monthly',
          priority: 'high',
          checklistPoints: [
            'Check pump operation and flow rate',
            'Inspect for unusual noises or vibrations',
            'Check pump basket for debris',
            'Inspect seals for leaks',
            'Verify timer settings'
          ]
        },
        {
          category: 'general',
          itemName: 'Pool Filter',
          description: 'Inspect and clean pool filter system',
          frequency: 'monthly',
          priority: 'high',
          checklistPoints: [
            'Check filter pressure gauge',
            'Backwash or clean filter as needed',
            'Inspect filter media condition',
            'Check for leaks or damage',
            'Test multiport valve operation'
          ]
        },
        {
          category: 'general',
          itemName: 'Pool Chlorinator',
          description: 'Inspect chlorinator and salt cell (if applicable)',
          frequency: 'monthly',
          priority: 'high',
          checklistPoints: [
            'Check chlorine output levels',
            'Inspect salt cell for calcium buildup',
            'Test chlorinator control panel',
            'Check chemical dispenser operation',
            'Verify proper chlorine residual'
          ]
        },
        {
          category: 'general',
          itemName: 'Water Chemistry',
          description: 'Test and balance pool water chemistry',
          frequency: 'weekly',
          priority: 'critical',
          photoRequired: true,
          checklistPoints: [
            'Test pH levels (7.2-7.6 ideal)',
            'Check chlorine levels (1-3 ppm)',
            'Test alkalinity (80-120 ppm)',
            'Check calcium hardness',
            'Take photo of test results'
          ]
        },
        {
          category: 'safety',
          itemName: 'Pool Safety Barriers',
          description: 'Inspect pool fencing and safety barriers for compliance',
          frequency: 'quarterly',
          priority: 'critical',
          photoRequired: true,
          complianceStandard: 'AS 1926.1 - Annual check',
          complianceYears: 1,
          checklistPoints: [
            'Check fence height (minimum 1.2m)',
            'Test self-closing gate operation',
            'Verify self-latching mechanism',
            'Check for climbing hazards near fence',
            'Inspect fence integrity and gaps',
            'Take photo of gate and latch'
          ]
        },
        {
          category: 'general',
          itemName: 'Pool Heater',
          description: 'Inspect pool heater operation and efficiency',
          frequency: 'quarterly',
          priority: 'medium',
          checklistPoints: [
            'Test heater ignition and operation',
            'Check for gas leaks (if gas heater)',
            'Inspect heat exchanger',
            'Check thermostat accuracy',
            'Clean burner assembly'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Pool Lighting',
          description: 'Test pool and spa lighting systems',
          frequency: 'quarterly',
          priority: 'medium',
          checklistPoints: [
            'Test all pool lights',
            'Check for water in light fixtures',
            'Inspect lens and seals',
            'Test GFCI protection',
            'Check transformer operation'
          ]
        },
        {
          category: 'structural',
          itemName: 'Pool Surface and Tiles',
          description: 'Inspect pool surface, tiles, and grout condition',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Check for cracks in pool surface',
            'Inspect tile condition and adhesion',
            'Check grout for deterioration',
            'Look for discoloration or staining',
            'Inspect waterline tiles'
          ]
        },
        {
          category: 'general',
          itemName: 'Pool Skimmer and Returns',
          description: 'Inspect skimmer boxes and return jets',
          frequency: 'monthly',
          priority: 'medium',
          checklistPoints: [
            'Clean skimmer basket',
            'Check skimmer weir operation',
            'Inspect return jet direction',
            'Check for leaks around fittings',
            'Test eyeball fitting adjustment'
          ]
        },
        {
          category: 'general',
          itemName: 'Pool Cleaner',
          description: 'Inspect automatic pool cleaner operation',
          frequency: 'monthly',
          priority: 'low',
          checklistPoints: [
            'Check cleaner operation and coverage',
            'Inspect hoses for leaks',
            'Clean debris bag or canister',
            'Check wheels and brushes',
            'Test cleaner timer settings'
          ]
        }
      ],

      // Wine Cellar-specific items
      wine_cellar: [
        {
          category: 'hvac',
          itemName: 'Temperature Control Unit',
          description: 'Inspect wine cellar cooling system and temperature controls',
          frequency: 'quarterly',
          priority: 'critical',
          checklistPoints: [
            'Check temperature consistency (55-58°F)',
            'Test cooling unit operation',
            'Inspect condensation drainage',
            'Check thermostat calibration',
            'Clean air filters and coils'
          ]
        },
        {
          category: 'hvac',
          itemName: 'Humidity Control',
          description: 'Monitor and maintain proper humidity levels',
          frequency: 'monthly',
          priority: 'high',
          checklistPoints: [
            'Check humidity levels (60-70%)',
            'Inspect humidifier operation',
            'Test dehumidifier if present',
            'Check for condensation issues',
            'Monitor hygrometer accuracy'
          ]
        },
        {
          category: 'structural',
          itemName: 'Wine Storage Racks',
          description: 'Inspect wine storage racks and shelving systems',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Check rack stability and mounting',
            'Inspect for damage or wear',
            'Test weight capacity',
            'Look for mold or moisture damage',
            'Check labeling system'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Cellar Lighting',
          description: 'Inspect low-heat lighting system',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test LED lighting operation',
            'Check for heat generation',
            'Inspect electrical connections',
            'Verify UV protection',
            'Test dimmer controls'
          ]
        }
      ],

      // Media Room-specific items
      media_room: [
        {
          category: 'electrical',
          itemName: 'Audio Visual Equipment',
          description: 'Test and inspect AV equipment and connections',
          frequency: 'quarterly',
          priority: 'medium',
          checklistPoints: [
            'Test all input/output connections',
            'Check remote control operation',
            'Inspect cable management',
            'Test audio quality and volume',
            'Check for overheating equipment'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Projector and Screen',
          description: 'Inspect projection equipment and screen condition',
          frequency: 'quarterly',
          priority: 'medium',
          checklistPoints: [
            'Clean projector lens and filters',
            'Test image quality and focus',
            'Check screen for tears or stains',
            'Inspect mounting hardware',
            'Test remote control functions'
          ]
        },
        {
          category: 'hvac',
          itemName: 'Room Acoustics',
          description: 'Check sound dampening and acoustic treatments',
          frequency: 'annual',
          priority: 'low',
          checklistPoints: [
            'Inspect acoustic panels condition',
            'Check for sound leakage',
            'Test speaker placement',
            'Verify carpet and fabric condition',
            'Check door sealing'
          ]
        }
      ],

      // Home Gym-specific items
      gym: [
        {
          category: 'structural',
          itemName: 'Exercise Equipment Mounting',
          description: 'Inspect wall-mounted and floor equipment security',
          frequency: 'quarterly',
          priority: 'critical',
          checklistPoints: [
            'Check wall mount stability',
            'Inspect anchor bolts and screws',
            'Test equipment movement range',
            'Check floor anchor points',
            'Verify weight capacity ratings'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Exercise Equipment Power',
          description: 'Test electrical equipment and safety features',
          frequency: 'quarterly',
          priority: 'high',
          checklistPoints: [
            'Test equipment power and operation',
            'Check emergency stop functions',
            'Inspect power cords for damage',
            'Test GFCI outlets',
            'Check grounding connections'
          ]
        },
        {
          category: 'safety',
          itemName: 'Exercise Area Safety',
          description: 'Inspect safety features and equipment condition',
          frequency: 'monthly',
          priority: 'high',
          checklistPoints: [
            'Check floor surface condition',
            'Inspect for trip hazards',
            'Test lighting adequacy',
            'Check mirror mounting security',
            'Verify first aid kit availability'
          ]
        }
      ],

      // Sauna-specific items
      sauna: [
        {
          category: 'electrical',
          itemName: 'Sauna Heater',
          description: 'Inspect electric or infrared heating elements',
          frequency: 'quarterly',
          priority: 'critical',
          checklistPoints: [
            'Test heater operation and controls',
            'Check temperature accuracy',
            'Inspect heating elements',
            'Test timer functions',
            'Check electrical connections'
          ]
        },
        {
          category: 'structural',
          itemName: 'Wood Condition',
          description: 'Inspect cedar or other wood surfaces',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Check for warping or cracking',
            'Look for staining or discoloration',
            'Inspect bench stability',
            'Check wood treatment condition',
            'Test door operation and sealing'
          ]
        },
        {
          category: 'hvac',
          itemName: 'Ventilation System',
          description: 'Check sauna ventilation and air circulation',
          frequency: 'quarterly',
          priority: 'high',
          checklistPoints: [
            'Test exhaust fan operation',
            'Check air intake vents',
            'Inspect ductwork for blockages',
            'Test humidity control',
            'Check for proper air flow'
          ]
        }
      ],

      // Conference Room-specific items
      conference_room: [
        {
          category: 'electrical',
          itemName: 'Presentation Equipment',
          description: 'Test projectors, screens, and audio visual systems',
          frequency: 'quarterly',
          priority: 'medium',
          checklistPoints: [
            'Test projector operation and image quality',
            'Check screen deployment and retraction',
            'Test audio system and microphones',
            'Verify remote control functions',
            'Check cable and connection integrity'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Conference Table Power',
          description: 'Inspect table-mounted power outlets and data ports',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test all power outlets',
            'Check USB charging ports',
            'Inspect data connection ports',
            'Test pop-up outlet mechanisms',
            'Check cable management systems'
          ]
        }
      ],

      // Patio-specific items
      patio: [
        {
          category: 'structural',
          itemName: 'Patio Surface',
          description: 'Inspect concrete, pavers, or stone patio surface',
          frequency: 'quarterly',
          priority: 'medium',
          checklistPoints: [
            'Check for cracks in concrete/pavers',
            'Look for uneven or settling areas',
            'Inspect for weed growth between pavers',
            'Check drainage and water pooling',
            'Test surface stability and levelness'
          ]
        },
        {
          category: 'structural',
          itemName: 'Patio Drainage',
          description: 'Check proper water drainage and slope',
          frequency: 'biannual',
          priority: 'high',
          checklistPoints: [
            'Verify proper slope away from house',
            'Check drain functionality',
            'Inspect for standing water areas',
            'Clear debris from drainage systems',
            'Test water flow during rain'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Outdoor Lighting',
          description: 'Inspect patio lighting fixtures and wiring',
          frequency: 'quarterly',
          priority: 'medium',
          checklistPoints: [
            'Test all patio lights are functional',
            'Check light fixtures for water damage',
            'Inspect wiring and connections',
            'Check for exposed wires or damaged cables',
            'Verify timer/sensor operation if applicable'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Outdoor Power Outlets',
          description: 'Inspect outdoor GPO/power outlets for safety',
          frequency: 'quarterly',
          priority: 'high',
          checklistPoints: [
            'Test outlet operation with tester',
            'Check GFCI/RCD protection is functional',
            'Inspect weatherproof covers',
            'Check for water ingress or corrosion',
            'Verify proper grounding'
          ]
        }
      ],

      // Balcony-specific items
      balcony: [
        {
          category: 'safety',
          itemName: 'Balcony Railings',
          description: 'Inspect railing height, stability, and safety features',
          frequency: 'quarterly',
          priority: 'critical',
          checklistPoints: [
            'Test railing stability and height',
            'Check baluster spacing and security',
            'Inspect for rust or corrosion',
            'Verify minimum height requirements',
            'Test railing attachment points'
          ]
        },
        {
          category: 'structural',
          itemName: 'Balcony Structure',
          description: 'Inspect structural integrity and condition',
          frequency: 'biannual',
          priority: 'critical',
          checklistPoints: [
            'Check for structural movement',
            'Inspect surface for damage or wear',
            'Look for cracks or damage',
            'Test drainage systems',
            'Check attachment to building'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Outdoor Lighting',
          description: 'Inspect balcony lighting fixtures and wiring',
          frequency: 'quarterly',
          priority: 'medium',
          checklistPoints: [
            'Test all balcony lights are functional',
            'Check light fixtures for water damage',
            'Inspect wiring and connections',
            'Check for exposed wires or damaged cables',
            'Verify switch operation'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Outdoor Power Outlets',
          description: 'Inspect outdoor GPO/power outlets for safety',
          frequency: 'quarterly',
          priority: 'high',
          checklistPoints: [
            'Test outlet operation with tester',
            'Check GFCI/RCD protection is functional',
            'Inspect weatherproof covers',
            'Check for water ingress or corrosion',
            'Verify proper grounding'
          ]
        }
      ],

      // Courtyard-specific items
      courtyard: [
        {
          category: 'structural',
          itemName: 'Paving Condition',
          description: 'Inspect pavers for cracks, settling, or loose units',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Check for cracked or broken pavers',
            'Look for settling or uneven areas',
            'Inspect for weed growth between joints',
            'Test surface stability',
            'Check for trip hazards'
          ]
        },
        {
          category: 'structural',
          itemName: 'Courtyard Drainage',
          description: 'Check courtyard drainage and water runoff',
          frequency: 'biannual',
          priority: 'high',
          checklistPoints: [
            'Verify proper slope for drainage',
            'Clear drain grates and channels',
            'Check for water pooling areas',
            'Test drainage during watering',
            'Inspect retaining walls for water damage'
          ]
        },
        {
          category: 'structural',
          itemName: 'Retaining Walls',
          description: 'Inspect any retaining walls for cracks or movement',
          frequency: 'annual',
          priority: 'high',
          checklistPoints: [
            'Check for new cracks or movement',
            'Inspect weep holes are clear',
            'Look for bulging or leaning',
            'Test wall stability',
            'Check drainage behind wall'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Outdoor Lighting',
          description: 'Check courtyard lights, sensors, and wiring',
          frequency: 'quarterly',
          priority: 'medium',
          checklistPoints: [
            'Test all courtyard lights',
            'Check fixtures for water damage',
            'Inspect wiring connections',
            'Test motion sensors and timers',
            'Clean light fixtures'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Outdoor Power Outlets',
          description: 'Inspect courtyard power outlets for safety and weatherproofing',
          frequency: 'quarterly',
          priority: 'high',
          checklistPoints: [
            'Test outlet operation',
            'Check GFCI/RCD protection',
            'Inspect weatherproof covers',
            'Check for corrosion',
            'Verify proper grounding'
          ]
        }
      ],

      // Roof Terrace-specific items
      roof_terrace: [
        {
          category: 'structural',
          itemName: 'Waterproof Membrane',
          description: 'Inspect waterproof membrane for damage or deterioration',
          frequency: 'biannual',
          priority: 'critical',
          checklistPoints: [
            'Check membrane for cracks or tears',
            'Inspect seams and overlaps',
            'Look for ponding water areas',
            'Check around penetrations',
            'Verify edge conditions'
          ]
        },
        {
          category: 'structural',
          itemName: 'Terrace Drainage',
          description: 'Check terrace drains are clear and functional',
          frequency: 'quarterly',
          priority: 'high',
          checklistPoints: [
            'Clear debris from drains',
            'Test water flow to drains',
            'Check drain covers are secure',
            'Inspect overflow drainage',
            'Verify proper slope to drains'
          ]
        },
        {
          category: 'safety',
          itemName: 'Safety Barriers',
          description: 'Inspect balustrades, railings, and edge protection',
          frequency: 'quarterly',
          priority: 'critical',
          checklistPoints: [
            'Test railing stability',
            'Check height meets code',
            'Inspect for corrosion or damage',
            'Verify baluster spacing',
            'Test attachment points'
          ]
        },
        {
          category: 'structural',
          itemName: 'Surface Condition',
          description: 'Check tiles, decking, or surface material condition',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Check for cracked or loose tiles',
            'Inspect decking for damage',
            'Look for slip hazards',
            'Test surface stability',
            'Check for drainage issues'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Outdoor Lighting',
          description: 'Check terrace lights, sensors, and wiring',
          frequency: 'quarterly',
          priority: 'medium',
          checklistPoints: [
            'Test all terrace lights',
            'Check for water damage',
            'Inspect wiring',
            'Test timers and sensors',
            'Clean fixtures'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Outdoor Power Outlets',
          description: 'Inspect terrace power outlets for safety and weatherproofing',
          frequency: 'quarterly',
          priority: 'high',
          checklistPoints: [
            'Test outlet operation',
            'Check GFCI/RCD protection',
            'Inspect weatherproof covers',
            'Check for corrosion',
            'Verify grounding'
          ]
        }
      ],

      // Garden-specific items
      garden: [
        {
          category: 'plumbing',
          itemName: 'Irrigation System',
          description: 'Check sprinklers, drip lines, and timer operation',
          frequency: 'quarterly',
          priority: 'medium',
          checklistPoints: [
            'Test all sprinkler heads for proper operation',
            'Check drip line connections and flow',
            'Verify timer programming and battery',
            'Inspect for leaks or broken lines',
            'Test zone coverage and overlap'
          ]
        },
        {
          category: 'structural',
          itemName: 'Garden Drainage',
          description: 'Check garden drainage and water flow patterns',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Inspect drainage channels and swales',
            'Check for water pooling areas',
            'Verify proper slope away from structures',
            'Clear debris from drain grates',
            'Test drainage during watering'
          ]
        },
        {
          category: 'structural',
          itemName: 'Garden Fencing and Gates',
          description: 'Inspect garden fencing and gate operation',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Check fence post stability',
            'Inspect for rot or damage',
            'Test gate hinges and latches',
            'Check fence panels for gaps',
            'Verify fence height and security'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Outdoor Lighting',
          description: 'Check garden lights, sensors, and wiring',
          frequency: 'quarterly',
          priority: 'medium',
          checklistPoints: [
            'Test all garden lights for operation',
            'Check light fixtures for water damage',
            'Inspect low-voltage wiring connections',
            'Test motion sensors and timers',
            'Clean solar panel lights if present'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Outdoor Power Outlets',
          description: 'Inspect garden power outlets for safety and weatherproofing',
          frequency: 'quarterly',
          priority: 'high',
          checklistPoints: [
            'Test outlet operation with tester',
            'Check GFCI/RCD protection is functional',
            'Inspect weatherproof covers',
            'Check for water ingress or corrosion',
            'Verify proper grounding'
          ]
        }
      ],

      // Garage-specific items
      garage: [
        {
          category: 'mechanical',
          itemName: 'Garage Door Opener',
          description: 'Test automatic garage door system and safety features',
          frequency: 'quarterly',
          priority: 'high',
          checklistPoints: [
            'Test door opening/closing operation',
            'Check safety reverse mechanism',
            'Inspect door tracks and rollers',
            'Test remote control operation',
            'Check emergency release function'
          ]
        },
        {
          category: 'structural',
          itemName: 'Garage Floor',
          description: 'Inspect concrete floor for cracks and oil stains',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Check for floor cracks or settling',
            'Inspect for oil stain penetration',
            'Look for water damage or pooling',
            'Check floor levelness',
            'Inspect floor drain functionality'
          ]
        }
      ],

      // Study/Office-specific items
      study: [
        {
          category: 'electrical',
          itemName: 'Office Equipment Power',
          description: 'Inspect electrical outlets and data connections',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test all power outlets',
            'Check USB charging ports',
            'Inspect network/data connections',
            'Test surge protection devices',
            'Check cable management'
          ]
        }
      ],

      // Attic-specific items
      attic: [
        {
          category: 'structural',
          itemName: 'Attic Insulation',
          description: 'Inspect insulation condition and coverage',
          frequency: 'annual',
          priority: 'high',
          checklistPoints: [
            'Check insulation thickness and coverage',
            'Look for gaps or compressed areas',
            'Inspect for pest damage',
            'Check vapor barrier condition',
            'Verify proper ventilation clearance'
          ]
        },
        {
          category: 'structural',
          itemName: 'Roof Structure',
          description: 'Inspect rafters, trusses, and roof decking',
          frequency: 'annual',
          priority: 'critical',
          checklistPoints: [
            'Check for sagging or damaged rafters',
            'Inspect roof decking condition',
            'Look for water damage or stains',
            'Check truss connections',
            'Inspect for pest damage'
          ]
        }
      ],

      // Basement-specific items
      basement: [
        {
          category: 'structural',
          itemName: 'Foundation Walls',
          description: 'Inspect foundation walls for cracks and moisture',
          frequency: 'biannual',
          priority: 'critical',
          checklistPoints: [
            'Check for new or expanding cracks',
            'Look for water infiltration signs',
            'Inspect for efflorescence (white deposits)',
            'Check wall plumbness and alignment',
            'Test moisture levels'
          ]
        },
        {
          category: 'mechanical',
          itemName: 'Sump Pump',
          description: 'Test sump pump operation and backup systems',
          frequency: 'quarterly',
          priority: 'critical',
          checklistPoints: [
            'Test pump operation with water',
            'Check float switch operation',
            'Inspect discharge pipe',
            'Test backup power system',
            'Check pit condition and cleanliness'
          ]
        }
      ]
    };

    // Define outdoor/exterior room types that should NOT get indoor electrical items
    const exteriorRoomTypes = [
      'pool', 'deck', 'patio', 'balcony', 'garden', 'courtyard', 'roof_terrace',
      'veranda', 'pergola', 'gazebo', 'carport', 'driveway', 'roof', 'gutters'
    ];

    // Default outdoor items for exterior rooms without specific templates
    const outdoorDefaultItems: Omit<InsertInspectionItem, 'roomId'>[] = [
      {
        category: 'structural',
        itemName: 'Surface Condition',
        description: 'Inspect outdoor surface for damage or deterioration',
        frequency: 'biannual',
        priority: 'medium',
        checklistPoints: [
          'Check for cracks or damage',
          'Look for settling or movement',
          'Inspect for weather damage',
          'Check drainage conditions',
          'Test surface stability'
        ]
      },
      {
        category: 'electrical',
        itemName: 'Outdoor Lighting',
        description: 'Check outdoor lights, sensors, and wiring',
        frequency: 'quarterly',
        priority: 'medium',
        checklistPoints: [
          'Test all lights for operation',
          'Check fixtures for water damage',
          'Inspect wiring connections',
          'Test motion sensors and timers',
          'Clean light fixtures'
        ]
      },
      {
        category: 'electrical',
        itemName: 'Outdoor Power Outlets',
        description: 'Inspect outdoor power outlets for safety and weatherproofing',
        frequency: 'quarterly',
        priority: 'high',
        checklistPoints: [
          'Test outlet operation',
          'Check GFCI/RCD protection',
          'Inspect weatherproof covers',
          'Check for corrosion or damage',
          'Verify proper grounding'
        ]
      }
    ];

    // PRIORITY 1: Handle exterior rooms FIRST to prevent indoor items from being added
    if (exteriorRoomTypes.includes(template)) {
      // If exterior room has a specific template, use only those items
      if (roomSpecificItems[template]) {
        return roomSpecificItems[template];
      }
      // Otherwise, return default outdoor items (no indoor electrical items)
      return outdoorDefaultItems;
    }

    // PRIORITY 2: Handle rooms with specific templates (indoor specialty rooms)
    if (roomSpecificItems[template]) {
      // For indoor specialty rooms, include some basic electrical/general items
      const basicElectricalItems = baseItems.filter(item => 
        item.category === 'electrical' || item.category === 'general'
      ).slice(0, 2);
      return [...roomSpecificItems[template], ...basicElectricalItems];
    }

    // PRIORITY 3: Handle bedroom types with proper inspection items
    if (template === 'master_bedroom' || template.includes('bedroom') || template === 'guest_bedroom' || template === 'kids_bedroom') {
      return [
        {
          category: 'electrical',
          itemName: 'Light Switch',
          description: 'Check operation and condition of light switches',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test all light switches for proper operation',
            'Check for flickering or dimming',
            'Inspect switch plates for damage',
            'Verify correct wiring'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Power Points (GPO)',
          description: 'Test and inspect general power outlets',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test all power outlets with tester',
            'Check for loose outlets',
            'Inspect for damage or scorch marks',
            'Verify GFCI protection where required'
          ]
        },
        {
          category: 'safety',
          itemName: 'Smoke Detector',
          description: 'Test smoke detector functionality, battery, and verify age',
          frequency: 'monthly',
          priority: 'critical',
          checklistPoints: [
            'Press test button to verify alarm sounds',
            'Check battery level indicator',
            'Verify manufacture date on unit (replace if 10+ years old)',
            'Clean detector housing and vents',
            'Take photo showing manufacture date stamp'
          ]
        },
        {
          category: 'windows_doors',
          itemName: 'Windows',
          description: 'Inspect window condition, operation, locks, and seals',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test window opens and closes smoothly',
            'Check window locks are secure',
            'Inspect seals and weatherstripping',
            'Look for cracks or damage to glass',
            'Check for condensation between panes'
          ]
        },
        {
          category: 'furnishings',
          itemName: 'Window Furnishings',
          description: 'Check condition of curtains, blinds, and window treatments',
          frequency: 'biannual',
          priority: 'low',
          checklistPoints: [
            'Test blind or curtain operation',
            'Check cord condition and safety',
            'Inspect mounting brackets',
            'Look for damage or staining',
            'Check child safety compliance'
          ]
        },
        {
          category: 'hvac',
          itemName: 'Air Conditioning',
          description: 'Test air conditioning system operation and filters',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test cooling and heating modes',
            'Check filters and clean if needed',
            'Verify thermostat operation',
            'Check for unusual noises',
            'Inspect vents for blockages'
          ]
        },
        {
          category: 'safety',
          itemName: 'Window Restrictors',
          description: 'Check window restrictor devices for child safety compliance (AS 1926.2)',
          frequency: 'biannual',
          priority: 'high',
          checklistPoints: [
            'Verify restrictors are fitted to all openable windows',
            'Test restrictor limits opening to 125mm or less',
            'Check restrictor mechanism is secure and functional',
            'Inspect for damage or tampering',
            'Confirm adult release mechanism works correctly'
          ]
        }
      ];
    }

    if (template.includes('bathroom') || template === 'master_ensuite' || template === 'powder_room') {
      return [
        {
          category: 'electrical',
          itemName: 'Light Switch',
          description: 'Check operation and condition of light switches',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test all light switches for proper operation',
            'Check for flickering or dimming',
            'Inspect switch plates for damage',
            'Verify correct wiring'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Power Points (GPO)',
          description: 'Test and inspect general power outlets',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test all power outlets with tester',
            'Check for loose outlets',
            'Inspect for damage or scorch marks',
            'Verify GFCI protection where required'
          ]
        },
        {
          category: 'windows_doors',
          itemName: 'Windows',
          description: 'Inspect window condition, operation, locks, and seals',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test window opens and closes smoothly',
            'Check window locks are secure',
            'Inspect seals and weatherstripping',
            'Look for cracks or damage to glass',
            'Check for condensation between panes'
          ]
        },
        {
          category: 'furnishings',
          itemName: 'Window Furnishings',
          description: 'Check condition of curtains, blinds, and window treatments',
          frequency: 'biannual',
          priority: 'low',
          checklistPoints: [
            'Test blind or curtain operation',
            'Check cord condition and safety',
            'Inspect mounting brackets',
            'Look for damage or staining',
            'Check child safety compliance'
          ]
        },
        {
          category: 'plumbing',
          itemName: 'Vanity Tap & Flexi Hoses',
          description: 'Inspect vanity tap operation and flexi hose condition',
          frequency: 'quarterly',
          priority: 'high',
          checklistPoints: [
            'Test hot and cold water flow',
            'Check for drips or leaks',
            'Inspect flexi hose for bulging or damage',
            'Check connections under vanity',
            'Verify isolation valve operation'
          ]
        },
        {
          category: 'plumbing',
          itemName: 'Toilet & Flexi Hose',
          description: 'Inspect toilet operation and water supply connection',
          frequency: 'quarterly',
          priority: 'high',
          checklistPoints: [
            'Test flush mechanism',
            'Check for leaks at base',
            'Inspect flexi hose condition',
            'Check cistern for running water',
            'Verify seat and lid security'
          ]
        },
        {
          category: 'plumbing',
          itemName: 'Shower',
          description: 'Inspect shower operation and condition',
          frequency: 'quarterly',
          priority: 'high',
          checklistPoints: [
            'Test water flow and temperature',
            'Check showerhead for blockages',
            'Inspect grout and sealant',
            'Check for leaks at base',
            'Test drain flow rate'
          ]
        },
        {
          category: 'plumbing',
          itemName: 'Bath',
          description: 'Check bath taps and drainage',
          frequency: 'quarterly',
          priority: 'medium',
          checklistPoints: [
            'Test tap operation',
            'Check for drips or leaks',
            'Test bath drainage speed',
            'Inspect plug and waste',
            'Check sealant around bath'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Exhaust Fan',
          description: 'Test bathroom exhaust fan operation',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test fan operation',
            'Check for unusual noises',
            'Clean fan grille',
            'Verify adequate airflow',
            'Check timer/switch operation'
          ]
        },
        {
          category: 'general',
          itemName: 'Cabinetry & Storage',
          description: 'Inspect vanity cabinets, mirrors, and bathroom storage',
          frequency: 'biannual',
          priority: 'low',
          checklistPoints: [
            'Test all door and drawer operation',
            'Check hinges and handles for security',
            'Inspect for moisture damage or swelling',
            'Verify mirror mounting is secure',
            'Check shelf condition and brackets'
          ]
        }
      ];
    }

    if (template === 'kitchen') {
      return [
        {
          category: 'electrical',
          itemName: 'Light Switch',
          description: 'Check operation and condition of light switches',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test all light switches for proper operation',
            'Check for flickering or dimming',
            'Inspect switch plates for damage',
            'Verify correct wiring'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Power Points (GPO)',
          description: 'Test and inspect general power outlets',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test all power outlets with tester',
            'Check for loose outlets',
            'Inspect for damage or scorch marks',
            'Verify GFCI protection where required'
          ]
        },
        {
          category: 'safety',
          itemName: 'Smoke Detector',
          description: 'Test smoke detector functionality, battery, and verify age',
          frequency: 'monthly',
          priority: 'critical',
          checklistPoints: [
            'Press test button to verify alarm sounds',
            'Check battery level indicator',
            'Verify manufacture date on unit (replace if 10+ years old)',
            'Clean detector housing and vents',
            'Take photo showing manufacture date stamp'
          ]
        },
        {
          category: 'windows_doors',
          itemName: 'Windows',
          description: 'Inspect window condition, operation, locks, and seals',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test window opens and closes smoothly',
            'Check window locks are secure',
            'Inspect seals and weatherstripping',
            'Look for cracks or damage to glass',
            'Check for condensation between panes'
          ]
        },
        {
          category: 'furnishings',
          itemName: 'Window Furnishings',
          description: 'Check condition of curtains, blinds, and window treatments',
          frequency: 'biannual',
          priority: 'low',
          checklistPoints: [
            'Test blind or curtain operation',
            'Check cord condition and safety',
            'Inspect mounting brackets',
            'Look for damage or staining',
            'Check child safety compliance'
          ]
        },
        {
          category: 'plumbing',
          itemName: 'Kitchen Tap & Flexi Hoses',
          description: 'Inspect kitchen tap operation and flexi hose condition',
          frequency: 'quarterly',
          priority: 'high',
          checklistPoints: [
            'Test hot and cold water flow',
            'Check for drips or leaks',
            'Inspect flexi hose for bulging or damage',
            'Check connections under sink',
            'Verify isolation valve operation'
          ]
        },
        {
          category: 'appliance',
          itemName: 'Dishwasher',
          description: 'Test dishwasher operation and drainage',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Check inlet hose for damage or leaks',
            'Inspect outlet hose connection',
            'Verify isolation valve operation',
            'Check for water damage around connections'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Rangehood',
          description: 'Test rangehood fan and lights',
          frequency: 'quarterly',
          priority: 'medium',
          checklistPoints: [
            'Test fan operation at all speeds',
            'Check lights are working',
            'Inspect and clean filters',
            'Check exhaust ducting',
            'Test controls and switches'
          ]
        },
        {
          category: 'gas',
          itemName: 'Gas Cooktop Connection',
          description: 'Gas appliance inspection by licensed gas fitter - certificate required',
          frequency: 'annual',
          priority: 'critical',
          inspectionType: 'professional',
          photoRequired: true,
          checklistPoints: [
            'Full inspection of gas connections by licensed gas fitter',
            'Check bayonet cap is secure',
            'Leak test with approved equipment',
            'Verify connection integrity and compliance',
            'Issue Gas Safety Certificate'
          ]
        },
        {
          category: 'general',
          itemName: 'Benchtop & Splashback',
          description: 'Inspect benchtop surfaces and splashback for damage or wear',
          frequency: 'biannual',
          priority: 'low',
          checklistPoints: [
            'Check for chips, cracks, or scratches',
            'Inspect grout and sealant condition',
            'Look for water damage or staining',
            'Test surface stability',
            'Check joins and edges'
          ]
        },
        {
          category: 'general',
          itemName: 'Cabinetry & Storage',
          description: 'Inspect kitchen cabinets, drawers, and pantry storage',
          frequency: 'biannual',
          priority: 'low',
          checklistPoints: [
            'Test all door and drawer operation',
            'Check hinges and handles for security',
            'Inspect drawer runners and soft-close mechanisms',
            'Look for signs of moisture damage or pest activity',
            'Check shelf condition and brackets'
          ]
        }
      ];
    }

    if (template === 'laundry') {
      return [
        {
          category: 'electrical',
          itemName: 'Light Switch',
          description: 'Check operation and condition of light switches',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test all light switches for proper operation',
            'Check for flickering or dimming',
            'Inspect switch plates for damage',
            'Verify correct wiring'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Power Points (GPO)',
          description: 'Test and inspect general power outlets',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test all power outlets with tester',
            'Check for loose outlets',
            'Inspect for damage or scorch marks',
            'Verify GFCI protection where required'
          ]
        },
        {
          category: 'safety',
          itemName: 'Smoke Detector',
          description: 'Test smoke detector functionality, battery, and verify age',
          frequency: 'monthly',
          priority: 'critical',
          checklistPoints: [
            'Press test button to verify alarm sounds',
            'Check battery level indicator',
            'Verify manufacture date on unit (replace if 10+ years old)',
            'Clean detector housing and vents',
            'Take photo showing manufacture date stamp'
          ]
        },
        {
          category: 'windows_doors',
          itemName: 'Windows',
          description: 'Inspect window condition, operation, locks, and seals',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test window opens and closes smoothly',
            'Check window locks are secure',
            'Inspect seals and weatherstripping',
            'Look for cracks or damage to glass',
            'Check for condensation between panes'
          ]
        },
        {
          category: 'furnishings',
          itemName: 'Window Furnishings',
          description: 'Check condition of curtains, blinds, and window treatments',
          frequency: 'biannual',
          priority: 'low',
          checklistPoints: [
            'Test blind or curtain operation',
            'Check cord condition and safety',
            'Inspect mounting brackets',
            'Look for damage or staining',
            'Check child safety compliance'
          ]
        },
        {
          category: 'plumbing',
          itemName: 'Laundry Tap & Flexi Hoses',
          description: 'Inspect laundry tap operation and flexi hose condition',
          frequency: 'quarterly',
          priority: 'high',
          checklistPoints: [
            'Check hot and cold tap operation',
            'Inspect for leaks',
            'Check washing machine flexi hoses',
            'Verify hose installation dates',
            'Take photo of all flexi hoses'
          ]
        },
        {
          category: 'plumbing',
          itemName: 'Drainage',
          description: 'Check laundry drainage and floor waste',
          frequency: 'quarterly',
          priority: 'medium',
          checklistPoints: [
            'Test floor waste drainage',
            'Check for blockages',
            'Inspect washing machine outlet',
            'Check for water pooling',
            'Verify trap is holding water'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Dryer Vent',
          description: 'Check dryer vent operation and clearance',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Inspect vent for lint buildup',
            'Check vent flap operates freely',
            'Verify adequate clearance around dryer',
            'Test airflow at exhaust point',
            'Clean lint filter'
          ]
        },
        {
          category: 'gas',
          itemName: 'Gas Dryer/Hot Water Inspection',
          description: 'Gas dryer or hot water inspection by licensed gas fitter - certificate required',
          frequency: 'biannual',
          priority: 'critical',
          inspectionType: 'professional',
          photoRequired: true,
          checklistPoints: [
            'Full inspection of gas connections by licensed gas fitter',
            'Check gas dryer connection and flue',
            'Inspect gas hot water system if present',
            'Leak test with approved equipment',
            'Issue Gas Safety Certificate'
          ]
        }
      ];
    }

    // Butler's Pantry - specific items only (no inappropriate plumbing items)
    if (template === 'butler_pantry') {
      return [
        {
          category: 'electrical',
          itemName: 'Light Switch',
          description: 'Check operation and condition of light switches',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test all light switches for proper operation',
            'Check for flickering or dimming',
            'Inspect switch plates for damage',
            'Verify correct wiring'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Power Points (GPO)',
          description: 'Test and inspect general power outlets',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test all power outlets with tester',
            'Check for loose outlets',
            'Inspect for damage or scorch marks',
            'Verify GFCI protection where required'
          ]
        },
        {
          category: 'plumbing',
          itemName: 'Sink Tap & Flexi Hoses',
          description: 'Inspect sink tap operation and flexi hose condition',
          frequency: 'quarterly',
          priority: 'medium',
          checklistPoints: [
            'Test hot and cold water flow',
            'Check under sink for leaks',
            'Inspect flexi hose condition',
            'Test sink drainage speed',
            'Check tap washer condition'
          ]
        },
        {
          category: 'plumbing',
          itemName: 'Dishwasher Connection',
          description: 'Check dishwasher water and drainage connections if present',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Check inlet hose for damage or leaks',
            'Inspect outlet hose connection',
            'Verify isolation valve operation',
            'Check for water damage around connections'
          ]
        },
        {
          category: 'general',
          itemName: 'Benchtop & Splashback',
          description: 'Inspect benchtop surfaces and splashback for damage or wear',
          frequency: 'biannual',
          priority: 'low',
          checklistPoints: [
            'Check for chips, cracks, or scratches',
            'Inspect grout and sealant condition',
            'Look for water damage or staining',
            'Test surface stability'
          ]
        },
        {
          category: 'general',
          itemName: 'Cabinetry & Storage',
          description: 'Check cabinet doors, hinges, and shelving condition',
          frequency: 'biannual',
          priority: 'low',
          checklistPoints: [
            'Test all door and drawer operation',
            'Check hinges and handles for security',
            'Inspect shelf condition and brackets',
            'Look for signs of moisture damage'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Bar Fridge Connection',
          description: 'Inspect power connection for bar fridge if present',
          frequency: 'biannual',
          priority: 'low',
          checklistPoints: [
            'Check power outlet condition',
            'Verify proper ventilation space',
            'Inspect power cord for damage',
            'Test fridge operation'
          ]
        },
      ];
    }

    // Living areas (living_room, family_room, lounge, dining_room)
    if (template === 'living_room' || template === 'family_room' || template === 'lounge' || template === 'dining_room') {
      return [
        {
          category: 'electrical',
          itemName: 'Light Switch',
          description: 'Check operation and condition of light switches',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test all light switches for proper operation',
            'Check for flickering or dimming',
            'Inspect switch plates for damage',
            'Verify correct wiring'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Power Points (GPO)',
          description: 'Test and inspect general power outlets',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test all power outlets with tester',
            'Check for loose outlets',
            'Inspect for damage or scorch marks',
            'Verify GFCI protection where required'
          ]
        },
        {
          category: 'safety',
          itemName: 'Smoke Detector',
          description: 'Test smoke detector functionality, battery, and verify age',
          frequency: 'monthly',
          priority: 'critical',
          checklistPoints: [
            'Press test button to verify alarm sounds',
            'Check battery level indicator',
            'Verify manufacture date on unit (replace if 10+ years old)',
            'Clean detector housing and vents',
            'Take photo showing manufacture date stamp'
          ]
        },
        {
          category: 'windows_doors',
          itemName: 'Windows',
          description: 'Inspect window condition, operation, locks, and seals',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test window opens and closes smoothly',
            'Check window locks are secure',
            'Inspect seals and weatherstripping',
            'Look for cracks or damage to glass',
            'Check for condensation between panes'
          ]
        },
        {
          category: 'furnishings',
          itemName: 'Window Furnishings',
          description: 'Check condition of curtains, blinds, and window treatments',
          frequency: 'biannual',
          priority: 'low',
          checklistPoints: [
            'Test blind or curtain operation',
            'Check cord condition and safety',
            'Inspect mounting brackets',
            'Look for damage or staining',
            'Check child safety compliance'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Air Conditioning',
          description: 'Test air conditioning operation and filters',
          frequency: 'quarterly',
          priority: 'medium',
          checklistPoints: [
            'Test cooling and heating modes',
            'Check and clean filters',
            'Listen for unusual noises',
            'Check remote control operation',
            'Inspect outdoor unit if accessible'
          ]
        },
        {
          category: 'gas',
          itemName: 'Gas Heater/Fireplace Inspection',
          description: 'Gas heater/fireplace inspection by licensed gas fitter - certificate required',
          frequency: 'annual',
          priority: 'critical',
          inspectionType: 'professional',
          photoRequired: true,
          checklistPoints: [
            'Full inspection of gas connections by licensed gas fitter',
            'Check gas bayonet and hose connections',
            'Inspect flue and ventilation',
            'Leak test with approved equipment',
            'Issue Gas Safety Certificate'
          ]
        }
      ];
    }

    // Theater Room / Media Room
    if (template === 'theater_room' || template === 'media_room') {
      return [
        {
          category: 'electrical',
          itemName: 'Light Switch',
          description: 'Check operation and condition of light switches',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test all light switches for proper operation',
            'Check dimmer controls if present',
            'Inspect switch plates for damage',
            'Verify correct wiring'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Power Points (GPO)',
          description: 'Test and inspect general power outlets',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test all power outlets with tester',
            'Check for loose outlets',
            'Inspect for damage or scorch marks',
            'Verify GFCI protection where required'
          ]
        },
        {
          category: 'safety',
          itemName: 'Smoke Detector',
          description: 'Test smoke detector functionality, battery, and verify age',
          frequency: 'monthly',
          priority: 'critical',
          checklistPoints: [
            'Press test button to verify alarm sounds',
            'Check battery level indicator',
            'Verify manufacture date on unit (replace if 10+ years old)',
            'Clean detector housing and vents',
            'Take photo showing manufacture date stamp'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Air Conditioning',
          description: 'Test air conditioning operation and filters',
          frequency: 'quarterly',
          priority: 'medium',
          checklistPoints: [
            'Test cooling and heating modes',
            'Check and clean filters',
            'Listen for unusual noises',
            'Check remote control operation',
            'Inspect outdoor unit if accessible'
          ]
        },
        {
          category: 'general',
          itemName: 'Acoustics',
          description: 'Inspect acoustic panels, treatments, and sound insulation',
          frequency: 'annual',
          priority: 'medium',
          checklistPoints: [
            'Check acoustic panels are securely mounted',
            'Inspect for damage or wear to acoustic treatments',
            'Verify ceiling tiles or panels are in place',
            'Check door seals for sound leakage',
            'Inspect any bass traps or diffusers'
          ]
        },
        {
          category: 'furnishings',
          itemName: 'Window Furnishings',
          description: 'Check condition of curtains, blinds, and blackout treatments',
          frequency: 'biannual',
          priority: 'low',
          checklistPoints: [
            'Test blind or curtain operation',
            'Check blackout effectiveness',
            'Inspect mounting brackets',
            'Look for damage or staining'
          ]
        }
      ];
    }

    // Study/Home Office/Library
    if (template === 'study' || template === 'home_office' || template === 'office' || template === 'library') {
      return [
        {
          category: 'electrical',
          itemName: 'Light Switch',
          description: 'Check operation and condition of light switches',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test all light switches for proper operation',
            'Check for flickering or dimming',
            'Inspect switch plates for damage',
            'Verify correct wiring'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Power Points (GPO)',
          description: 'Test and inspect general power outlets',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test all power outlets with tester',
            'Check for loose outlets',
            'Inspect for damage or scorch marks',
            'Verify GFCI protection where required'
          ]
        },
        {
          category: 'safety',
          itemName: 'Smoke Detector',
          description: 'Test smoke detector functionality, battery, and verify age',
          frequency: 'monthly',
          priority: 'critical',
          checklistPoints: [
            'Press test button to verify alarm sounds',
            'Check battery level indicator',
            'Verify manufacture date on unit (replace if 10+ years old)',
            'Clean detector housing and vents',
            'Take photo showing manufacture date stamp'
          ]
        },
        {
          category: 'windows_doors',
          itemName: 'Windows',
          description: 'Inspect window condition, operation, locks, and seals',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test window opens and closes smoothly',
            'Check window locks are secure',
            'Inspect seals and weatherstripping',
            'Look for cracks or damage to glass',
            'Check for condensation between panes'
          ]
        },
        {
          category: 'furnishings',
          itemName: 'Window Furnishings',
          description: 'Check condition of curtains, blinds, and window treatments',
          frequency: 'biannual',
          priority: 'low',
          checklistPoints: [
            'Test blind or curtain operation',
            'Check cord condition and safety',
            'Inspect mounting brackets',
            'Look for damage or staining',
            'Check child safety compliance'
          ]
        },
        {
          category: 'general',
          itemName: 'Cabinetry',
          description: 'Inspect built-in cabinets, shelving, and joinery',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Check all hinges and handles for tightness',
            'Test doors and drawers open and close smoothly',
            'Inspect for damage, scratches, or wear',
            'Check shelf supports are secure',
            'Verify soft-close mechanisms if present'
          ]
        }
      ];
    }

    // Garage
    if (template === 'garage') {
      return [
        {
          category: 'electrical',
          itemName: 'Light Switch',
          description: 'Check operation and condition of light switches',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test all light switches for proper operation',
            'Check for flickering or dimming',
            'Inspect switch plates for damage',
            'Verify correct wiring'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Power Points (GPO)',
          description: 'Test and inspect general power outlets',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test all power outlets with tester',
            'Check for loose outlets',
            'Inspect for damage or scorch marks',
            'Verify GFCI protection where required'
          ]
        },
        {
          category: 'safety',
          itemName: 'Smoke Detector',
          description: 'Test smoke detector functionality, battery, and verify age',
          frequency: 'monthly',
          priority: 'critical',
          checklistPoints: [
            'Press test button to verify alarm sounds',
            'Check battery level indicator',
            'Verify manufacture date on unit (replace if 10+ years old)',
            'Clean detector housing and vents',
            'Take photo showing manufacture date stamp'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Garage Door Opener',
          description: 'Test garage door opener operation and safety features',
          frequency: 'quarterly',
          priority: 'high',
          checklistPoints: [
            'Test door opens and closes smoothly',
            'Check auto-reverse safety feature',
            'Inspect door tracks and rollers',
            'Test remote control operation',
            'Check door seal condition'
          ]
        },
        {
          category: 'plumbing',
          itemName: 'Hot Water System',
          description: 'Inspect hot water system for condition and safety',
          frequency: 'annual',
          priority: 'high',
          checklistPoints: [
            'Check for visible leaks',
            'Test relief valve operation',
            'Check temperature setting',
            'Inspect anode rod condition',
            'Verify adequate clearance'
          ]
        },
        {
          category: 'gas',
          itemName: 'Gas Appliance Inspection',
          description: 'Gas appliance/hot water inspection by licensed gas fitter - certificate required',
          frequency: 'biannual',
          priority: 'critical',
          inspectionType: 'professional',
          photoRequired: true,
          checklistPoints: [
            'Full inspection of gas connections by licensed gas fitter',
            'Inspect gas hot water system connections',
            'Check gas bottle connections and regulator',
            'Leak test with approved equipment',
            'Issue Gas Safety Certificate'
          ]
        }
      ];
    }

    // Hallway/Entry/Stairway
    if (template === 'hallway' || template === 'entry' || template === 'foyer' || template === 'stairway') {
      return [
        {
          category: 'electrical',
          itemName: 'Light Switch',
          description: 'Check operation and condition of light switches',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test all light switches for proper operation',
            'Check for flickering or dimming',
            'Inspect switch plates for damage',
            'Verify correct wiring'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Power Points (GPO)',
          description: 'Test and inspect general power outlets',
          frequency: 'biannual',
          priority: 'medium',
          checklistPoints: [
            'Test all power outlets with tester',
            'Check for loose outlets',
            'Inspect for damage or scorch marks',
            'Verify GFCI protection where required'
          ]
        },
        {
          category: 'safety',
          itemName: 'Smoke Detector',
          description: 'Test smoke detector functionality, battery, and verify age',
          frequency: 'monthly',
          priority: 'critical',
          checklistPoints: [
            'Press test button to verify alarm sounds',
            'Check battery level indicator',
            'Verify manufacture date on unit (replace if 10+ years old)',
            'Clean detector housing and vents',
            'Take photo showing manufacture date stamp'
          ]
        },
        {
          category: 'safety',
          itemName: 'Handrails & Balustrades',
          description: 'Check handrails and balustrades for security and compliance',
          frequency: 'biannual',
          priority: 'high',
          checklistPoints: [
            'Test handrail security and stability',
            'Check balustrade spacing (max 125mm)',
            'Inspect for damage or wear',
            'Verify mounting is secure',
            'Check for sharp edges'
          ]
        }
      ];
    }

    // Power Box / Electrical Panel - Professional inspections only
    if (template === 'power_box') {
      return [
        {
          category: 'electrical',
          itemName: 'Electrical Panel Safety Inspection',
          description: 'Full electrical panel inspection by licensed electrician - certificate required',
          frequency: 'biannual',
          priority: 'critical',
          inspectionType: 'professional',
          photoRequired: true,
          checklistPoints: [
            'Inspect switchboard condition and labeling',
            'Test all circuit breakers for proper operation',
            'Check earthing and bonding connections',
            'Thermal scan for hot spots',
            'Verify main switch and isolators',
            'Issue Electrical Safety Certificate'
          ]
        },
        {
          category: 'electrical',
          itemName: 'RCD/Safety Switch Testing',
          description: 'Test all RCD/safety switches for proper operation - professional testing required',
          frequency: 'biannual',
          priority: 'critical',
          inspectionType: 'professional',
          photoRequired: true,
          checklistPoints: [
            'Test each RCD using test button',
            'Verify RCD trips within 30 milliseconds',
            'Check all circuits protected by RCD',
            'Document test results with date and signature'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Circuit Breaker Labeling',
          description: 'Verify all circuit breakers are properly labeled and legible',
          frequency: 'biannual',
          priority: 'high',
          inspectionType: 'visual',
          checklistPoints: [
            'Check all breakers have clear labels',
            'Verify labels match actual circuits',
            'Update labels if needed',
            'Take photo of panel directory'
          ]
        },
        {
          category: 'electrical',
          itemName: 'Panel Condition Assessment',
          description: 'Visual assessment of electrical panel physical condition',
          frequency: 'biannual',
          priority: 'high',
          inspectionType: 'visual',
          checklistPoints: [
            'Check for signs of overheating or burning',
            'Inspect for corrosion or moisture damage',
            'Verify panel door closes properly',
            'Check for proper clearance around panel'
          ]
        }
      ];
    }

    // PRIORITY 4: Default fallback for any other room type (interior) - use commonItems pattern
    return [
      {
        category: 'electrical',
        itemName: 'Light Switch',
        description: 'Check operation and condition of light switches',
        frequency: 'biannual',
        priority: 'medium',
        checklistPoints: [
          'Test all light switches for proper operation',
          'Check for flickering or dimming',
          'Inspect switch plates for damage',
          'Verify correct wiring'
        ]
      },
      {
        category: 'electrical',
        itemName: 'Power Points (GPO)',
        description: 'Test and inspect general power outlets',
        frequency: 'biannual',
        priority: 'medium',
        checklistPoints: [
          'Test all power outlets with tester',
          'Check for loose outlets',
          'Inspect for damage or scorch marks',
          'Verify GFCI protection where required'
        ]
      },
      {
        category: 'safety',
        itemName: 'Smoke Detector',
        description: 'Test smoke detector functionality, battery, and verify age',
        frequency: 'monthly',
        priority: 'critical',
        checklistPoints: [
          'Press test button to verify alarm sounds',
          'Check battery level indicator',
          'Verify manufacture date on unit (replace if 10+ years old)',
          'Clean detector housing and vents',
          'Take photo showing manufacture date stamp'
        ]
      },
      {
        category: 'windows_doors',
        itemName: 'Windows',
        description: 'Inspect window condition, operation, locks, and seals',
        frequency: 'biannual',
        priority: 'medium',
        checklistPoints: [
          'Test window opens and closes smoothly',
          'Check window locks are secure',
          'Inspect seals and weatherstripping',
          'Look for cracks or damage to glass',
          'Check for condensation between panes'
        ]
      },
      {
        category: 'furnishings',
        itemName: 'Window Furnishings',
        description: 'Check condition of curtains, blinds, and window treatments',
        frequency: 'biannual',
        priority: 'low',
        checklistPoints: [
          'Test blind or curtain operation',
          'Check cord condition and safety',
          'Inspect mounting brackets',
          'Look for damage or staining',
          'Check child safety compliance'
        ]
      }
    ];
  }

  // Compliance certificates
  async getComplianceCertificate(id: number): Promise<ComplianceCertificate | undefined> {
    const [certificate] = await this.database.select().from(complianceCertificates).where(eq(complianceCertificates.id, id));
    return certificate;
  }

  async createComplianceCertificate(certificate: InsertComplianceCertificate): Promise<ComplianceCertificate> {
    const [created] = await this.database.insert(complianceCertificates).values(certificate).returning();
    return created;
  }

  async updateComplianceCertificate(id: number, updates: Partial<ComplianceCertificate>): Promise<ComplianceCertificate | undefined> {
    const [updated] = await this.database.update(complianceCertificates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(complianceCertificates.id, id))
      .returning();
    return updated;
  }

  async deleteComplianceCertificate(id: number): Promise<void> {
    await this.database.delete(complianceCertificates).where(eq(complianceCertificates.id, id));
  }

  async getComplianceCertificatesByAgency(agencyId: number): Promise<ComplianceCertificate[]> {
    return await this.database.select().from(complianceCertificates)
      .where(eq(complianceCertificates.agencyId, agencyId))
      .orderBy(desc(complianceCertificates.expiryDate));
  }

  async getComplianceCertificatesByProperty(propertyId: number): Promise<ComplianceCertificate[]> {
    return await this.database.select().from(complianceCertificates)
      .where(eq(complianceCertificates.propertyId, propertyId))
      .orderBy(desc(complianceCertificates.expiryDate));
  }

  async getExpiringCertificates(agencyId: number, days: number = 30): Promise<ComplianceCertificate[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return await this.database.select().from(complianceCertificates)
      .where(
        and(
          eq(complianceCertificates.agencyId, agencyId),
          lte(complianceCertificates.expiryDate, futureDate),
          gte(complianceCertificates.expiryDate, new Date())
        )
      )
      .orderBy(complianceCertificates.expiryDate);
  }

  // Certificate email submissions methods
  async getCertificateSubmission(id: number): Promise<CertificateSubmission | undefined> {
    const [submission] = await this.database.select().from(certificateSubmissions).where(eq(certificateSubmissions.id, id));
    return submission;
  }

  async createCertificateSubmission(submission: InsertCertificateSubmission): Promise<CertificateSubmission> {
    const [created] = await this.database.insert(certificateSubmissions).values(submission).returning();
    return created;
  }

  async updateCertificateSubmission(id: number, updates: Partial<CertificateSubmission>): Promise<CertificateSubmission | undefined> {
    const [updated] = await this.database.update(certificateSubmissions)
      .set(updates)
      .where(eq(certificateSubmissions.id, id))
      .returning();
    return updated;
  }

  async deleteCertificateSubmission(id: number): Promise<void> {
    await this.database.delete(certificateSubmissions).where(eq(certificateSubmissions.id, id));
  }

  async getCertificateSubmissionsByProperty(propertyId: number): Promise<CertificateSubmission[]> {
    return await this.database.select().from(certificateSubmissions)
      .where(eq(certificateSubmissions.propertyId, propertyId))
      .orderBy(desc(certificateSubmissions.receivedAt));
  }

  async getCertificateSubmissionsByAgency(agencyId: number): Promise<CertificateSubmission[]> {
    return await this.database.select().from(certificateSubmissions)
      .where(eq(certificateSubmissions.agencyId, agencyId))
      .orderBy(desc(certificateSubmissions.receivedAt));
  }

  async getPendingCertificateSubmissions(agencyId: number): Promise<CertificateSubmission[]> {
    return await this.database.select().from(certificateSubmissions)
      .where(
        and(
          eq(certificateSubmissions.agencyId, agencyId),
          eq(certificateSubmissions.status, 'pending')
        )
      )
      .orderBy(desc(certificateSubmissions.receivedAt));
  }

  async getPropertyInspectionRatios(agencyId: number): Promise<{ propertyId: number; completedCount: number; totalCount: number; completionRatio: number; notInspectedCount: number }[]> {
    const result = await db
      .select({
        propertyId: properties.id,
        totalCount: count(inspectionItems.id),
        completedCount: sum(
          sql`case when ${inspectionItems.isCompleted} = true then 1 else 0 end`
        ),
        notInspectedCount: sum(
          sql`case when ${inspectionItems.lastInspectedDate} is null and ${inspectionItems.isNotApplicable} = false then 1 else 0 end`
        )
      })
      .from(properties)
      .leftJoin(propertyRooms, and(eq(propertyRooms.propertyId, properties.id), eq(propertyRooms.isActive, true)))
      .leftJoin(inspectionItems, and(eq(inspectionItems.roomId, propertyRooms.id), eq(inspectionItems.isActive, true)))
      .where(and(eq(properties.agencyId, agencyId), eq(properties.isActive, true)))
      .groupBy(properties.id)
      .orderBy(properties.id);

    return result.map(row => {
      const total = Number(row.totalCount) || 0;
      const completed = Number(row.completedCount) || 0;
      const notInspected = Number(row.notInspectedCount) || 0;
      const ratio = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      return {
        propertyId: row.propertyId,
        totalCount: total,
        completedCount: completed,
        completionRatio: ratio,
        notInspectedCount: notInspected
      };
    });
  }

  async getPortfolioComplianceData(agencyId: number): Promise<{
    totalItems: number;
    completedItems: number;
    overdueItems: number;
    dueSoonItems: number;
    compliantItems: number;
    notApplicableItems: number;
    notInspectedItems: number;
    overallComplianceRate: number;
  }> {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const agencyProperties = await this.getPropertiesByAgency(agencyId);
    const overduePropertyMap = new Map<number, Date>();
    for (const p of agencyProperties) {
      if (p.nextInspectionDate && new Date(p.nextInspectionDate) < today) {
        overduePropertyMap.set(p.id, new Date(p.nextInspectionDate));
      }
    }
    
    const result = await this.database
      .select({
        id: inspectionItems.id,
        isCompleted: inspectionItems.isCompleted,
        isNotApplicable: inspectionItems.isNotApplicable,
        lastInspectedDate: inspectionItems.lastInspectedDate,
        nextInspectionDate: inspectionItems.nextInspectionDate,
        propertyId: properties.id,
      })
      .from(inspectionItems)
      .innerJoin(propertyRooms, and(
        eq(propertyRooms.id, inspectionItems.roomId),
        eq(propertyRooms.isActive, true)
      ))
      .innerJoin(properties, and(
        eq(properties.id, propertyRooms.propertyId),
        eq(properties.isActive, true),
        eq(properties.agencyId, agencyId)
      ))
      .where(eq(inspectionItems.isActive, true));
    
    const totalItems = result.length;
    const notApplicableItems = result.filter(item => item.isNotApplicable).length;
    const applicableItems = result.filter(item => !item.isNotApplicable);
    const completedItems = applicableItems.filter(item => item.isCompleted).length;
    const notInspectedItems = applicableItems.filter(item => !item.lastInspectedDate).length;
    
    let overdueItems = 0;
    let dueSoonItems = 0;
    let compliantItems = 0;
    
    for (const item of applicableItems) {
      let isOverdue = false;

      if (item.nextInspectionDate) {
        const nextDate = new Date(item.nextInspectionDate);
        if (nextDate < today) {
          isOverdue = true;
        } else if (nextDate <= thirtyDaysFromNow) {
          dueSoonItems++;
          continue;
        }
      }

      if (!isOverdue && !item.isCompleted && !item.nextInspectionDate) {
        isOverdue = true;
      }

      if (!isOverdue && !item.isCompleted) {
        const propNextDate = overduePropertyMap.get(item.propertyId);
        if (propNextDate) {
          const lastInsp = item.lastInspectedDate ? new Date(item.lastInspectedDate) : null;
          if (!lastInsp || lastInsp < propNextDate) {
            isOverdue = true;
          }
        }
      }

      if (isOverdue) {
        overdueItems++;
      } else if (item.isCompleted) {
        compliantItems++;
      }
    }
    
    // Calculate overall compliance rate based on completed applicable items
    const applicableCount = applicableItems.length;
    const overallComplianceRate = applicableCount > 0 
      ? Math.round((completedItems / applicableCount) * 100)
      : 100;
    
    return {
      totalItems,
      completedItems,
      overdueItems,
      dueSoonItems,
      compliantItems,
      notApplicableItems,
      notInspectedItems,
      overallComplianceRate
    };
  }

  // Inspection periods methods
  async getInspectionPeriods(propertyId: number): Promise<InspectionPeriod[]> {
    return await this.database.select().from(inspectionPeriods)
      .where(eq(inspectionPeriods.propertyId, propertyId))
      .orderBy(inspectionPeriods.startDate);
  }

  async getRoomCompletionForProperty(propertyId: number): Promise<{totalRooms: number, completedRooms: number}> {
    // Get all active rooms for the property
    const rooms = await this.database.select({ id: propertyRooms.id })
      .from(propertyRooms)
      .where(and(eq(propertyRooms.propertyId, propertyId), eq(propertyRooms.isActive, true)));

    let completedRooms = 0;
    const totalRooms = rooms.length;

    // For each room, check if all its active inspection items are completed or marked N/A
    for (const room of rooms) {
      const roomItems = await this.database.select({
        isCompleted: inspectionItems.isCompleted,
        isNotApplicable: inspectionItems.isNotApplicable,
        isActive: inspectionItems.isActive
      })
      .from(inspectionItems)
      .where(and(
        eq(inspectionItems.roomId, room.id),
        eq(inspectionItems.isActive, true)
      ));

      // If room has no inspection items, consider it complete
      // If room has items, all must be completed OR marked N/A for the room to be complete
      // N/A items count as "checked" since user made a deliberate decision
      const hasItems = roomItems.length > 0;
      const allItemsChecked = hasItems ? roomItems.every(item => item.isCompleted || item.isNotApplicable) : true;
      
      if (allItemsChecked) {
        completedRooms++;
      }
    }

    return { totalRooms, completedRooms };
  }

  async getRoomCompletionForPeriod(periodId: number): Promise<{totalRooms: number, completedRooms: number}> {
    // Get inspection items for this specific period to determine which rooms have items
    const periodItems = await this.database.select({
      roomId: inspectionItems.roomId,
      isCompleted: inspectionItems.isCompleted,
      isNotApplicable: inspectionItems.isNotApplicable
    })
    .from(inspectionItems)
    .where(and(
      eq(inspectionItems.inspectionPeriodId, periodId),
      eq(inspectionItems.isActive, true)
    ));

    // Group items by room
    const itemsByRoom = periodItems.reduce((acc, item) => {
      if (!acc[item.roomId]) {
        acc[item.roomId] = [];
      }
      acc[item.roomId].push(item);
      return acc;
    }, {} as Record<number, typeof periodItems>);

    const roomIds = Object.keys(itemsByRoom).map(id => parseInt(id));
    const totalRooms = roomIds.length;
    let completedRooms = 0;

    // For each room with items in this period, check if all items are completed or marked N/A
    // N/A items count as "checked" since user made a deliberate decision
    for (const roomId of roomIds) {
      const roomItems = itemsByRoom[roomId];
      const allItemsChecked = roomItems.every(item => item.isCompleted || item.isNotApplicable);
      
      if (allItemsChecked) {
        completedRooms++;
      }
    }

    return { totalRooms, completedRooms };
  }

  async getPropertyById(propertyId: number): Promise<Property | undefined> {
    const [property] = await this.database.select().from(properties).where(eq(properties.id, propertyId));
    return property;
  }

  async createInspectionPeriod(period: InsertInspectionPeriod): Promise<InspectionPeriod> {
    const [newPeriod] = await this.database.insert(inspectionPeriods).values(period).returning();
    return newPeriod;
  }

  async updateInspectionPeriod(id: number, updates: Partial<InspectionPeriod>): Promise<InspectionPeriod | undefined> {
    const [updated] = await this.database.update(inspectionPeriods)
      .set(updates)
      .where(eq(inspectionPeriods.id, id))
      .returning();
    return updated;
  }

  async deleteInspectionPeriod(id: number): Promise<void> {
    await this.database.delete(inspectionPeriods).where(eq(inspectionPeriods.id, id));
  }

  async getInspectionPeriod(id: number): Promise<InspectionPeriod | undefined> {
    const [period] = await this.database.select().from(inspectionPeriods).where(eq(inspectionPeriods.id, id));
    return period;
  }

  async getInspectionItemsByPeriod(periodId: number): Promise<InspectionItem[]> {
    // Get the inspection period to understand timing and frequency
    const period = await this.getInspectionPeriod(periodId);
    if (!period) return [];

    // Generate inspection items for this specific period if they don't exist
    await this.generateInspectionItemsForPeriod(periodId);
    
    // Return items for this period
    return await this.database.select().from(inspectionItems)
      .where(and(
        eq(inspectionItems.inspectionPeriodId, periodId),
        eq(inspectionItems.isActive, true)
      ))
      .orderBy(inspectionItems.roomId, inspectionItems.category, inspectionItems.itemName);
  }

  async generateInspectionItemsForPeriod(periodId: number): Promise<void> {
    const period = await this.getInspectionPeriod(periodId);
    if (!period) return;

    // Check if items already exist for this period
    const existingItems = await this.database.select().from(inspectionItems)
      .where(eq(inspectionItems.inspectionPeriodId, periodId));
    
    if (existingItems.length > 0) return; // Already has items

    // Get rooms that are due for inspection within this period based on their next_inspection_date
    // or all rooms if they don't have inspection dates set
    const rooms = await this.database.select().from(propertyRooms)
      .where(and(
        eq(propertyRooms.propertyId, period.propertyId),
        eq(propertyRooms.isActive, true)
      ));

    // Filter rooms that should be inspected during this period
    const roomsDueForInspection = rooms.filter(room => {
      if (!room.nextInspectionDate) {
        // If no inspection date set, include all rooms for the first period to set up baseline inspections
        return true;
      }
      
      // Check if the room's next inspection date falls within this period
      const nextInspectionDate = new Date(room.nextInspectionDate);
      const periodStartDate = new Date(period.startDate);
      const periodEndDate = new Date(period.endDate);
      
      return nextInspectionDate >= periodStartDate && nextInspectionDate <= periodEndDate;
    });

    // If no rooms are due, don't create any items (this period should show as completed)
    if (roomsDueForInspection.length === 0) {
      return;
    }

    // Create inspection items for rooms that are due
    const itemsToCreate: InsertInspectionItem[] = [];

    for (const room of roomsDueForInspection) {
      // Create basic inspection items for each room
      itemsToCreate.push({
        roomId: room.id,
        inspectionPeriodId: periodId,
        category: 'general',
        itemName: 'General Room Condition',
        description: 'Check overall condition, cleanliness, and any visible damage',
        frequency: period.frequency,
        priority: 'medium',
        isCompleted: false
      });

      // Add specific items based on room type
      if (room.roomType === 'kitchen') {
        itemsToCreate.push({
          roomId: room.id,
          inspectionPeriodId: periodId,
          category: 'plumbing',
          itemName: 'Kitchen Tap & Flexi Hoses',
          description: 'Inspect kitchen tap operation and flexi hose condition',
          frequency: period.frequency,
          priority: 'medium',
          isCompleted: false
        });
      }

      if (room.roomType?.includes('bathroom') || room.roomType?.includes('ensuite')) {
        itemsToCreate.push({
          roomId: room.id,
          inspectionPeriodId: periodId,
          category: 'plumbing',
          itemName: 'Bathroom Fixtures',
          description: 'Check toilets, taps, shower, and drainage for proper operation',
          frequency: period.frequency,
          priority: 'medium',
          isCompleted: false
        });
      }

      if (room.roomType === 'roof') {
        itemsToCreate.push({
          roomId: room.id,
          inspectionPeriodId: periodId,
          category: 'structural',
          itemName: 'Roof Condition',
          description: 'Check for damaged tiles, leaks, or structural issues',
          frequency: period.frequency,
          priority: 'high',
          isCompleted: false
        });
      }

      if (room.roomType === 'gutters') {
        itemsToCreate.push({
          roomId: room.id,
          inspectionPeriodId: periodId,
          category: 'structural',
          itemName: 'Gutter Inspection',
          description: 'Check for blockages, damage, and proper drainage',
          frequency: period.frequency,
          priority: 'medium',
          isCompleted: false
        });
      }

      if (room.roomType === 'power_box') {
        itemsToCreate.push({
          roomId: room.id,
          inspectionPeriodId: periodId,
          category: 'electrical',
          itemName: 'Electrical Panel Safety Inspection',
          description: 'Full electrical panel inspection by licensed electrician - certificate required',
          frequency: period.frequency,
          priority: 'critical',
          inspectionType: 'professional',
          photoRequired: true,
          isCompleted: false
        });
        itemsToCreate.push({
          roomId: room.id,
          inspectionPeriodId: periodId,
          category: 'electrical',
          itemName: 'RCD/Safety Switch Testing',
          description: 'Test all RCD/safety switches for proper operation',
          frequency: period.frequency,
          priority: 'critical',
          inspectionType: 'professional',
          photoRequired: true,
          isCompleted: false
        });
        itemsToCreate.push({
          roomId: room.id,
          inspectionPeriodId: periodId,
          category: 'electrical',
          itemName: 'Circuit Breaker Labeling',
          description: 'Verify all circuit breakers are properly labeled',
          frequency: period.frequency,
          priority: 'high',
          inspectionType: 'visual',
          isCompleted: false
        });
      }
    }

    // Insert all items
    if (itemsToCreate.length > 0) {
      await this.database.insert(inspectionItems).values(itemsToCreate);
    }
  }

  async getInspectionPeriodsWithCompletion(agencyId: number): Promise<Array<{
    propertyId: number;
    periods: Array<{
      id: number;
      periodName: string;
      startDate: Date;
      endDate: Date;
      dueDate: Date;
      status: string;
      completedItems: number;
      totalItems: number;
      completionRatio: number;
    }>;
  }>> {
    // Get all properties for the agency
    const agencyProperties = await this.database.select({ id: properties.id })
      .from(properties)
      .where(and(eq(properties.agencyId, agencyId), eq(properties.isActive, true)));

    const result = [];

    for (const property of agencyProperties) {
      // Get inspection periods for this property
      const periods = await this.database.select({
        id: inspectionPeriods.id,
        periodName: inspectionPeriods.periodName,
        startDate: inspectionPeriods.startDate,
        endDate: inspectionPeriods.endDate,
        dueDate: inspectionPeriods.dueDate,
        status: inspectionPeriods.status,
        totalItems: count(inspectionItems.id),
        completedItems: sum(
          sql`case when ${inspectionItems.isCompleted} = true then 1 else 0 end`
        )
      })
      .from(inspectionPeriods)
      .leftJoin(inspectionItems, and(
        eq(inspectionItems.inspectionPeriodId, inspectionPeriods.id),
        eq(inspectionItems.isActive, true)
      ))
      .where(eq(inspectionPeriods.propertyId, property.id))
      .groupBy(
        inspectionPeriods.id, 
        inspectionPeriods.periodName,
        inspectionPeriods.startDate,
        inspectionPeriods.endDate,
        inspectionPeriods.dueDate,
        inspectionPeriods.status
      )
      .orderBy(inspectionPeriods.dueDate); // Order by due date first, then we'll take relevant ones

      const periodsWithCompletion = periods.map(period => {
        const total = Number(period.totalItems) || 0;
        const completed = Number(period.completedItems) || 0;
        const ratio = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          id: period.id,
          periodName: period.periodName,
          startDate: period.startDate,
          endDate: period.endDate,
          dueDate: period.dueDate,
          status: period.status,
          completedItems: completed,
          totalItems: total,
          completionRatio: ratio
        };
      });

      // Select most relevant 3 periods: 1 previous completed, current/upcoming, and 1 future
      const now = new Date();
      const relevantPeriods: typeof periodsWithCompletion = [];
      
      // Find the most recent completed/past period
      const pastPeriods = periodsWithCompletion
        .filter(p => new Date(p.dueDate) < now)
        .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
      if (pastPeriods.length > 0) {
        relevantPeriods.push(pastPeriods[0]);
      }
      
      // Find current and upcoming periods
      const futurePeriods = periodsWithCompletion
        .filter(p => new Date(p.dueDate) >= now)
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      
      // Add up to 2 future periods (current + next)
      relevantPeriods.push(...futurePeriods.slice(0, 2));
      
      // Ensure we have exactly 3 periods (fill with additional if needed)
      const remainingSlots = 3 - relevantPeriods.length;
      if (remainingSlots > 0) {
        const additionalPeriods = periodsWithCompletion
          .filter(p => !relevantPeriods.includes(p))
          .slice(0, remainingSlots);
        relevantPeriods.push(...additionalPeriods);
      }

      result.push({
        propertyId: property.id,
        periods: relevantPeriods.slice(0, 3) // Ensure max 3 periods
      });
    }

    return result;
  }

  // Inspection Reports
  async getInspectionReport(id: number): Promise<InspectionReport | undefined> {
    const [report] = await this.database.select().from(inspectionReports).where(eq(inspectionReports.id, id));
    return report || undefined;
  }

  async getInspectionReportByPeriod(periodId: number): Promise<InspectionReport | undefined> {
    const [report] = await this.database.select().from(inspectionReports).where(eq(inspectionReports.inspectionPeriodId, periodId));
    return report || undefined;
  }

  async createInspectionReport(report: InsertInspectionReport): Promise<InspectionReport> {
    const [newReport] = await this.database.insert(inspectionReports).values(report).returning();
    return newReport;
  }

  async updateInspectionReport(id: number, updates: Partial<InspectionReport>): Promise<InspectionReport | undefined> {
    const [updated] = await this.database.update(inspectionReports).set(updates).where(eq(inspectionReports.id, id)).returning();
    return updated || undefined;
  }

  // User Notification Preferences
  async getUserNotificationPreferences(userId: number): Promise<UserNotificationPreferences | undefined> {
    const [prefs] = await this.database.select().from(userNotificationPreferences).where(eq(userNotificationPreferences.userId, userId));
    return prefs || undefined;
  }

  async createUserNotificationPreferences(prefs: InsertUserNotificationPreferences): Promise<UserNotificationPreferences> {
    const [newPrefs] = await this.database.insert(userNotificationPreferences).values(prefs).returning();
    return newPrefs;
  }

  async updateUserNotificationPreferences(userId: number, updates: Partial<UserNotificationPreferences>): Promise<UserNotificationPreferences | undefined> {
    const [updated] = await this.database.update(userNotificationPreferences)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userNotificationPreferences.userId, userId))
      .returning();
    return updated || undefined;
  }

  // Complete Inspection Period with Report Generation
  async completeInspectionPeriod(periodId: number, userId: number): Promise<{ period: InspectionPeriod; report: InspectionReport }> {
    // Get the inspection period
    const period = await this.getInspectionPeriod(periodId);
    if (!period) {
      throw new Error('Inspection period not found');
    }

    // Get the property
    const property = await this.getProperty(period.propertyId);
    if (!property) {
      throw new Error('Property not found');
    }

    // Get all rooms and their inspection items
    const rooms = await this.getPropertyRooms(period.propertyId);
    const roomsSummary: Array<{
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
    }> = [];

    let totalItems = 0;
    let completedItems = 0;
    const recommendations: string[] = [];

    for (const room of rooms) {
      const items = await this.getInspectionItems(room.id);
      const activeItems = items.filter(i => i.isActive);
      
      const roomTotal = activeItems.length;
      const roomCompleted = activeItems.filter(i => i.isCompleted).length;
      
      totalItems += roomTotal;
      completedItems += roomCompleted;

      // Add recommendations for incomplete critical items
      for (const item of activeItems) {
        if (!item.isCompleted && item.priority === 'critical') {
          recommendations.push(`Critical: ${item.itemName} in ${room.roomName} requires attention`);
        }
        if (!item.isCompleted && item.priority === 'high') {
          recommendations.push(`High Priority: ${item.itemName} in ${room.roomName} needs inspection`);
        }
      }

      roomsSummary.push({
        roomName: room.roomName,
        roomType: room.roomType,
        totalItems: roomTotal,
        completedItems: roomCompleted,
        items: activeItems.map(item => ({
          itemName: item.itemName,
          category: item.category,
          isCompleted: item.isCompleted || false,
          photoUrl: item.photoUrl || undefined,
          notes: item.notes || undefined,
          complianceStandard: item.complianceStandard || undefined
        }))
      });
    }

    const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 100;
    const overallStatus = completionPercentage === 100 ? 'complete' : 
                          completionPercentage >= 80 ? 'mostly_complete' : 
                          completionPercentage >= 50 ? 'partial' : 'incomplete';

    // Update the inspection period
    const now = new Date();
    const [updatedPeriod] = await this.database.update(inspectionPeriods)
      .set({
        status: 'completed',
        completionDate: now,
        completedAt: now,
        completionPercentage,
        completedBy: userId,
        totalItems,
        completedItems
      })
      .where(eq(inspectionPeriods.id, periodId))
      .returning();

    // Create the inspection report
    const [report] = await this.database.insert(inspectionReports)
      .values({
        inspectionPeriodId: periodId,
        propertyId: period.propertyId,
        summaryJson: {
          totalItems,
          completedItems,
          completionPercentage,
          roomsSummary,
          recommendations,
          overallStatus
        },
        recipientsJson: {
          sentTo: [],
          sentAt: '',
          deliveryStatus: {}
        }
      })
      .returning();

    return { period: updatedPeriod, report };
  }

  async createUserFeedback(feedback: InsertUserFeedback): Promise<UserFeedback> {
    const [result] = await this.database.insert(userFeedback).values(feedback).returning();
    return result;
  }

  async getUserFeedbackByAgency(agencyId: number): Promise<UserFeedback[]> {
    return this.database.select().from(userFeedback).where(eq(userFeedback.agencyId, agencyId)).orderBy(desc(userFeedback.createdAt));
  }

  // Certificate verification methods
  async createCertificateVerification(verification: InsertCertificateVerification): Promise<CertificateVerification> {
    const [result] = await this.database.insert(certificateVerifications).values(verification).returning();
    return result;
  }

  async getCertificateVerification(id: number): Promise<CertificateVerification | undefined> {
    const [result] = await this.database.select().from(certificateVerifications).where(eq(certificateVerifications.id, id));
    return result;
  }

  async updateCertificateVerification(id: number, updates: Partial<CertificateVerification>): Promise<CertificateVerification | undefined> {
    const [result] = await this.database.update(certificateVerifications).set(updates).where(eq(certificateVerifications.id, id)).returning();
    return result;
  }

  // Inspection type classification - determines if item requires licensed professional
  classifyInspectionType(itemName: string, category: string): 'visual' | 'professional' {
    const lowerName = itemName.toLowerCase();
    const lowerCategory = category.toLowerCase();
    
    // Check if item name contains any professional keywords
    for (const keyword of PROFESSIONAL_INSPECTION_KEYWORDS) {
      if (lowerName.includes(keyword.toLowerCase())) {
        return 'professional';
      }
    }
    
    // Additional category-specific rules for common professional items
    // These are items that typically require licensed professionals even without matching keywords
    const professionalPatterns: Record<string, RegExp[]> = {
      electrical: [
        /breaker/i, /rcd/i, /safety switch/i, /switchboard/i, /meter/i,
        /earth/i, /bond/i, /wiring test/i, /load test/i
      ],
      gas: [
        /pressure test/i, /leak/i, /combustion/i, /flue/i, /regulator/i,
        /burner test/i, /pilot/i, /thermocouple/i, /gas test/i, /gas check/i
      ],
      plumbing: [
        /tpr/i, /pressure relief/i, /anode/i, /tempering/i, /backflow/i,
        /pressure test/i, /hot water.*test/i
      ],
      fire_safety: [
        /panel/i, /sprinkler.*test/i, /booster/i, /extinguisher.*service/i,
        /emergency.*test/i, /exit.*test/i, /decibel/i
      ],
      pool: [
        /barrier.*cert/i, /fence.*cert/i, /pump.*test/i, /chlorinator.*service/i,
        /pool.*compliance/i
      ],
      hvac: [
        /refrigerant/i, /duct.*clean/i, /furnace.*service/i, /ac.*service/i,
        /hvac.*service/i
      ]
    };
    
    const patterns = professionalPatterns[lowerCategory] || [];
    for (const pattern of patterns) {
      if (pattern.test(lowerName)) {
        return 'professional';
      }
    }
    
    // Default to visual inspection
    return 'visual';
  }

  // Backfill inspection types for all items in an agency
  async backfillInspectionTypes(agencyId: number): Promise<{ updated: number; professional: number; visual: number }> {
    // Get all properties for the agency
    const agencyProperties = await this.database.select()
      .from(properties)
      .where(eq(properties.agencyId, agencyId));
    
    if (agencyProperties.length === 0) {
      return { updated: 0, professional: 0, visual: 0 };
    }
    
    const propertyIds = agencyProperties.map(p => p.id);
    
    // Get all rooms for these properties
    const rooms = await this.database.select()
      .from(propertyRooms)
      .where(inArray(propertyRooms.propertyId, propertyIds));
    
    if (rooms.length === 0) {
      return { updated: 0, professional: 0, visual: 0 };
    }
    
    const roomIds = rooms.map(r => r.id);
    
    // Get all inspection items for these rooms
    const items = await this.database.select()
      .from(inspectionItems)
      .where(inArray(inspectionItems.roomId, roomIds));
    
    let updated = 0;
    let professional = 0;
    let visual = 0;
    
    for (const item of items) {
      const inspectionType = this.classifyInspectionType(item.itemName, item.category);
      
      if (item.inspectionType !== inspectionType) {
        await this.database.update(inspectionItems)
          .set({ inspectionType })
          .where(eq(inspectionItems.id, item.id));
        updated++;
      }
      
      if (inspectionType === 'professional') {
        professional++;
      } else {
        visual++;
      }
    }
    
    return { updated, professional, visual };
  }

  // Get the certificate type to category mapping
  private getCertificateTypeCategories(certificateType: string): string[] {
    const mapping: Record<string, string[]> = {
      'gas': ['gas'],
      'gas_safety': ['gas'],
      'gas_inspection': ['gas'],
      'electrical': ['electrical'],
      'electrical_safety': ['electrical'],
      'electrical_test': ['electrical'],
      'smoke_alarm': ['fire_safety'],
      'smoke_detector': ['fire_safety'],
      'fire_safety': ['fire_safety'],
      'pool': ['pool'],
      'pool_compliance': ['pool'],
      'pool_fence': ['pool'],
      'hvac': ['hvac'],
      'hvac_service': ['hvac'],
      'air_conditioning': ['hvac'],
      'plumbing': ['plumbing'],
      'water_heater': ['plumbing'],
      'hot_water': ['plumbing'],
    };
    
    const lowerType = certificateType.toLowerCase().replace(/[- ]/g, '_');
    return mapping[lowerType] || [];
  }

  // Apply certificate coverage to matching professional items
  async applyCertificateCoverage(certificateId: number, propertyId: number): Promise<{ updated: number; items: number[] }> {
    // Get the certificate
    const certificate = await this.database.select()
      .from(complianceCertificates)
      .where(eq(complianceCertificates.id, certificateId))
      .limit(1);
    
    if (certificate.length === 0) {
      return { updated: 0, items: [] };
    }
    
    const cert = certificate[0];
    
    // Get the categories this certificate type covers
    const categories = this.getCertificateTypeCategories(cert.certificateType);
    
    if (categories.length === 0) {
      return { updated: 0, items: [] };
    }
    
    // Get all rooms for this property
    const rooms = await this.database.select()
      .from(propertyRooms)
      .where(eq(propertyRooms.propertyId, propertyId));
    
    if (rooms.length === 0) {
      return { updated: 0, items: [] };
    }
    
    const roomIds = rooms.map(r => r.id);
    
    // Get all professional items in matching categories for these rooms
    const matchingItems = await this.database.select()
      .from(inspectionItems)
      .where(
        and(
          inArray(inspectionItems.roomId, roomIds),
          eq(inspectionItems.inspectionType, 'professional'),
          inArray(inspectionItems.category, categories),
          eq(inspectionItems.isNotApplicable, false)
        )
      );
    
    if (matchingItems.length === 0) {
      return { updated: 0, items: [] };
    }
    
    const itemIds = matchingItems.map(i => i.id);
    const now = new Date();
    
    // Update all matching items with certificate coverage
    await this.database.update(inspectionItems)
      .set({
        linkedCertificateId: certificateId,
        certificateExpiryDate: cert.expiryDate,
        certificateCoveredAt: now,
        lastInspectedDate: cert.issueDate,
        nextInspectionDate: cert.expiryDate,
        isCompleted: true,
        completedDate: cert.issueDate,
      })
      .where(inArray(inspectionItems.id, itemIds));
    
    return { updated: itemIds.length, items: itemIds };
  }

  // Remove certificate coverage from items when certificate is deleted or expired
  async removeCertificateCoverage(certificateId: number): Promise<{ updated: number }> {
    // Get items currently covered by this certificate
    const coveredItems = await this.database.select()
      .from(inspectionItems)
      .where(eq(inspectionItems.linkedCertificateId, certificateId));
    
    if (coveredItems.length === 0) {
      return { updated: 0 };
    }
    
    const itemIds = coveredItems.map(i => i.id);
    
    // Clear certificate linkage - items will recalculate their next inspection date
    await this.database.update(inspectionItems)
      .set({
        linkedCertificateId: null,
        certificateExpiryDate: null,
        certificateCoveredAt: null,
        isCompleted: false,
        completedDate: null,
      })
      .where(inArray(inspectionItems.id, itemIds));
    
    return { updated: itemIds.length };
  }

  // Get all items covered by a specific certificate
  async getItemsCoveredByCertificate(certificateId: number): Promise<InspectionItem[]> {
    return this.database.select()
      .from(inspectionItems)
      .where(eq(inspectionItems.linkedCertificateId, certificateId));
  }

  // Get all professional items for a property, optionally filtered by category
  async getProfessionalItemsForProperty(propertyId: number, category?: string): Promise<InspectionItem[]> {
    const rooms = await this.database.select()
      .from(propertyRooms)
      .where(eq(propertyRooms.propertyId, propertyId));
    
    if (rooms.length === 0) {
      return [];
    }
    
    const roomIds = rooms.map(r => r.id);
    
    const conditions = [
      inArray(inspectionItems.roomId, roomIds),
      eq(inspectionItems.inspectionType, 'professional'),
    ];
    
    if (category) {
      conditions.push(eq(inspectionItems.category, category));
    }
    
    return this.database.select()
      .from(inspectionItems)
      .where(and(...conditions));
  }
}

// Safe storage initialization - wraps database calls to throw DatabaseUnavailableError
// when database is not configured, allowing server to start in degraded mode
class SafeStorageWrapper implements IStorage {
  private delegate: DatabaseStorage | null = null;

  constructor() {
    // Only initialize DatabaseStorage if database is available
    if (db) {
      try {
        this.delegate = new DatabaseStorage();
      } catch (error) {
        console.warn('⚠ Failed to initialize DatabaseStorage:', error);
      }
    }
  }

  private requireDatabase() {
    if (!this.delegate || !db) {
      throw new DatabaseUnavailableError();
    }
    return this.delegate;
  }

  async getUser(id: number) { return this.requireDatabase().getUser(id); }
  async getUserByUsername(username: string) { return this.requireDatabase().getUserByUsername(username); }
  async getUserByEmail(email: string) { return this.requireDatabase().getUserByEmail(email); }
  async createUser(user: InsertUser) { return this.requireDatabase().createUser(user); }
  async updateUser(id: number, updates: Partial<User>) { return this.requireDatabase().updateUser(id, updates); }
  async getUsersByAgency(agencyId: number) { return this.requireDatabase().getUsersByAgency(agencyId); }
  async getAllUsers() { return this.requireDatabase().getAllUsers(); }
  
  async createPasswordResetToken(token: InsertPasswordResetToken) { return this.requireDatabase().createPasswordResetToken(token); }
  async findValidResetToken(userId: number, tokenHash: string) { return this.requireDatabase().findValidResetToken(userId, tokenHash); }
  async getAllValidResetTokens() { return this.requireDatabase().getAllValidResetTokens(); }
  async markTokenAsUsed(tokenId: number) { return this.requireDatabase().markTokenAsUsed(tokenId); }
  async deleteExpiredTokens() { return this.requireDatabase().deleteExpiredTokens(); }
  
  async getAgency(id: number) { return this.requireDatabase().getAgency(id); }
  async createAgency(agency: InsertAgency) { return this.requireDatabase().createAgency(agency); }
  async updateAgency(id: number, updates: Partial<Agency>) { return this.requireDatabase().updateAgency(id, updates); }
  async getAllAgencies() { return this.requireDatabase().getAllAgencies(); }
  
  async getProperty(id: number) { return this.requireDatabase().getProperty(id); }
  async createProperty(property: InsertProperty) { return this.requireDatabase().createProperty(property); }
  async updateProperty(id: number, updates: Partial<Property>) { return this.requireDatabase().updateProperty(id, updates); }
  async deleteProperty(id: number) { return this.requireDatabase().deleteProperty(id); }
  async getPropertiesByAgency(agencyId: number) { return this.requireDatabase().getPropertiesByAgency(agencyId); }
  async getPropertiesByOwner(ownerId: number) { return this.requireDatabase().getPropertiesByOwner(ownerId); }
  async getPropertiesByManager(managerId: number) { return this.requireDatabase().getPropertiesByManager(managerId); }
  async getAllProperties() { return this.requireDatabase().getAllProperties(); }
  
  async getPropertyTemplate(id: number) { return this.requireDatabase().getPropertyTemplate(id); }
  async getPropertyTemplates(agencyId?: number) { return this.requireDatabase().getPropertyTemplates(agencyId); }
  async createPropertyTemplate(template: InsertPropertyTemplate) { return this.requireDatabase().createPropertyTemplate(template); }
  async createPropertyFromTemplate(templateId: number, propertyData: InsertProperty) { return this.requireDatabase().createPropertyFromTemplate(templateId, propertyData); }
  
  async getMaintenanceTemplate(id: number) { return this.requireDatabase().getMaintenanceTemplate(id); }
  async createMaintenanceTemplate(template: InsertMaintenanceTemplate) { return this.requireDatabase().createMaintenanceTemplate(template); }
  async updateMaintenanceTemplate(id: number, updates: Partial<MaintenanceTemplate>) { return this.requireDatabase().updateMaintenanceTemplate(id, updates); }
  async getMaintenanceTemplatesByAgency(agencyId: number) { return this.requireDatabase().getMaintenanceTemplatesByAgency(agencyId); }
  
  async getMaintenanceTask(id: number) { return this.requireDatabase().getMaintenanceTask(id); }
  async createMaintenanceTask(task: InsertMaintenanceTask) { return this.requireDatabase().createMaintenanceTask(task); }
  async updateMaintenanceTask(id: number, updates: Partial<MaintenanceTask>) { return this.requireDatabase().updateMaintenanceTask(id, updates); }
  async getMaintenanceTasksByAgency(agencyId: number) { return this.requireDatabase().getMaintenanceTasksByAgency(agencyId); }
  async getMaintenanceTasksByProperty(propertyId: number) { return this.requireDatabase().getMaintenanceTasksByProperty(propertyId); }
  async getMaintenanceTasksByManager(managerId: number) { return this.requireDatabase().getMaintenanceTasksByManager(managerId); }
  async getUpcomingTasks(agencyId: number, days?: number) { return this.requireDatabase().getUpcomingTasks(agencyId, days); }
  async getOverdueTasks(agencyId: number) { return this.requireDatabase().getOverdueTasks(agencyId); }
  
  async createNotificationLog(log: InsertNotificationLog) { return this.requireDatabase().createNotificationLog(log); }
  async getNotificationLogsByAgency(agencyId: number) { return this.requireDatabase().getNotificationLogsByAgency(agencyId); }
  async getNotificationLogsByRecipient(recipientId: number) { return this.requireDatabase().getNotificationLogsByRecipient(recipientId); }
  
  async getServiceProvider(id: number) { return this.requireDatabase().getServiceProvider(id); }
  async createServiceProvider(provider: InsertServiceProvider) { return this.requireDatabase().createServiceProvider(provider); }
  async updateServiceProvider(id: number, updates: Partial<ServiceProvider>) { return this.requireDatabase().updateServiceProvider(id, updates); }
  async deleteServiceProvider(id: number) { return this.requireDatabase().deleteServiceProvider(id); }
  async getServiceProvidersByAgency(agencyId: number) { return this.requireDatabase().getServiceProvidersByAgency(agencyId); }
  async getServiceProvidersByProperty(propertyId: number) { return this.requireDatabase().getServiceProvidersByProperty(propertyId); }
  async getServiceProvidersByTrade(agencyId: number, tradeCategory: string) { return this.requireDatabase().getServiceProvidersByTrade(agencyId, tradeCategory); }
  async getContractorsForProperty(propertyId: number, agencyId: number) { return this.requireDatabase().getContractorsForProperty(propertyId, agencyId); }
  
  async createActivityLog(log: InsertActivityLog) { return this.requireDatabase().createActivityLog(log); }
  async getActivityLogsByAgency(agencyId: number) { return this.requireDatabase().getActivityLogsByAgency(agencyId); }
  async getRecentActivity(agencyId: number, limit?: number) { return this.requireDatabase().getRecentActivity(agencyId, limit); }
  
  async getPropertyRooms(propertyId: number) { return this.requireDatabase().getPropertyRooms(propertyId); }
  async getPropertyRoomById(id: number) { return this.requireDatabase().getPropertyRoomById(id); }
  async createPropertyRoom(room: InsertPropertyRoom) { return this.requireDatabase().createPropertyRoom(room); }
  async createBulkPropertyRooms(propertyId: number, rooms: Parameters<DatabaseStorage['createBulkPropertyRooms']>[1]) { return this.requireDatabase().createBulkPropertyRooms(propertyId, rooms); }
  async updatePropertyRoom(id: number, updates: Partial<PropertyRoom>) { return this.requireDatabase().updatePropertyRoom(id, updates); }
  async deletePropertyRoom(id: number) { return this.requireDatabase().deletePropertyRoom(id); }
  async generateStandardItemsForRoom(room: PropertyRoom, countryCode?: string) { return this.requireDatabase().generateStandardItemsForRoom(room, countryCode); }
  async getRoomCompletionForPeriod(periodId: number) { return this.requireDatabase().getRoomCompletionForPeriod(periodId); }
  
  async getInspectionItems(roomId: number) { return this.requireDatabase().getInspectionItems(roomId); }
  async getInspectionItemById(id: number) { return this.requireDatabase().getInspectionItemById(id); }
  async getAllInspectionItemsForProperty(propertyId: number) { return this.requireDatabase().getAllInspectionItemsForProperty(propertyId); }
  async createInspectionItem(item: InsertInspectionItem) { return this.requireDatabase().createInspectionItem(item); }
  async updateInspectionItem(id: number, updates: Partial<InspectionItem>) { return this.requireDatabase().updateInspectionItem(id, updates); }
  async deleteInspectionItem(id: number) { return this.requireDatabase().deleteInspectionItem(id); }
  async bulkCheckInspectionItems(propertyId: number, itemName: string) { return this.requireDatabase().bulkCheckInspectionItems(propertyId, itemName); }
  async createBulkInspectionItems(roomId: number, template: string, floor?: number) { return this.requireDatabase().createBulkInspectionItems(roomId, template, floor); }
  async getDueInspectionItemsCount(agencyId: number) { return this.requireDatabase().getDueInspectionItemsCount(agencyId); }
  async auditAndFixInspectionIntervals() { return this.requireDatabase().auditAndFixInspectionIntervals(); }
  
  // Inspection item snapshots
  async createInspectionItemSnapshot(snapshot: InsertInspectionItemSnapshot) { return this.requireDatabase().createInspectionItemSnapshot(snapshot); }
  async getInspectionItemSnapshots(inspectionItemId: number) { return this.requireDatabase().getInspectionItemSnapshots(inspectionItemId); }
  async getLatestSnapshot(inspectionItemId: number) { return this.requireDatabase().getLatestSnapshot(inspectionItemId); }
  
  async getInspectionPeriods(propertyId: number) { return this.requireDatabase().getInspectionPeriods(propertyId); }
  async getInspectionPeriod(id: number) { return this.requireDatabase().getInspectionPeriod(id); }
  async getInspectionItemsByPeriod(periodId: number) { return this.requireDatabase().getInspectionItemsByPeriod(periodId); }
  async createInspectionPeriod(period: InsertInspectionPeriod) { return this.requireDatabase().createInspectionPeriod(period); }
  async updateInspectionPeriod(id: number, updates: Partial<InspectionPeriod>) { return this.requireDatabase().updateInspectionPeriod(id, updates); }
  async deleteInspectionPeriod(id: number) { return this.requireDatabase().deleteInspectionPeriod(id); }
  async getInspectionPeriodsWithCompletion(agencyId: number) { return this.requireDatabase().getInspectionPeriodsWithCompletion(agencyId); }
  
  async getPropertyById(propertyId: number) { return this.requireDatabase().getProperty(propertyId); }
  async getPropertyInspectionRatios(agencyId: number) { return this.requireDatabase().getPropertyInspectionRatios(agencyId); }
  async getPortfolioComplianceData(agencyId: number) { return this.requireDatabase().getPortfolioComplianceData(agencyId); }
  
  async getComplianceCertificate(id: number) { return this.requireDatabase().getComplianceCertificate(id); }
  async createComplianceCertificate(certificate: InsertComplianceCertificate) { return this.requireDatabase().createComplianceCertificate(certificate); }
  async updateComplianceCertificate(id: number, updates: Partial<ComplianceCertificate>) { return this.requireDatabase().updateComplianceCertificate(id, updates); }
  async deleteComplianceCertificate(id: number) { return this.requireDatabase().deleteComplianceCertificate(id); }
  async getComplianceCertificatesByAgency(agencyId: number) { return this.requireDatabase().getComplianceCertificatesByAgency(agencyId); }
  async getComplianceCertificatesByProperty(propertyId: number) { return this.requireDatabase().getComplianceCertificatesByProperty(propertyId); }
  async getExpiringCertificates(agencyId: number, days?: number) { return this.requireDatabase().getExpiringCertificates(agencyId, days); }
  
  // Certificate email submissions
  async getCertificateSubmission(id: number) { return this.requireDatabase().getCertificateSubmission(id); }
  async createCertificateSubmission(submission: InsertCertificateSubmission) { return this.requireDatabase().createCertificateSubmission(submission); }
  async updateCertificateSubmission(id: number, updates: Partial<CertificateSubmission>) { return this.requireDatabase().updateCertificateSubmission(id, updates); }
  async deleteCertificateSubmission(id: number) { return this.requireDatabase().deleteCertificateSubmission(id); }
  async getCertificateSubmissionsByProperty(propertyId: number) { return this.requireDatabase().getCertificateSubmissionsByProperty(propertyId); }
  async getCertificateSubmissionsByAgency(agencyId: number) { return this.requireDatabase().getCertificateSubmissionsByAgency(agencyId); }
  async getPendingCertificateSubmissions(agencyId: number) { return this.requireDatabase().getPendingCertificateSubmissions(agencyId); }

  // Inspection reports
  async getInspectionReport(id: number) { return this.requireDatabase().getInspectionReport(id); }
  async getInspectionReportByPeriod(periodId: number) { return this.requireDatabase().getInspectionReportByPeriod(periodId); }
  async createInspectionReport(report: InsertInspectionReport) { return this.requireDatabase().createInspectionReport(report); }
  async updateInspectionReport(id: number, updates: Partial<InspectionReport>) { return this.requireDatabase().updateInspectionReport(id, updates); }
  
  // User notification preferences
  async getUserNotificationPreferences(userId: number) { return this.requireDatabase().getUserNotificationPreferences(userId); }
  async createUserNotificationPreferences(prefs: InsertUserNotificationPreferences) { return this.requireDatabase().createUserNotificationPreferences(prefs); }
  async updateUserNotificationPreferences(userId: number, updates: Partial<UserNotificationPreferences>) { return this.requireDatabase().updateUserNotificationPreferences(userId, updates); }
  
  // Complete inspection with report
  async completeInspectionPeriod(periodId: number, userId: number) { return this.requireDatabase().completeInspectionPeriod(periodId, userId); }
  
  // User feedback
  async createUserFeedback(feedback: InsertUserFeedback) { return this.requireDatabase().createUserFeedback(feedback); }
  async getUserFeedbackByAgency(agencyId: number) { return this.requireDatabase().getUserFeedbackByAgency(agencyId); }
  
  // Certificate verification methods
  async createCertificateVerification(verification: InsertCertificateVerification) { return this.requireDatabase().createCertificateVerification(verification); }
  async getCertificateVerification(id: number) { return this.requireDatabase().getCertificateVerification(id); }
  async updateCertificateVerification(id: number, updates: Partial<CertificateVerification>) { return this.requireDatabase().updateCertificateVerification(id, updates); }

  // Inspection type classification and certificate linkage
  classifyInspectionType(itemName: string, category: string) { return this.requireDatabase().classifyInspectionType(itemName, category); }
  async backfillInspectionTypes(agencyId: number) { return this.requireDatabase().backfillInspectionTypes(agencyId); }
  async applyCertificateCoverage(certificateId: number, propertyId: number) { return this.requireDatabase().applyCertificateCoverage(certificateId, propertyId); }
  async removeCertificateCoverage(certificateId: number) { return this.requireDatabase().removeCertificateCoverage(certificateId); }
  async getItemsCoveredByCertificate(certificateId: number) { return this.requireDatabase().getItemsCoveredByCertificate(certificateId); }
  async getProfessionalItemsForProperty(propertyId: number, category?: string) { return this.requireDatabase().getProfessionalItemsForProperty(propertyId, category); }
}

export const storage: IStorage = new SafeStorageWrapper();