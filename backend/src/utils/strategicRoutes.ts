import { Route } from '../models/Route';

export interface StrategicRoute {
  origin: string;
  destination: string;
  tier: 1 | 2 | 3;
  scanFrequencyHours: 2 | 3 | 4 | 6 | 12;
  estimatedCallsPerScan: number;
  remarks: string;
  priority: 'high' | 'medium' | 'low';
  expectedDiscountRange: string;
  targetUserTypes: ('free' | 'premium' | 'enterprise')[];
  geographicRegion: 'europe' | 'americas' | 'asia' | 'africa' | 'oceania';
  seasonalBoost?: boolean;
  aiTestRoute?: boolean;
}

export const STRATEGIC_ROUTES: StrategicRoute[] = [
  // TIER 1 - Routes Premium internationales long-courrier (3h sauf mardi 2h-10h)
  {
    origin: 'CDG',
    destination: 'JFK',
    tier: 1,
    scanFrequencyHours: 3,
    estimatedCallsPerScan: 4,
    remarks: 'Promo fréquente >50% (Air France, Delta, Norse)',
    priority: 'high',
    expectedDiscountRange: '30-70%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'americas'
  },
  {
    origin: 'CDG',
    destination: 'LAX',
    tier: 1,
    scanFrequencyHours: 3,
    estimatedCallsPerScan: 3,
    remarks: 'Promos récurrentes jusqu\'à -35%',
    priority: 'high',
    expectedDiscountRange: '20-35%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'americas'
  },
  {
    origin: 'CDG',
    destination: 'BKK',
    tier: 1,
    scanFrequencyHours: 3,
    estimatedCallsPerScan: 4,
    remarks: 'Promos Thai/Qatar régulières, ok pour premium',
    priority: 'high',
    expectedDiscountRange: '25-45%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'asia'
  },
  {
    origin: 'CDG',
    destination: 'DXB',
    tier: 1,
    scanFrequencyHours: 3,
    estimatedCallsPerScan: 3,
    remarks: 'Promos Emirates régulières, utile premium',
    priority: 'high',
    expectedDiscountRange: '25-40%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'asia'
  },
  {
    origin: 'CDG',
    destination: 'SIN',
    tier: 1,
    scanFrequencyHours: 3,
    estimatedCallsPerScan: 3,
    remarks: 'Promos Singapore Airlines régulières',
    priority: 'high',
    expectedDiscountRange: '20-35%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'asia'
  },
  {
    origin: 'CDG',
    destination: 'HKG',
    tier: 1,
    scanFrequencyHours: 3,
    estimatedCallsPerScan: 3,
    remarks: 'Promos Cathay Pacific récurrentes',
    priority: 'high',
    expectedDiscountRange: '25-40%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'asia'
  },
  {
    origin: 'CDG',
    destination: 'NRT',
    tier: 1,
    scanFrequencyHours: 3,
    estimatedCallsPerScan: 3,
    remarks: 'Promos JAL/ANA régulières',
    priority: 'high',
    expectedDiscountRange: '20-35%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'asia'
  },
  {
    origin: 'CDG',
    destination: 'SYD',
    tier: 1,
    scanFrequencyHours: 3,
    estimatedCallsPerScan: 3,
    remarks: 'Promos Qantas récurrentes',
    priority: 'high',
    expectedDiscountRange: '25-40%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'oceania'
  },
  {
    origin: 'CDG',
    destination: 'GRU',
    tier: 1,
    scanFrequencyHours: 3,
    estimatedCallsPerScan: 3,
    remarks: 'Promos Air France/LATAM régulières',
    priority: 'high',
    expectedDiscountRange: '20-35%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'americas'
  },
  {
    origin: 'CDG',
    destination: 'EZE',
    tier: 1,
    scanFrequencyHours: 3,
    estimatedCallsPerScan: 3,
    remarks: 'Promos Air France/Aerolineas régulières',
    priority: 'high',
    expectedDiscountRange: '25-40%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'americas'
  },
  {
    origin: 'CDG',
    destination: 'SCL',
    tier: 1,
    scanFrequencyHours: 3,
    estimatedCallsPerScan: 3,
    remarks: 'Promos Air France/LATAM régulières',
    priority: 'high',
    expectedDiscountRange: '20-35%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'americas'
  },
  {
    origin: 'CDG',
    destination: 'MEX',
    tier: 1,
    scanFrequencyHours: 3,
    estimatedCallsPerScan: 3,
    remarks: 'Promos Air France/Aeromexico régulières',
    priority: 'high',
    expectedDiscountRange: '25-40%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'americas'
  },
  {
    origin: 'CDG',
    destination: 'BOM',
    tier: 1,
    scanFrequencyHours: 3,
    estimatedCallsPerScan: 3,
    remarks: 'Promos Air France/Air India régulières',
    priority: 'high',
    expectedDiscountRange: '20-35%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'asia'
  },
  {
    origin: 'CDG',
    destination: 'DEL',
    tier: 1,
    scanFrequencyHours: 3,
    estimatedCallsPerScan: 3,
    remarks: 'Promos Air France/IndiGo régulières',
    priority: 'high',
    expectedDiscountRange: '25-40%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'asia'
  },
  {
    origin: 'CDG',
    destination: 'PEK',
    tier: 1,
    scanFrequencyHours: 3,
    estimatedCallsPerScan: 3,
    remarks: 'Promos Air France/Air China régulières',
    priority: 'high',
    expectedDiscountRange: '20-35%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'asia'
  },
  {
    origin: 'CDG',
    destination: 'PVG',
    tier: 1,
    scanFrequencyHours: 3,
    estimatedCallsPerScan: 3,
    remarks: 'Promos Air France/China Eastern régulières',
    priority: 'high',
    expectedDiscountRange: '25-40%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'asia'
  },
  {
    origin: 'CDG',
    destination: 'ICN',
    tier: 1,
    scanFrequencyHours: 3,
    estimatedCallsPerScan: 3,
    remarks: 'Promos Air France/Korean Air régulières',
    priority: 'high',
    expectedDiscountRange: '20-35%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'asia'
  },

  // TIER 2 - Routes régionales à fréquence moyenne (6h)
  {
    origin: 'ORY',
    destination: 'YUL',
    tier: 2,
    scanFrequencyHours: 6,
    estimatedCallsPerScan: 3,
    remarks: 'Réduction 30-50% fréquente, utile gratuit + premium',
    priority: 'medium',
    expectedDiscountRange: '30-50%',
    targetUserTypes: ['free', 'premium', 'enterprise'],
    geographicRegion: 'americas'
  },
  {
    origin: 'CDG',
    destination: 'YYZ',
    tier: 2,
    scanFrequencyHours: 6,
    estimatedCallsPerScan: 2,
    remarks: 'Promo Air Transat >30% fréquentes',
    priority: 'medium',
    expectedDiscountRange: '30-45%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'americas'
  },
  {
    origin: 'CDG',
    destination: 'CUN',
    tier: 2,
    scanFrequencyHours: 6,
    estimatedCallsPerScan: 3,
    remarks: 'Très bonne base de promos TUI/XL/AF',
    priority: 'medium',
    expectedDiscountRange: '30-50%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'americas'
  },
  {
    origin: 'CDG',
    destination: 'FDF',
    tier: 2,
    scanFrequencyHours: 6,
    estimatedCallsPerScan: 3,
    remarks: 'Air Caraïbes promotions saisonnières fortes',
    priority: 'medium',
    expectedDiscountRange: '35-55%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'americas',
    seasonalBoost: true
  },
  {
    origin: 'ORY',
    destination: 'PTP',
    tier: 2,
    scanFrequencyHours: 6,
    estimatedCallsPerScan: 3,
    remarks: 'Vols DOM très demandés, bons taux de promo',
    priority: 'medium',
    expectedDiscountRange: '30-50%',
    targetUserTypes: ['free', 'premium', 'enterprise'],
    geographicRegion: 'americas',
    seasonalBoost: true
  },

  // TIER 3 - Routes locales à basse fréquence (12h)
  {
    origin: 'CDG',
    destination: 'RUH',
    tier: 3,
    scanFrequencyHours: 12,
    estimatedCallsPerScan: 2,
    remarks: 'Promos Saudia récurrentes',
    priority: 'low',
    expectedDiscountRange: '20-35%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'asia'
  },
  {
    origin: 'CDG',
    destination: 'MNL',
    tier: 3,
    scanFrequencyHours: 12,
    estimatedCallsPerScan: 2,
    remarks: 'Promos Philippine Airlines récurrentes',
    priority: 'low',
    expectedDiscountRange: '25-40%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'asia'
  },
  {
    origin: 'CDG',
    destination: 'ISL',
    tier: 3,
    scanFrequencyHours: 12,
    estimatedCallsPerScan: 2,
    remarks: 'Promos Turkish Airlines récurrentes',
    priority: 'low',
    expectedDiscountRange: '20-35%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'europe'
  },
  {
    origin: 'CDG',
    destination: 'DOH',
    tier: 3,
    scanFrequencyHours: 12,
    estimatedCallsPerScan: 2,
    remarks: 'Promos Qatar Airways récurrentes',
    priority: 'low',
    expectedDiscountRange: '25-40%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'asia'
  },
  {
    origin: 'CDG',
    destination: 'LHR',
    tier: 3,
    scanFrequencyHours: 12,
    estimatedCallsPerScan: 2,
    remarks: 'Promos British Airways récurrentes',
    priority: 'low',
    expectedDiscountRange: '20-35%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'europe'
  },

  // ROUTES SAISONNIÈRES - Fréquence adaptative selon saison
  {
    origin: 'CDG',
    destination: 'MIA',
    tier: 2,
    scanFrequencyHours: 6,
    estimatedCallsPerScan: 3,
    remarks: 'Promos saisonnières vers Floride',
    priority: 'medium',
    expectedDiscountRange: '30-50%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'americas',
    seasonalBoost: true
  },
  // Été (exemples)
  { origin: 'CDG', destination: 'ATH', tier: 2, scanFrequencyHours: 6, estimatedCallsPerScan: 3, remarks: 'Grèce été', priority: 'medium', expectedDiscountRange: '25-40%', targetUserTypes: ['premium','enterprise'], geographicRegion: 'europe', seasonalBoost: true },
  { origin: 'CDG', destination: 'PMI', tier: 2, scanFrequencyHours: 6, estimatedCallsPerScan: 3, remarks: 'Majorque familles', priority: 'medium', expectedDiscountRange: '25-45%', targetUserTypes: ['premium','enterprise'], geographicRegion: 'europe', seasonalBoost: true },
  { origin: 'CDG', destination: 'IBZ', tier: 2, scanFrequencyHours: 6, estimatedCallsPerScan: 3, remarks: 'Ibiza clubs', priority: 'medium', expectedDiscountRange: '20-40%', targetUserTypes: ['premium','enterprise'], geographicRegion: 'europe', seasonalBoost: true },
  { origin: 'CDG', destination: 'SPU', tier: 2, scanFrequencyHours: 6, estimatedCallsPerScan: 3, remarks: 'Split Croatie', priority: 'medium', expectedDiscountRange: '20-35%', targetUserTypes: ['premium','enterprise'], geographicRegion: 'europe', seasonalBoost: true },
  // Hiver (exemples)
  { origin: 'CDG', destination: 'MLE', tier: 2, scanFrequencyHours: 6, estimatedCallsPerScan: 3, remarks: 'Maldives luxe', priority: 'medium', expectedDiscountRange: '20-35%', targetUserTypes: ['premium','enterprise'], geographicRegion: 'asia', seasonalBoost: true },
  { origin: 'CDG', destination: 'PUJ', tier: 2, scanFrequencyHours: 6, estimatedCallsPerScan: 3, remarks: 'Punta Cana', priority: 'medium', expectedDiscountRange: '25-40%', targetUserTypes: ['premium','enterprise'], geographicRegion: 'americas', seasonalBoost: true },
  { origin: 'CDG', destination: 'DPS', tier: 2, scanFrequencyHours: 6, estimatedCallsPerScan: 3, remarks: 'Bali', priority: 'medium', expectedDiscountRange: '20-35%', targetUserTypes: ['premium','enterprise'], geographicRegion: 'asia', seasonalBoost: true },
  // Intersaison (exemples)
  { origin: 'CDG', destination: 'LIS', tier: 3, scanFrequencyHours: 12, estimatedCallsPerScan: 2, remarks: 'Lisbonne', priority: 'low', expectedDiscountRange: '20-35%', targetUserTypes: ['premium','enterprise'], geographicRegion: 'europe' },
  { origin: 'CDG', destination: 'VIE', tier: 3, scanFrequencyHours: 12, estimatedCallsPerScan: 2, remarks: 'Vienne', priority: 'low', expectedDiscountRange: '20-35%', targetUserTypes: ['premium','enterprise'], geographicRegion: 'europe' },
  { origin: 'CDG', destination: 'BUD', tier: 3, scanFrequencyHours: 12, estimatedCallsPerScan: 2, remarks: 'Budapest', priority: 'low', expectedDiscountRange: '20-35%', targetUserTypes: ['premium','enterprise'], geographicRegion: 'europe' },
  {
    origin: 'CDG',
    destination: 'MCO',
    tier: 2,
    scanFrequencyHours: 6,
    estimatedCallsPerScan: 3,
    remarks: 'Disney World - promos saisonnières',
    priority: 'medium',
    expectedDiscountRange: '25-45%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'americas',
    seasonalBoost: true
  },
  {
    origin: 'CDG',
    destination: 'BKK',
    tier: 2,
    scanFrequencyHours: 6,
    estimatedCallsPerScan: 3,
    remarks: 'Thaïlande - promos saisonnières',
    priority: 'medium',
    expectedDiscountRange: '30-50%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'asia',
    seasonalBoost: true
  },
  {
    origin: 'CDG',
    destination: 'BAL',
    tier: 2,
    scanFrequencyHours: 6,
    estimatedCallsPerScan: 3,
    remarks: 'Turquie - promos saisonnières',
    priority: 'medium',
    expectedDiscountRange: '25-40%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'europe',
    seasonalBoost: true
  },
  {
    origin: 'CDG',
    destination: 'HER',
    tier: 2,
    scanFrequencyHours: 6,
    estimatedCallsPerScan: 3,
    remarks: 'Crète - promos saisonnières',
    priority: 'medium',
    expectedDiscountRange: '30-50%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'europe',
    seasonalBoost: true
  },

  // ROUTES TESTS IA - Nouvelles destinations émergentes
  {
    origin: 'CDG',
    destination: 'HAN',
    tier: 3,
    scanFrequencyHours: 12,
    estimatedCallsPerScan: 2,
    remarks: 'Test IA - Vietnam émergent',
    priority: 'low',
    expectedDiscountRange: '20-35%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'asia',
    aiTestRoute: true
  },
  {
    origin: 'CDG',
    destination: 'CGK',
    tier: 3,
    scanFrequencyHours: 12,
    estimatedCallsPerScan: 2,
    remarks: 'Test IA - Indonésie émergent',
    priority: 'low',
    expectedDiscountRange: '25-40%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'asia',
    aiTestRoute: true
  },
  {
    origin: 'CDG',
    destination: 'KUL',
    tier: 3,
    scanFrequencyHours: 12,
    estimatedCallsPerScan: 2,
    remarks: 'Test IA - Malaisie émergent',
    priority: 'low',
    expectedDiscountRange: '20-35%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'asia',
    aiTestRoute: true
  },
  {
    origin: 'CDG',
    destination: 'BOG',
    tier: 3,
    scanFrequencyHours: 12,
    estimatedCallsPerScan: 2,
    remarks: 'Test IA - Colombie émergent',
    priority: 'low',
    expectedDiscountRange: '25-40%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'americas',
    aiTestRoute: true
  },
  {
    origin: 'CDG',
    destination: 'LIM',
    tier: 3,
    scanFrequencyHours: 12,
    estimatedCallsPerScan: 2,
    remarks: 'Test IA - Pérou émergent',
    priority: 'low',
    expectedDiscountRange: '20-35%',
    targetUserTypes: ['premium', 'enterprise'],
    geographicRegion: 'americas',
    aiTestRoute: true
  }
];

