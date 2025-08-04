import { Pool } from 'pg';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';
import { Redis } from 'ioredis';

interface Route {
  id: string;
  origin: string;
  destination: string;
  tier: number;
  scan_frequency_hours: number;
  total_alerts: number;
  avg_discount: number;
  last_scan: Date;
}

interface AIUsageStats {
  model: 'gemini' | 'gpt';
  cost: number;
  calls: number;
}

interface DatabaseRow {
  id: string;
  model: 'gemini' | 'gpt';
  total_cost: string;
  total_calls: string;
  [key: string]: any;
}

interface AIModelCosts {
  gemini: number;
  gpt: number;
}

interface AIUsageResult {
  gemini: AIUsageStats;
  gpt: AIUsageStats;
}

type AIModel = 'gemini' | 'gpt';

export class AIAgentService {
  private readonly aiModelCosts: AIModelCosts = {
    gemini: 0.0005, // Cost per 1K tokens
    gpt: 0.002     // Cost per 1K tokens
  };

  constructor(
    private readonly pool: Pool,
    private readonly redis: Redis,
    private readonly gemini: GoogleGenerativeAI,
    private readonly openai: OpenAI
  ) {}

  /**
   * Gets the current AI budget status
   */
  public async getAIBudgetStatus(): Promise<AIUsageResult> {
    try {
      const query = `
        SELECT model, SUM(cost) as total_cost, COUNT(*) as total_calls
        FROM ai_usage
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY model
      `;
      
      const { rows } = await this.pool.query<DatabaseRow>(query);
    
      const result: AIUsageResult = {
        gemini: { model: 'gemini', cost: 0, calls: 0 },
        gpt: { model: 'gpt', cost: 0, calls: 0 }
      };

      rows.forEach((row) => {
        if (row.model === 'gemini' || row.model === 'gpt') {
          result[row.model] = {
            model: row.model,
            cost: parseFloat(row.total_cost) || 0,
            calls: parseInt(row.total_calls) || 0
          };
  }
      });

      return result;
    } catch (error) {
      console.error('Error getting AI budget status:', error);
      return {
        gemini: { model: 'gemini', cost: 0, calls: 0 },
        gpt: { model: 'gpt', cost: 0, calls: 0 }
      };
    }
  }

  /**
   * Optimizes routes using AI
   */
  public async optimizeRoutesIntelligently(): Promise<Route[]> {
    try {
      // Get current routes
      const { rows: routes } = await this.pool.query<Route>('SELECT * FROM routes');
      
      // Get historical performance
      const { rows: performance } = await this.pool.query(`
        SELECT 
          route_id,
          COUNT(*) as total_alerts,
          AVG(discount_percentage) as avg_discount
        FROM alerts
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY route_id
      `);
      
      // Analyze with Gemini
      const model = this.gemini.getGenerativeModel({ model: 'gemini-pro' });
      const prompt = this.buildOptimizationPrompt(routes, performance);
      const result = await model.generateContent(prompt);
      const suggestions = this.parseAISuggestions(result.response.text());
      
      // Apply optimizations
      await this.applyOptimizations(suggestions);
      
      // Get updated routes
      const { rows: updatedRoutes } = await this.pool.query<Route>('SELECT * FROM routes');
      return updatedRoutes;

    } catch (error) {
      console.error('Error optimizing routes:', error);
      throw error;
    }
  }

  /**
   * Tracks AI model usage
   */
  public async trackModelUsage(model: AIModel, tokens: number): Promise<void> {
    try {
      const cost = (tokens / 1000) * this.aiModelCosts[model];
      
      await this.pool.query(`
        INSERT INTO ai_usage (model, tokens, cost)
        VALUES ($1, $2, $3)
      `, [model, tokens, cost]);

    } catch (error) {
      console.error('Error tracking AI usage:', error);
    }
  }

  /**
   * Gets route suggestions from AI
   */
  public async getRouteSuggestions(): Promise<Route[]> {
    try {
      const { rows } = await this.pool.query<Route>(`
        SELECT r.*, 
          COUNT(a.id) as total_alerts,
          AVG(a.discount_percentage) as avg_discount
      FROM routes r
        LEFT JOIN alerts a ON a.route_id = r.id
        WHERE a.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY r.id
        ORDER BY avg_discount DESC
        LIMIT 10
      `);
    
      return rows.map((r: Route) => ({
        ...r,
        total_alerts: parseInt(r.total_alerts as any) || 0,
        avg_discount: parseFloat(r.avg_discount as any) || 0
      }));

    } catch (error) {
      console.error('Error getting route suggestions:', error);
      return [];
    }
  }

  /**
   * Generates personalized content using AI
   */
  public async generatePersonalizedContent(userId: string, type: string): Promise<string> {
    try {
      // Get user data
      const { rows: [user] } = await this.pool.query(`
        SELECT u.first_name, up.preferred_travel_type, up.dream_destination,
               up.accommodation_type, array_agg(DISTINCT r.destination) as visited
        FROM users u
        LEFT JOIN user_preferences up ON u.id = up.user_id
        LEFT JOIN user_alerts ua ON u.id = ua.user_id
        LEFT JOIN alerts a ON ua.alert_id = a.id
        LEFT JOIN routes r ON a.route_id = r.id
        WHERE u.id = $1
        GROUP BY u.id, u.first_name, up.preferred_travel_type, 
                 up.dream_destination, up.accommodation_type
      `, [userId]);

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Generate content based on type
      const prompt = this.buildContentPrompt(type, user);
      const model = this.gemini.getGenerativeModel({ model: 'gemini-pro' });
      const result = await model.generateContent(prompt);
      const content = result.response.text();

      // Track usage
      await this.trackModelUsage('gemini', this.estimateTokens(prompt + content));
      
      return content;

    } catch (error) {
      console.error('Error generating personalized content:', error);
      throw error;
    }
  }

  private buildOptimizationPrompt(routes: Route[], performance: any[]): string {
    // Build prompt for AI
    return `Analyze these routes and their performance:
      ${JSON.stringify({ routes, performance })}
      
      Suggest optimizations for:
      1. Scan frequency based on alert success
      2. Tier adjustments based on performance
      3. Route priority based on user engagement
      
      Format response as JSON with fields:
      - routeId
      - suggestedTier
      - suggestedFrequency
      - reason`;
  }

  private parseAISuggestions(aiResponse: string): any[] {
    try {
      return JSON.parse(aiResponse);
    } catch {
      return [];
  }
  }

  private async applyOptimizations(suggestions: any[]): Promise<void> {
    if (!suggestions.length) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const suggestion of suggestions) {
        await client.query(`
          UPDATE routes 
          SET 
            tier = $1,
            scan_frequency_hours = $2,
            updated_at = NOW()
          WHERE id = $3
        `, [suggestion.suggestedTier, suggestion.suggestedFrequency, suggestion.routeId]);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private buildContentPrompt(type: string, user: any): string {
    return `
      Génère un ${type} personnalisé pour cet utilisateur:
      - Prénom: ${user.first_name}
      - Type de voyage préféré: ${user.preferred_travel_type}
      - Destination de rêve: ${user.dream_destination}
      - Destinations visitées: ${user.visited?.join(', ')}
      
      Le contenu doit être engageant, personnalisé et inciter à l'action.
      Maximum 150 mots.
    `;
  }

  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}