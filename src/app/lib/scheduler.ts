import cron from 'node-cron';
import { loadEnvConfig } from '@next/env';
import { Summarizer } from './Summarizer';
import { paths } from '@/app/utils/paths';
import fs from 'fs';

// Load environment variables
loadEnvConfig(process.cwd());

// Helper functions
async function runScraper() {
  const { scrape } = await import('./scraper');
  return scrape();
}

async function checkThreadAvailability(): Promise<number> {
  try {
    if (!fs.existsSync(paths.threadsDir)) {
      console.log('Threads directory does not exist');
      return 0;
    }
    const files = fs.readdirSync(paths.threadsDir).filter(f => f.endsWith('.json'));
    console.log(`Found ${files.length} thread files`);
    return files.length;
  } catch (error) {
    console.error('Error checking thread availability:', error);
    return 0;
  }
}

async function waitForThreads(requiredCount: number = 12, maxAttempts: number = 8): Promise<boolean> {
  console.log(`Waiting for at least ${requiredCount} threads to be available...`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const threadCount = await checkThreadAvailability();
    console.log(`Attempt ${attempt}/${maxAttempts}: Found ${threadCount} threads`);
    
    if (threadCount >= requiredCount) {
      console.log('Sufficient threads found!');
      return true;
    }
    
    if (attempt < maxAttempts) {
      console.log('Waiting 15 seconds before next check...');
      await new Promise(resolve => setTimeout(resolve, 15000)); // 15 second wait
    }
  }
  
  console.log('Timed out waiting for threads');
  return false;
}

async function runSummarizer() {
  console.log(`[${new Date().toISOString()}] Checking summarizer prerequisites...`);
  
  // Check API key
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error('DEEPSEEK_API_KEY environment variable is not set');
    throw new Error('DEEPSEEK_API_KEY environment variable is not set');
  }
  console.log('API key verified');

  // Check thread availability
  const hasThreads = await waitForThreads();
  if (!hasThreads) {
    throw new Error('Insufficient threads available for analysis');
  }
  
  const summarizer = new Summarizer(apiKey);
  const { loadAllThreads } = await import('../utils/fileLoader');
  const { selectThreads } = await import('../utils/threadSelector');
  
  // Load and select threads
  console.log('Loading threads from:', paths.threadsDir);
  const allThreads = await loadAllThreads(paths.threadsDir);
  const selection = selectThreads(allThreads);
  const threadsToAnalyze = [
    ...selection.topByPosts,
    ...selection.mediumHighPosts,
    ...selection.mediumPosts,
    ...selection.lowPosts
  ];
  
  console.log(`Selected ${threadsToAnalyze.length} threads for analysis`);
  return summarizer.analyze(threadsToAnalyze);
}

export class Scheduler {
  private static instance: Scheduler | null = null;
  private scraperJob: cron.ScheduledTask | null = null;
  private summarizerJob: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;

  private constructor() {
    console.log(`[${new Date().toISOString()}] Scheduler instance created`);
  }

  static getInstance(): Scheduler {
    if (!Scheduler.instance) {
      console.log(`[${new Date().toISOString()}] Creating new Scheduler instance`);
      Scheduler.instance = new Scheduler();
    } else {
      console.log(`[${new Date().toISOString()}] Reusing existing Scheduler instance`);
    }
    return Scheduler.instance;
  }

  async start() {
    // Only run scheduler in production
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${new Date().toISOString()}] Scheduler disabled in non-production environment`);
      return;
    }

    if (this.isRunning) {
      console.log(`[${new Date().toISOString()}] Scheduler is already running`);
      return;
    }

    console.log(`[${new Date().toISOString()}] Starting scheduler in production mode...`);
    console.log(`[${new Date().toISOString()}] Starting scheduler...`);
    console.log('Current UTC time:', new Date().toUTCString());

    // Run scraper immediately on startup
    console.log(`[${new Date().toISOString()}] Running initial scraper job...`);
    try {
      await runScraper();
      console.log(`[${new Date().toISOString()}] Initial scraper job completed`);
      
      // Wait 2 minutes before running summarizer to ensure threads are available
      console.log('Waiting 2 minutes for threads to be properly saved...');
      await new Promise(resolve => setTimeout(resolve, 120000));
      
      console.log(`[${new Date().toISOString()}] Running initial summarizer job...`);
      await runSummarizer();
      console.log(`[${new Date().toISOString()}] Initial summarizer job completed`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error running initial jobs:`, error);
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
    console.log(`[${new Date().toISOString()}] Scheduler started successfully`);
    console.log('Scraper schedule: Every 3 hours starting at 00:00 UTC');
    console.log('Summarizer schedule: Daily at 23:30 UTC');
    
    // Log current time for reference
    const now = new Date();
    console.log('Current time (UTC):', now.toUTCString());
    console.log('Current hour (UTC):', now.getUTCHours());
    console.log('Current minute (UTC):', now.getUTCMinutes());
  }

  stop() {
    if (!this.isRunning) {
      console.log(`[${new Date().toISOString()}] Scheduler is not running`);
      return;
    }

    console.log(`[${new Date().toISOString()}] Stopping scheduler...`);
    this.scraperJob?.stop();
    this.summarizerJob?.stop();
    this.isRunning = false;
    console.log(`[${new Date().toISOString()}] Scheduler stopped`);
  }

  /**
   * Manually run the summarizer - useful for development
   */
  async runSummarizerManually() {
    console.log(`[${new Date().toISOString()}] Manually running summarizer...`);
    try {
      await runSummarizer();
      console.log(`[${new Date().toISOString()}] Manual summarizer run completed`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Manual summarizer run failed:`, error);
      throw error;
    }
  }
} 