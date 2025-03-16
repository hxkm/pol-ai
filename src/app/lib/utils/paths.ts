/**
 * Centralized path management for the application
 * 
 * This utility ensures consistent path handling across all environments
 * (local development, production, Railway deployment)
 */

import path from 'path';
import fs from 'fs';

// Enhanced debug logging with timestamps and categories
function logPathInfo(category: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [PATHS:${category}] ${message}`;
  console.log(logMessage);
  if (data) {
    console.log(`[${timestamp}] [PATHS:${category}:DATA]`, data);
  }
}

// Detect if we're running on Railway
const isRailway = process.env.RAILWAY_ENVIRONMENT === 'production';

// Get the project root directory
const PROJECT_ROOT = isRailway ? '/app' : process.cwd();

// Log detailed environment information
logPathInfo('ENV', `Running in ${isRailway ? 'Railway' : 'Local'} environment`);
logPathInfo('PATHS', 'System paths:', {
  projectRoot: PROJECT_ROOT,
  processCwd: process.cwd(),
  dirname: __dirname,
  platform: process.platform,
  nodeVersion: process.version
});

// Always use data directory relative to project root
const DATA_DIR = path.resolve(PROJECT_ROOT, 'data');
logPathInfo('DATA', `Data directory resolved to: ${DATA_DIR}`);

// Define all application paths
export interface Paths {
  dataDir: string;
  threadsDir: string;
  summariesDir: string;
  threadFile: (threadId: string) => string;
  summaryFile: (threadId: string) => string;
}

export const paths: Paths = {
  // Base data directory
  dataDir: DATA_DIR,
  
  // Thread data storage
  threadsDir: path.resolve(DATA_DIR, 'threads'),
  
  // Summary data storage
  summariesDir: path.resolve(DATA_DIR, 'summaries'),
  
  // Helper to get thread file path by ID
  threadFile: (threadId: string) => {
    const filePath = path.resolve(DATA_DIR, 'threads', `${threadId}.json`);
    logPathInfo('FILE', `Resolved thread file path: ${filePath}`, { threadId });
    return filePath;
  },
  
  // Helper to get summary file path by ID
  summaryFile: (threadId: string) => {
    const filePath = path.resolve(DATA_DIR, 'summaries', `${threadId}.json`);
    logPathInfo('FILE', `Resolved summary file path: ${filePath}`, { threadId });
    return filePath;
  },
};

// Log all resolved paths
logPathInfo('PATHS', 'Resolved application paths:', {
  dataDir: paths.dataDir,
  threadsDir: paths.threadsDir,
  summariesDir: paths.summariesDir
});

/**
 * Ensures all required directories exist
 * This should be called during application startup
 */
export async function ensureDirectories(): Promise<void> {
  logPathInfo('INIT', 'Starting directory initialization');
  
  for (const dir of [paths.dataDir, paths.threadsDir, paths.summariesDir]) {
    try {
      if (!fs.existsSync(dir)) {
        logPathInfo('CREATE', `Creating directory: ${dir}`);
        await fs.promises.mkdir(dir, { recursive: true });
        logPathInfo('SUCCESS', `Created directory: ${dir}`);
      } else {
        logPathInfo('EXISTS', `Directory already exists: ${dir}`);
      }
      
      // Verify directory is writable
      const testFile = path.join(dir, '.write-test');
      await fs.promises.writeFile(testFile, 'test');
      await fs.promises.unlink(testFile);
      logPathInfo('WRITE', `Verified write access to: ${dir}`);
    } catch (error) {
      logPathInfo('ERROR', `Failed to initialize directory: ${dir}`, { error });
      throw error;
    }
  }
  
  logPathInfo('INIT', 'Directory initialization complete');
}

/**
 * Validates write permissions for all data directories
 * Returns true if all directories are writable
 */
export async function validateDirectories(): Promise<boolean> {
  logPathInfo('VALIDATE', 'Starting directory validation');
  
  try {
    for (const dir of [paths.dataDir, paths.threadsDir, paths.summariesDir]) {
      // Check if directory exists
      if (!fs.existsSync(dir)) {
        throw new Error(`Directory does not exist: ${dir}`);
      }
      logPathInfo('CHECK', `Directory exists: ${dir}`);
      
      // Get directory stats
      const stats = await fs.promises.stat(dir);
      logPathInfo('STATS', `Directory stats for ${dir}:`, {
        mode: stats.mode,
        uid: stats.uid,
        gid: stats.gid,
        size: stats.size,
        atime: stats.atime,
        mtime: stats.mtime,
        ctime: stats.ctime
      });
      
      // Test write permission
      const testFile = path.join(dir, '.write-test');
      await fs.promises.writeFile(testFile, 'test');
      await fs.promises.unlink(testFile);
      logPathInfo('WRITE', `Verified write access to: ${dir}`);
    }
    
    logPathInfo('VALIDATE', 'Directory validation successful');
    return true;
  } catch (error) {
    logPathInfo('ERROR', 'Directory validation failed', { error });
    return false;
  }
} 