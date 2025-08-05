import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  subscription_type: 'free' | 'premium' | 'enterprise';
  lastLogin?: Date;
  
  // Préférences Premium Onboarding
  preferences?: {
    // Aéroports de province additionnels (CDG/Orly/Beauvais par défaut pour tous)
    additionalAirports?: string[]; // Ex: ['LYS', 'MRS', 'NCE', 'TLS']
    
    // Destinations de rêve
    dreamDestinations?: {
      destination: string; // Ex: 'Tokyo', 'New York', 'Bali'
      airportCode?: string; // Ex: 'NRT', 'JFK', 'DPS'
      priority: 'high' | 'medium' | 'low';
    }[];
    
    // Type de voyageur
    travelerType?: 'business' | 'leisure' | 'family' | 'backpacker' | 'luxury' | 'adventure';
    
    // Période de voyage
    travelPeriod?: {
      flexible: boolean; // true = n'importe quand, false = période précise
      specificPeriods?: {
        type: 'month' | 'season';
        value: string;
        name: string;
      }[];
      avoidPeriods?: {
        startDate: Date;
        endDate: Date;
        reason?: string; // Ex: 'Période de travail intense'
      }[];
    };
    
    // Préférences de notification
    notificationStyle?: 'urgent' | 'friendly' | 'professional' | 'casual';
    
    // Budget indicatif
    budgetRange?: {
      min: number;
      max: number;
      currency: string;
    };
  };
  
  // Métadonnées d'onboarding
  onboardingCompleted?: boolean;
  onboardingDate?: Date;
  profileCompleteness?: number; // 0-100%
  
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  subscription_type: {
    type: String,
    enum: ['free', 'premium', 'enterprise'],
    default: 'free'
  },
  lastLogin: {
    type: Date
  },
  
  // Préférences Premium
  preferences: {
    additionalAirports: [{
      type: String,
      uppercase: true,
      match: /^[A-Z]{3}$/ // Code IATA 3 lettres
    }],
    
    dreamDestinations: [{
      destination: { type: String, required: true },
      airportCode: { 
        type: String,
        uppercase: true,
        match: /^[A-Z]{3}$/
      },
      priority: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'medium'
      }
    }],
    
    travelerType: {
      type: String,
      enum: ['business', 'leisure', 'family', 'backpacker', 'luxury', 'adventure']
    },
    
    travelPeriod: {
      flexible: { type: Boolean, default: true },
      specificPeriods: [{
        type: { type: String, enum: ['month', 'season'] },
        value: { type: String },
        name: { type: String }
      }],
      avoidPeriods: [{
        startDate: Date,
        endDate: Date,
        reason: String
      }]
    },
    
    notificationStyle: {
      type: String,
      enum: ['urgent', 'friendly', 'professional', 'casual'],
      default: 'friendly'
    },
    
    budgetRange: {
      min: Number,
      max: Number,
      currency: { type: String, default: 'EUR' }
    }
  },
  
  onboardingCompleted: { type: Boolean, default: false },
  onboardingDate: Date,
  profileCompleteness: { type: Number, default: 0, min: 0, max: 100 }
  
}, {
  timestamps: true
});

// Index pour les recherches
userSchema.index({ email: 1 });
userSchema.index({ subscription_type: 1 });
userSchema.index({ 'preferences.additionalAirports': 1 });
userSchema.index({ 'preferences.dreamDestinations.airportCode': 1 });

const User = mongoose.model<IUser>('User', userSchema);
export default User;