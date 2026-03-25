import {
  users, agencies, properties, maintenanceTemplates, maintenanceTasks,
  notificationLogs, serviceProviders, activityLogs,
  type User, type InsertUser, type Agency, type InsertAgency,
  type Property, type InsertProperty, type MaintenanceTemplate, type InsertMaintenanceTemplate,
  type MaintenanceTask, type InsertMaintenanceTask, type NotificationLog, type InsertNotificationLog,
  type ServiceProvider, type InsertServiceProvider, type ActivityLog, type InsertActivityLog
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  getUsersByAgency(agencyId: number): Promise<User[]>;

  // Agency management
  getAgency(id: number): Promise<Agency | undefined>;
  createAgency(agency: InsertAgency): Promise<Agency>;
  updateAgency(id: number, updates: Partial<Agency>): Promise<Agency | undefined>;
  getAllAgencies(): Promise<Agency[]>;

  // Property management
  getProperty(id: number): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: number, updates: Partial<Property>): Promise<Property | undefined>;
  getPropertiesByAgency(agencyId: number): Promise<Property[]>;
  getPropertiesByOwner(ownerId: number): Promise<Property[]>;
  getPropertiesByManager(managerId: number): Promise<Property[]>;

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

  // Service providers
  getServiceProvider(id: number): Promise<ServiceProvider | undefined>;
  createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider>;
  updateServiceProvider(id: number, updates: Partial<ServiceProvider>): Promise<ServiceProvider | undefined>;
  getServiceProvidersByAgency(agencyId: number): Promise<ServiceProvider[]>;

  // Activity logs
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogsByAgency(agencyId: number): Promise<ActivityLog[]>;
  getRecentActivity(agencyId: number, limit?: number): Promise<ActivityLog[]>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeDatabase();
  }

  private async initializeDatabase() {
    try {
      // Seed database with initial data if empty
      const existingUsers = await db.select().from(users).limit(1);
      if (existingUsers.length === 0) {
        await this.seedData();
      }
    } catch (error) {
      console.error('Database initialization error:', error);
    }
  }

  private async seedData() {
    // Seed with demo agency and admin user
    const [agency] = await db.insert(agencies).values({
      name: "Elite Property Management",
      email: "admin@elitepm.com",
      phone: "+1-555-0123",
      address: "123 Business District, Melbourne VIC 3000",
      website: "https://elitepm.com",
      branding: { primaryColor: "#1976D2", logo: null },
      isActive: true,
    }).returning();

    await db.insert(users).values({
      username: "admin",
      email: "admin@elitepm.com",
      password: "password123", // In real app, this would be hashed
      firstName: "John",
      lastName: "Davidson",
      role: "agency_admin",
      agencyId: agency.id,
      isActive: true,
    });

    // Seed maintenance templates
    await db.insert(maintenanceTemplates).values([
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
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      ...user,
      id: this.currentUserId++,
      createdAt: new Date(),
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getUsersByAgency(agencyId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.agencyId === agencyId);
  }

  // Agency methods
  async getAgency(id: number): Promise<Agency | undefined> {
    return this.agencies.get(id);
  }

  async createAgency(agency: InsertAgency): Promise<Agency> {
    const newAgency: Agency = {
      ...agency,
      id: this.currentAgencyId++,
      createdAt: new Date(),
    };
    this.agencies.set(newAgency.id, newAgency);
    return newAgency;
  }

  async updateAgency(id: number, updates: Partial<Agency>): Promise<Agency | undefined> {
    const agency = this.agencies.get(id);
    if (!agency) return undefined;
    const updatedAgency = { ...agency, ...updates };
    this.agencies.set(id, updatedAgency);
    return updatedAgency;
  }

  async getAllAgencies(): Promise<Agency[]> {
    return Array.from(this.agencies.values()).filter(agency => agency.isActive);
  }

  // Property methods
  async getProperty(id: number): Promise<Property | undefined> {
    return this.properties.get(id);
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const newProperty: Property = {
      ...property,
      id: this.currentPropertyId++,
      createdAt: new Date(),
    };
    this.properties.set(newProperty.id, newProperty);
    return newProperty;
  }

  async updateProperty(id: number, updates: Partial<Property>): Promise<Property | undefined> {
    const property = this.properties.get(id);
    if (!property) return undefined;
    const updatedProperty = { ...property, ...updates };
    this.properties.set(id, updatedProperty);
    return updatedProperty;
  }

  async getPropertiesByAgency(agencyId: number): Promise<Property[]> {
    return Array.from(this.properties.values()).filter(
      property => property.agencyId === agencyId && property.isActive
    );
  }

  async getPropertiesByOwner(ownerId: number): Promise<Property[]> {
    return Array.from(this.properties.values()).filter(
      property => property.ownerId === ownerId && property.isActive
    );
  }

  async getPropertiesByManager(managerId: number): Promise<Property[]> {
    return Array.from(this.properties.values()).filter(
      property => property.managerId === managerId && property.isActive
    );
  }

  // Maintenance template methods
  async getMaintenanceTemplate(id: number): Promise<MaintenanceTemplate | undefined> {
    return this.maintenanceTemplates.get(id);
  }

  async createMaintenanceTemplate(template: InsertMaintenanceTemplate): Promise<MaintenanceTemplate> {
    const newTemplate: MaintenanceTemplate = {
      ...template,
      id: this.currentTemplateId++,
      createdAt: new Date(),
    };
    this.maintenanceTemplates.set(newTemplate.id, newTemplate);
    return newTemplate;
  }

  async updateMaintenanceTemplate(id: number, updates: Partial<MaintenanceTemplate>): Promise<MaintenanceTemplate | undefined> {
    const template = this.maintenanceTemplates.get(id);
    if (!template) return undefined;
    const updatedTemplate = { ...template, ...updates };
    this.maintenanceTemplates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  async getMaintenanceTemplatesByAgency(agencyId: number): Promise<MaintenanceTemplate[]> {
    return Array.from(this.maintenanceTemplates.values()).filter(
      template => template.agencyId === agencyId && template.isActive
    );
  }

  // Maintenance task methods
  async getMaintenanceTask(id: number): Promise<MaintenanceTask | undefined> {
    return this.maintenanceTasks.get(id);
  }

  async createMaintenanceTask(task: InsertMaintenanceTask): Promise<MaintenanceTask> {
    const newTask: MaintenanceTask = {
      ...task,
      id: this.currentTaskId++,
      createdAt: new Date(),
    };
    this.maintenanceTasks.set(newTask.id, newTask);
    return newTask;
  }

  async updateMaintenanceTask(id: number, updates: Partial<MaintenanceTask>): Promise<MaintenanceTask | undefined> {
    const task = this.maintenanceTasks.get(id);
    if (!task) return undefined;
    const updatedTask = { ...task, ...updates };
    this.maintenanceTasks.set(id, updatedTask);
    return updatedTask;
  }

  async getMaintenanceTasksByAgency(agencyId: number): Promise<MaintenanceTask[]> {
    return Array.from(this.maintenanceTasks.values()).filter(task => task.agencyId === agencyId);
  }

  async getMaintenanceTasksByProperty(propertyId: number): Promise<MaintenanceTask[]> {
    return Array.from(this.maintenanceTasks.values()).filter(task => task.propertyId === propertyId);
  }

  async getMaintenanceTasksByManager(managerId: number): Promise<MaintenanceTask[]> {
    return Array.from(this.maintenanceTasks.values()).filter(task => task.assignedTo === managerId);
  }

  async getUpcomingTasks(agencyId: number, days = 30): Promise<MaintenanceTask[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    
    return Array.from(this.maintenanceTasks.values()).filter(task => 
      task.agencyId === agencyId && 
      task.dueDate >= now && 
      task.dueDate <= futureDate &&
      task.status !== 'completed' &&
      task.status !== 'cancelled'
    );
  }

  async getOverdueTasks(agencyId: number): Promise<MaintenanceTask[]> {
    const now = new Date();
    
    return Array.from(this.maintenanceTasks.values()).filter(task => 
      task.agencyId === agencyId && 
      task.dueDate < now &&
      task.status !== 'completed' &&
      task.status !== 'cancelled'
    );
  }

  // Notification methods
  async createNotificationLog(log: InsertNotificationLog): Promise<NotificationLog> {
    const newLog: NotificationLog = {
      ...log,
      id: this.currentNotificationId++,
      sentAt: new Date(),
    };
    this.notificationLogs.set(newLog.id, newLog);
    return newLog;
  }

  async getNotificationLogsByAgency(agencyId: number): Promise<NotificationLog[]> {
    return Array.from(this.notificationLogs.values()).filter(log => log.agencyId === agencyId);
  }

  async getNotificationLogsByRecipient(recipientId: number): Promise<NotificationLog[]> {
    return Array.from(this.notificationLogs.values()).filter(log => log.recipientId === recipientId);
  }

  // Service provider methods
  async getServiceProvider(id: number): Promise<ServiceProvider | undefined> {
    return this.serviceProviders.get(id);
  }

  async createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider> {
    const newProvider: ServiceProvider = {
      ...provider,
      id: this.currentProviderId++,
      createdAt: new Date(),
    };
    this.serviceProviders.set(newProvider.id, newProvider);
    return newProvider;
  }

  async updateServiceProvider(id: number, updates: Partial<ServiceProvider>): Promise<ServiceProvider | undefined> {
    const provider = this.serviceProviders.get(id);
    if (!provider) return undefined;
    const updatedProvider = { ...provider, ...updates };
    this.serviceProviders.set(id, updatedProvider);
    return updatedProvider;
  }

  async getServiceProvidersByAgency(agencyId: number): Promise<ServiceProvider[]> {
    return Array.from(this.serviceProviders.values()).filter(
      provider => provider.agencyId === agencyId && provider.isActive
    );
  }

  // Activity log methods
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const newLog: ActivityLog = {
      ...log,
      id: this.currentActivityId++,
      createdAt: new Date(),
    };
    this.activityLogs.set(newLog.id, newLog);
    return newLog;
  }

  async getActivityLogsByAgency(agencyId: number): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values()).filter(log => log.agencyId === agencyId);
  }

  async getRecentActivity(agencyId: number, limit = 10): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values())
      .filter(log => log.agencyId === agencyId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}

export const storage = new MemStorage();
