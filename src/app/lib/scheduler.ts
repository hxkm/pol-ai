import cron from 'node-cron';
import { loadEnvConfig } from '@next/env';
import { Summarizer } from './Summarizer';
import { paths } from './utils/paths';

// Load environment variables
loadEnvConfig(process.cwd());

// Helper functions
async function runScraper() {
  const { scrape } = await import('./scraper');
  return scrape();
}

async function runSummarizer() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable is not set');
  }
  
  const summarizer = new Summarizer(apiKey);
  const { loadAllThreads } = await import('../utils/fileLoader');
  const { selectThreads } = await import('../utils/threadSelector');
  
  // Load and select threads
  const allThreads = await loadAllThreads(paths.threadsDir);
  const selection = selectThreads(allThreads);
  const threadsToAnalyze = [
    ...selection.topByPosts,
    ...selection.mediumHighPosts,
    ...selection.mediumPosts,
    ...selection.lowPosts
  ];
  
  return summarizer.analyze(threadsToAnalyze);
}

export class Scheduler {
  private static instance: Scheduler | null = null;
  private scraperJob: cron.ScheduledTask | null = null;
  private summarizerJob: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;

  private constructor() {
    // Private constructor to enforce singleton
  }

  static getInstance(): Scheduler {
    if (!Scheduler.instance) {
      Scheduler.instance = new Scheduler();
    }
    return Scheduler.instance;
  }

  start() {
    if (this.isRunning) {
      console.log('Scheduler is already running');
      return;
    }

    // Scraper: At minute 0 of hours 0, 3, 6, 9, 12, 15, 18, and 21 (UTC)
    this.scraperJob = cron.schedule('0 0,3,6,9,12,15,18,21 * * *', async () => {
      console.log(`[${new Date().toISOString()}] Starting scheduled scraper job`);
      try {
        await runScraper();
        console.log(`[${new Date().toISOString()}] Completed scheduled scraper job`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Scraper job failed:`, error);
      }
    }, {
      timezone: 'UTC'
    });

    // Summarizer: At 23:30 UTC daily
    this.summarizerJob = cron.schedule('30 23 * * *', async () => {
      console.log(`[${new Date().toISOString()}] Starting scheduled summarizer job`);
      try {
        await runSummarizer();
        console.log(`[${new Date().toISOString()}] Completed scheduled summarizer job`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Summarizer job failed:`, error);
      }
    }, {
      timezone: 'UTC'
    });

    this.isRunning = true;
    console.log('Scheduler started');
    console.log('Scraper schedule: Every 3 hours starting at 00:00 UTC');
    console.log('Summarizer schedule: Daily at 23:30 UTC');
  }

  stop() {
    if (!this.isRunning) {
      console.log('Scheduler is not running');
      return;
    }

    this.scraperJob?.stop();
    this.summarizerJob?.stop();
    this.isRunning = false;
    console.log('Scheduler stopped');
  }
} 