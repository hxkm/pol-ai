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
const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');

// Log environment information
logPathInfo('Environment', isRailway ? 'Railway' : 'Local');
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
      path.resolve(paths.dataDir, 'analysis'),
      path.resolve(paths.dataDir, 'analysis', 'get'),
    ].forEach(dir => {
      if (!fs.existsSync(dir)) {
        console.log(`Creating directory: ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
      }
      console.log(`Verified directory exists: ${dir}`);
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