/**
 * Centralized path management for the application
 * 
 * This utility ensures consistent path handling across all environments
 * (local development, production, Railway deployment)
 */

import path from 'path';
import fs from 'fs';

// Get the base data directory from environment variables
// Default to './data' for local development if not specified
const DATA_DIR = process.env.DATA_DIR || './data';

// Define all application paths
export const paths = {
  // Base data directory
  dataDir: DATA_DIR,
  
  // Thread data storage
  threadsDir: path.join(DATA_DIR, 'threads'),
  
  // Summary data storage
  summariesDir: path.join(DATA_DIR, 'summaries'),
  
  // Helper to get thread file path by ID
  threadFile: (threadId: string) => path.join(DATA_DIR, 'threads', `${threadId}.json`),
  
  // Helper to get summary file path by ID
  summaryFile: (threadId: string) => path.join(DATA_DIR, 'summaries', `${threadId}.json`),
};

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