import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { paths } from '@/app/lib/utils/paths';

export async function GET() {
  try {
    // Ensure the analysis directory exists
    const analysisDir = path.resolve(paths.dataDir, 'analysis');
    if (!fs.existsSync(analysisDir)) {
      return NextResponse.json({
        analyzers: [],
        message: 'No analysis data available'
      });
    }

    // Get all analyzer directories
    const analyzerDirs = fs.readdirSync(analysisDir);
    
    // Get status for each analyzer
    const analyzerStatus = analyzerDirs.map(name => {
      const resultsPath = path.resolve(analysisDir, name, 'results.json');
      
      if (!fs.existsSync(resultsPath)) {
        return {
          name,
          available: false,
          lastUpdated: null
        };
      }

      try {
        const data = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
        return {
          name,
          available: true,
          lastUpdated: data.lastUpdated,
          resultCount: data.results?.length || 0
        };
      } catch (error) {
        console.error(`Error reading results for ${name}:`, error);
        return {
          name,
          available: false,
          lastUpdated: null,
          error: 'Invalid data format'
        };
      }
    });

    return NextResponse.json({
      analyzers: analyzerStatus,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error in analysis API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 