// --- Auto-augmentation to reach target coverage locally ---
// Goal: ensure at least 120 routes (30 Tier1, 40 Tier2, 50 Tier3) without duplicating existing entries.
// This keeps the intelligent calling intact; only coverage list is extended deterministically.
const TARGET_COUNTS = { tier1: 30, tier2: 40, tier3: 50 } as const;

function routeKey(o: string, d: string) { return `${o}-${d}`; }

function pushIfMissing(arr: StrategicRoute[], r: StrategicRoute, seen: Set<string>) {
  const key = routeKey(r.origin, r.destination);
  if (seen.has(key)) return false;
  arr.push(r);
  seen.add(key);
  return true;
}

// Minimal region mapper for destinations we add below
function mapRegion(dest: string): StrategicRoute['geographicRegion'] {
  const americas = new Set(['JFK','EWR','BOS','IAD','ORD','MIA','ATL','DFW','LAX','SFO','SEA','YVR','YYC','YUL','YYZ','CUN','MCO','GRU','EZE','SCL','MEX','BOG','LIM']);
  const asia = new Set(['BKK','SIN','HKG','NRT','HND','ICN','KUL','TPE','PVG','PEK','DEL','BOM','CGK','HAN','DPS','KIX']);
  const europe = new Set(['LHR','AMS','FRA','MAD','FCO','LIS','VIE','BUD','CPH','OSL','ARN']);
  const oceania = new Set(['SYD','AKL','BNE','PER']);
  const africa = new Set(['CAI','CPT','NBO','LOS','ACC']);
  if (americas.has(dest)) return 'americas';
  if (asia.has(dest)) return 'asia';
  if (europe.has(dest)) return 'europe';
  if (oceania.has(dest)) return 'oceania';
  if (africa.has(dest)) return 'africa';
  return 'americas';
}

