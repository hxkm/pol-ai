import fs from 'fs';
import path from 'path';
import { paths, ensureDirectories } from './utils/paths';

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
    throw error; // This will prevent app startup if we can't create directories
  }
}

// Self-executing async function to run cleanup
(async () => {
  try {
    console.log('Running startup script...');
    await cleanupDataDirectories();
    console.log('Startup script completed successfully');
  } catch (error) {
    console.error('Startup script failed:', error);
    process.exit(1); // Exit with error if cleanup fails
  }
})(); 