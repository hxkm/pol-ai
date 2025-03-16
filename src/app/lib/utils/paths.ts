/**
 * Centralized path management for the application
 * 
 * This utility ensures consistent path handling across all environments
 * (local development, production, Railway deployment)
 */

import path from 'path';
import fs from 'fs';

// Debug logging function
function logPathInfo(label: string, value: string) {
  console.log(`[PATHS] ${label}: ${value}`);
}

// Detect if we're running on Railway
const isRailway = process.env.RAILWAY_ENVIRONMENT === 'production';

// Get the project root directory
const PROJECT_ROOT = isRailway ? '/app' : process.cwd();

// Log environment information
logPathInfo('Environment', isRailway ? 'Railway' : 'Local');
logPathInfo('Project Root', PROJECT_ROOT);
logPathInfo('Process CWD', process.cwd());
logPathInfo('__dirname', __dirname);

// Always use data directory relative to project root
const DATA_DIR = path.resolve(PROJECT_ROOT, 'data');
logPathInfo('Data Directory', DATA_DIR);

// Define all application paths
export const paths = {
  // Base data directory
  dataDir: DATA_DIR,
  
  // Thread data storage
  threadsDir: path.resolve(DATA_DIR, 'threads'),
  
  // Summary data storage
  summariesDir: path.resolve(DATA_DIR, 'summaries'),
  
  // Helper to get thread file path by ID
  threadFile: (threadId: string) => path.resolve(DATA_DIR, 'threads', `${threadId}.json`),
  
  // Helper to get summary file path by ID
  summaryFile: (threadId: string) => path.resolve(DATA_DIR, 'summaries', `${threadId}.json`),
};

console.log('DEBUG - Threads Dir:', paths.threadsDir);

/**
 * Ensures all required directories exist
 * This should be called during application startup
 */
export function ensureDirectories(): void {
  // Create directories if they don't exist
  [paths.dataDir, paths.threadsDir, paths.summariesDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      console.log(`Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Validates write permissions for all data directories
 * Returns true if all directories are writable
 */
export function validateDirectories(): boolean {
  try {
    // Check if directories exist and are writable
    [paths.dataDir, paths.threadsDir, paths.summariesDir].forEach(dir => {
      // Ensure directory exists
      if (!fs.existsSync(dir)) {
        throw new Error(`Directory does not exist: ${dir}`);
      }
      
      // Test write permission by creating and removing a temp file
      const testFile = path.join(dir, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
    });
    
    return true;
  } catch (error) {
    console.error('Directory validation failed:', error);
    return false;
  }
} 