function ensureTargetCoverage() {
  const seen = new Set<string>(STRATEGIC_ROUTES.map(r => routeKey(r.origin, r.destination)));
  const counts = {
    tier1: STRATEGIC_ROUTES.filter(r => r.tier === 1).length,
    tier2: STRATEGIC_ROUTES.filter(r => r.tier === 2).length,
    tier3: STRATEGIC_ROUTES.filter(r => r.tier === 3).length,
  };

  // Candidate pools by tier (origins include hubs secondaires)
  const tier1Origins = ['CDG','ORY','AMS','FRA'];
  const tier1Dests   = ['JFK','LAX','SFO','SEA','ORD','MIA','BOS','IAD','YYZ','YUL','YVR','BKK','SIN','HKG','NRT','HND','ICN','PVG','PEK','DEL','BOM','KUL','TPE','SYD','MEX','GRU','EZE','SCL','BOG','LIM'];

  const tier2Origins = ['CDG','ORY','AMS','MAD','FCO'];
  const tier2Dests   = ['YUL','YYZ','CUN','FDF','PTP','MCO','MIA','ATH','PMI','IBZ','SPU','LIS','VIE','BUD','DPS','MLE','PUJ'];

  const tier3Origins = ['CDG','ORY','AMS','MAD','FCO'];
  const tier3Dests   = ['LHR','CPH','OSL','ARN','CAI','CPT','NBO','LOS','ACC','RUH','MNL','ISL','DOH','AKL','BNE','PER'];

  // Fill Tier 1
  outer1: for (const o of tier1Origins) {
    for (const d of tier1Dests) {
      if (counts.tier1 >= TARGET_COUNTS.tier1) break outer1;
      pushIfMissing(STRATEGIC_ROUTES, {
        origin: o, destination: d, tier: 1, scanFrequencyHours: 3,
        estimatedCallsPerScan: 2,
        remarks: 'Auto-added T1 coverage', priority: 'high',
        expectedDiscountRange: '20-45%', targetUserTypes: ['premium','enterprise'],
        geographicRegion: mapRegion(d)
      }, seen) && counts.tier1++;
    }
  }

  // Fill Tier 2
  outer2: for (const o of tier2Origins) {
    for (const d of tier2Dests) {
      if (counts.tier2 >= TARGET_COUNTS.tier2) break outer2;
      pushIfMissing(STRATEGIC_ROUTES, {
        origin: o, destination: d, tier: 2, scanFrequencyHours: 6,
        estimatedCallsPerScan: 2,
        remarks: 'Auto-added T2 coverage', priority: 'medium',
        expectedDiscountRange: '25-45%', targetUserTypes: ['free','premium','enterprise'],
        geographicRegion: mapRegion(d)
      }, seen) && counts.tier2++;
    }
  }

  // Fill Tier 3
  outer3: for (const o of tier3Origins) {
    for (const d of tier3Dests) {
      if (counts.tier3 >= TARGET_COUNTS.tier3) break outer3;
      pushIfMissing(STRATEGIC_ROUTES, {
        origin: o, destination: d, tier: 3, scanFrequencyHours: 12,
        estimatedCallsPerScan: 2,
        remarks: 'Auto-added T3 monitoring', priority: 'low',
        expectedDiscountRange: '15-35%', targetUserTypes: ['premium','enterprise'],
        geographicRegion: mapRegion(d)
      }, seen) && counts.tier3++;
    }
  }
}

