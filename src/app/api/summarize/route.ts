import { NextResponse } from 'next/server';
import { loadEnvConfig } from '@next/env';
import { Summarizer } from '@/app/lib/Summarizer';
import { loadAllThreads } from '@/app/utils/fileLoader';
import { selectThreads } from '@/app/utils/threadSelector';
import path from 'path';
import fs from 'fs/promises';

// Load environment variables
loadEnvConfig(process.cwd());

export async function POST() {
  try {
    console.log('Starting summarizer process...');
    
    // Check API key
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY environment variable is not set');
    }
    console.log('API key verified');

    // Load all threads from the threads directory
    const threadsDir = path.resolve(process.cwd(), 'data', 'threads');
    console.log('Looking for threads in:', threadsDir);
    
    // Check if directory exists
    try {
      await fs.access(threadsDir);
      console.log('Threads directory exists');
    } catch (e) {
      console.error('Threads directory not found:', e);
      throw new Error(`Threads directory not found at ${threadsDir}`);
    }

    const allThreads = await loadAllThreads(threadsDir);
    console.log(`Loaded ${allThreads.length} threads`);
    
    if (allThreads.length === 0) {
      throw new Error('No threads found to analyze');
    }

    // Select threads based on criteria
    console.log('Selecting threads for analysis...');
    const selection = selectThreads(allThreads);
    const threadsToAnalyze = [
      ...selection.topByPosts,
      ...selection.mediumHighPosts,
      ...selection.mediumPosts,
      ...selection.lowPosts
    ];

    if (threadsToAnalyze.length !== 12) {
      throw new Error(`Expected 12 threads for analysis, but got ${threadsToAnalyze.length}`);
    }
    console.log(`Selected ${threadsToAnalyze.length} threads for analysis`);

    // Initialize and run summarizer
    console.log('Initializing summarizer...');
    const summarizer = new Summarizer(apiKey);
    console.log('Starting analysis...');
    const { articles, matrix, bigPicture } = await summarizer.analyze(threadsToAnalyze);
    console.log('Analysis complete');

    // Save results
    const outputPath = path.resolve(
      process.cwd(),
      'data',
      'analysis',
      'latest-summary.json'
    );
    
    // Ensure the directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    
    // Write the results to file
    await fs.writeFile(
      outputPath,
      JSON.stringify({ articles, matrix, bigPicture }, null, 2),
      'utf-8'
    );
    console.log('Results saved to:', outputPath);

    return NextResponse.json({ 
      message: 'Summarizer completed successfully',
      threadsAnalyzed: articles.batchStats.totalThreads,
      averageAntisemiticPercentage: articles.batchStats.averageAntisemiticPercentage,
      matrixStats: {
        meanPercentage: matrix.statistics.mean,
        medianPercentage: matrix.statistics.median,
        totalAnalyzed: matrix.statistics.totalAnalyzed,
        themeCount: matrix.themes.length
      },
      bigPictureStats: {
        themeCount: bigPicture.themes.length,
        sentimentCount: bigPicture.sentiments.length,
        overviewLength: bigPicture.overview.article.length
      }
    });
  } catch (error) {
    console.error('Failed to run summarizer:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run summarizer' },
      { status: 500 }
    );
  }
} 