/**
 * Data Cleaner
 * 
 * This module handles cleaning up old thread and summary data
 * to prevent excessive storage usage.
 */

import fs from 'fs';
import path from 'path';
import { ensureDirectories, paths } from '../utils/paths';

// Maximum age of threads to keep (in days)
const MAX_THREAD_AGE_DAYS = 1;

/**
 * Get the age of a file in days
 */
function getFileAgeDays(filePath: string): number {
  try {
    const stats = fs.statSync(filePath);
    const ageMs = Date.now() - stats.mtime.getTime();
    return ageMs / (1000 * 60 * 60 * 24);
  } catch (error) {
    console.error(`Error getting age of file ${filePath}:`, error);
    return 0;
  }
}

/**
 * Clean up old thread files
 */
function cleanThreads(): void {
  console.log('Cleaning up old thread files...');
  
  try {
    // Get all thread files
    const threadFiles = fs.readdirSync(paths.threadsDir)
      .filter(file => file.endsWith('.json'));
    
    let removedCount = 0;
    
    // Check each file's age
    for (const file of threadFiles) {
      const filePath = path.join(paths.threadsDir, file);
      const ageDays = getFileAgeDays(filePath);
      
      // If the file is older than our threshold, remove it
      if (ageDays > MAX_THREAD_AGE_DAYS) {
        console.log(`Removing old thread file: ${file} (${ageDays.toFixed(1)} days old)`);
        fs.unlinkSync(filePath);
        removedCount++;
      }
    }
    
    console.log(`Removed ${removedCount} old thread files`);
  } catch (error) {
    console.error('Error cleaning thread files:', error);
  }
}

/**
 * Clean up summary files that no longer have corresponding thread files
 */
function cleanOrphanedSummaries(): void {
  console.log('Cleaning up orphaned summary files...');
  
  try {
    // Get all summary files
    const summaryFiles = fs.readdirSync(paths.summariesDir)
      .filter(file => file.endsWith('.json'));
    
    let removedCount = 0;
    
    // Check if each summary has a corresponding thread file
    for (const file of summaryFiles) {
      const threadId = path.basename(file, '.json');
      const threadPath = path.join(paths.threadsDir, `${threadId}.json`);
      
      // If the thread file doesn't exist, remove the summary
      if (!fs.existsSync(threadPath)) {
        const summaryPath = path.join(paths.summariesDir, file);
        console.log(`Removing orphaned summary file: ${file}`);
        fs.unlinkSync(summaryPath);
        removedCount++;
      }
    }
    
    console.log(`Removed ${removedCount} orphaned summary files`);
  } catch (error) {
    console.error('Error cleaning orphaned summaries:', error);
  }
}

/**
 * Main cleaner function
 */
function clean(): void {
  console.log('Starting data cleaner...');
  
  // Ensure our data directories exist
  ensureDirectories();
  
  // Clean up old thread files
  cleanThreads();
  
  // Clean up orphaned summary files
  cleanOrphanedSummaries();
  
  console.log('Cleaning complete!');
}

// If this file is run directly (not imported)
if (require.main === module) {
  try {
    clean();
    console.log('Cleaner finished successfully');
  } catch (error) {
    console.error('Cleaner failed:', error);
    process.exit(1);
  }
}

// Export for use in other modules
export { clean }; 