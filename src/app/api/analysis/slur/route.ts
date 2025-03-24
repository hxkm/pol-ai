import { NextResponse } from 'next/server';
import fs from 'fs';
import { paths } from '@/app/lib/utils/paths';
import { SlurAnalyzer } from '@/app/lib/analyzers/slur';
import { loadAllThreads } from '@/app/utils/fileLoader';

export async function GET() {
  try {
    const analyzer = 'slur';
    const resultsPath = paths.analyzerResultsFile(analyzer);
    
    // Log the path we're trying to read from
    console.log('Looking for slur results at:', resultsPath);
    
    if (!fs.existsSync(resultsPath)) {
      console.log('Results file not found at:', resultsPath);
      
      // Try to generate results
      try {
        console.log('Attempting to generate slur analysis results...');
        
        // Load threads
        const threads = await loadAllThreads(paths.threadsDir);
        if (threads.length === 0) {
          return NextResponse.json(
            { error: 'No threads available for analysis' },
            { status: 404 }
          );
        }
        
        // Run analyzer
        const slurAnalyzer = new SlurAnalyzer();
        const results = await slurAnalyzer.analyze(threads);
        await slurAnalyzer.saveResults(results);
        
        // Return the newly generated results
        return NextResponse.json({
          name: analyzer,
          results,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Failed to generate slur analysis:', error);
        return NextResponse.json(
          { error: 'No results available and failed to generate new ones' },
          { status: 404 }
        );
      }
    }

    try {
      const data = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
      console.log('Successfully loaded slur analysis data');
      return NextResponse.json({
        name: analyzer,
        ...data,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error(`Error reading results:`, error);
      return NextResponse.json(
        { error: 'Invalid data format' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in slur analyzer API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 