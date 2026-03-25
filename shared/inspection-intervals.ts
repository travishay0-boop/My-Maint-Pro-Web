export interface InspectionInterval {
  item: string;
  visualInspectionInterval: string;
  professionalServiceInterval: string;
  legalRequirement: string;
}

export interface CountryInspectionIntervals {
  [country: string]: InspectionInterval[];
}

export const inspectionIntervals: CountryInspectionIntervals = {
  "AU": [
    {
      item: "Electrical switches & GPOs",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "Every 2 years (Vic); 2–5 years elsewhere",
      legalRequirement: "Vic: 2-year mandatory"
    },
    {
      item: "Flexi Hoses",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "Replace every 5 years",
      legalRequirement: "None"
    },
    {
      item: "Roof Gutters",
      visualInspectionInterval: "6 months",
      professionalServiceInterval: "Clean 6–12 months",
      legalRequirement: "None"
    },
    {
      item: "Gas Compliance Inspections",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "Every 2 years (Vic); annual best practice",
      legalRequirement: "Vic: every 2 years"
    },
    {
      item: "Window & Cladding Connections",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "3–5 years",
      legalRequirement: "None"
    },
    {
      item: "Tap Mixers / Tap Washers",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "Replace mixer at ~10 years",
      legalRequirement: "None"
    },
    {
      item: "Fire Extinguishers",
      visualInspectionInterval: "Monthly",
      professionalServiceInterval: "6-monthly, annual, 5-year major",
      legalRequirement: "AS 1851: 6m, 12m, 5y"
    },
    {
      item: "Kitchen & Bathroom Silicone & Grout",
      visualInspectionInterval: "Monthly",
      professionalServiceInterval: "Annual inspection, 5-year reseal",
      legalRequirement: "None"
    },
    {
      item: "Decking Timbers & Frames",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "3–5 years professional",
      legalRequirement: "Guidelines only"
    }
  ],
  "GB": [
    {
      item: "Electrical switches & GPOs",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "Every 5 years (EICR)",
      legalRequirement: "5-year EICR (legal)"
    },
    {
      item: "Flexi Hoses",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "Replace every 5 years",
      legalRequirement: "None"
    },
    {
      item: "Roof Gutters",
      visualInspectionInterval: "6 months",
      professionalServiceInterval: "Clean 6–12 months",
      legalRequirement: "None"
    },
    {
      item: "Gas Compliance Inspections",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "Annual (legal)",
      legalRequirement: "Annual (legal)"
    },
    {
      item: "Window & Cladding Connections",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "3–5 years",
      legalRequirement: "None"
    },
    {
      item: "Tap Mixers / Tap Washers",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "Replace mixer ~10 years",
      legalRequirement: "None"
    },
    {
      item: "Fire Extinguishers",
      visualInspectionInterval: "Monthly",
      professionalServiceInterval: "Annual; 5-year extended; 10-year overhaul",
      legalRequirement: "BS 5306"
    },
    {
      item: "Kitchen & Bathroom Silicone & Grout",
      visualInspectionInterval: "Monthly",
      professionalServiceInterval: "Annual inspection, 5-year reseal",
      legalRequirement: "None"
    },
    {
      item: "Decking Timbers & Frames",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "3–5 years professional",
      legalRequirement: "None"
    }
  ],
  "US": [
    {
      item: "Electrical switches & GPOs",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "Every 5–10 years or change of ownership",
      legalRequirement: "State dependent"
    },
    {
      item: "Flexi Hoses",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "Replace every 5 years",
      legalRequirement: "None"
    },
    {
      item: "Roof Gutters",
      visualInspectionInterval: "6 months",
      professionalServiceInterval: "Clean 6–12 months",
      legalRequirement: "None"
    },
    {
      item: "Gas Compliance Inspections",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "Annual (industry standard)",
      legalRequirement: "State dependent"
    },
    {
      item: "Window & Cladding Connections",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "3–5 years",
      legalRequirement: "Varies by city"
    },
    {
      item: "Tap Mixers / Tap Washers",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "Replace mixer ~10 years",
      legalRequirement: "None"
    },
    {
      item: "Fire Extinguishers",
      visualInspectionInterval: "Monthly",
      professionalServiceInterval: "Annual; 6/12-year tests",
      legalRequirement: "NFPA 10"
    },
    {
      item: "Kitchen & Bathroom Silicone & Grout",
      visualInspectionInterval: "Monthly",
      professionalServiceInterval: "Annual inspection, 5-year reseal",
      legalRequirement: "None"
    },
    {
      item: "Decking Timbers & Frames",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "Annual; 3–5 years professional",
      legalRequirement: "None"
    }
  ],
  "CA": [
    {
      item: "Electrical switches & GPOs",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "Every 5–10 years",
      legalRequirement: "None nationally"
    },
    {
      item: "Flexi Hoses",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "Replace every 5 years",
      legalRequirement: "None"
    },
    {
      item: "Roof Gutters",
      visualInspectionInterval: "6 months",
      professionalServiceInterval: "Clean 6–12 months",
      legalRequirement: "None"
    },
    {
      item: "Gas Compliance Inspections",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "Annual (industry standard)",
      legalRequirement: "None nationally"
    },
    {
      item: "Window & Cladding Connections",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "3–5 years",
      legalRequirement: "None"
    },
    {
      item: "Tap Mixers / Tap Washers",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "Replace mixer ~10 years",
      legalRequirement: "None"
    },
    {
      item: "Fire Extinguishers",
      visualInspectionInterval: "Monthly",
      professionalServiceInterval: "Annual; 6/12-year tests",
      legalRequirement: "NFPA 10 adopted"
    },
    {
      item: "Kitchen & Bathroom Silicone & Grout",
      visualInspectionInterval: "Monthly",
      professionalServiceInterval: "Annual inspection, 5-year reseal",
      legalRequirement: "None"
    },
    {
      item: "Decking Timbers & Frames",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "Annual; 3–5 years professional",
      legalRequirement: "None"
    }
  ],
  "NZ": [
    {
      item: "Electrical switches & GPOs",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "Every 5–10 years",
      legalRequirement: "None"
    },
    {
      item: "Flexi Hoses",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "Replace every 5 years",
      legalRequirement: "None"
    },
    {
      item: "Roof Gutters",
      visualInspectionInterval: "6 months",
      professionalServiceInterval: "Clean 6–12 months",
      legalRequirement: "None"
    },
    {
      item: "Gas Compliance Inspections",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "Annual recommended",
      legalRequirement: "None"
    },
    {
      item: "Window & Cladding Connections",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "3–5 years",
      legalRequirement: "None"
    },
    {
      item: "Tap Mixers / Tap Washers",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "Replace mixer ~10 years",
      legalRequirement: "None"
    },
    {
      item: "Fire Extinguishers",
      visualInspectionInterval: "Monthly",
      professionalServiceInterval: "Annual; 6-monthly in hostile environments",
      legalRequirement: "NZS 4503"
    },
    {
      item: "Kitchen & Bathroom Silicone & Grout",
      visualInspectionInterval: "Monthly",
      professionalServiceInterval: "Annual inspection, 5-year reseal",
      legalRequirement: "None"
    },
    {
      item: "Decking Timbers & Frames",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "Annual; 3–5 years professional",
      legalRequirement: "None"
    }
  ],
  "IE": [
    {
      item: "Electrical switches & GPOs",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "Every 5 years (RECI)",
      legalRequirement: "5-year recommended"
    },
    {
      item: "Flexi Hoses",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "Replace every 5 years",
      legalRequirement: "None"
    },
    {
      item: "Roof Gutters",
      visualInspectionInterval: "6 months",
      professionalServiceInterval: "Clean 6–12 months",
      legalRequirement: "None"
    },
    {
      item: "Gas Compliance Inspections",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "Annual (RGI)",
      legalRequirement: "Annual (RGI registered)"
    },
    {
      item: "Window & Cladding Connections",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "3–5 years",
      legalRequirement: "None"
    },
    {
      item: "Tap Mixers / Tap Washers",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "Replace mixer ~10 years",
      legalRequirement: "None"
    },
    {
      item: "Fire Extinguishers",
      visualInspectionInterval: "Monthly",
      professionalServiceInterval: "Annual; 5-year extended",
      legalRequirement: "IS 291"
    },
    {
      item: "Kitchen & Bathroom Silicone & Grout",
      visualInspectionInterval: "Monthly",
      professionalServiceInterval: "Annual inspection, 5-year reseal",
      legalRequirement: "None"
    },
    {
      item: "Decking Timbers & Frames",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "3–5 years professional",
      legalRequirement: "None"
    },
    {
      item: "Smoke Detector",
      visualInspectionInterval: "Monthly",
      professionalServiceInterval: "Replace every 10 years",
      legalRequirement: "IS 3218"
    },
    {
      item: "Carbon Monoxide Detector",
      visualInspectionInterval: "12 months",
      professionalServiceInterval: "Replace every 7 years",
      legalRequirement: "IS 50291"
    }
  ]
};

