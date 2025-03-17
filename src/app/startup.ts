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
      return false;
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

  // Recreate directories
  try {
    await ensureDirectories();
    console.log('Data directories cleaned and recreated successfully');
  } catch (error) {
    console.error('Error recreating directories:', error);
    throw error;
  }
}

/**
 * Initialize the application
 * Returns true if initialization was successful
 */
export async function initializeApp(): Promise<boolean> {
  try {
    console.log('Starting application initialization...');
    
    // Run cleanup first
    await cleanupDataDirectories();
    
    // Verify directories after cleanup
    console.log('Verifying directory structure...');
    const maxAttempts = 5;
    let attempts = 0;
    let directoriesReady = false;
    
    while (attempts < maxAttempts && !directoriesReady) {
      attempts++;
      console.log(`Directory verification attempt ${attempts}/${maxAttempts}`);
      directoriesReady = await verifyDirectories();
      
      if (!directoriesReady && attempts < maxAttempts) {
        console.log('Waiting 5 seconds before next attempt...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    if (!directoriesReady) {
      throw new Error('Failed to verify directory structure after multiple attempts');
    }
    
    console.log('Application initialization completed successfully');
    return true;
  } catch (error) {
    console.error('Application initialization failed:', error);
    return false;
  }
}

// If this file is run directly, run initialization
if (require.main === module) {
  initializeApp()
    .then(success => {
      if (!success) {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Startup script failed:', error);
      process.exit(1);
    });
} 