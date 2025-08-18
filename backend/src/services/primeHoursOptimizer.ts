/**
 * Service d'optimisation des heures prime de scanning
 * Implémente un système intelligent basé sur les patterns de prix
 */

export class PrimeHoursOptimizer {
  
  /**
   * Détermine si nous sommes dans une heure prime pour le scanning
   */
  static isPrimeHour(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
    
    // Heures prime générales (9-11h et 14-16h) - quand les prix bougent le plus
    const isPrimeTimeGeneral = (hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16);
    
    // Mardi et mercredi - jours historiquement meilleurs pour les deals
    const isPrimeDays = day === 2 || day === 3; // Mardi ou Mercredi
    
    // Éviter les heures creuses (nuit)
    const isDeadHours = hour >= 0 && hour <= 6;
    
    return isPrimeTimeGeneral || isPrimeDays && !isDeadHours;
  }

  /**
   * Calcule le facteur de boost pour les heures prime
   * Retourne 1.0 (normal) à 1.5 (boost maximum)
   */
  static getPrimeHourMultiplier(): number {
    if (!this.isPrimeHour()) {
      return 1.0; // Pas de modification
    }

    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    let multiplier = 1.0;
    
    // Boost heures prime générales
    if ((hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16)) {
      multiplier += 0.2; // +20%
    }
    
    // Boost jours prime (Mardi/Mercredi)
    if (day === 2 || day === 3) {
      multiplier += 0.15; // +15%
    }
    
    // Boost spécial Mardi 9-11h (historically best time)
    if (day === 2 && hour >= 9 && hour <= 11) {
      multiplier += 0.15; // +15% supplémentaire
    }
    
    // Limiter le boost maximum à 50%
    return Math.min(multiplier, 1.5);
  }

  /**
   * Détermine si nous devons réduire la fréquence (heures creuses)
   */
  static shouldReduceFrequency(): boolean {
    const now = new Date();
    const hour = now.getHours();
    
    // Réduire pendant les heures creuses (nuit)
    return hour >= 0 && hour <= 6;
  }

  /**
   * Calcule l'intervalle de scan optimisé pour un tier donné
   */
  static getOptimizedScanInterval(tierBaseInterval: number): number {
    if (this.shouldReduceFrequency()) {
      // Pendant les heures creuses, augmenter l'intervalle de 50%
      return Math.floor(tierBaseInterval * 1.5);
    }
    
    const multiplier = this.getPrimeHourMultiplier();
    if (multiplier > 1.0) {
      // Pendant les heures prime, réduire l'intervalle (scanner plus souvent)
      return Math.floor(tierBaseInterval / multiplier);
    }
    
    return tierBaseInterval;
  }

  /**
   * Logs des optimisations pour monitoring
   */
  static logOptimization(): void {
    const isPrime = this.isPrimeHour();
    const multiplier = this.getPrimeHourMultiplier();
    const shouldReduce = this.shouldReduceFrequency();
    
    if (isPrime || shouldReduce) {
      console.log(`⚡ [PrimeHours] ${isPrime ? 'PRIME TIME' : 'OFF HOURS'} detected (multiplier: ${multiplier.toFixed(2)})`);
    }
  }

  /**
   * Retourne un résumé de l'état actuel pour le dashboard
   */
  static getCurrentOptimizationStatus(): {
    isPrimeHour: boolean;
    multiplier: number;
    status: 'prime' | 'normal' | 'reduced';
    nextPrimeHour?: string;
  } {
    const isPrime = this.isPrimeHour();
    const multiplier = this.getPrimeHourMultiplier();
    const shouldReduce = this.shouldReduceFrequency();
    
    let status: 'prime' | 'normal' | 'reduced' = 'normal';
    if (isPrime) status = 'prime';
    else if (shouldReduce) status = 'reduced';
    
    return {
      isPrimeHour: isPrime,
      multiplier,
      status
    };
  }
}
