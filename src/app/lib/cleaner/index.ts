/**
 * Data Cleaner
 * 
 * This module handles cleaning up old thread and summary data
 * to prevent excessive storage usage.
 */

import fs from 'fs';
import path from 'path';
import { ensureDirectories, paths } from '../utils/paths';
import { Thread } from '../../types/interfaces';

// Maximum age of threads to keep (in hours)
const MAX_THREAD_AGE_HOURS = 24;

/**
 * Parse 4chan date format to timestamp
 * Format: "MM/DD/YY(Day)HH:MM:SS"
 */
function parseThreadDate(dateStr: string): number {
  try {
    // Extract date parts from format "03/15/25(Sat)10:49:41"
    const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{2})\([^)]+\)(\d{2}):(\d{2}):(\d{2})/);
    if (!match) return Date.now(); // Return current time if format doesn't match

    const [, month, day, year, hours, minutes, seconds] = match;
    // Convert to full year (assuming 20xx)
    const fullYear = 2000 + parseInt(year);
    
    return new Date(
      fullYear,
      parseInt(month) - 1, // JS months are 0-based
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    ).getTime();
  } catch (error) {
    console.error(`Error parsing thread date ${dateStr}:`, error);
    return Date.now(); // Return current time on error
  }
}

/**
 * Get thread age in hours
 */
function getThreadAgeHours(thread: Thread): number {
  if (!thread.now) return 0;
  
  const threadTime = parseThreadDate(thread.now);
  const ageMs = Date.now() - threadTime;
  return ageMs / (1000 * 60 * 60);
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
    
    // Check each thread's age
    for (const file of threadFiles) {
      const filePath = path.join(paths.threadsDir, file);
      
      try {
        // Read and parse the thread file
        const threadData = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Thread;
        const ageHours = getThreadAgeHours(threadData);
        
        // If the thread is older than our threshold, remove it
        if (ageHours > MAX_THREAD_AGE_HOURS) {
          console.log(`Removing old thread file: ${file} (${ageHours.toFixed(1)} hours old)`);
          fs.unlinkSync(filePath);
          removedCount++;
        }
      } catch (error) {
        console.error(`Error processing thread file ${file}:`, error);
        // If we can't read/parse the file, remove it
        try {
          fs.unlinkSync(filePath);
          removedCount++;
          console.log(`Removed invalid thread file: ${file}`);
        } catch {
          console.error(`Failed to remove invalid thread file: ${file}`);
        }
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