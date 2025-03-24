import { NextResponse } from 'next/server';
import fs from 'fs';
import { paths } from '@/app/lib/utils/paths';

export async function GET() {
  try {
    const analyzer = 'slur';
    const resultsPath = paths.analyzerResultsFile(analyzer);
    
    // Log the path we're trying to read from
    console.log('Looking for slur results at:', resultsPath);
    
    if (!fs.existsSync(resultsPath)) {
      console.log('Results file not found at:', resultsPath);
      return NextResponse.json(
        { error: 'No results available' },
        { status: 404 }
      );
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