import { promises as fs } from 'fs';
import * as cron from 'node-cron';
import { scrape } from './scraper';
import { Summarizer } from './Summarizer';
import { paths } from '@/app/utils/paths';
import { loadEnvConfig } from '@next/env';
import { loadAllThreads } from '../utils/fileLoader';
import { selectThreads } from '../utils/threadSelector';
import path from 'path';

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
    console.error(`[${new Date().toISOString()}] Summarizer job failed:`, error);
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

    // Check if we missed today's summarizer run
    const now = new Date();
    const todayRun = new Date();
    todayRun.setUTCHours(23, 30, 0, 0);
    
    // If it's past 23:30 UTC, we've missed today's run
    if (now.getUTCHours() >= 23 && now.getUTCMinutes() >= 30) {
      console.log(`[${new Date().toISOString()}] Past today's summarizer window, scheduling for tomorrow`);
    } else if (now.getUTCHours() <= 23 && now.getUTCMinutes() <= 30) {
      // If we're before today's run and haven't run today, run it
      console.log(`[${new Date().toISOString()}] Checking if we need to run today's summarizer...`);
      try {
        // We could add a check here against a persistent store (like a file) to see if we already ran today
        // For now, we'll just run it to be safe
        console.log(`[${new Date().toISOString()}] Running missed summarizer job`);
        await runSummarizerJob();
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Failed to run missed summarizer job:`, error);
      }
    }

    // Set up scheduled jobs (no immediate execution)
    this.setupScheduledJobs();
    
    this.isRunning = true;
    console.log(`[${new Date().toISOString()}] Scheduler started successfully`);
    console.log('Scraper schedule: Every 2 hours starting at 00:00 UTC');
    console.log('Summarizer schedule: Daily at 23:30 UTC');
    
    // Log current time for reference
    console.log('Current time (UTC):', now.toUTCString());
    console.log('Current hour (UTC):', now.getUTCHours());
    console.log('Current minute (UTC):', now.getUTCMinutes());
  }

  private setupScheduledJobs() {
    // Scraper: At minute 0 of every even hour (0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22) UTC
    this.scraperJob = cron.schedule('0 0,2,4,6,8,10,12,14,16,18,20,22 * * *', runScraperJob, {
      timezone: 'UTC'
    });

    // Enhanced logging for summarizer schedule
    const now = new Date();
    const targetTime = new Date();
    targetTime.setUTCHours(23, 30, 0, 0);
    
    // If we've already passed today's run time, schedule for tomorrow
    if (now > targetTime) {
      targetTime.setDate(targetTime.getDate() + 1);
    }
    
    const msUntilRun = targetTime.getTime() - now.getTime();
    const hoursUntilRun = Math.floor(msUntilRun / (1000 * 60 * 60));
    const minutesUntilRun = Math.floor((msUntilRun % (1000 * 60 * 60)) / (1000 * 60));
    
    console.log(`[Scheduler] Next summarizer run scheduled for: ${targetTime.toUTCString()}`);
    console.log(`[Scheduler] Time until next run: ${hoursUntilRun}h ${minutesUntilRun}m`);

    // Summarizer: At 23:30 UTC daily with retries
    this.summarizerJob = cron.schedule('30 23 * * *', async () => {
      const maxRetries = 3;
      const retryDelayMinutes = 5;
      let currentRetry = 0;
      let lastError = null;

      const attemptSummarizer = async (): Promise<void> => {
        try {
          const startTime = new Date();
          console.log(`[${startTime.toISOString()}] Starting scheduled summarizer job (attempt ${currentRetry + 1}/${maxRetries})`);
          console.log('Memory usage before run:', process.memoryUsage());
          
          const results = await runSummarizerJob();
          
          const endTime = new Date();
          const duration = (endTime.getTime() - startTime.getTime()) / 1000;
          
          console.log(`[${endTime.toISOString()}] Summarizer completed successfully in ${duration} seconds`);
          console.log('Memory usage after run:', process.memoryUsage());
          console.log('Summary results:', {
            threadsAnalyzed: results.articles.batchStats.totalThreads,
            postsAnalyzed: results.articles.batchStats.totalAnalyzedPosts,
            averageAntisemiticPercentage: results.articles.batchStats.averageAntisemiticPercentage
          });
        } catch (error) {
          lastError = error;
          console.error(`[${new Date().toISOString()}] Summarizer attempt ${currentRetry + 1} failed:`, error);
          console.error('Memory usage at failure:', process.memoryUsage());
          
          currentRetry++;
          if (currentRetry < maxRetries) {
            console.log(`[${new Date().toISOString()}] Scheduling retry ${currentRetry} in ${retryDelayMinutes} minutes...`);
            await new Promise(resolve => setTimeout(resolve, retryDelayMinutes * 60 * 1000));
            return attemptSummarizer();
          } else {
            console.error(`[${new Date().toISOString()}] All ${maxRetries} attempts failed. Last error:`, lastError);
            // Send notification or alert here if needed
          }
        }
      };

      await attemptSummarizer();
    }, {
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