export function parseInspectionInterval(interval: string): number {
  const lower = interval.toLowerCase();
  
  if (lower.includes('monthly') || lower.includes('month') && !lower.includes('months')) {
    return 1;
  }
  
  const monthMatch = lower.match(/(\d+)\s*months?/);
  if (monthMatch) {
    return parseInt(monthMatch[1]);
  }
  
  const yearMatch = lower.match(/(\d+)\s*years?/);
  if (yearMatch) {
    return parseInt(yearMatch[1]) * 12;
  }
  
  if (lower.includes('6-monthly') || lower.includes('six-monthly')) {
    return 6;
  }
  
  if (lower.includes('annual') || lower.includes('yearly')) {
    return 12;
  }
  
  return 12;
}

export function calculateNextInspectionDate(lastInspectionDate: Date, intervalMonths: number): Date {
  const nextDate = new Date(lastInspectionDate);
  nextDate.setMonth(nextDate.getMonth() + intervalMonths);
  return nextDate;
}

export function getInspectionIntervalForItem(country: string, itemName: string): InspectionInterval | null {
  const countryIntervals = inspectionIntervals[country];
  if (!countryIntervals) {
    return null;
  }
  
  const normalizedItemName = itemName.toLowerCase().trim();
  
  // First try exact match
  const exactMatch = countryIntervals.find(interval => 
    interval.item.toLowerCase() === normalizedItemName
  );
  if (exactMatch) return exactMatch;
  
  // Then try word-boundary matches (more precise substring matching)
  // Avoid false matches like "bath" in "bathroom"
  const wordBoundaryMatch = countryIntervals.find(interval => {
    const intervalLower = interval.item.toLowerCase();
    // Check if the item name starts with or is the main component
    if (normalizedItemName.startsWith(intervalLower + ' ') || 
        normalizedItemName.endsWith(' ' + intervalLower) ||
        normalizedItemName.includes(' ' + intervalLower + ' ')) {
      return true;
    }
    // Check the reverse
    if (intervalLower.startsWith(normalizedItemName + ' ') ||
        intervalLower.endsWith(' ' + normalizedItemName)) {
      return true;
    }
    return false;
  });
  if (wordBoundaryMatch) return wordBoundaryMatch;
  
  // Finally, fallback to loose substring matching but with length check
  // to avoid short strings matching unrelated entries
  const looseMatch = countryIntervals.find(interval => {
    const intervalLower = interval.item.toLowerCase();
    // Only do loose matching if the search term is at least 5 characters
    // and doesn't appear as a substring in compound words
    if (normalizedItemName.length >= 5) {
      if (normalizedItemName.includes(intervalLower) || intervalLower.includes(normalizedItemName)) {
        // Exclude compound words like "bathroom" matching "bath"
        if (intervalLower.includes('bathroom') && normalizedItemName === 'bath') return false;
        if (intervalLower.includes('kitchen') && normalizedItemName === 'bath') return false;
        return true;
      }
    }
    return false;
  });
  
  return looseMatch || null;
}