// Execute augmentation at module load (local dev)
ensureTargetCoverage();

// Normalize per-scan cost to keep daily budget ≈ 1000 calls for 30k/month
function normalizeEstimatedCallsPerScan() {
  for (const r of STRATEGIC_ROUTES) {
    if (r.estimatedCallsPerScan > 2) {
      r.estimatedCallsPerScan = 2;
    }
  }
}

normalizeEstimatedCallsPerScan();

// Fonctions utilitaires avec stratégie adaptative
export function getAdaptiveFrequency(route: StrategicRoute, date: Date = new Date()): number {
  const dayOfWeek = date.getDay(); // 0 = dimanche, 2 = mardi
  const hour = date.getHours();
  
  // Mardi entre 2h et 10h : fréquence augmentée (2h au lieu de 3h)
  if (dayOfWeek === 2 && hour >= 2 && hour <= 10) {
    if (route.tier === 1) {
      return 2; // 2h au lieu de 3h
    }
  }
  
  // Routes saisonnières : fréquence adaptative selon la saison
  if (route.seasonalBoost) {
    const month = date.getMonth(); // 0-11
    const isHighSeason = (month >= 5 && month <= 8) || (month >= 11 && month <= 1); // été + hiver
    
    if (isHighSeason) {
      return Math.max(route.scanFrequencyHours - 2, 2); // Réduire de 2h
    }
  }
  
  // Routes tests IA : fréquence variable selon performance
  if (route.aiTestRoute) {
    // Logique pour ajuster selon les résultats des tests
    return route.scanFrequencyHours;
  }
  
  return route.scanFrequencyHours;
}

