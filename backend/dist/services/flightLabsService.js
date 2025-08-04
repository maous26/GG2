"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlightLabsService = void 0;
const axios_1 = __importDefault(require("axios"));
const ApiCall_1 = require("../models/ApiCall");
class FlightLabsService {
    constructor() {
        this.baseUrl = 'https://goflightlabs.com';
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
        this.apiKey = process.env.FLIGHTLABS_API_KEY || '';
        if (!this.apiKey) {
            console.warn('⚠️ FlightLabs API key not found. Flight data will be simulated.');
        }
    }
    /**
     * Recherche les vols disponibles pour une route
     */
    async searchFlights(route, options = {}) {
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
            const response = await this.makeApiCall('advanced-future-flights', params, 'GET');
            // 🔍 DEBUG: Log de la réponse API pour voir son format
            console.log(`🔍 [FlightLabs] Route ${route.origin}-${route.destination} - Type de réponse:`, typeof response);
            console.log(`🔍 [FlightLabs] Route ${route.origin}-${route.destination} - Est un tableau:`, Array.isArray(response));
            console.log(`🔍 [FlightLabs] Route ${route.origin}-${route.destination} - Nombre de vols:`, Array.isArray(response) ? response.length : 'N/A');
            // Normaliser la réponse en tableau si ce n'est pas déjà le cas
            let flights = [];
            if (Array.isArray(response)) {
                // Convertir les données de schedule en données de prix simulées
                flights = response.slice(0, 5).map((schedule, index) => {
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
            }
            else if (response && response.data && Array.isArray(response.data)) {
                flights = response.data;
            }
            else if (response && response.results && Array.isArray(response.results)) {
                flights = response.results;
            }
            else {
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
        }
        catch (error) {
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
    async detectDeals(route) {
        const flights = await this.searchFlights(route);
        const deals = [];
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
    async getFlightSchedules(route, date) {
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
            const response = await this.makeApiCall('schedules', params, 'GET');
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
        }
        catch (error) {
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
    async makeApiCall(endpoint, params, method = 'GET') {
        let lastError = null;
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
                const response = await (0, axios_1.default)(config);
                return response.data;
            }
            catch (error) {
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
    async trackApiCall(data) {
        try {
            await ApiCall_1.ApiCall.create({
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
        }
        catch (error) {
            console.error('❌ Error tracking API call:', error);
        }
    }
    /**
     * Génère des données de vol simulées pour le développement
     */
    generateMockFlightPrices(route, options) {
        const basePrice = this.getBasePriceForRoute(route);
        const airlines = this.getAirlinesForRoute(route);
        const flights = [];
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
    generateMockSchedules(route) {
        const airlines = this.getAirlinesForRoute(route);
        const schedules = [];
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
    getMinDiscountForTier(tier) {
        switch (tier) {
            case 1: return 25; // 25% minimum pour tier 1
            case 2: return 20; // 20% minimum pour tier 2
            case 3: return 15; // 15% minimum pour tier 3
            default: return 20;
        }
    }
    getBasePriceForRoute(route) {
        // Prix de base estimés selon la destination
        const longHaulDestinations = ['JFK', 'LAX', 'YYZ', 'YUL', 'BKK', 'DXB', 'DEL', 'CUN', 'FDF', 'PTP'];
        const europeanDestinations = ['BCN', 'FCO', 'LIS', 'ATH', 'MXP', 'BUD', 'MAD', 'STN', 'BRU', 'AMS', 'OPO', 'GVA', 'DUB', 'KUT', 'TIA'];
        if (longHaulDestinations.includes(route.destination)) {
            return Math.floor(Math.random() * 400) + 600; // 600-1000€
        }
        else if (europeanDestinations.includes(route.destination)) {
            return Math.floor(Math.random() * 200) + 100; // 100-300€
        }
        else {
            return Math.floor(Math.random() * 150) + 80; // 80-230€ (domestic)
        }
    }
    getAirlinesForRoute(route) {
        // Mapping réaliste des compagnies par route
        const airlineMap = {
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
    estimateFlightDuration(route) {
        const hours = this.getFlightDurationHours(route);
        const minutes = Math.floor((hours % 1) * 60);
        return `${Math.floor(hours)}h ${minutes}m`;
    }
    getFlightDurationHours(route) {
        // Durées estimées basées sur les distances réelles
        const durationMap = {
            'CDG-JFK': 8.5, 'CDG-LAX': 11.5, 'CDG-BKK': 11, 'CDG-DXB': 7,
            'CDG-BCN': 1.5, 'ORY-FCO': 2.5, 'LYS-BCN': 1.5, 'CDG-NCE': 1.5
        };
        const routeKey = `${route.origin}-${route.destination}`;
        return durationMap[routeKey] || 2; // Default 2h for European routes
    }
    getIcaoFromIata(iata) {
        const icaoMap = {
            'CDG': 'LFPG', 'ORY': 'LFPO', 'LYS': 'LFLL', 'NCE': 'LFMN',
            'JFK': 'KJFK', 'LAX': 'KLAX', 'BKK': 'VTBS', 'DXB': 'OMDB'
        };
        return icaoMap[iata] || `IC${iata}`;
    }
    getDefaultDepartureDate() {
        const date = new Date();
        date.setDate(date.getDate() + 14); // 2 weeks from now
        return date.toISOString().split('T')[0];
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.FlightLabsService = FlightLabsService;
