import { Thread } from '../../types/interfaces';
import { analyzerRegistry } from './registry';
import { paths } from '../utils/paths';
import path from 'path';
import fs from 'fs';
import { GetAnalyzer } from './get';
import { ReplyAnalyzer } from './reply';
import { LinkAnalyzer } from './link';

/**
 * Initialize the analysis system
 */
export async function initializeAnalyzers(): Promise<void> {
  console.log('Initializing analysis system...');
  
  try {
    // Ensure analysis directory exists
    const analysisDir = path.join(paths.dataDir, 'analysis');
    if (!fs.existsSync(analysisDir)) {
      console.log('Creating analysis directory...');
      await fs.promises.mkdir(analysisDir, { recursive: true });
    }

    // Register analyzers in order of execution
    analyzerRegistry.register(new GetAnalyzer());
    analyzerRegistry.register(new ReplyAnalyzer());
    analyzerRegistry.register(new LinkAnalyzer()); // Add link analyzer last

    // Initialize registry and all registered analyzers
    await analyzerRegistry.initialize();
    
    console.log('Analysis system initialized successfully');
  } catch (error) {
    console.error('Failed to initialize analysis system:', error);
    throw error;
  }
}

/**
 * Analyze a collection of threads with all registered analyzers
 */
export async function analyzeThreads(threads: Thread[]): Promise<void> {
  if (!threads || threads.length === 0) {
    throw new Error('No threads provided for analysis');
  }

  try {
    console.log(`Analyzing ${threads.length} threads...`);
    await analyzerRegistry.analyzeThreads(threads);
    console.log('Thread analysis complete');
  } catch (error) {
    console.error('Failed to analyze threads:', error);
    throw error;
  }
}

/**
 * Clean up old analysis results
 */
export async function purgeOldResults(): Promise<void> {
  try {
    console.log('Starting analysis results cleanup...');
    await analyzerRegistry.purgeOldResults();
    console.log('Analysis results cleanup complete');
  } catch (error) {
    console.error('Failed to purge old results:', error);
    throw error;
  }
}

// Re-export registry and base analyzer
export { analyzerRegistry } from './registry';
export { BaseAnalyzer } from './base'; 