export function calculateRouteStrategy() {
  const tier1Routes = STRATEGIC_ROUTES.filter(route => route.tier === 1);
  const tier2Routes = STRATEGIC_ROUTES.filter(route => route.tier === 2);
  const tier3Routes = STRATEGIC_ROUTES.filter(route => route.tier === 3);
  const seasonalRoutes = STRATEGIC_ROUTES.filter(route => route.seasonalBoost);
  const aiTestRoutes = STRATEGIC_ROUTES.filter(route => route.aiTestRoute);

  // Calcul des appels mensuels avec fréquence adaptative
  const tier1CallsPerDay = tier1Routes.reduce((sum, route) => {
    const adaptiveFreq = getAdaptiveFrequency(route);
    const scansPerDay = 24 / adaptiveFreq;
    return sum + (scansPerDay * route.estimatedCallsPerScan);
  }, 0);

  const tier2CallsPerDay = tier2Routes.reduce((sum, route) => {
    const adaptiveFreq = getAdaptiveFrequency(route);
    const scansPerDay = 24 / adaptiveFreq;
    return sum + (scansPerDay * route.estimatedCallsPerScan);
  }, 0);

  const tier3CallsPerDay = tier3Routes.reduce((sum, route) => {
    const adaptiveFreq = getAdaptiveFrequency(route);
    const scansPerDay = 24 / adaptiveFreq;
    return sum + (scansPerDay * route.estimatedCallsPerScan);
  }, 0);

  const totalCallsPerDay = tier1CallsPerDay + tier2CallsPerDay + tier3CallsPerDay;
  const totalCallsPerMonth = totalCallsPerDay * 30;

  // Calcul de la couverture géographique
  const geographicCoverage = calculateGeographicCoverage();

  return {
    tier1: {
      routes: tier1Routes.length,
      callsPerDay: tier1CallsPerDay,
      callsPerMonth: tier1CallsPerDay * 30
    },
    tier2: {
      routes: tier2Routes.length,
      callsPerDay: tier2CallsPerDay,
      callsPerMonth: tier2CallsPerDay * 30
    },
    tier3: {
      routes: tier3Routes.length,
      callsPerDay: tier3CallsPerDay,
      callsPerMonth: tier3CallsPerDay * 30
    },
    seasonal: {
      routes: seasonalRoutes.length,
      callsPerDay: seasonalRoutes.reduce((sum, route) => {
        const adaptiveFreq = getAdaptiveFrequency(route);
        const scansPerDay = 24 / adaptiveFreq;
        return sum + (scansPerDay * route.estimatedCallsPerScan);
      }, 0),
      callsPerMonth: seasonalRoutes.reduce((sum, route) => {
        const adaptiveFreq = getAdaptiveFrequency(route);
        const scansPerDay = 24 / adaptiveFreq;
        return sum + (scansPerDay * route.estimatedCallsPerScan);
      }, 0) * 30
    },
    aiTest: {
      routes: aiTestRoutes.length,
      callsPerDay: aiTestRoutes.reduce((sum, route) => {
        const adaptiveFreq = getAdaptiveFrequency(route);
        const scansPerDay = 24 / adaptiveFreq;
        return sum + (scansPerDay * route.estimatedCallsPerScan);
      }, 0),
      callsPerMonth: aiTestRoutes.reduce((sum, route) => {
        const adaptiveFreq = getAdaptiveFrequency(route);
        const scansPerDay = 24 / adaptiveFreq;
        return sum + (scansPerDay * route.estimatedCallsPerScan);
      }, 0) * 30
    },
    total: {
      routes: STRATEGIC_ROUTES.length,
      callsPerDay: totalCallsPerDay,
      callsPerMonth: totalCallsPerMonth
    },
    geographicCoverage,
    adaptiveStrategy: {
      totalBudget: Number(process.env.BUDGET_MONTHLY_CALLS || 30000),
      usedBudget: totalCallsPerMonth,
      remainingBudget: Number(process.env.BUDGET_MONTHLY_CALLS || 30000) - totalCallsPerMonth,
      coverageScore: geographicCoverage.score,
      recommendations: generateAdaptiveRecommendations(geographicCoverage)
    }
  };
}

