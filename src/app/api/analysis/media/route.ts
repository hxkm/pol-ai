import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { paths } from '../../../lib/utils/paths';

export async function GET() {
  try {
    // Read the latest media analysis results
    const resultsPath = path.resolve(paths.dataDir, 'analysis/media/results.json');
    
    if (!fs.existsSync(resultsPath)) {
      return NextResponse.json(
        { error: 'No media analysis results found' },
        { status: 404 }
      );
    }

    const rawData = await fs.promises.readFile(resultsPath, 'utf-8');
    const data = JSON.parse(rawData);

    if (!Array.isArray(data) || !data.length) {
      return NextResponse.json(
        { error: 'Invalid media analysis data format' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      name: 'media',
      data: data[0], // Return most recent result
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error reading media analysis results:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 