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

// Get the data directory from environment variable or default
const DATA_DIR = process.env.DATA_DIR || 
  (isRailway ? '/data' : path.resolve(process.cwd(), 'data'));

// Log environment information
logPathInfo('Environment', isRailway ? 'Railway' : 'Local');
logPathInfo('Project Root', process.cwd());
logPathInfo('Process CWD', process.cwd());
logPathInfo('__dirname', __dirname);
logPathInfo('Data Directory', DATA_DIR);

// Define all application paths
export const paths = {
  // Base data directory
  dataDir: DATA_DIR,
  
  // Thread data storage
  threadsDir: path.resolve(DATA_DIR, 'threads'),
  
  // Summary data storage
  summariesDir: path.resolve(DATA_DIR, 'summaries'),
  
  // Analysis data storage
  analysisDir: path.resolve(DATA_DIR, 'analysis'),
  
  // Helper to get thread file path by ID
  threadFile: (threadId: string) => path.resolve(DATA_DIR, 'threads', `${threadId}.json`),
  
  // Helper to get summary file path by ID
  summaryFile: (threadId: string) => path.resolve(DATA_DIR, 'summaries', `${threadId}.json`),
};

/**
 * Ensures all required directories exist
 * This should be called during application startup
 */
export function ensureDirectories(): void {
  try {
    // Create base directories
    [
      paths.dataDir,
      paths.threadsDir,
      paths.summariesDir,
      paths.analysisDir,
      path.resolve(paths.analysisDir, 'get'),
      path.resolve(paths.analysisDir, 'reply'),
      path.resolve(paths.analysisDir, 'link'),
      path.resolve(paths.analysisDir, 'geo'),
      path.resolve(paths.analysisDir, 'slur'),
      path.resolve(paths.analysisDir, 'media'),
    ].forEach(dir => {
      if (!fs.existsSync(dir)) {
        console.log(`Creating directory: ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
        // Set permissions to 777 in Railway
        if (isRailway) {
          fs.chmodSync(dir, '777');
        }
      }
      console.log(`Verified directory exists: ${dir}`);
      
      // Log directory permissions
      const stats = fs.statSync(dir);
      console.log(`Directory permissions for ${dir}: ${stats.mode.toString(8)}`);
    });
  } catch (error) {
    console.error('Error ensuring directories exist:', error);
    // Don't throw - let the application continue and handle errors at higher levels
  }
}

/**
 * Validates write permissions for all data directories
 * Returns true if all directories are writable
 */
export function validateDirectories(): boolean {
  try {
    // Check if directories exist and are writable
    [paths.dataDir, paths.threadsDir, paths.summariesDir, paths.analysisDir].forEach(dir => {
      // Ensure directory exists
      if (!fs.existsSync(dir)) {
        throw new Error(`Directory does not exist: ${dir}`);
      }
      
      // Test write permission by creating and removing a temp file
      const testFile = path.join(dir, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      
      // Log success
      console.log(`Validated write permissions for: ${dir}`);
    });
    
    return true;
  } catch (error) {
    console.error('Directory validation failed:', error);
    return false;
  }
} 