export interface ComplianceStandard {
  itemName: string;
  category: string;
  frequency: string;
  priority: string;
  description?: string;
  checklistPoints?: string[];
  photoRequired: boolean;
  complianceStandard: string;
  complianceYears: number;
  applicableRooms?: string[]; // If undefined, applies to property-level or all rooms
  conditional?: string; // Special conditions for when this applies
}

export interface CountryCompliance {
  countryCode: string;
  countryName: string;
  standards: ComplianceStandard[];
}

export const GLOBAL_COMPLIANCE_STANDARDS: CountryCompliance[] = [
  {
    countryCode: 'AU',
    countryName: 'Australia',
    standards: [
      {
        itemName: 'RCD/Safety Switch Testing',
        category: 'electrical',
        frequency: 'biannual',
        priority: 'critical',
        description: 'Test all RCD/safety switches at main switchboard',
        checklistPoints: [
          'Test each RCD using test button',
          'Verify RCD trips within 30 milliseconds',
          'Check all circuits protected by RCD',
          'Document test results with date and signature'
        ],
        photoRequired: true,
        complianceStandard: 'AS/NZS 3000 (6 months)',
        complianceYears: 0.5,
        applicableRooms: ['power_box']
      },
      {
        itemName: 'Electrical Panel Safety Inspection',
        category: 'electrical',
        frequency: 'annual',
        priority: 'critical',
        description: 'Full electrical panel inspection by licensed electrician - certificate required every 2 years for rental properties',
        checklistPoints: [
          'Inspect switchboard condition and labeling',
          'Test all circuit breakers for proper operation',
          'Check earthing and bonding connections',
          'Thermal scan for hot spots',
          'Verify main switch and isolators',
          'Issue Electrical Safety Certificate'
        ],
        photoRequired: true,
        complianceStandard: 'AS/NZS 3000 (2 years)',
        complianceYears: 2,
        applicableRooms: ['power_box']
      },
      {
        itemName: 'Smoke Detector Replacement',
        category: 'safety',
        frequency: 'annual',
        priority: 'critical',
        description: 'Replace smoke detectors every 10 years as per manufacturer specs',
        checklistPoints: [
          'Check manufacture date on detector',
          'Test detector function',
          'Clean detector housing',
          'Replace battery if applicable',
          'Replace entire unit if 10+ years old'
        ],
        photoRequired: true,
        complianceStandard: 'AS 3786 (10 years)',
        complianceYears: 10,
        applicableRooms: ['bedroom', 'hallway', 'living_room']
      },
      {
        itemName: 'Hot Water PTR Valve',
        category: 'plumbing',
        frequency: 'annual',
        priority: 'high',
        description: 'Test and replace hot water system Pressure & Temperature Relief valve',
        checklistPoints: [
          'Check for leaks around valve',
          'Lift valve lever to test operation',
          'Ensure valve seats properly',
          'Replace valve every 5 years'
        ],
        photoRequired: true,
        complianceStandard: 'AS 3500 (5 years)',
        complianceYears: 5,
        applicableRooms: ['laundry', 'bathroom']
      },
      {
        itemName: 'Flexi Hose Replacement',
        category: 'plumbing',
        frequency: 'annual',
        priority: 'high',
        description: 'Replace all flexi hoses every 5 years to prevent burst failures',
        checklistPoints: [
          'Check hose manufacture date',
          'Inspect for corrosion or damage',
          'Verify secure connections',
          'Replace if 5+ years old or damaged'
        ],
        photoRequired: true,
        complianceStandard: 'AS 3500 (5 years)',
        complianceYears: 5,
        applicableRooms: ['kitchen', 'bathroom', 'laundry']
      },
      {
        itemName: 'Gas Appliance Compliance',
        category: 'gas',
        frequency: 'annual',
        priority: 'critical',
        description: 'Annual gas appliance safety check by licensed gasfitter',
        checklistPoints: [
          'Check all gas connections for leaks',
          'Test appliance operation',
          'Inspect flue and ventilation',
          'Verify compliance certificate current'
        ],
        photoRequired: true,
        complianceStandard: 'AS/NZS 5601 (5 years)',
        complianceYears: 5,
        applicableRooms: ['kitchen', 'laundry', 'living_room']
      },
      {
        itemName: 'Pool Barrier Compliance',
        category: 'safety',
        frequency: 'annual',
        priority: 'critical',
        description: 'Annual pool barrier inspection for child safety compliance',
        checklistPoints: [
          'Check fence height (min 1200mm)',
          'Verify gate self-closing and self-latching',
          'Inspect for climbable objects near fence',
          'Check CPR sign is visible and current'
        ],
        photoRequired: true,
        complianceStandard: 'AS 1926.1 (Annual)',
        complianceYears: 1,
        applicableRooms: ['pool', 'outdoor']
      },
      {
        itemName: 'Window Safety Restrictors',
        category: 'safety',
        frequency: 'annual',
        priority: 'high',
        description: 'Check window restrictors on upper floor windows',
        checklistPoints: [
          'Verify restrictors installed on all openable windows',
          'Test restrictor locking mechanism',
          'Ensure windows cannot open more than 125mm',
          'Check for damage or wear'
        ],
        photoRequired: true,
        complianceStandard: 'AS 1926.2 (Annual)',
        complianceYears: 1,
        applicableRooms: ['bedroom', 'living_room'],
        conditional: 'Upper floors only (2nd story and above)'
      },
      {
        itemName: 'Fire Extinguisher Inspection',
        category: 'safety',
        frequency: 'annual',
        priority: 'high',
        description: 'Annual fire extinguisher inspection and maintenance',
        checklistPoints: [
          'Check pressure gauge in green zone',
          'Inspect for physical damage',
          'Verify pin and tamper seal intact',
          'Update service tag'
        ],
        photoRequired: true,
        complianceStandard: 'AS 1851 (Annual)',
        complianceYears: 1,
        applicableRooms: ['kitchen', 'hallway', 'garage']
      }
    ]
  },
  {
    countryCode: 'US',
    countryName: 'United States',
    standards: [
      {
        itemName: 'Smoke Detector Testing',
        category: 'safety',
        frequency: 'monthly',
        priority: 'critical',
        description: 'Test smoke detectors monthly, replace every 10 years',
        checklistPoints: [
          'Press test button on each detector',
          'Replace batteries annually',
          'Clean detector of dust',
          'Replace unit after 10 years'
        ],
        photoRequired: true,
        complianceStandard: 'NFPA 72 (10 years)',
        complianceYears: 10,
        applicableRooms: ['bedroom', 'hallway', 'living_room']
      },
      {
        itemName: 'Carbon Monoxide Detector',
        category: 'safety',
        frequency: 'monthly',
        priority: 'critical',
        description: 'Test CO detectors monthly, replace every 5-7 years',
        checklistPoints: [
          'Press test button',
          'Check battery level',
          'Verify detector location near bedrooms',
          'Replace according to manufacturer date'
        ],
        photoRequired: true,
        complianceStandard: 'NFPA 720 (5-7 years)',
        complianceYears: 7,
        applicableRooms: ['bedroom', 'hallway', 'garage']
      },
      {
        itemName: 'GFCI Outlet Testing',
        category: 'electrical',
        frequency: 'monthly',
        priority: 'high',
        description: 'Test GFCI outlets in wet areas monthly',
        checklistPoints: [
          'Press TEST button - outlet should trip',
          'Press RESET button to restore power',
          'Check for proper grounding',
          'Replace if not functioning properly'
        ],
        photoRequired: true,
        complianceStandard: 'NEC Article 406 (Monthly test)',
        complianceYears: 15,
        applicableRooms: ['bathroom', 'kitchen', 'outdoor', 'garage']
      },
      {
        itemName: 'Water Heater TPR Valve',
        category: 'plumbing',
        frequency: 'annual',
        priority: 'high',
        description: 'Test Temperature & Pressure Relief valve annually',
        checklistPoints: [
          'Lift valve lever to test',
          'Water should flow and stop when released',
          'Check for leaks',
          'Replace if not functioning'
        ],
        photoRequired: true,
        complianceStandard: 'IPC Section 504 (Annual test)',
        complianceYears: 5,
        applicableRooms: ['laundry', 'garage', 'basement']
      },
      {
        itemName: 'Fire Extinguisher Inspection',
        category: 'safety',
        frequency: 'annual',
        priority: 'high',
        description: 'Annual fire extinguisher inspection',
        checklistPoints: [
          'Check pressure gauge',
          'Inspect for damage',
          'Verify accessibility',
          'Update inspection tag'
        ],
        photoRequired: true,
        complianceStandard: 'NFPA 10 (Annual)',
        complianceYears: 12,
        applicableRooms: ['kitchen', 'garage']
      },
      {
        itemName: 'Electrical Panel Safety Inspection',
        category: 'electrical',
        frequency: 'annual',
        priority: 'critical',
        description: 'Professional electrical panel inspection by licensed electrician - certificate recommended every 3-5 years',
        checklistPoints: [
          'Inspect breaker panel for damage or overheating',
          'Check all circuit breakers for proper operation',
          'Test AFCI/GFCI breakers',
          'Verify proper grounding and bonding',
          'Check for outdated panels (FPE, Zinsco)',
          'Issue inspection certificate'
        ],
        photoRequired: true,
        complianceStandard: 'NEC/NFPA 70B (5 years)',
        complianceYears: 5,
        applicableRooms: ['power_box']
      }
    ]
  },
  {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    standards: [
      {
        itemName: 'Gas Safety Certificate',
        category: 'gas',
        frequency: 'annual',
        priority: 'critical',
        description: 'Annual gas safety check by Gas Safe registered engineer',
        checklistPoints: [
          'Check all gas appliances',
          'Inspect flues and ventilation',
          'Test for gas leaks',
          'Provide CP12 certificate'
        ],
        photoRequired: true,
        complianceStandard: 'Gas Safety Regulations (Annual)',
        complianceYears: 1,
        applicableRooms: ['kitchen', 'living_room', 'boiler_room']
      },
      {
        itemName: 'Electrical Installation Condition Report (EICR)',
        category: 'electrical',
        frequency: 'annual',
        priority: 'critical',
        description: 'Electrical safety inspection every 5 years for rentals - mandatory since 2020',
        checklistPoints: [
          'Test all electrical circuits',
          'Inspect consumer unit/fuse box',
          'Check earthing and bonding',
          'Test RCD operation',
          'Identify any code violations',
          'Issue EICR certificate'
        ],
        photoRequired: true,
        complianceStandard: 'BS 7671 (5 years)',
        complianceYears: 5,
        applicableRooms: ['power_box']
      },
      {
        itemName: 'Smoke Alarm Testing',
        category: 'safety',
        frequency: 'monthly',
        priority: 'critical',
        description: 'Test smoke alarms monthly, replace every 10 years',
        checklistPoints: [
          'Press test button on each alarm',
          'Check battery backup',
          'Clean alarm sensor',
          'Replace unit after 10 years'
        ],
        photoRequired: true,
        complianceStandard: 'BS 5839 (10 years)',
        complianceYears: 10,
        applicableRooms: ['bedroom', 'hallway', 'living_room']
      },
      {
        itemName: 'Carbon Monoxide Alarm',
        category: 'safety',
        frequency: 'annual',
        priority: 'critical',
        description: 'CO alarms required in rooms with solid fuel appliances',
        checklistPoints: [
          'Test alarm function',
          'Check battery',
          'Verify location near appliance',
          'Replace according to manufacturer specs'
        ],
        photoRequired: true,
        complianceStandard: 'BS EN 50291 (5-7 years)',
        complianceYears: 7,
        applicableRooms: ['living_room', 'bedroom'],
        conditional: 'Required for rooms with solid fuel burning appliances'
      },
      {
        itemName: 'Legionella Risk Assessment',
        category: 'plumbing',
        frequency: 'annual',
        priority: 'high',
        description: 'Water system risk assessment for legionella bacteria',
        checklistPoints: [
          'Check water temperature at outlets (>50°C)',
          'Inspect for stagnant water',
          'Clean shower heads',
          'Descale taps and outlets'
        ],
        photoRequired: true,
        complianceStandard: 'HSE L8 (2 years)',
        complianceYears: 2,
        applicableRooms: ['bathroom', 'kitchen']
      }
    ]
  },
  {
    countryCode: 'CA',
    countryName: 'Canada',
    standards: [
      {
        itemName: 'Smoke Alarm Testing',
        category: 'safety',
        frequency: 'monthly',
        priority: 'critical',
        description: 'Test smoke alarms monthly, replace every 10 years',
        checklistPoints: [
          'Press test button',
          'Replace batteries annually',
          'Clean detector',
          'Replace unit after 10 years'
        ],
        photoRequired: true,
        complianceStandard: 'CAN/ULC-S531 (10 years)',
        complianceYears: 10,
        applicableRooms: ['bedroom', 'hallway']
      },
      {
        itemName: 'Carbon Monoxide Alarm',
        category: 'safety',
        frequency: 'monthly',
        priority: 'critical',
        description: 'Test CO alarms monthly in homes with fuel-burning appliances',
        checklistPoints: [
          'Test each alarm',
          'Check battery',
          'Verify placement near sleeping areas',
          'Replace per manufacturer instructions'
        ],
        photoRequired: true,
        complianceStandard: 'CAN/CSA-6.19 (7-10 years)',
        complianceYears: 10,
        applicableRooms: ['bedroom', 'hallway', 'garage']
      },
      {
        itemName: 'Furnace Inspection',
        category: 'hvac',
        frequency: 'annual',
        priority: 'high',
        description: 'Annual furnace inspection and cleaning',
        checklistPoints: [
          'Inspect heat exchanger',
          'Clean burners',
          'Check gas connections',
          'Test safety controls'
        ],
        photoRequired: true,
        complianceStandard: 'CSA B149.1 (Annual)',
        complianceYears: 1,
        applicableRooms: ['basement', 'utility_room']
      },
      {
        itemName: 'Electrical Panel Safety Inspection',
        category: 'electrical',
        frequency: 'annual',
        priority: 'critical',
        description: 'Professional electrical panel inspection by licensed electrician - certificate required every 5 years',
        checklistPoints: [
          'Inspect breaker panel for damage or overheating',
          'Check all circuit breakers for proper operation',
          'Test GFCI/AFCI protection',
          'Verify proper grounding and bonding',
          'Check for arc fault indicators',
          'Issue ESA inspection certificate'
        ],
        photoRequired: true,
        complianceStandard: 'Ontario ESA / CSA (5 years)',
        complianceYears: 5,
        applicableRooms: ['power_box']
      }
    ]
  },
  {
    countryCode: 'NZ',
    countryName: 'New Zealand',
    standards: [
      {
        itemName: 'Smoke Alarm Testing',
        category: 'safety',
        frequency: 'monthly',
        priority: 'critical',
        description: 'Test smoke alarms monthly, replace every 10 years',
        checklistPoints: [
          'Press test button',
          'Replace batteries',
          'Clean alarm',
          'Replace unit after 10 years'
        ],
        photoRequired: true,
        complianceStandard: 'NZS 4514 (10 years)',
        complianceYears: 10,
        applicableRooms: ['bedroom', 'hallway', 'living_room']
      },
      {
        itemName: 'Electrical Panel Safety Inspection',
        category: 'electrical',
        frequency: 'annual',
        priority: 'critical',
        description: 'Professional electrical safety inspection by registered electrician - certificate required every 4 years for rental properties',
        checklistPoints: [
          'Test all RCD/safety switches',
          'Inspect switchboard for damage and labeling',
          'Check earthing and bonding connections',
          'Check all fixed electrical appliances',
          'Issue Electrical Warrant of Fitness'
        ],
        photoRequired: true,
        complianceStandard: 'AS/NZS 3000 (4 years)',
        complianceYears: 4,
        applicableRooms: ['power_box']
      },
      {
        itemName: 'Healthy Homes - Heating',
        category: 'hvac',
        frequency: 'annual',
        priority: 'high',
        description: 'Ensure heating meets Healthy Homes standards',
        checklistPoints: [
          'Verify heating in living room',
          'Check heating capacity adequate for room size',
          'Test heating operation',
          'Maintain heating appliances'
        ],
        photoRequired: true,
        complianceStandard: 'Healthy Homes Standards (Annual check)',
        complianceYears: 1,
        applicableRooms: ['living_room']
      }
    ]
  },
  {
    countryCode: 'IE',
    countryName: 'Ireland',
    standards: [
      {
        itemName: 'BER Certificate',
        category: 'energy',
        frequency: 'annual',
        priority: 'critical',
        description: 'Building Energy Rating certificate required for rental properties - valid 10 years',
        checklistPoints: [
          'Verify BER certificate is current',
          'Check BER rating displayed',
          'Confirm certificate registered with SEAI',
          'Schedule renewal if expiring'
        ],
        photoRequired: true,
        complianceStandard: 'SI 243/2012 (10 years)',
        complianceYears: 10,
        applicableRooms: ['living_room']
      },
      {
        itemName: 'Smoke Alarm Testing',
        category: 'safety',
        frequency: 'monthly',
        priority: 'critical',
        description: 'Test smoke alarms monthly, replace every 10 years per Irish standards',
        checklistPoints: [
          'Press test button on each alarm',
          'Check battery backup',
          'Clean alarm sensor',
          'Replace unit after 10 years'
        ],
        photoRequired: true,
        complianceStandard: 'IS 3218 (10 years)',
        complianceYears: 10,
        applicableRooms: ['bedroom', 'hallway', 'living_room']
      },
      {
        itemName: 'Carbon Monoxide Alarm',
        category: 'safety',
        frequency: 'annual',
        priority: 'critical',
        description: 'CO alarms required in rooms with fuel-burning appliances',
        checklistPoints: [
          'Test alarm function',
          'Check battery',
          'Verify location near appliance',
          'Replace according to manufacturer specs'
        ],
        photoRequired: true,
        complianceStandard: 'IS 50291 (7 years)',
        complianceYears: 7,
        applicableRooms: ['living_room', 'kitchen', 'bedroom']
      },
      {
        itemName: 'Electrical Installation Inspection',
        category: 'electrical',
        frequency: 'annual',
        priority: 'critical',
        description: 'Electrical inspection by RECI registered contractor - recommended every 5 years for rentals',
        checklistPoints: [
          'Test all electrical circuits',
          'Inspect consumer unit/fuse box',
          'Check earthing and bonding',
          'Test RCD operation',
          'Issue Periodic Inspection Report'
        ],
        photoRequired: true,
        complianceStandard: 'ET 101 (5 years)',
        complianceYears: 5,
        applicableRooms: ['power_box']
      },
      {
        itemName: 'Gas Boiler Service',
        category: 'gas',
        frequency: 'annual',
        priority: 'critical',
        description: 'Annual gas boiler service by RGI registered installer',
        checklistPoints: [
          'Check all gas connections for leaks',
          'Test boiler operation and efficiency',
          'Inspect flue and ventilation',
          'Provide service certificate'
        ],
        photoRequired: true,
        complianceStandard: 'RGI Standards (Annual)',
        complianceYears: 1,
        applicableRooms: ['boiler_room', 'utility_room', 'kitchen']
      },
      {
        itemName: 'Fire Blanket Inspection',
        category: 'safety',
        frequency: 'annual',
        priority: 'high',
        description: 'Annual fire blanket inspection in kitchen',
        checklistPoints: [
          'Check blanket is accessible',
          'Inspect for damage',
          'Verify mounting is secure',
          'Replace if damaged or used'
        ],
        photoRequired: true,
        complianceStandard: 'IS EN 1869 (Annual)',
        complianceYears: 1,
        applicableRooms: ['kitchen']
      },
      {
        itemName: 'Window Safety Restrictors',
        category: 'safety',
        frequency: 'annual',
        priority: 'high',
        description: 'Check window restrictors on upper floor windows for child safety',
        checklistPoints: [
          'Verify restrictors installed on all openable windows',
          'Test restrictor locking mechanism',
          'Ensure windows cannot open more than 100mm',
          'Check for damage or wear'
        ],
        photoRequired: true,
        complianceStandard: 'Building Regulations Part K (Annual)',
        complianceYears: 1,
        applicableRooms: ['bedroom', 'living_room'],
        conditional: 'Upper floors only'
      }
    ]
  }
];

