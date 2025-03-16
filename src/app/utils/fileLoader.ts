import fs from 'fs/promises';
import path from 'path';
import { Thread } from '../types/interfaces';

export async function loadThreadFile(filePath: string): Promise<Thread | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const thread = JSON.parse(content) as Thread;
    console.log(`✓ Loaded thread ${thread.no} with ${thread.posts?.length || 0} posts`);
    return thread;
  } catch (error) {
    console.error(`✗ Error loading thread from ${filePath}:`, error);
    return null;
  }
}

export async function loadAllThreads(dirPath: string): Promise<Thread[]> {
  try {
    console.log('\n📂 Loading threads from directory...');
    const files = await fs.readdir(dirPath);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    console.log(`Found ${jsonFiles.length} JSON files`);
    
    const threadPromises = jsonFiles.map(file => 
      loadThreadFile(path.join(dirPath, file))
    );
    
    const threads = await Promise.all(threadPromises);
    const validThreads = threads.filter((t): t is Thread => t !== null);
    
    console.log(`\n📊 Thread Loading Summary:`);
    console.log(`- Total files processed: ${jsonFiles.length}`);
    console.log(`- Successfully loaded: ${validThreads.length}`);
    console.log(`- Failed to load: ${jsonFiles.length - validThreads.length}`);
    
    return validThreads;
  } catch (error) {
    console.error('❌ Error loading threads:', error);
    return [];
  }
} 