export function calculateGeographicCoverage() {
  const regions = STRATEGIC_ROUTES.reduce((acc, route) => {
    if (!acc[route.geographicRegion]) {
      acc[route.geographicRegion] = {
        routes: 0,
        callsPerDay: 0,
        tier1Routes: 0,
        tier2Routes: 0,
        tier3Routes: 0
      };
    }
    acc[route.geographicRegion].routes++;
    acc[route.geographicRegion].callsPerDay += (24 / route.scanFrequencyHours) * route.estimatedCallsPerScan;
    if (route.tier === 1) acc[route.geographicRegion].tier1Routes++;
    if (route.tier === 2) acc[route.geographicRegion].tier2Routes++;
    if (route.tier === 3) acc[route.geographicRegion].tier3Routes++;
    return acc;
  }, {} as Record<string, any>);

  // Calcul du score de couverture (0-100)
  const totalRegions = 5; // europe, americas, asia, africa, oceania
  const coveredRegions = Object.keys(regions).length;
  const coverageScore = Math.round((coveredRegions / totalRegions) * 100);

  return {
    regions,
    score: coverageScore,
    coveredRegions,
    totalRegions,
    gaps: identifyGeographicGaps(regions)
  };
}

export function identifyGeographicGaps(regions: Record<string, any>) {
  const allRegions = ['europe', 'americas', 'asia', 'africa', 'oceania'];
  const gaps = allRegions.filter(region => !regions[region]);
  
  return gaps.map(gap => ({
    region: gap,
    priority: getRegionPriority(gap),
    recommendedRoutes: getRecommendedRoutesForRegion(gap)
  }));
}

