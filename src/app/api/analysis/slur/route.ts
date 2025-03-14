import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { paths } from '@/app/lib/utils/paths';

export async function GET() {
  try {
    const analyzer = 'slur';
    const resultsPath = path.resolve(paths.dataDir, 'analysis', analyzer, 'results.json');
    
    if (!fs.existsSync(resultsPath)) {
      return NextResponse.json(
        { error: 'No results available' },
        { status: 404 }
      );
    }

    try {
      const data = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
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