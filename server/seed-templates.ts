import { storage } from "./storage";
import { db } from "./db";
import { promoCodes, users, agencies } from "@shared/schema";
import { eq, isNull } from "drizzle-orm";

export const DEFAULT_PROPERTY_TEMPLATES = [
  {
    name: "Standard Residential House",
    description: "A typical 3-4 bedroom family home with all common rooms",
    templateType: "residential_house",
    propertyType: "house",
    isSystem: true,
    rooms: [
      {
        roomName: "Kitchen",
        roomType: "kitchen",
        inspectionItems: [
          { itemName: "Rangehood Filter", category: "appliances", priority: "medium", inspectionType: "visual" },
          { itemName: "Oven/Cooktop", category: "appliances", priority: "medium", inspectionType: "visual" },
          { itemName: "Dishwasher", category: "appliances", priority: "low", inspectionType: "visual" },
          { itemName: "Sink & Tapware", category: "plumbing", priority: "medium", inspectionType: "visual" },
          { itemName: "Cabinetry & Benchtops", category: "fixtures", priority: "low", inspectionType: "visual" },
          { itemName: "Smoke Detector", category: "safety", priority: "high", inspectionType: "visual", complianceStandard: "AS 3786", photoRequired: true },
        ]
      },
      {
        roomName: "Living Room",
        roomType: "living",
        inspectionItems: [
          { itemName: "Windows & Screens", category: "fixtures", priority: "medium", inspectionType: "visual" },
          { itemName: "Flooring", category: "fixtures", priority: "low", inspectionType: "visual" },
          { itemName: "Walls & Ceiling", category: "structural", priority: "low", inspectionType: "visual" },
          { itemName: "Light Fixtures", category: "electrical", priority: "medium", inspectionType: "visual" },
          { itemName: "Power Points", category: "electrical", priority: "medium", inspectionType: "visual" },
        ]
      },
      {
        roomName: "Master Bedroom",
        roomType: "bedroom",
        inspectionItems: [
          { itemName: "Windows & Screens", category: "fixtures", priority: "medium", inspectionType: "visual" },
          { itemName: "Built-in Wardrobe", category: "fixtures", priority: "low", inspectionType: "visual" },
          { itemName: "Flooring", category: "fixtures", priority: "low", inspectionType: "visual" },
          { itemName: "Smoke Detector", category: "safety", priority: "high", inspectionType: "visual", complianceStandard: "AS 3786", photoRequired: true },
        ]
      },
      {
        roomName: "Bedroom 2",
        roomType: "bedroom",
        inspectionItems: [
          { itemName: "Windows & Screens", category: "fixtures", priority: "medium", inspectionType: "visual" },
          { itemName: "Built-in Wardrobe", category: "fixtures", priority: "low", inspectionType: "visual" },
          { itemName: "Flooring", category: "fixtures", priority: "low", inspectionType: "visual" },
        ]
      },
      {
        roomName: "Bedroom 3",
        roomType: "bedroom",
        inspectionItems: [
          { itemName: "Windows & Screens", category: "fixtures", priority: "medium", inspectionType: "visual" },
          { itemName: "Built-in Wardrobe", category: "fixtures", priority: "low", inspectionType: "visual" },
          { itemName: "Flooring", category: "fixtures", priority: "low", inspectionType: "visual" },
        ]
      },
      {
        roomName: "Main Bathroom",
        roomType: "bathroom",
        inspectionItems: [
          { itemName: "Toilet", category: "plumbing", priority: "high", inspectionType: "visual" },
          { itemName: "Basin & Tapware", category: "plumbing", priority: "medium", inspectionType: "visual" },
          { itemName: "Shower/Bath", category: "plumbing", priority: "medium", inspectionType: "visual" },
          { itemName: "Exhaust Fan", category: "electrical", priority: "medium", inspectionType: "visual" },
          { itemName: "Tiles & Grouting", category: "fixtures", priority: "low", inspectionType: "visual" },
          { itemName: "Mirror & Cabinet", category: "fixtures", priority: "low", inspectionType: "visual" },
        ]
      },
      {
        roomName: "Ensuite",
        roomType: "bathroom",
        inspectionItems: [
          { itemName: "Toilet", category: "plumbing", priority: "high", inspectionType: "visual" },
          { itemName: "Basin & Tapware", category: "plumbing", priority: "medium", inspectionType: "visual" },
          { itemName: "Shower", category: "plumbing", priority: "medium", inspectionType: "visual" },
          { itemName: "Exhaust Fan", category: "electrical", priority: "medium", inspectionType: "visual" },
        ]
      },
      {
        roomName: "Laundry",
        roomType: "laundry",
        inspectionItems: [
          { itemName: "Washing Machine Taps", category: "plumbing", priority: "medium", inspectionType: "visual" },
          { itemName: "Laundry Tub", category: "plumbing", priority: "medium", inspectionType: "visual" },
          { itemName: "Dryer Vent", category: "appliances", priority: "medium", inspectionType: "visual" },
          { itemName: "Hot Water System", category: "plumbing", priority: "high", inspectionType: "visual", tradeCategory: "plumbing" },
        ]
      },
      {
        roomName: "Garage",
        roomType: "garage",
        inspectionItems: [
          { itemName: "Garage Door & Opener", category: "fixtures", priority: "medium", inspectionType: "visual" },
          { itemName: "Lighting", category: "electrical", priority: "low", inspectionType: "visual" },
          { itemName: "Fire Extinguisher", category: "safety", priority: "high", inspectionType: "visual" },
        ]
      },
      {
        roomName: "Exterior",
        roomType: "exterior",
        inspectionItems: [
          { itemName: "Gutters & Downpipes", category: "structural", priority: "medium", inspectionType: "visual" },
          { itemName: "Roof Condition", category: "structural", priority: "high", inspectionType: "visual" },
          { itemName: "Exterior Walls", category: "structural", priority: "medium", inspectionType: "visual" },
          { itemName: "Driveway", category: "exterior", priority: "low", inspectionType: "visual" },
          { itemName: "Fencing", category: "exterior", priority: "medium", inspectionType: "visual" },
          { itemName: "Garden & Landscaping", category: "exterior", priority: "low", inspectionType: "visual" },
        ]
      },
      {
        roomName: "Electrical & Safety",
        roomType: "utility",
        inspectionItems: [
          { itemName: "Switchboard/RCD Testing", category: "electrical", priority: "critical", inspectionType: "professional", complianceStandard: "AS/NZS 3000", tradeCategory: "electrical", photoRequired: true },
          { itemName: "Meter Box", category: "electrical", priority: "medium", inspectionType: "visual" },
          { itemName: "Safety Switch Test", category: "electrical", priority: "critical", inspectionType: "professional", tradeCategory: "electrical" },
        ]
      },
    ]
  },
  {
    name: "Apartment/Unit",
    description: "Standard apartment or unit with typical rooms",
    templateType: "apartment",
    propertyType: "apartment",
    isSystem: true,
    rooms: [
      {
        roomName: "Kitchen",
        roomType: "kitchen",
        inspectionItems: [
          { itemName: "Rangehood Filter", category: "appliances", priority: "medium", inspectionType: "visual" },
          { itemName: "Oven/Cooktop", category: "appliances", priority: "medium", inspectionType: "visual" },
          { itemName: "Dishwasher", category: "appliances", priority: "low", inspectionType: "visual" },
          { itemName: "Sink & Tapware", category: "plumbing", priority: "medium", inspectionType: "visual" },
          { itemName: "Smoke Detector", category: "safety", priority: "high", inspectionType: "visual", complianceStandard: "AS 3786", photoRequired: true },
        ]
      },
      {
        roomName: "Living/Dining",
        roomType: "living",
        inspectionItems: [
          { itemName: "Windows & Screens", category: "fixtures", priority: "medium", inspectionType: "visual" },
          { itemName: "Flooring", category: "fixtures", priority: "low", inspectionType: "visual" },
          { itemName: "Air Conditioning", category: "hvac", priority: "medium", inspectionType: "visual" },
          { itemName: "Balcony Door/Access", category: "fixtures", priority: "medium", inspectionType: "visual" },
        ]
      },
      {
        roomName: "Bedroom",
        roomType: "bedroom",
        inspectionItems: [
          { itemName: "Windows & Screens", category: "fixtures", priority: "medium", inspectionType: "visual" },
          { itemName: "Built-in Wardrobe", category: "fixtures", priority: "low", inspectionType: "visual" },
          { itemName: "Flooring", category: "fixtures", priority: "low", inspectionType: "visual" },
          { itemName: "Smoke Detector", category: "safety", priority: "high", inspectionType: "visual", complianceStandard: "AS 3786", photoRequired: true },
        ]
      },
      {
        roomName: "Bathroom",
        roomType: "bathroom",
        inspectionItems: [
          { itemName: "Toilet", category: "plumbing", priority: "high", inspectionType: "visual" },
          { itemName: "Basin & Tapware", category: "plumbing", priority: "medium", inspectionType: "visual" },
          { itemName: "Shower/Bath", category: "plumbing", priority: "medium", inspectionType: "visual" },
          { itemName: "Exhaust Fan", category: "electrical", priority: "medium", inspectionType: "visual" },
        ]
      },
      {
        roomName: "Balcony",
        roomType: "exterior",
        inspectionItems: [
          { itemName: "Balcony Balustrade", category: "safety", priority: "high", inspectionType: "visual" },
          { itemName: "Flooring/Tiles", category: "fixtures", priority: "low", inspectionType: "visual" },
          { itemName: "Drainage", category: "plumbing", priority: "medium", inspectionType: "visual" },
        ]
      },
      {
        roomName: "Electrical",
        roomType: "utility",
        inspectionItems: [
          { itemName: "Switchboard/RCD Testing", category: "electrical", priority: "critical", inspectionType: "professional", complianceStandard: "AS/NZS 3000", tradeCategory: "electrical", photoRequired: true },
          { itemName: "Intercom System", category: "electrical", priority: "low", inspectionType: "visual" },
        ]
      },
    ]
  },
  {
    name: "Townhouse",
    description: "Multi-level townhouse with typical room configuration",
    templateType: "townhouse",
    propertyType: "house",
    isSystem: true,
    rooms: [
      {
        roomName: "Kitchen",
        roomType: "kitchen",
        inspectionItems: [
          { itemName: "Rangehood Filter", category: "appliances", priority: "medium", inspectionType: "visual" },
          { itemName: "Oven/Cooktop", category: "appliances", priority: "medium", inspectionType: "visual" },
          { itemName: "Dishwasher", category: "appliances", priority: "low", inspectionType: "visual" },
          { itemName: "Sink & Tapware", category: "plumbing", priority: "medium", inspectionType: "visual" },
          { itemName: "Smoke Detector", category: "safety", priority: "high", inspectionType: "visual", complianceStandard: "AS 3786", photoRequired: true },
        ]
      },
      {
        roomName: "Living Room",
        roomType: "living",
        inspectionItems: [
          { itemName: "Windows & Screens", category: "fixtures", priority: "medium", inspectionType: "visual" },
          { itemName: "Flooring", category: "fixtures", priority: "low", inspectionType: "visual" },
          { itemName: "Staircase", category: "structural", priority: "medium", inspectionType: "visual" },
          { itemName: "Handrails", category: "safety", priority: "high", inspectionType: "visual" },
        ]
      },
      {
        roomName: "Master Bedroom",
        roomType: "bedroom",
        inspectionItems: [
          { itemName: "Windows & Screens", category: "fixtures", priority: "medium", inspectionType: "visual" },
          { itemName: "Built-in Wardrobe", category: "fixtures", priority: "low", inspectionType: "visual" },
          { itemName: "Smoke Detector", category: "safety", priority: "high", inspectionType: "visual", complianceStandard: "AS 3786", photoRequired: true },
        ]
      },
      {
        roomName: "Bedroom 2",
        roomType: "bedroom",
        inspectionItems: [
          { itemName: "Windows & Screens", category: "fixtures", priority: "medium", inspectionType: "visual" },
          { itemName: "Built-in Wardrobe", category: "fixtures", priority: "low", inspectionType: "visual" },
        ]
      },
      {
        roomName: "Bathroom",
        roomType: "bathroom",
        inspectionItems: [
          { itemName: "Toilet", category: "plumbing", priority: "high", inspectionType: "visual" },
          { itemName: "Basin & Tapware", category: "plumbing", priority: "medium", inspectionType: "visual" },
          { itemName: "Shower/Bath", category: "plumbing", priority: "medium", inspectionType: "visual" },
          { itemName: "Exhaust Fan", category: "electrical", priority: "medium", inspectionType: "visual" },
        ]
      },
      {
        roomName: "Ensuite",
        roomType: "bathroom",
        inspectionItems: [
          { itemName: "Toilet", category: "plumbing", priority: "high", inspectionType: "visual" },
          { itemName: "Basin & Tapware", category: "plumbing", priority: "medium", inspectionType: "visual" },
          { itemName: "Shower", category: "plumbing", priority: "medium", inspectionType: "visual" },
        ]
      },
      {
        roomName: "Garage",
        roomType: "garage",
        inspectionItems: [
          { itemName: "Garage Door & Opener", category: "fixtures", priority: "medium", inspectionType: "visual" },
          { itemName: "Internal Access Door", category: "fixtures", priority: "medium", inspectionType: "visual" },
        ]
      },
      {
        roomName: "Courtyard",
        roomType: "exterior",
        inspectionItems: [
          { itemName: "Fencing", category: "exterior", priority: "medium", inspectionType: "visual" },
          { itemName: "Paving", category: "exterior", priority: "low", inspectionType: "visual" },
        ]
      },
      {
        roomName: "Electrical & Safety",
        roomType: "utility",
        inspectionItems: [
          { itemName: "Switchboard/RCD Testing", category: "electrical", priority: "critical", inspectionType: "professional", complianceStandard: "AS/NZS 3000", tradeCategory: "electrical", photoRequired: true },
        ]
      },
    ]
  },
];

