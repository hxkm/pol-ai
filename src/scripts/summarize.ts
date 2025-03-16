import path from 'path';
import fs from 'fs/promises';
import { loadEnvConfig } from '@next/env';
import { Thread } from '../app/types/interfaces';
import { Summarizer } from '../app/lib/Summarizer';
import { selectThreads } from '../app/utils/threadSelector';

// Load environment variables
loadEnvConfig(process.cwd());

async function loadThreadFile(filePath: string): Promise<Thread | null> {
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

async function loadAllThreads(dirPath: string): Promise<Thread[]> {
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

async function saveResults(results: unknown, outputPath: string): Promise<void> {
  try {
    // Ensure the directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    
    // Write the new results
    await fs.writeFile(
      outputPath,
      JSON.stringify(results, null, 2),
      'utf-8'
    );
    console.log(`\n💾 Results saved successfully to:`);
    console.log(outputPath);
  } catch (error) {
    console.error('❌ Error saving results:', error);
  }
}

async function main() {
  console.log('\n🚀 Starting Summarizer...\n');
  
  try {
    // Check API key
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY environment variable is not set');
    }
    console.log('✓ DeepSeek API key found');

    // Load all threads from the threads directory
    const threadsDir = path.resolve(process.cwd(), 'data', 'threads');
    const allThreads = await loadAllThreads(threadsDir);
    
    if (allThreads.length === 0) {
      throw new Error('No threads found to analyze');
    }

    // Select threads based on criteria
    const selection = selectThreads(allThreads);
    const threadsToAnalyze = [
      ...selection.topByPosts,
      ...selection.mediumHighPosts,
      ...selection.mediumPosts,
      ...selection.lowPosts
    ];

    console.log('\n📋 Final Thread Selection Summary:');
    console.log(`- Top by posts (>300): ${selection.topByPosts.length}`);
    console.log(`- High range (200-300): ${selection.mediumHighPosts.length}`);
    console.log(`- Medium range (100-200): ${selection.mediumPosts.length}`);
    console.log(`- Low range (50-150): ${selection.lowPosts.length}`);
    console.log(`Total threads selected: ${threadsToAnalyze.length}`);

    if (threadsToAnalyze.length !== 12) {
      throw new Error(`Expected 12 threads for analysis, but got ${threadsToAnalyze.length}`);
    }

    // Initialize and run summarizer
    console.log('\n🔄 Initializing summarizer...');
    const summarizer = new Summarizer(apiKey);
    
    console.log('🏃 Starting analysis...\n');
    console.log('This may take a while. Processing threads:');
    
    const results = await summarizer.analyze(threadsToAnalyze);
    console.log(`\n✓ Completed analysis of all ${threadsToAnalyze.length} threads`);

    // Log detailed results
    console.log('\n📊 Analysis Summary:');
    console.log('Article Analysis:');
    console.log(`- Analyzed ${results.articles.batchStats.totalAnalyzedPosts} posts`);
    console.log(`- Across ${results.articles.batchStats.totalThreads} threads`);
    console.log(`- Average antisemitic content: ${results.articles.batchStats.averageAntisemiticPercentage.toFixed(2)}%`);
    
    console.log('\nAntisemitism Matrix:');
    console.log(`- Identified ${results.matrix.themes.length} antisemitic themes`);
    console.log(`- Mean percentage: ${results.matrix.statistics.mean.toFixed(2)}%`);
    console.log(`- Median percentage: ${results.matrix.statistics.median.toFixed(2)}%`);
    
    console.log('\nBig Picture Analysis:');
    console.log(`- Generated ${results.bigPicture.overview.article.length} character overview`);
    console.log(`- Identified ${results.bigPicture.themes.length} general themes`);
    console.log(`- Analyzed ${results.bigPicture.sentiments.length} major sentiments`);

    // Save results with consistent filename
    const outputPath = path.resolve(
      process.cwd(),
      'data',
      'analysis',
      'latest-summary.json'
    );

    await saveResults(results, outputPath);

    console.log('\n✨ Analysis complete!\n');

  } catch (error) {
    console.error('\n❌ Error running summarizer:', error);
    process.exit(1);
  }
}

// Run the program
main(); 