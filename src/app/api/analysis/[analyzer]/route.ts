import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { paths } from '@/app/lib/utils/paths';

export async function GET(
  request: NextRequest,
  { params }: { params: { analyzer: string } }
) {
  try {
    const { analyzer } = params;
    
    // Validate analyzer name (prevent directory traversal)
    if (!/^[a-z]+$/.test(analyzer)) {
      return NextResponse.json(
        { error: 'Invalid analyzer name' },
        { status: 400 }
      );
    }

    // Get the results file path
    const resultsPath = path.join(paths.dataDir, 'analysis', analyzer, 'results.json');
    
    // Check if results exist
    if (!fs.existsSync(resultsPath)) {
      return NextResponse.json(
        { error: 'No results available for this analyzer' },
        { status: 404 }
      );
    }

    try {
      // Read and parse the results
      const data = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
      
      return NextResponse.json({
        name: analyzer,
        ...data,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error(`Error reading results for ${analyzer}:`, error);
      return NextResponse.json(
        { error: 'Invalid data format' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in analyzer API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 