export async function seedPropertyTemplates(): Promise<void> {
  try {
    // Check if templates already exist
    const existingTemplates = await storage.getPropertyTemplates();
    
    if (existingTemplates.length > 0) {
      console.log(`[Seed] Property templates already exist (${existingTemplates.length} found), skipping seed`);
    } else {
      console.log('[Seed] Seeding default property templates...');
      
      for (const template of DEFAULT_PROPERTY_TEMPLATES) {
        await storage.createPropertyTemplate({
          name: template.name,
          description: template.description,
          templateType: template.templateType,
          propertyType: template.propertyType,
          isSystem: template.isSystem,
          rooms: template.rooms,
        });
        console.log(`[Seed] Created template: ${template.name}`);
      }
      
      console.log(`[Seed] Successfully seeded ${DEFAULT_PROPERTY_TEMPLATES.length} property templates`);
    }
  } catch (error) {
    console.error('[Seed] Error seeding property templates:', error);
  }

  await seedPromoCodes();
  await repairUsersWithoutAgency();
}

async function repairUsersWithoutAgency(): Promise<void> {
  try {
    if (!db) return;
    const orphanUsers = await db.select().from(users).where(isNull(users.agencyId));
    if (orphanUsers.length === 0) return;
    console.log(`[Repair] Found ${orphanUsers.length} user(s) without an agency — creating personal agencies...`);
    for (const user of orphanUsers) {
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
      const [agency] = await db.insert(agencies).values({
        name: `${name}'s Properties`,
        email: user.email,
        isActive: true,
      }).returning();
      await db.update(users).set({ agencyId: agency.id }).where(eq(users.id, user.id));
      console.log(`[Repair] Created agency "${agency.name}" for user ${user.email}`);
    }
  } catch (error) {
    console.error('[Repair] Error repairing users without agency:', error);
  }
}

async function seedPromoCodes(): Promise<void> {
  try {
    if (!db) return;
    const existing = await db.select().from(promoCodes).where(eq(promoCodes.code, 'WELCOME2024'));
    if (existing.length > 0) {
      console.log('[Seed] Promo code WELCOME2024 already exists, skipping');
      return;
    }
    await db.insert(promoCodes).values({
      code: 'WELCOME2024',
      description: 'Welcome promo - full access',
      grantType: 'full_access',
      maxUses: 100,
      usedCount: 0,
      isActive: true,
    });
    console.log('[Seed] Created promo code: WELCOME2024');
  } catch (error) {
    console.error('[Seed] Error seeding promo codes:', error);
  }
}