export function getRegionPriority(region: string): 'high' | 'medium' | 'low' {
  const priorities: Record<string, 'high' | 'medium' | 'low'> = {
    'europe': 'high',
    'americas': 'high', 
    'asia': 'high',
    'africa': 'medium',
    'oceania': 'medium'
  };
  return priorities[region] || 'low';
}

export function getRecommendedRoutesForRegion(region: string) {
  const recommendations: Record<string, string[]> = {
    'europe': ['CDG-LHR', 'CDG-AMS', 'CDG-FRA', 'CDG-MAD', 'CDG-FCO'],
    'americas': ['CDG-YYC', 'CDG-YVR', 'CDG-YYZ', 'CDG-GRU', 'CDG-EZE'],
    'asia': ['CDG-BJS', 'CDG-CAN', 'CDG-CTU', 'CDG-HGH', 'CDG-XIY'],
    'africa': ['CDG-CAI', 'CDG-CPT', 'CDG-NBO', 'CDG-LOS', 'CDG-ACC'],
    'oceania': ['CDG-AKL', 'CDG-BNE', 'CDG-PER', 'CDG-ADL', 'CDG-CBR']
  };
  return recommendations[region] || [];
}

export function generateAdaptiveRecommendations(coverage: any) {
  const recommendations = [];

  // Recommandation basée sur la couverture géographique
  if (coverage.score < 80) {
    recommendations.push({
      type: 'geographic_gap',
      priority: 'high',
      message: `Couverture géographique faible (${coverage.score}%). Ajouter des routes vers: ${coverage.gaps.map((g: any) => g.region).join(', ')}`,
      action: 'add_routes',
      estimatedCalls: 2000
    });
  }

  // Recommandation basée sur le budget restant
  const remainingBudget = 30000 - coverage.totalCallsPerMonth;
  if (remainingBudget > 5000) {
    recommendations.push({
      type: 'budget_optimization',
      priority: 'medium',
      message: `${remainingBudget} calls disponibles. Augmenter fréquence Tier 1 ou ajouter routes saisonnières`,
      action: 'increase_frequency',
      estimatedCalls: Math.min(remainingBudget, 3000)
    });
  }

  // Recommandation pour tests IA
  if (coverage.aiTestRoutes < 10) {
    recommendations.push({
      type: 'ai_testing',
      priority: 'medium',
      message: 'Ajouter plus de routes de test IA pour découvrir nouvelles opportunités',
      action: 'add_ai_tests',
      estimatedCalls: 1500
    });
  }

  return recommendations;
}