export function getCountryCompliance(countryCode: string): CountryCompliance | undefined {
  return GLOBAL_COMPLIANCE_STANDARDS.find(c => c.countryCode === countryCode);
}

export function normalizeRoomType(roomType: string): string {
  const normalized = roomType.toLowerCase().trim();
  
  // Pattern-based matching to handle dynamic room types
  // This ensures bedroom_1, bedroom_2, bedroom_3, master_bedroom, etc. all map to "bedroom"
  
  if (/bedroom|kids|child/.test(normalized)) {
    return 'bedroom';
  }
  if (/bathroom|ensuite|powder|toilet|wc/.test(normalized)) {
    return 'bathroom';
  }
  if (/kitchen/.test(normalized)) {
    return 'kitchen';
  }
  if (/living|lounge|family/.test(normalized)) {
    return 'living_room';
  }
  if (/dining/.test(normalized)) {
    return 'dining_room';
  }
  if (/laundry/.test(normalized)) {
    return 'laundry';
  }
  if (/butler|pantry|scullery/.test(normalized)) {
    return 'butler_pantry';
  }
  if (/garage/.test(normalized)) {
    return 'garage';
  }
  if (/hallway|corridor|passage/.test(normalized)) {
    return 'hallway';
  }
  if (/outdoor|patio|deck|balcony/.test(normalized)) {
    return 'outdoor';
  }
  if (/pool/.test(normalized)) {
    return 'pool';
  }
  if (/basement|cellar/.test(normalized)) {
    return 'basement';
  }
  if (/utility/.test(normalized)) {
    return 'utility_room';
  }
  if (/boiler/.test(normalized)) {
    return 'boiler_room';
  }
  if (/switchboard|electrical|power.?box|meter.?box|fuse.?box|breaker.?panel/.test(normalized)) {
    return 'power_box';
  }
  if (/roof/.test(normalized)) {
    return 'roof';
  }
  if (/gutter/.test(normalized)) {
    return 'gutters';
  }
  
  // Return original if no mapping found
  return normalized;
}

