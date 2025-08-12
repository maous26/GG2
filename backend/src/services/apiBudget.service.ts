import Settings from '../models/Settings';
import { getRedis } from '../config/redis';

interface BudgetConfig {
  monthlyCalls: number;
  lastResetAt?: string; // ISO date of last reset
}

export class ApiBudgetService {
  private static cache: { config: BudgetConfig; monthKey: string } | null = null;
  private static redis = getRedis();

  private static getMonthKey(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  static async getConfig(): Promise<BudgetConfig> {
    const monthKey = this.getMonthKey();
    if (this.cache && this.cache.monthKey === monthKey) return this.cache.config;

    const defaultMonthly = Number(process.env.BUDGET_MONTHLY_CALLS || 30000);
    const doc = await Settings.findOne({ key: 'apiBudget' });
    const config: BudgetConfig = doc?.value || { monthlyCalls: defaultMonthly };
    this.cache = { config, monthKey };
    return config;
  }

  static async setMonthlyCalls(monthlyCalls: number) {
    const config = await this.getConfig();
    config.monthlyCalls = monthlyCalls;
    await Settings.findOneAndUpdate(
      { key: 'apiBudget' },
      { key: 'apiBudget', value: config, updatedAt: new Date() },
      { upsert: true }
    );
    this.cache = { config, monthKey: this.getMonthKey() };
  }

  // Persistent counters (month/day) and reservation
  static async getCounters(): Promise<{ month: number; day: number }> {
    const monthKey = `budget:calls:month:${this.getMonthKey()}`;
    const dayKey = `budget:calls:day:${new Date().toISOString().slice(0,10)}`;
    const [m, d] = await this.redis.mget(monthKey, dayKey);
    return { month: Number(m || 0), day: Number(d || 0) };
  }

  static async reserveCalls(count: number): Promise<boolean> {
    const cfg = await this.getConfig();
    const monthKey = `budget:calls:month:${this.getMonthKey()}`;
    const dayKey = `budget:calls:day:${new Date().toISOString().slice(0,10)}`;
    const dailyCap = Math.floor(cfg.monthlyCalls / 30);
    
    const lua = `
      local monthKey = KEYS[1]
      local dayKey = KEYS[2]
      local monthCap = tonumber(ARGV[1])
      local dayCap = tonumber(ARGV[2])
      local delta = tonumber(ARGV[3])
      local m = tonumber(redis.call('GET', monthKey) or '0')
      local d = tonumber(redis.call('GET', dayKey) or '0')
      if (m + delta) > monthCap then return 0 end
      if (d + delta) > dayCap then return 0 end
      redis.call('INCRBY', monthKey, delta)
      redis.call('INCRBY', dayKey, delta)
      return 1
    `;
    const ok = await this.redis.eval(lua, 2, monthKey, dayKey, String(cfg.monthlyCalls), String(dailyCap), String(count));
    return ok === 1;
  }

  static async releaseCalls(count: number): Promise<void> {
    const monthKey = `budget:calls:month:${this.getMonthKey()}`;
    const dayKey = `budget:calls:day:${new Date().toISOString().slice(0,10)}`;
    await this.redis.decrby(monthKey, count);
    await this.redis.decrby(dayKey, count);
  }
}

export default ApiBudgetService;

