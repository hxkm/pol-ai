import { promises as fs } from 'fs';
import * as cron from 'node-cron';
import { scrape } from './scraper';
import { Summarizer } from './Summarizer';
import { paths } from '@/app/utils/paths';
import { loadEnvConfig } from '@next/env';
import { loadAllThreads } from '../utils/fileLoader';
import { selectThreads } from '../utils/threadSelector';
import path from 'path';
import { xPoster } from './xposter/poster';

// Helper function to check thread availability
async function checkThreadAvailability(): Promise<number> {
  try {
    // Use the same path resolution as the manual trigger
    const threadsDir = path.resolve(process.cwd(), 'data', 'threads');
    console.log('Looking for threads in:', threadsDir);

    // Check if directory exists
    try {
      await fs.access(threadsDir);
      console.log('Threads directory exists and is accessible');
    } catch {
      console.log('Threads directory does not exist');
      return 0;
    }

    // Read directory contents
    const files = await fs.readdir(threadsDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    console.log(`Found ${jsonFiles.length} thread files`);
    return jsonFiles.length;
  } catch (error) {
    console.error('Error checking thread availability:', error);
    return 0;
  }
}

// Helper function for the scraper job
async function runScraperJob() {
  console.log('Running scheduled scraper job');
  try {
    await scrape();
    console.log('Completed scheduled scraper job successfully');
  } catch (error) {
    console.error('Scraper job failed:', error);
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
  console.log('Running scheduled summarizer job');
  
  try {
    // Ensure environment variables are loaded
    loadEnvConfig(process.cwd());
    
    // Check API key
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY environment variable is not set');
    }
    console.log('API key verified');

    // Log environment info
    console.log('Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
      CWD: process.cwd(),
      DATA_DIR: process.env.DATA_DIR
    });

    // Ensure all required directories exist
    console.log('Verifying and creating required directories...');
    const requiredDirs = [
      paths.dataDir,
      path.resolve(paths.dataDir, 'analysis'),
      path.resolve(paths.dataDir, 'analysis/get'),
      path.resolve(paths.dataDir, 'analysis/reply')
    ];

    for (const dir of requiredDirs) {
      try {
        await fs.access(dir);
        console.log(`Directory exists: ${dir}`);
        // Log directory permissions
        const stats = await fs.stat(dir);
        console.log(`Directory permissions for ${dir}: ${stats.mode}`);
      } catch {
        console.log(`Creating directory: ${dir}`);
        await fs.mkdir(dir, { recursive: true, mode: 0o777 });
        console.log(`Created directory with full permissions: ${dir}`);
      }
    }

    // Check thread availability
    console.log('Checking thread availability...');
    const threadCount = await checkThreadAvailability();
    console.log(`Found ${threadCount} threads`);
    
    if (threadCount < 12) {
      throw new Error(`Insufficient threads available for analysis: found ${threadCount}, need at least 12`);
    }
    
    // Load threads with explicit path verification
    const threadsDir = path.resolve(process.cwd(), 'data', 'threads');
    console.log('Loading threads from:', threadsDir);
    try {
      await fs.access(threadsDir);
      console.log('Threads directory exists and is accessible');
    } catch (e) {
      console.error('Threads directory not found or not accessible:', e);
      throw new Error(`Threads directory not found at ${threadsDir}`);
    }
    
    const allThreads = await loadAllThreads(threadsDir);
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
    
    return results;
  } catch (error) {
    console.error('Summarizer job failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
}

// Helper function for the X poster job
async function runXPosterJob() {
  console.log(`[${new Date().toISOString()}] Running scheduled X poster job`);
  try {
    const result = await xPoster.postNextArticle();
    if (result.success) {
      console.log(`[${new Date().toISOString()}] Successfully posted tweet with ID: ${result.tweetId}`);
    } else {
      console.error(`[${new Date().toISOString()}] Failed to post tweet: ${result.error}`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] X poster job failed:`, error);
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
  private xPosterJob: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;

  private constructor() {
    console.log('Scheduler instance created');
  }

  static getInstance(): Scheduler {
    if (!Scheduler.instance) {
      Scheduler.instance = new Scheduler();
    }
    return Scheduler.instance;
  }

  async start() {
    if (this.isRunning) {
      console.log('Scheduler is already running');
      return;
    }

    console.log('Starting scheduler...');
    this.isRunning = true;

    // Setup scheduled jobs
    this.setupScheduledJobs();

    console.log('Scheduler started successfully');
  }

  private setupScheduledJobs() {
    // Schedule scraper job - every 15 minutes
    this.scraperJob = cron.schedule('*/15 * * * *', async () => {
      console.log('Running scheduled scraper job');
      await runScraperJob();
    });

    // Schedule summarizer job - every 30 minutes
    this.summarizerJob = cron.schedule('*/30 * * * *', async () => {
      console.log('Running scheduled summarizer job');
      const attemptSummarizer = async (): Promise<void> => {
        try {
          await runSummarizerJob();
        } catch (error) {
          console.error('Summarizer job failed:', error);
          throw error;
        }
      };

      try {
        await attemptSummarizer();
      } catch (error) {
        console.error('Initial summarizer attempt failed:', error);
        console.log('Scheduling retry in 5 minutes...');
        
        // Wait 5 minutes and try again
        setTimeout(async () => {
          console.log('Attempting retry...');
          try {
            await attemptSummarizer();
            console.log('Retry attempt succeeded');
          } catch (error) {
            console.error('Retry attempt failed:', error);
          }
        }, 5 * 60 * 1000);
      }
    });

    // X Poster: Three times daily at 01:30, 11:30, and 17:30 UTC
    // Times are after scraper runs to ensure fresh data
    this.xPosterJob = cron.schedule('30 1,11,17 * * *', runXPosterJob, {
      timezone: 'UTC'
    });

    console.log('Scheduled jobs setup complete');
  }

  stop() {
    if (!this.isRunning) {
      console.log('Scheduler is not running');
      return;
    }

    console.log('Stopping scheduler...');

    if (this.scraperJob) {
      this.scraperJob.stop();
      this.scraperJob = null;
    }

    if (this.summarizerJob) {
      this.summarizerJob.stop();
      this.summarizerJob = null;
    }

    if (this.xPosterJob) {
      this.xPosterJob.stop();
      this.xPosterJob = null;
    }

    this.isRunning = false;
    console.log('Scheduler stopped successfully');
  }

  async runSummarizerManually() {
    console.log('Running summarizer manually...');
    try {
      const results = await runSummarizerJob();
      console.log('Manual summarizer run completed successfully');
      return results;
    } catch (error) {
      console.error('Manual summarizer run failed:', error);
      throw error;
    }
  }

  /**
   * Manually run the X poster - useful for development
   */
  async runXPosterManually() {
    console.log(`[${new Date().toISOString()}] Manually running X poster...`);
    try {
      await runXPosterJob();
      console.log(`[${new Date().toISOString()}] Manual X poster run completed`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Manual X poster run failed:`, error);
      throw error;
    }
  }
} 