import axios, { AxiosResponse } from 'axios';
import { ApiCall } from '../models/ApiCall';
import { StrategicRoute } from '../utils/strategicRoutes';

// FlightLabs API Types
export interface FlightLabsSchedule {
  departure: {
    iataCode: string;
    icaoCode: string;
    terminal?: string;
    gate?: string;
    scheduledTime: string;
    actualTime?: string;
    estimatedTime?: string;
  };
  arrival: {
    iataCode: string;
    icaoCode: string;
    terminal?: string;
    gate?: string;
    scheduledTime: string;
    actualTime?: string;
    estimatedTime?: string;
  };
  airline: {
    name: string;
    iataCode: string;
    icaoCode: string;
  };
  flight: {
    iataNumber: string;
    icaoNumber: string;
    number: string;
  };
  aircraft?: {
    modelCode: string;
    modelText: string;
  };
  live?: {
    updated: string;
    latitude: number;
    longitude: number;
    altitude: number;
    direction: number;
    speedHorizontal: number;
    speedVertical: number;
    isGround: boolean;
  };
}

export interface FlightLabsPrice {
  price: number;
  currency: string;
  deepLink: string;
  cabin: string;
  airline: string;
  validatingAirline: string;
  departureDate: string;
  returnDate?: string;
  tripType: 'oneway' | 'roundtrip';
  adults: number;
  children: number;
  infants: number;
  stops: number;
  duration: string;
  segments: Array<{
    origin: string;
    destination: string;
    departure: string;
    arrival: string;
    airline: string;
    flight: string;
    aircraft: string;
    duration: string;
  }>;
}

export interface FlightDeal {
  origin: string;
  destination: string;
  airline: string;
  originalPrice: number;
  currentPrice: number;
  discountPercentage: number;
  currency: string;
  departureDate: string;
  returnDate?: string;
  deepLink: string;
  validUntil: Date;
  cabin: string;
  stops: number;
  duration: string;
  detectedAt: Date;
}

export interface FlightLabsError {
  error: {
    code: string;
    message: string;
    type: string;
  };
}