// Comprehensive default intervals for common inspection items (in months)
// These are used when country-specific intervals aren't available
export interface ItemIntervalDefaults {
  intervalMonths: number;
  visualInspectionInterval: string;
  professionalServiceInterval?: string;
  legalRequirement?: string;
}

// Default intervals by item category/type - applies to all countries unless overridden
const DEFAULT_ITEM_INTERVALS: Record<string, ItemIntervalDefaults> = {
  // Safety items
  'smoke detector': { intervalMonths: 12, visualInspectionInterval: '12 months', professionalServiceInterval: 'Replace every 10 years' },
  'smoke alarm': { intervalMonths: 12, visualInspectionInterval: '12 months', professionalServiceInterval: 'Replace every 10 years' },
  'carbon monoxide': { intervalMonths: 12, visualInspectionInterval: '12 months', professionalServiceInterval: 'Replace every 5-7 years' },
  'fire extinguisher': { intervalMonths: 12, visualInspectionInterval: '12 months', professionalServiceInterval: 'Annual service' },
  'fire blanket': { intervalMonths: 12, visualInspectionInterval: '12 months', professionalServiceInterval: 'Annual inspection' },
  'window safety': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'rcd': { intervalMonths: 6, visualInspectionInterval: '6 months', professionalServiceInterval: 'Biannual testing' },
  'safety switch': { intervalMonths: 6, visualInspectionInterval: '6 months', professionalServiceInterval: 'Biannual testing' },
  
  // Plumbing items
  'flexi hose': { intervalMonths: 12, visualInspectionInterval: '12 months', professionalServiceInterval: 'Replace every 5 years' },
  'tap': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'vanity': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'toilet': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'shower': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'bath': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'sink': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'hot water': { intervalMonths: 12, visualInspectionInterval: '12 months', professionalServiceInterval: '5-year PTR valve replacement' },
  'ptr valve': { intervalMonths: 12, visualInspectionInterval: '12 months', professionalServiceInterval: 'Replace every 5 years' },
  'sump pump': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'drainage': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'irrigation': { intervalMonths: 6, visualInspectionInterval: '6 months' },
  
  // Electrical items
  'light switch': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'power point': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'gpo': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'electrical panel': { intervalMonths: 12, visualInspectionInterval: '12 months', professionalServiceInterval: '2-5 years inspection' },
  'circuit breaker': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'exhaust fan': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'rangehood': { intervalMonths: 6, visualInspectionInterval: '6 months' },
  'outdoor lighting': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  
  // HVAC items
  'air conditioning': { intervalMonths: 12, visualInspectionInterval: '12 months', professionalServiceInterval: 'Annual service' },
  'heating': { intervalMonths: 12, visualInspectionInterval: '12 months', professionalServiceInterval: 'Annual service' },
  'hvac': { intervalMonths: 12, visualInspectionInterval: '12 months', professionalServiceInterval: 'Annual service' },
  'furnace': { intervalMonths: 12, visualInspectionInterval: '12 months', professionalServiceInterval: 'Annual service' },
  'boiler': { intervalMonths: 12, visualInspectionInterval: '12 months', professionalServiceInterval: 'Annual service' },
  
  // Gas items
  'gas': { intervalMonths: 12, visualInspectionInterval: '12 months', professionalServiceInterval: 'Annual gas safety check' },
  
  // Structural items
  'roof': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'gutter': { intervalMonths: 6, visualInspectionInterval: '6 months' },
  'downpipe': { intervalMonths: 6, visualInspectionInterval: '6 months' },
  'deck': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'balcony': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'railing': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'foundation': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'cladding': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'window': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'door': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'fence': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'gate': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'paving': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'retaining wall': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'attic': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'insulation': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  
  // Kitchen items
  'cabinetry': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'benchtop': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'splashback': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'dishwasher': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'oven': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'cooktop': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'fridge': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  
  // Pool items
  'pool barrier': { intervalMonths: 12, visualInspectionInterval: '12 months', professionalServiceInterval: 'Annual compliance check' },
  'pool fence': { intervalMonths: 12, visualInspectionInterval: '12 months', professionalServiceInterval: 'Annual compliance check' },
  'pool pump': { intervalMonths: 6, visualInspectionInterval: '6 months' },
  'pool filter': { intervalMonths: 6, visualInspectionInterval: '6 months' },
  
  // Garage items
  'garage door': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'garage floor': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  
  // General items
  'silicone': { intervalMonths: 12, visualInspectionInterval: '12 months', professionalServiceInterval: '5-year reseal' },
  'grout': { intervalMonths: 12, visualInspectionInterval: '12 months', professionalServiceInterval: '5-year reseal' },
  'tile': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'flooring': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'carpet': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'paint': { intervalMonths: 24, visualInspectionInterval: '24 months' },
  'wall': { intervalMonths: 12, visualInspectionInterval: '12 months' },
  'ceiling': { intervalMonths: 12, visualInspectionInterval: '12 months' },
};

// Get the best matching interval for an item name
export function getDefaultIntervalForItem(itemName: string): ItemIntervalDefaults {
  const normalizedName = itemName.toLowerCase();
  
  // Try to find an exact or partial match
  for (const [key, interval] of Object.entries(DEFAULT_ITEM_INTERVALS)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return interval;
    }
  }
  
  // Default to 12 months if no match found
  return {
    intervalMonths: 12,
    visualInspectionInterval: '12 months'
  };
}

// Comprehensive resolver that checks country-specific first, then falls back to defaults
export function resolveInspectionInterval(country: string, itemName: string): {
  intervalMonths: number;
  visualInspectionInterval: string;
  professionalServiceInterval?: string;
  legalRequirement?: string;
} {
  // First try country-specific intervals
  const countryInterval = getInspectionIntervalForItem(country, itemName);
  if (countryInterval) {
    return {
      intervalMonths: parseInspectionInterval(countryInterval.visualInspectionInterval),
      visualInspectionInterval: countryInterval.visualInspectionInterval,
      professionalServiceInterval: countryInterval.professionalServiceInterval,
      legalRequirement: countryInterval.legalRequirement
    };
  }
  
  // Fall back to defaults
  return getDefaultIntervalForItem(itemName);
}
