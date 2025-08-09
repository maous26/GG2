import Settings from '../models/Settings';

interface BudgetConfig {
  monthlyCalls: number;
  lastResetAt?: string; // ISO date of last reset
}

export class ApiBudgetService {
  private static cache: { config: BudgetConfig; monthKey: string } | null = null;

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
}

export default ApiBudgetService;

