// Aéroports par défaut (reçus par TOUS les utilisateurs)
export const DEFAULT_AIRPORTS = [
  { code: 'CDG', name: 'Paris Charles de Gaulle', city: 'Paris' },
  { code: 'ORY', name: 'Paris Orly', city: 'Paris' },
  { code: 'BVA', name: 'Paris Beauvais', city: 'Paris' }
];

// Aéroports de province disponibles (choix optionnel pour Premium)
export const PROVINCIAL_AIRPORTS = [
  // Sud-Est
  { code: 'NCE', name: 'Nice Côte d\'Azur', city: 'Nice', region: 'Sud-Est' },
  { code: 'MRS', name: 'Marseille Provence', city: 'Marseille', region: 'Sud-Est' },
  { code: 'LYS', name: 'Lyon Saint-Exupéry', city: 'Lyon', region: 'Sud-Est' },
  { code: 'GNB', name: 'Grenoble Alpes-Isère', city: 'Grenoble', region: 'Sud-Est' },
  
  // Sud-Ouest
  { code: 'TLS', name: 'Toulouse Blagnac', city: 'Toulouse', region: 'Sud-Ouest' },
  { code: 'BOD', name: 'Bordeaux Mérignac', city: 'Bordeaux', region: 'Sud-Ouest' },
  { code: 'BIQ', name: 'Biarritz Pays Basque', city: 'Biarritz', region: 'Sud-Ouest' },
  { code: 'MPL', name: 'Montpellier Méditerranée', city: 'Montpellier', region: 'Sud-Ouest' },
  
  // Ouest
  { code: 'NTE', name: 'Nantes Atlantique', city: 'Nantes', region: 'Ouest' },
  { code: 'RNS', name: 'Rennes Saint-Jacques', city: 'Rennes', region: 'Ouest' },
  { code: 'BES', name: 'Brest Bretagne', city: 'Brest', region: 'Ouest' },
  { code: 'LRT', name: 'Lorient Bretagne Sud', city: 'Lorient', region: 'Ouest' },
  
  // Nord
  { code: 'LIL', name: 'Lille Lesquin', city: 'Lille', region: 'Nord' },
  
  // Est
  { code: 'SXB', name: 'Strasbourg Entzheim', city: 'Strasbourg', region: 'Est' },
  { code: 'MLH', name: 'Mulhouse EuroAirport', city: 'Mulhouse', region: 'Est' },
  { code: 'ETZ', name: 'Metz-Nancy-Lorraine', city: 'Metz', region: 'Est' },
  
  // DOM-TOM
  { code: 'PTP', name: 'Pointe-à-Pitre Le Raizet', city: 'Pointe-à-Pitre', region: 'Guadeloupe' },
  { code: 'FDF', name: 'Fort-de-France Aimé Césaire', city: 'Fort-de-France', region: 'Martinique' },
  { code: 'RUN', name: 'Roland Garros', city: 'Saint-Denis', region: 'La Réunion' },
  { code: 'CAY', name: 'Cayenne Félix Eboué', city: 'Cayenne', region: 'Guyane' }
];

