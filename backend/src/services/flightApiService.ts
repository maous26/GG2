import axios, { AxiosResponse } from 'axios';
import { ApiCall } from '../models/ApiCall';
import { StrategicRoute } from '../utils/strategicRoutes';

// FlightAPI Types based on the provided documentation
export interface FlightAPIItinerary {
  id: string;
  leg_ids: string[];
  pricing_options: Array<{
    id: string;
    agent_ids: string[];
    price: {
      amount: number;
      update_status: string;
      last_updated: string;
      quote_age: number;
    };
    items: Array<{
      agent_id: string;
      url: string;
      segment_ids: string[];
      price: {
        amount: number;
        update_status: string;
        last_updated: string;
        quote_age: number;
      };
      booking_proposition: string;
      fares: Array<{
        segment_id: string;
        fare_basis_code: string;
        booking_code: string;
        fare_family: string;
      }>;
    }>;
  }>;
  score: number;
  cheapest_price: {
    amount: number;
    update_status: string;
    last_updated: string;
    quote_age: number;
  };
  pricing_options_count: number;
}

export interface FlightAPILeg {
  id: string;
  origin_place_id: number;
  destination_place_id: number;
  departure: string;
  arrival: string;
  segment_ids: string[];
  duration: number;
  stop_count: number;
  marketing_carrier_ids: number[];
  operating_carrier_ids: number[];
  stop_ids: number[][];
}

export interface FlightAPISegment {
  id: string;
  origin_place_id: number;
  destination_place_id: number;
  arrival: string;
  departure: string;
  duration: number;
  marketing_flight_number: string;
  marketing_carrier_id: number;
  operating_carrier_id: number;
  mode: string;
}

export interface FlightAPIResponse {
  itineraries: FlightAPIItinerary[];
  legs: FlightAPILeg[];
  segments: FlightAPISegment[];
  places?: any[];
  carriers?: any[];
  agents?: any[];
}

