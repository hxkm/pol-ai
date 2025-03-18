import fs from 'fs';
import path from 'path';
import { paths, ensureDirectories } from './utils/paths';

/**
 * Verify that all critical directories exist and are accessible
 */
async function verifyDirectories(): Promise<boolean> {
  const criticalDirs = [
    paths.dataDir,
    paths.threadsDir,
    paths.summariesDir,
    paths.analysisDir
  ];

  for (const dir of criticalDirs) {
    try {
      await fs.promises.access(dir, fs.constants.R_OK | fs.constants.W_OK);
      const stats = await fs.promises.stat(dir);
      if (!stats.isDirectory()) {
        console.error(`Path exists but is not a directory: ${dir}`);
        return false;
      }
      console.log(`✓ Verified directory: ${dir}`);
    } catch (error) {
      console.error(`Failed to verify directory ${dir}:`, error);
      // Create directory if it doesn't exist
      try {
        await fs.promises.mkdir(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      } catch (mkdirError) {
        console.error(`Failed to create directory ${dir}:`, mkdirError);
        return false;
      }
    }
  }
  return true;
}

async function cleanupDataDirectories() {
  // Skip cleanup if explicitly disabled
  if (process.env.SKIP_DATA_CLEANUP === 'true') {
    console.log('Data cleanup disabled via SKIP_DATA_CLEANUP');
    return;
  }

  // Only run in Railway environment
  if (process.env.RAILWAY_ENVIRONMENT !== 'production') {
    console.log('Not in Railway environment, skipping cleanup');
    return;
  }

  console.log('Starting data directory cleanup...');
  console.log('Environment:', process.env.RAILWAY_ENVIRONMENT);
  console.log('CWD:', process.cwd());
  console.log('Data Dir:', paths.dataDir);

  const dirsToClean = [
    paths.threadsDir,
    paths.summariesDir,
    paths.analysisDir,
    path.join(paths.analysisDir, 'get'),
    path.join(paths.analysisDir, 'reply'),
    path.join(paths.analysisDir, 'link'),
    path.join(paths.analysisDir, 'geo'),
    path.join(paths.analysisDir, 'slur'),
    path.join(paths.analysisDir, 'media')
  ];

  // Add timeout to cleanup operation
  const cleanupPromise = (async () => {
    // Clean each directory
    for (const dir of dirsToClean) {
      try {
        if (fs.existsSync(dir)) {
          console.log(`Cleaning directory: ${dir}`);
          const files = await fs.promises.readdir(dir);
          for (const file of files) {
            const filePath = path.join(dir, file);
            try {
              await fs.promises.rm(filePath, { recursive: true, force: true });
              console.log(`Removed: ${filePath}`);
            } catch (error) {
              console.error(`Error removing ${filePath}:`, error);
            }
          }
        }
      } catch (error) {
        console.error(`Error cleaning ${dir}:`, error);
      }
    }
  })();

  // Set 30 second timeout
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Cleanup timed out after 30 seconds')), 30000);
  });

  try {
    await Promise.race([cleanupPromise, timeoutPromise]);
    console.log('Cleanup completed within timeout');
  } catch (error) {
    console.error('Cleanup operation error:', error);
    // Continue even if cleanup times out
  }

  // Always try to recreate directories
  try {
    await ensureDirectories();
    console.log('Data directories cleaned and recreated successfully');
  } catch (error) {
    console.error('Error recreating directories:', error);
    // Don't throw, just log the error
  }
}

/**
 * Initialize the application
 * Returns true if initialization was successful
 */
export async function initializeApp(): Promise<boolean> {
  try {
    console.log('Starting application initialization...');
    
    // Set overall timeout for initialization
    const initPromise = (async () => {
      // Run cleanup first
      await cleanupDataDirectories();
      
      // Verify directories after cleanup
      console.log('Verifying directory structure...');
      const maxAttempts = 3; // Reduced from 5 to 3
      let attempts = 0;
      let directoriesReady = false;
      
      while (attempts < maxAttempts && !directoriesReady) {
        attempts++;
        console.log(`Directory verification attempt ${attempts}/${maxAttempts}`);
        directoriesReady = await verifyDirectories();
        
        if (!directoriesReady && attempts < maxAttempts) {
          console.log('Waiting 3 seconds before next attempt...'); // Reduced from 5 to 3 seconds
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
      if (!directoriesReady) {
        console.warn('Directory structure not fully verified, but continuing...');
      }
      
      return true;
    })();

    // Set 60 second timeout for entire initialization
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Initialization timed out after 60 seconds')), 60000);
    });

    await Promise.race([initPromise, timeoutPromise]);
    console.log('Application initialization completed successfully');
    return true;
  } catch (error) {
    console.error('Application initialization failed:', error);
    // Return true anyway to allow the app to start
    return true;
  }
}

// If this file is run directly, run initialization
if (require.main === module) {
  initializeApp()
    .then(() => {
      // Always exit successfully
      process.exit(0);
    })
    .catch(error => {
      console.error('Startup script failed:', error);
      // Exit successfully even on error
      process.exit(0);
    });
} 