export function getRoutesByTier(tier: 1 | 2 | 3): StrategicRoute[] {
  return STRATEGIC_ROUTES.filter(route => route.tier === tier);
}

export function getRoutesByUserType(userType: 'free' | 'premium' | 'enterprise'): StrategicRoute[] {
  return STRATEGIC_ROUTES.filter(route => route.targetUserTypes.includes(userType));
}

export function getHighPriorityRoutes(): StrategicRoute[] {
  return STRATEGIC_ROUTES.filter(route => route.priority === 'high');
}

export function getSeasonalRoutes(): StrategicRoute[] {
  return STRATEGIC_ROUTES.filter(route => route.seasonalBoost);
}

export function getAiTestRoutes(): StrategicRoute[] {
  return STRATEGIC_ROUTES.filter(route => route.aiTestRoute);
}

export function getRoutesByRegion(region: string): StrategicRoute[] {
  return STRATEGIC_ROUTES.filter(route => route.geographicRegion === region);
}

export function convertToRouteModel(strategicRoute: StrategicRoute) {
  return {
    origin: strategicRoute.origin,
    destination: strategicRoute.destination,
    tier: strategicRoute.tier,
    scanFrequencyHours: strategicRoute.scanFrequencyHours,
    isActive: true,
    performance: {
      totalAlerts: 0,
      avgDiscount: 0,
      clickRate: 0,
      conversionRate: 0
    },
    metadata: {
      remarks: strategicRoute.remarks,
      priority: strategicRoute.priority,
      expectedDiscountRange: strategicRoute.expectedDiscountRange,
      estimatedCallsPerScan: strategicRoute.estimatedCallsPerScan,
      geographicRegion: strategicRoute.geographicRegion,
      seasonalBoost: strategicRoute.seasonalBoost,
      aiTestRoute: strategicRoute.aiTestRoute
    },
    seasonalScore: {
      spring: Math.floor(Math.random() * 30) + 20,
      summer: Math.floor(Math.random() * 40) + 30,
      fall: Math.floor(Math.random() * 30) + 20,
      winter: Math.floor(Math.random() * 25) + 15
    }
  };
} 