// Converted types to match existing system interfaces
export interface FlightPrice {
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

export interface FlightSchedule {
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
}

export class FlightAPIService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.flightapi.io';
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor() {
    this.apiKey = process.env.FLIGHTAPI_KEY || '';
    if (!this.apiKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('FLIGHTAPI_KEY is required in production');
      }
      console.warn('⚠️ FlightAPI key not found. Flight data will be simulated (non-production).');
    }
  }

  /**
   * Search flights for a route using FlightAPI
   */
  async searchFlights(route: StrategicRoute, options: {
    departureDate?: string;
    returnDate?: string;
    adults?: number;
    children?: number;
    infants?: number;
    cabin?: 'Economy' | 'Business' | 'First' | 'Premium_Economy';
    currency?: string;
  } = {}): Promise<FlightPrice[]> {
    const startTime = Date.now();
    
    try {
      if (!this.apiKey) {
        console.warn(`⚠️ FlightAPI key missing for ${route.origin}-${route.destination}. Returning empty results.`);
        return [];
      }

      const {
        departureDate = this.getDefaultDepartureDate(),
        returnDate,
        adults = 1,
        children = 0,
        infants = 0,
        cabin = 'Economy',
        currency = 'EUR'
      } = options;

      // Provider doc: roundtrip endpoint; if no return date, synthesize one with min-stay rules
      const synthesizedReturn = returnDate || this.computeReturnDateByRules(route.origin, route.destination, departureDate);
      const response: FlightAPIResponse = await this.makeRoundTripRequest({
        departure_airport_code: route.origin,
        arrival_airport_code: route.destination,
        departure_date: departureDate,
        arrival_date: synthesizedReturn,
        number_of_adults: adults.toString(),
        number_of_childrens: children.toString(),
        number_of_infants: infants.toString(),
        cabin_class: cabin,
        currency,
        region: this.getIsoRegionForOrigin(route.origin)
      });

      console.log(`✅ [FlightAPI] ${response.itineraries?.length || 0} flight options found for ${route.origin}-${route.destination}`);

      // Convert FlightAPI response to our internal format
      const flights = this.convertResponseToFlightPrices(response, options, route);

      // Log API usage including route for per-route analytics
      await this.logApiUsage({
        endpoint: `${returnDate ? '/roundtrip' : '/oneway'}/${route.origin}-${route.destination}`,
        method: 'GET',
        responseTime: Date.now() - startTime,
        success: true,
        resultsCount: flights.length
      });

      return flights;

    } catch (error) {
      console.error(`❌ [FlightAPI] Error searching flights for ${route.origin}-${route.destination}:`, error);
      
      // Log failed API usage
      await this.logApiUsage({
        endpoint: `${options.returnDate ? '/roundtrip' : '/oneway'}/${route.origin}-${route.destination}`,
        method: 'GET',
        responseTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // No fallback: strictly return empty results on failure
      return [];
    }
  }

  /**
   * Make a round trip request to FlightAPI
   */
  private async makeRoundTripRequest(params: {
    departure_airport_code: string;
    arrival_airport_code: string;
    departure_date: string;
    arrival_date: string;
    number_of_adults: string;
    number_of_childrens: string;
    number_of_infants: string;
    cabin_class: string;
    currency: string;
    region: string;
  }): Promise<FlightAPIResponse> {
    const url = `${this.baseUrl}/roundtrip/${this.apiKey}/${params.departure_airport_code}/${params.arrival_airport_code}/${params.departure_date}/${params.arrival_date}/${params.number_of_adults}/${params.number_of_childrens}/${params.number_of_infants}/${params.cabin_class}/${params.currency}`;
    
    const response = await this.makeApiCall<FlightAPIResponse>(url);
    return response;
  }

  /**
   * Make a one way request to FlightAPI
   */
  // oneway disabled: provider focuses on roundtrip pricing. If needed, re-enable later.

  /**
   * Convert FlightAPI response to internal FlightPrice format
   */
  private convertResponseToFlightPrices(
    response: FlightAPIResponse, 
    options: any, 
    route: StrategicRoute
  ): FlightPrice[] {
    if (!response.itineraries || response.itineraries.length === 0) {
      return [];
    }

    return response.itineraries.slice(0, 10).map((itinerary, index) => {
      const pricing = itinerary.pricing_options[0];
      const cheapestPrice = itinerary.cheapest_price;
      
      // Find corresponding legs and segments
      const legs = response.legs?.filter(leg => 
        itinerary.leg_ids.includes(leg.id)
      ) || [];
      
      const segments = response.segments?.filter(segment => 
        legs.some(leg => leg.segment_ids.includes(segment.id))
      ) || [];

      // Calculate stops and duration from legs
      const totalStops = legs.reduce((acc, leg) => acc + leg.stop_count, 0);
      const totalDuration = legs.reduce((acc, leg) => acc + leg.duration, 0);

      return {
        price: cheapestPrice.amount,
        currency: options.currency || 'USD',
        deepLink: pricing.items[0]?.url || `https://flightapi.io/booking/${route.origin}-${route.destination}`,
        cabin: options.cabin || 'Economy',
        airline: this.getAirlineFromCarrierId(segments[0]?.marketing_carrier_id, response.carriers),
        validatingAirline: this.getAirlineFromCarrierId(segments[0]?.marketing_carrier_id, response.carriers),
        departureDate: options.departureDate || this.getDefaultDepartureDate(),
        returnDate: options.returnDate,
         tripType: 'roundtrip',
        adults: options.adults || 1,
        children: options.children || 0,
        infants: options.infants || 0,
        stops: totalStops,
        duration: this.formatDuration(totalDuration),
        segments: segments.map(segment => ({
          origin: this.getPlaceCodeFromId(segment.origin_place_id, response.places) || route.origin,
          destination: this.getPlaceCodeFromId(segment.destination_place_id, response.places) || route.destination,
          departure: segment.departure,
          arrival: segment.arrival,
          airline: this.getAirlineFromCarrierId(segment.marketing_carrier_id, response.carriers),
          flight: segment.marketing_flight_number,
          aircraft: 'Unknown', // FlightAPI doesn't provide aircraft info in basic response
          duration: this.formatDuration(segment.duration)
        }))
      };
    });
  }

  /**
   * Detect flight deals for a route
   */
  async detectDeals(route: StrategicRoute): Promise<FlightDeal[]> {
    try {
      const flights = await this.searchFlights(route, {
        departureDate: this.getDefaultDepartureDate(),
        adults: 1
      });

      if (flights.length === 0) {
        console.log(`⚠️ [FlightAPI] No flights found for deal detection: ${route.origin}-${route.destination}`);
        return [];
      }

      const deals: FlightDeal[] = [];
      const prices = flights.map(f => f.price).filter(p => p > 0);
      
      if (prices.length === 0) return deals;

      const sortedPrices = [...prices].sort((a, b) => a - b);
      const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

      for (const flight of flights) {
        const discountFromMedian = ((medianPrice - flight.price) / medianPrice) * 100;
        const discountFromAvg = ((avgPrice - flight.price) / avgPrice) * 100;
        
        // Use intelligent pricing service if available
        let adaptiveThreshold = 15; // Default threshold
        try {
          const { IntelligentPricingService } = require('./intelligentPricingService');
          adaptiveThreshold = await IntelligentPricingService.calculateAdaptiveThreshold(
            route.origin, 
            route.destination, 
            flight.price, 
            avgPrice, 
            'premium'
          );
        } catch (error) {
          console.log('Using default threshold as IntelligentPricingService not available');
        }

        const actualDiscount = Math.max(discountFromMedian, discountFromAvg);
        // Multi-source quick validation (placeholder): require price > 0 and discount >> 0
        const passesBasicComparators = flight.price > 0 && actualDiscount > 0;

        if (passesBasicComparators && actualDiscount >= adaptiveThreshold) {
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

      // Sort by discount percentage descending
      deals.sort((a, b) => b.discountPercentage - a.discountPercentage);
      return deals.slice(0, 10); // Top 10 deals

    } catch (error) {
      console.error(`❌ [FlightAPI] Error detecting deals for ${route.origin}-${route.destination}:`, error);
      return [];
    }
  }

  /**
   * Get flight schedules (simplified for FlightAPI)
   */
  async getFlightSchedules(route: StrategicRoute, date?: string): Promise<FlightSchedule[]> {
    try {
      // FlightAPI doesn't have a dedicated schedules endpoint, so we'll use search and convert
      const flights = await this.searchFlights(route, {
        departureDate: date || this.getDefaultDepartureDate()
      });

      return flights.slice(0, 5).map((flight, index) => ({
        departure: {
          iataCode: route.origin,
          icaoCode: route.origin,
          scheduledTime: flight.segments[0]?.departure || '10:00',
          terminal: '1',
        },
        arrival: {
          iataCode: route.destination,
          icaoCode: route.destination,
          scheduledTime: flight.segments[0]?.arrival || '12:00',
          terminal: '1',
        },
        airline: {
          name: flight.airline,
          iataCode: flight.airline.substring(0, 2),
          icaoCode: flight.airline.substring(0, 3),
        },
        flight: {
          iataNumber: flight.segments[0]?.flight || `FL${index + 1}`,
          icaoNumber: flight.segments[0]?.flight || `FL${index + 1}`,
          number: flight.segments[0]?.flight || `${index + 1}`,
        },
        aircraft: {
          modelCode: 'A320',
          modelText: 'Airbus A320'
        }
      }));

    } catch (error) {
      console.error(`❌ [FlightAPI] Error getting schedules for ${route.origin}-${route.destination}:`, error);
      return [];
    }
  }

  /**
   * Make API call with retry logic
   */
  private async makeApiCall<T>(url: string): Promise<T> {
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🌐 [FlightAPI] Making request (attempt ${attempt}/${this.maxRetries}): ${url.replace(this.apiKey, '***')}`);
        
        const response: AxiosResponse<T> = await axios.get(url, {
          timeout: 30000, // 30 second timeout
          headers: {
            'User-Agent': 'GlobeGenius/1.0',
            'Accept': 'application/json'
          }
        });

        if (response.status === 200 && response.data) {
          return response.data;
        } else {
          throw new Error(`Invalid response: ${response.status}`);
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < this.maxRetries) {
          console.warn(`⚠️ FlightAPI attempt ${attempt}/${this.maxRetries} failed:`, lastError.message);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }

    throw lastError;
  }

  // Compute return date by simple min-stay rules aligned with email rules
  private computeReturnDateByRules(origin: string, destination: string, dep: string): string {
    const esPt = new Set(['MAD','BCN','AGP','PMI','IBZ','VLC','SVQ','TFS','TFN','LPA','ACE','FUE','BIO','XRY','MAH','LIS','OPO','FAO','FNC','PDL']);
    const euNa = new Set(['LHR','AMS','FCO','BER','VIE','BUD','CMN','RAK','TUN','ALG','FES','OUD','AGA']);
    const minStay = esPt.has(destination) ? 5 : (euNa.has(destination) ? 7 : 10);
    const d = new Date(dep);
    d.setDate(d.getDate() + minStay);
    return d.toISOString().split('T')[0];
  }

  private getIsoRegionForOrigin(origin: string): string {
    // If needed, map origin to country ISO. For now default to 'FR' for Paris hubs.
    return ['CDG','ORY','BVA'].includes(origin) ? 'FR' : 'US';
  }

  /**
   * Log API usage
   */
  private async logApiUsage(data: {
    endpoint: string;
    method: string;
    responseTime: number;
    success: boolean;
    resultsCount?: number;
    error?: string;
  }): Promise<void> {
    try {
      await ApiCall.create({
        endpoint: `flightapi${data.endpoint}`,
        method: data.method,
        responseTime: data.responseTime,
        success: data.success,
        status: data.success ? 200 : 500,
        timestamp: new Date(),
        resultsCount: data.resultsCount || 0,
        provider: 'flightapi',
        error: data.error
      });
    } catch (error) {
      console.warn('Failed to log API usage:', error);
    }
  }

  // Helper methods
  private getDefaultDepartureDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 7); // 7 days from now
    return date.toISOString().split('T')[0];
  }

  private formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  private getAirlineFromCarrierId(carrierId: number, carriers?: any[]): string {
    if (!carriers) return 'Unknown Airline';
    const carrier = carriers.find(c => c.id === carrierId);
    return carrier?.name || 'Unknown Airline';
  }

  private getPlaceCodeFromId(placeId: number, places?: any[]): string | null {
    if (!places) return null;
    const place = places.find(p => p.id === placeId);
    return place?.iata_code || null;
  }

  private getBasePriceForRoute(route: StrategicRoute): number {
    // Base prices by tier
    const basePrices = {
      1: 300,  // Tier 1: premium routes
      2: 200,  // Tier 2: standard routes
      3: 150   // Tier 3: budget routes
    };
    return basePrices[route.tier as keyof typeof basePrices] || 200;
  }

  private estimateFlightDuration(route: StrategicRoute): string {
    // Simple duration estimation based on route
    const estimatedHours = Math.max(1, Math.floor(Math.random() * 8) + 1);
    const estimatedMinutes = Math.floor(Math.random() * 60);
    return `${estimatedHours}h ${estimatedMinutes}m`;
  }

  /**
   * Generate realistic fallback flight data when API fails
   */
  private generateRealisticFallbackFlights(route: StrategicRoute, options: any = {}): FlightPrice[] {
    console.log(`🔄 [FlightAPI] Generating fallback data for ${route.origin}-${route.destination}`);
    
    const basePrice = this.getBasePriceForRoute(route);
    const flights: FlightPrice[] = [];
    const airlines = ['American Airlines', 'Delta Air Lines', 'United Airlines', 'Air France', 'Lufthansa', 'British Airways'];
    
    for (let i = 0; i < 5; i++) {
      const priceVariation = (Math.random() - 0.5) * 0.6; // ±30% variation
      const price = Math.round(basePrice * (1 + priceVariation));
      const airline = airlines[Math.floor(Math.random() * airlines.length)];
      
      flights.push({
        price,
        currency: options.currency || 'USD',
        deepLink: `https://flightapi.io/booking/${route.origin}-${route.destination}`,
        cabin: options.cabin || 'Economy',
        airline,
        validatingAirline: airline,
         departureDate: options.departureDate || this.getDefaultDepartureDate(),
         returnDate: options.returnDate || this.computeReturnDateByRules(route.origin, route.destination, (options.departureDate || this.getDefaultDepartureDate())),
         tripType: 'roundtrip',
        adults: options.adults || 1,
        children: options.children || 0,
        infants: options.infants || 0,
        stops: Math.floor(Math.random() * 2),
        duration: this.estimateFlightDuration(route),
        segments: [{
          origin: route.origin,
          destination: route.destination,
          departure: `${8 + i}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
          arrival: `${10 + i}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
          airline,
          flight: `${airline.substring(0, 2)}${100 + i}`,
          aircraft: 'A320',
          duration: this.estimateFlightDuration(route)
        }]
      });
    }
    
    return flights;
  }
}