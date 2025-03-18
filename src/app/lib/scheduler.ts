import { promises as fs } from 'fs';
import * as cron from 'node-cron';
import { scrape } from './scraper';
import { Summarizer } from './Summarizer';
import { paths } from '@/app/utils/paths';
import { loadEnvConfig } from '@next/env';
import { loadAllThreads } from '../utils/fileLoader';
import { selectThreads } from '../utils/threadSelector';

// Helper function to check thread availability
async function checkThreadAvailability(): Promise<number> {
  try {
    if (!paths.threadsDir) {
      console.log('Threads directory path is not defined');
      return 0;
    }

    // Check if directory exists
    try {
      await fs.access(paths.threadsDir);
    } catch {
      console.log('Threads directory does not exist');
      return 0;
    }

    // Read directory contents
    const files = await fs.readdir(paths.threadsDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    return jsonFiles.length;
  } catch (error) {
    console.error('Error checking thread availability:', error);
    return 0;
  }
}

// Helper function for the scraper job
async function runScraperJob() {
  console.log(`[${new Date().toISOString()}] Running scheduled scraper job`);
  try {
    await scrape();
    console.log(`[${new Date().toISOString()}] Completed scheduled scraper job successfully`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Scraper job failed:`, error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
  }
}

// Helper function for the summarizer job
async function runSummarizerJob() {
  console.log(`[${new Date().toISOString()}] Running scheduled summarizer job`);
  
  try {
    // Ensure environment variables are loaded
    loadEnvConfig(process.cwd());
    
    // Check API key
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY environment variable is not set');
    }
    console.log('API key verified');

    // Check thread availability
    console.log('Checking thread availability...');
    const threadCount = await checkThreadAvailability();
    console.log(`Found ${threadCount} threads`);
    
    if (threadCount < 12) {
      throw new Error(`Insufficient threads available for analysis: found ${threadCount}, need at least 12`);
    }
    
    // Load threads with explicit path verification
    console.log('Loading threads from:', paths.threadsDir);
    try {
      await fs.access(paths.threadsDir);
      console.log('Threads directory exists and is accessible');
    } catch (e) {
      console.error('Threads directory not found or not accessible:', e);
      throw new Error(`Threads directory not found at ${paths.threadsDir}`);
    }
    
    const allThreads = await loadAllThreads(paths.threadsDir);
    console.log(`Loaded ${allThreads.length} threads successfully`);
    
    if (allThreads.length === 0) {
      throw new Error('No threads were loaded for analysis');
    }

    // Select threads for analysis
    const selection = selectThreads(allThreads);
    const threadsToAnalyze = [
      ...selection.topByPosts,
      ...selection.mediumHighPosts,
      ...selection.mediumPosts,
      ...selection.lowPosts
    ];
    
    console.log(`Selected ${threadsToAnalyze.length} threads for analysis`);
    
    if (threadsToAnalyze.length !== 12) {
      throw new Error(`Expected 12 threads for analysis, but got ${threadsToAnalyze.length}`);
    }

    // Initialize and run summarizer
    console.log('Initializing summarizer with API key');
    const summarizer = new Summarizer(apiKey);
    console.log('Running analysis...');
    const results = await summarizer.analyze(threadsToAnalyze);
    console.log(`Analysis complete: ${results.articles.batchStats.totalThreads} threads analyzed`);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Summarizer job failed:`, error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
  }
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

    console.log(`[${new Date().toISOString()}] Starting scheduler in production mode`);
    console.log('Current UTC time:', new Date().toUTCString());

    // Set up scheduled jobs (no immediate execution)
    this.setupScheduledJobs();
    
    this.isRunning = true;
    console.log(`[${new Date().toISOString()}] Scheduler started successfully`);
    console.log('Scraper schedule: Every 2 hours starting at 00:00 UTC');
    console.log('Summarizer schedule: Daily at 23:30 UTC');
    
    // Log current time for reference
    const now = new Date();
    console.log('Current time (UTC):', now.toUTCString());
    console.log('Current hour (UTC):', now.getUTCHours());
    console.log('Current minute (UTC):', now.getUTCMinutes());
  }

  private setupScheduledJobs() {
    // Scraper: At minute 0 of every even hour (0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22) UTC
    this.scraperJob = cron.schedule('0 0,2,4,6,8,10,12,14,16,18,20,22 * * *', runScraperJob, {
      timezone: 'UTC'
    });

    // Summarizer: At 23:30 UTC daily
    this.summarizerJob = cron.schedule('30 23 * * *', runSummarizerJob, {
      timezone: 'UTC'
    });
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
      await runSummarizerJob();
      console.log(`[${new Date().toISOString()}] Manual summarizer run completed`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Manual summarizer run failed:`, error);
      throw error;
    }
  }
} 