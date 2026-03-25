// Address normalization and comparison utility for certificate validation

// Common abbreviation mappings for address normalization
const ABBREVIATION_MAP: Record<string, string> = {
  'st': 'street',
  'str': 'street',
  'rd': 'road',
  'ave': 'avenue',
  'av': 'avenue',
  'blvd': 'boulevard',
  'dr': 'drive',
  'ct': 'court',
  'pl': 'place',
  'ln': 'lane',
  'cres': 'crescent',
  'cr': 'crescent',
  'cir': 'circle',
  'pde': 'parade',
  'tce': 'terrace',
  'hwy': 'highway',
  'apt': 'unit',
  'unit': 'unit',
  '#': 'unit',
  'ste': 'suite',
  'n': 'north',
  's': 'south',
  'e': 'east',
  'w': 'west',
  'nth': 'north',
  'sth': 'south',
  'fl': 'floor',
  'flr': 'floor',
  'bldg': 'building',
  'nsw': 'new south wales',
  'vic': 'victoria', 
  'qld': 'queensland',
  'wa': 'western australia',
  'sa': 'south australia',
  'tas': 'tasmania',
  'nt': 'northern territory',
  'act': 'australian capital territory',
};

// Normalize an address for comparison
export function normalizeAddress(address: string): string {
  if (!address) return '';
  
  let normalized = address
    .toLowerCase()
    .trim()
    // Remove punctuation except alphanumeric and spaces
    .replace(/[.,\-\/\\'"()]/g, ' ')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
  
  // Expand abbreviations
  const words = normalized.split(' ');
  const expandedWords = words.map(word => ABBREVIATION_MAP[word] || word);
  
  return expandedWords.join(' ');
}

// Extract address components
interface AddressComponents {
  unitNumber: string | null;
  streetNumber: string | null;
  streetName: string | null;
  streetType: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  raw: string;
}

export function parseAddressComponents(address: string): AddressComponents {
  const normalized = normalizeAddress(address);
  
  // Extract postcode (4 digits for Australia, 5 for US)
  const postcodeMatch = normalized.match(/\b(\d{4,5})\b/);
  const postcode = postcodeMatch ? postcodeMatch[1] : null;
  
  // Extract unit number patterns like "unit 1", "1/", "apt 2"
  const unitMatch = normalized.match(/(?:unit|apt|suite|#)\s*(\d+[a-z]?)|(\d+[a-z]?)\s*(?:\/)/i);
  const unitNumber = unitMatch ? (unitMatch[1] || unitMatch[2]) : null;
  
  // Extract street number (first number that isn't unit or postcode)
  const streetNumberMatch = normalized.match(/\b(\d+[a-z]?)\s+(?!unit|apt)/);
  const streetNumber = streetNumberMatch ? streetNumberMatch[1] : null;
  
  // Common street types
  const streetTypes = ['street', 'road', 'avenue', 'drive', 'court', 'place', 'lane', 'crescent', 'circle', 'parade', 'terrace', 'highway', 'way', 'close', 'boulevard'];
  let streetType: string | null = null;
  let streetName: string | null = null;
  
  for (const type of streetTypes) {
    const idx = normalized.indexOf(type);
    if (idx > 0) {
      streetType = type;
      // Extract street name - text between street number and street type
      const beforeType = normalized.substring(0, idx).trim();
      const words = beforeType.split(' ').filter(w => !w.match(/^\d/) && w !== 'unit' && !Object.keys(ABBREVIATION_MAP).includes(w));
      streetName = words.slice(-2).join(' '); // Take last 2 words as street name
      break;
    }
  }
  
  // Try to extract suburb (usually before postcode or state)
  const states = ['new south wales', 'victoria', 'queensland', 'western australia', 'south australia', 'tasmania', 'northern territory', 'australian capital territory'];
  let suburb: string | null = null;
  let state: string | null = null;
  
  for (const s of states) {
    if (normalized.includes(s)) {
      state = s;
      // Get text before state
      const beforeState = normalized.split(s)[0].trim();
      const words = beforeState.split(' ');
      // Suburb is usually the last 1-3 words before state
      suburb = words.slice(-3).filter(w => !w.match(/^\d+$/) && !streetTypes.includes(w)).join(' ');
      break;
    }
  }
  
  return {
    unitNumber,
    streetNumber,
    streetName,
    streetType,
    suburb,
    state,
    postcode,
    raw: normalized,
  };
}

// Calculate similarity between two strings using Levenshtein distance
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  if (m === 0) return n;
  if (n === 0) return m;
  
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  
  return dp[m][n];
}

// Calculate string similarity (0-1)
function stringSimilarity(str1: string, str2: string): number {
  if (!str1 && !str2) return 1;
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  
  const distance = levenshteinDistance(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  
  return 1 - (distance / maxLen);
}

// Address comparison result
export interface AddressComparisonResult {
  overallScore: number;
  componentScores: {
    streetNumber: number;
    streetName: number;
    suburb: number;
    postcode: number;
    unit: number;
  };
  status: 'match' | 'review' | 'mismatch' | 'no_address';
  notes: string[];
}

// Compare two addresses and return a similarity score
export function compareAddresses(
  propertyAddress: string,
  certificateAddress: string | null
): AddressComparisonResult {
  const notes: string[] = [];
  
  // Handle missing certificate address
  if (!certificateAddress || certificateAddress.trim().length < 5) {
    return {
      overallScore: 0,
      componentScores: { streetNumber: 0, streetName: 0, suburb: 0, postcode: 0, unit: 0 },
      status: 'no_address',
      notes: ['No address extracted from certificate'],
    };
  }
  
  const prop = parseAddressComponents(propertyAddress);
  const cert = parseAddressComponents(certificateAddress);
  
  // Calculate component scores
  const scores = {
    streetNumber: prop.streetNumber && cert.streetNumber 
      ? (prop.streetNumber === cert.streetNumber ? 1 : 0)
      : 0.5, // Partial credit if one is missing
    
    streetName: stringSimilarity(prop.streetName || '', cert.streetName || ''),
    
    suburb: stringSimilarity(prop.suburb || '', cert.suburb || ''),
    
    postcode: prop.postcode && cert.postcode 
      ? (prop.postcode === cert.postcode ? 1 : 0)
      : 0.5,
    
    unit: (prop.unitNumber === cert.unitNumber) ? 1 :
          (!prop.unitNumber && !cert.unitNumber) ? 1 :
          (prop.unitNumber && !cert.unitNumber) ? 0.5 : // Certificate missing unit - needs review
          0.0, // Unit mismatch is critical for multi-unit properties
  };
  
  // Flag if property has a unit number but certificate doesn't match
  const hasUnitMismatch = prop.unitNumber && prop.unitNumber !== cert.unitNumber;
  
  // Critical mismatches - postcode or street number wrong is a strong signal
  if (prop.postcode && cert.postcode && prop.postcode !== cert.postcode) {
    notes.push(`Postcode mismatch: ${prop.postcode} vs ${cert.postcode}`);
  }
  
  if (prop.streetNumber && cert.streetNumber && prop.streetNumber !== cert.streetNumber) {
    notes.push(`Street number mismatch: ${prop.streetNumber} vs ${cert.streetNumber}`);
  }
  
  if (scores.streetName < 0.7) {
    notes.push(`Street name differs significantly`);
  }
  
  if (scores.suburb < 0.7) {
    notes.push(`Suburb differs: "${prop.suburb || 'unknown'}" vs "${cert.suburb || 'unknown'}"`);
  }
  
  if (scores.unit < 1 && (prop.unitNumber || cert.unitNumber)) {
    notes.push(`Unit number mismatch or missing`);
  }
  
  // Calculate weighted overall score
  // Critical: street number and postcode are most important
  const overallScore = (
    scores.streetNumber * 0.30 +  // 30% weight - critical
    scores.streetName * 0.25 +    // 25% weight
    scores.suburb * 0.15 +        // 15% weight
    scores.postcode * 0.25 +      // 25% weight - critical
    scores.unit * 0.05            // 5% weight
  );
  
  // Determine status based on score and critical mismatches
  let status: 'match' | 'review' | 'mismatch';
  
  // Critical failures - force mismatch
  const hasCriticalMismatch = 
    (prop.postcode && cert.postcode && prop.postcode !== cert.postcode) ||
    (scores.suburb < 0.5) ||
    (prop.unitNumber && cert.unitNumber && prop.unitNumber !== cert.unitNumber); // Unit mismatch for multi-unit properties
  
  // Force review if property has unit but certificate is missing it
  const needsUnitReview = prop.unitNumber && !cert.unitNumber;
  
  if (hasCriticalMismatch) {
    status = 'mismatch';
    notes.push('Critical address component mismatch detected');
  } else if (needsUnitReview) {
    status = 'review';
    notes.push('Property has unit number but certificate does not specify unit - manual review required');
  } else if (overallScore >= 0.92) {
    status = 'match';
    notes.push('High confidence address match');
  } else if (overallScore >= 0.85) {
    status = 'review';
    notes.push('Moderate confidence - manual review recommended');
  } else {
    status = 'mismatch';
    notes.push('Low confidence address match');
  }
  
  return {
    overallScore: Math.round(overallScore * 100) / 100,
    componentScores: scores,
    status,
    notes,
  };
}