export function detectCountryFromAddress(address: string): string {
  const addressLower = address.toLowerCase().trim();
  
  // Check for explicit country names first (most reliable)
  if (/\b(australia|australian)\b/.test(addressLower)) return 'AU';
  if (/\b(new zealand)\b/.test(addressLower)) return 'NZ';
  if (/\b(united states|usa|america)\b/.test(addressLower)) return 'US';
  if (/\b(united kingdom|england|scotland|wales|northern ireland)\b/.test(addressLower)) return 'GB';
  if (/\b(ireland|irish|eire)\b/.test(addressLower) && !/\bnorthern ireland\b/.test(addressLower)) return 'IE';
  if (/\bcanada\b/.test(addressLower)) return 'CA';
  
  // Irish counties and cities (before UK to avoid false matches)
  if (/\b(dublin|cork|galway|limerick|waterford|kilkenny|wexford|kerry|clare|mayo|sligo|donegal|tipperary|wicklow|meath|louth|kildare|laois|offaly|westmeath|longford|roscommon|leitrim|cavan|monaghan|carlow)\b/.test(addressLower)) return 'IE';
  // Irish postcodes (Eircode format like D02 X285)
  if (/\b[a-z]\d{2}\s?[a-z0-9]{4}\b/.test(addressLower)) return 'IE';
  
  // Australian states and cities
  if (/\b(nsw|vic|qld|sa|wa|tas|nt|act)\b/.test(addressLower)) return 'AU';
  if (/\b(sydney|melbourne|brisbane|perth|adelaide|canberra|hobart|darwin)\b/.test(addressLower)) return 'AU';
  
  // UK cities and regions
  if (/\b(london|manchester|birmingham|glasgow|liverpool|edinburgh|leeds|bristol|sheffield|newcastle|nottingham|cardiff|belfast|southampton|oxford|cambridge|brighton|bath|york|chester)\b/.test(addressLower)) return 'GB';
  // UK postcodes (format like SW1A 1AA, M1 1AE, etc.)
  if (/\b[a-z]{1,2}\d[a-z\d]?\s?\d[a-z]{2}\b/.test(addressLower)) return 'GB';
  
  // Canadian provinces and cities
  if (/\b(ontario|quebec|british columbia|alberta|manitoba|saskatchewan|nova scotia|new brunswick|newfoundland|prince edward island|yukon|northwest territories|nunavut)\b/.test(addressLower)) return 'CA';
  if (/\b(toronto|vancouver|montreal|calgary|ottawa|edmonton|winnipeg|quebec city|hamilton|kitchener|london|victoria|halifax|regina|saskatoon)\b/.test(addressLower)) return 'CA';
  // Canadian postcodes (format like K1A 0B1)
  if (/\b[a-z]\d[a-z]\s?\d[a-z]\d\b/.test(addressLower)) return 'CA';
  
  // New Zealand cities
  if (/\b(auckland|wellington|christchurch|dunedin|hamilton|tauranga|palmerston north|napier|hastings|nelson|rotorua|invercargill|whangarei|new plymouth|gisborne)\b/.test(addressLower)) return 'NZ';
  
  // US states (only check for full state names or explicit abbreviations in context)
  // This must come AFTER Australian checks to avoid false matches
  const usStatePatterns = /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)\b/;
  if (usStatePatterns.test(addressLower)) return 'US';
  
  // US cities (common ones)
  if (/\b(new york|los angeles|chicago|houston|phoenix|philadelphia|san antonio|san diego|dallas|san jose|austin|seattle|boston|miami|atlanta|denver|detroit|minneapolis|portland|las vegas|baltimore|milwaukee|san francisco|sacramento|kansas city|cleveland|indianapolis|columbus|charlotte|nashville|memphis|louisville|oklahoma city|jacksonville|albuquerque|tucson|fresno|mesa|omaha|colorado springs|raleigh|virginia beach|long beach|oakland|tulsa|honolulu|arlington|bakersfield|aurora)\b/.test(addressLower)) return 'US';
  // US ZIP codes (5 digits or 5+4 format)
  if (/\b\d{5}(-\d{4})?\b/.test(addressLower)) return 'US';
  
  // Default to Australia if no clear match (most conservative choice for this app)
  console.log(`⚠️ Could not detect country from address: "${address}" - defaulting to AU`);
  return 'AU';
}