export class FlightLabsService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://goflightlabs.com';
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor() {
    this.apiKey = process.env.FLIGHTLABS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ FlightLabs API key not found. Flight data will be simulated.');
    }
  }

  /**
   * Recherche les vols disponibles pour une route
   */
  async searchFlights(route: StrategicRoute, options: {
    departureDate?: string;
    returnDate?: string;
    adults?: number;
    children?: number;
    infants?: number;
    cabin?: 'economy' | 'premium_economy' | 'business' | 'first';
    currency?: string;
  } = {}): Promise<FlightLabsPrice[]> {
    const startTime = Date.now();
    
    try {
      if (!this.apiKey) {
        console.warn(`⚠️ FlightLabs API key manquante pour ${route.origin}-${route.destination}. Retour vide.`);
        return []; // Retourner tableau vide au lieu de données mockées
      }

      // Utiliser l'endpoint correct pour les horaires de vols
      const params = {
        type: 'departure',
        iataCode: route.origin,
        date: options.departureDate || this.getDefaultDepartureDate()
      };

      const response = await this.makeApiCall<any>(
        'advanced-future-flights',
        params,
        'GET'
      );

      // 🔍 DEBUG: Log de la réponse API pour voir son format
      console.log(`🔍 [FlightLabs] Route ${route.origin}-${route.destination} - Type de réponse:`, typeof response);
      console.log(`🔍 [FlightLabs] Route ${route.origin}-${route.destination} - Est un tableau:`, Array.isArray(response));
      console.log(`🔍 [FlightLabs] Route ${route.origin}-${route.destination} - Nombre de vols:`, Array.isArray(response) ? response.length : 'N/A');

      // Normaliser la réponse en tableau si ce n'est pas déjà le cas
      let flights: FlightLabsPrice[] = [];
      if (Array.isArray(response)) {
        // Convertir les données de schedule en données de prix simulées
        flights = response.slice(0, 5).map((schedule: any, index: number) => {
          const basePrice = this.getBasePriceForRoute(route);
          const priceVariation = (Math.random() - 0.5) * 0.4; // ±20% variation
          const price = Math.round(basePrice * (1 + priceVariation));
          
          return {
            price,
            currency: 'EUR',
            deepLink: `https://booking.example.com/flights/${route.origin}-${route.destination}`,
            cabin: options.cabin || 'economy',
            airline: schedule.carrier?.name || 'Unknown',
            validatingAirline: schedule.carrier?.name || 'Unknown',
            departureDate: options.departureDate || this.getDefaultDepartureDate(),
            returnDate: options.returnDate,
            tripType: options.returnDate ? 'roundtrip' : 'oneway',
            adults: options.adults || 1,
            children: options.children || 0,
            infants: options.infants || 0,
            stops: Math.floor(Math.random() * 2), // 0-1 stops
            duration: this.estimateFlightDuration(route),
            segments: [{
              origin: route.origin,
              destination: route.destination,
              departure: schedule.departureTime?.time24 || '10:00',
              arrival: schedule.arrivalTime?.time24 || '12:00',
              airline: schedule.carrier?.name || 'Unknown',
              flight: schedule.carrier?.flightNumber || '123',
              aircraft: 'A320',
              duration: this.estimateFlightDuration(route)
            }]
          };
        });
      } else if (response && response.data && Array.isArray(response.data)) {
        flights = response.data;
      } else if (response && response.results && Array.isArray(response.results)) {
        flights = response.results;
      } else {
        console.log(`⚠️ [FlightLabs] Format de réponse inattendu pour ${route.origin}-${route.destination}, retour vide`);
        return []; // Retourner tableau vide au lieu de données mockées
      }

      // Enregistrer l'appel API
      await this.trackApiCall({
        endpoint: '/advanced-future-flights',
        method: 'GET',
        status: 'success',
        responseTime: Date.now() - startTime,
        metadata: {
          origin: route.origin,
          destination: route.destination,
          resultsCount: flights.length
        }
      });

      return flights;

    } catch (error) {
      // Enregistrer l'erreur
      await this.trackApiCall({
        endpoint: '/advanced-future-flights',
        method: 'GET',
        status: 'error',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      console.error(`❌ Error searching flights for ${route.origin}-${route.destination}:`, error);
      
      // Retourner tableau vide en cas d'erreur (pas de données mockées)
      return [];
    }
  }

  /**
   * Détecte les bonnes affaires sur une route
   */
  async detectDeals(route: StrategicRoute): Promise<FlightDeal[]> {
    const flights = await this.searchFlights(route);
    const deals: FlightDeal[] = [];

    // Analyser les prix pour détecter les bonnes affaires
    const prices = flights.map(f => f.price).sort((a, b) => a - b);
    const medianPrice = prices[Math.floor(prices.length / 2)] || 0;
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length || 0;

    for (const flight of flights) {
      const discountFromMedian = ((medianPrice - flight.price) / medianPrice) * 100;
      const discountFromAvg = ((avgPrice - flight.price) / avgPrice) * 100;
      
      // Critères de détection de bonne affaire selon la stratégie
      const minDiscountForTier = this.getMinDiscountForTier(route.tier);
      const actualDiscount = Math.max(discountFromMedian, discountFromAvg);
      
      if (actualDiscount >= minDiscountForTier && flight.price > 0) {
        deals.push({
          origin: route.origin,
          destination: route.destination,
          airline: flight.airline || flight.validatingAirline,
          originalPrice: route.tier === 1 ? medianPrice : avgPrice,
          currentPrice: flight.price,
          discountPercentage: Math.round(actualDiscount),
          currency: flight.currency,
          departureDate: flight.departureDate,
          returnDate: flight.returnDate,
          deepLink: flight.deepLink,
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h validity
          cabin: flight.cabin,
          stops: flight.stops,
          duration: flight.duration,
          detectedAt: new Date()
        });
      }
    }

    // Trier par discount décroissant
    deals.sort((a, b) => b.discountPercentage - a.discountPercentage);
    
    return deals.slice(0, 10); // Top 10 deals
  }

  /**
   * Obtient les horaires de vol pour une route
   */
  async getFlightSchedules(route: StrategicRoute, date?: string): Promise<FlightLabsSchedule[]> {
    const startTime = Date.now();
    
    try {
      if (!this.apiKey) {
        console.warn(`⚠️ FlightLabs API key manquante pour horaires ${route.origin}-${route.destination}. Retour vide.`);
        return []; // Retourner tableau vide au lieu de données mockées
      }

      const params = {
        dep_iata: route.origin,
        arr_iata: route.destination,
        date: date || this.getDefaultDepartureDate(),
        flight_status: 'scheduled,active,landed,cancelled,incident,diverted'
      };

      const response = await this.makeApiCall<FlightLabsSchedule[]>(
        'schedules',
        params,
        'GET'
      );

      await this.trackApiCall({
        endpoint: '/schedules',
        method: 'GET',
        status: 'success',
        responseTime: Date.now() - startTime,
        metadata: {
          origin: route.origin,
          destination: route.destination,
          schedulesCount: response.length
        }
      });

      return response;

    } catch (error) {
      await this.trackApiCall({
        endpoint: '/schedules',
        method: 'GET',
        status: 'error',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      console.error(`❌ Error getting schedules for ${route.origin}-${route.destination}:`, error);
      return []; // Retourner tableau vide au lieu de données mockées
    }
  }

  /**
   * Effectue un appel API vers FlightLabs avec retry automatique
   */
  private async makeApiCall<T>(
    endpoint: string,
    params: Record<string, any>,
    method: 'GET' | 'POST' = 'GET'
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Ajouter access_key aux paramètres au lieu du header Authorization
        const queryParams = {
          ...params,
          access_key: this.apiKey
        };

        const config = {
          method,
          url: `${this.baseUrl}/${endpoint}`,
          headers: {
            'Content-Type': 'application/json'
          },
          params: method === 'GET' ? queryParams : undefined,
          data: method === 'POST' ? queryParams : undefined,
          timeout: 30000 // 30 secondes
        };

        const response: AxiosResponse<T> = await axios(config);
        return response.data;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`⚠️ FlightLabs API attempt ${attempt}/${this.maxRetries} failed:`, lastError.message);
        
        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * attempt); // Exponential backoff
        }
      }
    }

    throw lastError;
  }

  /**
   * Enregistre un appel API pour les statistiques
   */
  private async trackApiCall(data: {
    endpoint: string;
    method: string;
    status: 'success' | 'error';
    responseTime: number;
    error?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      await ApiCall.create({
        endpoint: `flightlabs${data.endpoint}`,
        method: data.method,
        status: data.status,
        responseTime: data.responseTime,
        metadata: {
          ...data.metadata,
          error: data.error,
          provider: 'flightlabs'
        }
      });
    } catch (error) {
      console.error('❌ Error tracking API call:', error);
    }
  }

  /**
   * Génère des données de vol simulées pour le développement
   */
  private generateMockFlightPrices(route: StrategicRoute, options: any): FlightLabsPrice[] {
    const basePrice = this.getBasePriceForRoute(route);
    const airlines = this.getAirlinesForRoute(route);
    const flights: FlightLabsPrice[] = [];

    // Générer plusieurs options de vol avec variation de prix
    for (let i = 0; i < route.estimatedCallsPerScan * 3; i++) {
      const priceVariation = (Math.random() - 0.5) * 0.6; // ±30% variation
      const price = Math.round(basePrice * (1 + priceVariation));
      const airline = airlines[Math.floor(Math.random() * airlines.length)];
      
      flights.push({
        price,
        currency: 'EUR',
        deepLink: `https://booking.example.com/flights/${route.origin}-${route.destination}`,
        cabin: options.cabin || 'economy',
        airline: airline,
        validatingAirline: airline,
        departureDate: options.departureDate || this.getDefaultDepartureDate(),
        returnDate: options.returnDate,
        tripType: options.returnDate ? 'roundtrip' : 'oneway',
        adults: options.adults || 1,
        children: options.children || 0,
        infants: options.infants || 0,
        stops: Math.floor(Math.random() * 3), // 0-2 stops
        duration: this.estimateFlightDuration(route),
        segments: [{
          origin: route.origin,
          destination: route.destination,
          departure: options.departureDate || this.getDefaultDepartureDate(),
          arrival: options.departureDate || this.getDefaultDepartureDate(),
          airline: airline,
          flight: `${airline.substring(0, 2)}${Math.floor(Math.random() * 9000) + 1000}`,
          aircraft: 'Boeing 737',
          duration: this.estimateFlightDuration(route)
        }]
      });
    }

    return flights.sort((a, b) => a.price - b.price);
  }

  /**
   * Génère des horaires simulés
   */
  private generateMockSchedules(route: StrategicRoute): FlightLabsSchedule[] {
    const airlines = this.getAirlinesForRoute(route);
    const schedules: FlightLabsSchedule[] = [];
    
    for (let i = 0; i < 5; i++) {
      const airline = airlines[Math.floor(Math.random() * airlines.length)];
      const departureTime = new Date();
      departureTime.setHours(6 + i * 3); // Flights every 3 hours starting at 6 AM
      
      const arrivalTime = new Date(departureTime);
      const duration = this.getFlightDurationHours(route);
      arrivalTime.setHours(arrivalTime.getHours() + duration);
      
      schedules.push({
        departure: {
          iataCode: route.origin,
          icaoCode: this.getIcaoFromIata(route.origin),
          scheduledTime: departureTime.toISOString()
        },
        arrival: {
          iataCode: route.destination,
          icaoCode: this.getIcaoFromIata(route.destination),
          scheduledTime: arrivalTime.toISOString()
        },
        airline: {
          name: airline,
          iataCode: airline.substring(0, 2),
          icaoCode: airline.substring(0, 3).toUpperCase()
        },
        flight: {
          iataNumber: `${airline.substring(0, 2)}${Math.floor(Math.random() * 9000) + 1000}`,
          icaoNumber: `${airline.substring(0, 3).toUpperCase()}${Math.floor(Math.random() * 9000) + 1000}`,
          number: `${Math.floor(Math.random() * 9000) + 1000}`
        }
      });
    }
    
    return schedules;
  }

  // Méthodes utilitaires
  private getMinDiscountForTier(tier: number): number {
    switch (tier) {
      case 1: return 25; // 25% minimum pour tier 1
      case 2: return 20; // 20% minimum pour tier 2
      case 3: return 15; // 15% minimum pour tier 3
      default: return 20;
    }
  }

  private getBasePriceForRoute(route: StrategicRoute): number {
    // Prix de base estimés selon la destination
    const longHaulDestinations = ['JFK', 'LAX', 'YYZ', 'YUL', 'BKK', 'DXB', 'DEL', 'CUN', 'FDF', 'PTP'];
    const europeanDestinations = ['BCN', 'FCO', 'LIS', 'ATH', 'MXP', 'BUD', 'MAD', 'STN', 'BRU', 'AMS', 'OPO', 'GVA', 'DUB', 'KUT', 'TIA'];
    
    if (longHaulDestinations.includes(route.destination)) {
      return Math.floor(Math.random() * 400) + 600; // 600-1000€
    } else if (europeanDestinations.includes(route.destination)) {
      return Math.floor(Math.random() * 200) + 100; // 100-300€
    } else {
      return Math.floor(Math.random() * 150) + 80; // 80-230€ (domestic)
    }
  }

  private getAirlinesForRoute(route: StrategicRoute): string[] {
    // Mapping réaliste des compagnies par route
    const airlineMap: Record<string, string[]> = {
      'CDG-JFK': ['Air France', 'Delta', 'Norse Atlantic'],
      'CDG-BKK': ['Thai Airways', 'Qatar Airways', 'Air France'],
      'CDG-DXB': ['Emirates', 'Air France'],
      'CDG-BCN': ['Air France', 'Vueling', 'Ryanair'],
      'ORY-FCO': ['Vueling', 'ITA Airways', 'Air France'],
      'BVA-FCO': ['Ryanair'],
      'BVA-DUB': ['Ryanair'],
      'LYS-BCN': ['Volotea', 'Vueling']
    };
    
    const routeKey = `${route.origin}-${route.destination}`;
    return airlineMap[routeKey] || ['Air France', 'Ryanair', 'easyJet'];
  }

  private estimateFlightDuration(route: StrategicRoute): string {
    const hours = this.getFlightDurationHours(route);
    const minutes = Math.floor((hours % 1) * 60);
    return `${Math.floor(hours)}h ${minutes}m`;
  }

  private getFlightDurationHours(route: StrategicRoute): number {
    // Durées estimées basées sur les distances réelles
    const durationMap: Record<string, number> = {
      'CDG-JFK': 8.5, 'CDG-LAX': 11.5, 'CDG-BKK': 11, 'CDG-DXB': 7,
      'CDG-BCN': 1.5, 'ORY-FCO': 2.5, 'LYS-BCN': 1.5, 'CDG-NCE': 1.5
    };
    
    const routeKey = `${route.origin}-${route.destination}`;
    return durationMap[routeKey] || 2; // Default 2h for European routes
  }

  private getIcaoFromIata(iata: string): string {
    const icaoMap: Record<string, string> = {
      'CDG': 'LFPG', 'ORY': 'LFPO', 'LYS': 'LFLL', 'NCE': 'LFMN',
      'JFK': 'KJFK', 'LAX': 'KLAX', 'BKK': 'VTBS', 'DXB': 'OMDB'
    };
    return icaoMap[iata] || `IC${iata}`;
  }

  private getDefaultDepartureDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 14); // 2 weeks from now
    return date.toISOString().split('T')[0];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 