// Destinations populaires avec codes aéroports
export const POPULAR_DESTINATIONS = [
  // Europe
  { destination: 'Londres', airportCode: 'LHR', region: 'Europe' },
  { destination: 'Rome', airportCode: 'FCO', region: 'Europe' },
  { destination: 'Barcelone', airportCode: 'BCN', region: 'Europe' },
  { destination: 'Amsterdam', airportCode: 'AMS', region: 'Europe' },
  { destination: 'Berlin', airportCode: 'BER', region: 'Europe' },
  { destination: 'Madrid', airportCode: 'MAD', region: 'Europe' },
  { destination: 'Lisbonne', airportCode: 'LIS', region: 'Europe' },
  { destination: 'Prague', airportCode: 'PRG', region: 'Europe' },
  { destination: 'Vienne', airportCode: 'VIE', region: 'Europe' },
  { destination: 'Budapest', airportCode: 'BUD', region: 'Europe' },
  
  // Amérique du Nord
  { destination: 'New York', airportCode: 'JFK', region: 'Amérique du Nord' },
  { destination: 'Los Angeles', airportCode: 'LAX', region: 'Amérique du Nord' },
  { destination: 'Miami', airportCode: 'MIA', region: 'Amérique du Nord' },
  { destination: 'Toronto', airportCode: 'YYZ', region: 'Amérique du Nord' },
  { destination: 'San Francisco', airportCode: 'SFO', region: 'Amérique du Nord' },
  { destination: 'Montréal', airportCode: 'YUL', region: 'Amérique du Nord' },
  
  // Asie
  { destination: 'Tokyo', airportCode: 'NRT', region: 'Asie' },
  { destination: 'Bangkok', airportCode: 'BKK', region: 'Asie' },
  { destination: 'Singapour', airportCode: 'SIN', region: 'Asie' },
  { destination: 'Hong Kong', airportCode: 'HKG', region: 'Asie' },
  { destination: 'Séoul', airportCode: 'ICN', region: 'Asie' },
  { destination: 'Kuala Lumpur', airportCode: 'KUL', region: 'Asie' },
  { destination: 'Jakarta', airportCode: 'CGK', region: 'Asie' },
  { destination: 'Mumbai', airportCode: 'BOM', region: 'Asie' },
  { destination: 'Delhi', airportCode: 'DEL', region: 'Asie' },
  
  // Océanie
  { destination: 'Sydney', airportCode: 'SYD', region: 'Océanie' },
  { destination: 'Melbourne', airportCode: 'MEL', region: 'Océanie' },
  { destination: 'Auckland', airportCode: 'AKL', region: 'Océanie' },
  
  // Afrique
  { destination: 'Le Cap', airportCode: 'CPT', region: 'Afrique' },
  { destination: 'Marrakech', airportCode: 'RAK', region: 'Afrique' },
  { destination: 'Casablanca', airportCode: 'CMN', region: 'Afrique' },
  { destination: 'Tunis', airportCode: 'TUN', region: 'Afrique' },
  { destination: 'Alger', airportCode: 'ALG', region: 'Afrique' },
  { destination: 'Dakar', airportCode: 'DKR', region: 'Afrique' },
  
  // Amérique du Sud
  { destination: 'São Paulo', airportCode: 'GRU', region: 'Amérique du Sud' },
  { destination: 'Rio de Janeiro', airportCode: 'GIG', region: 'Amérique du Sud' },
  { destination: 'Buenos Aires', airportCode: 'EZE', region: 'Amérique du Sud' },
  { destination: 'Lima', airportCode: 'LIM', region: 'Amérique du Sud' },
  
  // Caraïbes & Îles
  { destination: 'Bali', airportCode: 'DPS', region: 'Asie' },
  { destination: 'Maldives', airportCode: 'MLE', region: 'Asie' },
  { destination: 'Maurice', airportCode: 'MRU', region: 'Afrique' },
  { destination: 'Seychelles', airportCode: 'SEZ', region: 'Afrique' },
  { destination: 'Phuket', airportCode: 'HKT', region: 'Asie' }
];

// Fonction utilitaire pour obtenir tous les aéroports de départ d'un utilisateur
export const getUserDepartureAirports = (user: any): string[] => {
  const airports = [...DEFAULT_AIRPORTS.map(a => a.code)];
  
  if (user.preferences?.additionalAirports) {
    airports.push(...user.preferences.additionalAirports);
  }
  
  return [...new Set(airports)]; // Dédupliquer
};

// Fonction pour obtenir les aéroports par région
export const getAirportsByRegion = () => {
  const grouped = PROVINCIAL_AIRPORTS.reduce((acc, airport) => {
    if (!acc[airport.region]) {
      acc[airport.region] = [];
    }
    acc[airport.region].push(airport);
    return acc;
  }, {} as Record<string, typeof PROVINCIAL_AIRPORTS>);
  
  return grouped;
};

// Fonction pour valider un code aéroport
export const isValidAirportCode = (code: string): boolean => {
  const allAirports = [
    ...DEFAULT_AIRPORTS.map(a => a.code),
    ...PROVINCIAL_AIRPORTS.map(a => a.code),
    ...POPULAR_DESTINATIONS.map(d => d.airportCode)
  ];
  
  return allAirports.includes(code.toUpperCase());
}; 