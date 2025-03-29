import fs from 'fs';
import path from 'path';
import { paths } from '../app/utils/paths';

async function cleanDataDirectory() {
  console.log('🧹 Cleaning data directory...');
  
  try {
    if (fs.existsSync(paths.dataDir)) {
      fs.rmSync(paths.dataDir, { recursive: true, force: true });
      console.log('✨ Data directory wiped clean');
    } else {
      console.log('📂 Data directory does not exist');
    }
  } catch (error) {
    console.error('❌ Error cleaning data directory:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  cleanDataDirectory();
} 