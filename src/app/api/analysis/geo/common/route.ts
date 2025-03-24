import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface CountryData {
  code: string;
  name: string;
  postCount: number;
  uniquePosters: number;
  lastSeen: number;
}

interface ProcessedCountry {
  country: string;
  count: number;
  name: string;
}

interface GeoResultData {
  timestamp: number;
  threadId: number;
  postId: number;
  totalUniqueCountries: number;
  mostCommonCountries: CountryData[];
  mostUniqueCountries: CountryData[];
  metadata: {
    totalPostsAnalyzed: number;
    postsWithLocation: number;
  };
}

export async function GET() {
  try {
    // Get the data directory path
    const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
    const filePath = path.resolve(dataDir, 'analysis', 'geo', 'results.json');

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      console.error('Geo results file not found:', filePath);
      return NextResponse.json([], { status: 404 });
    }

    // Read and parse the file
    const jsonData = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(jsonData);

    // Ensure we have valid data
    if (!data?.results?.[0]) {
      console.error('Invalid data format in geo results');
      return NextResponse.json([], { status: 500 });
    }

    // Get the most recent result
    const latestResult = data.results[0];
    
    // Get the 4 most common countries
    const commonCountries = latestResult.mostCommonCountries
      .slice(0, 4)
      .map((country: CountryData): ProcessedCountry => ({
        country: country.code,
        count: country.postCount,
        name: country.name
      }));

    console.log('Most common countries:', commonCountries);
    return NextResponse.json(commonCountries);
  } catch (error) {
    console.error('Error reading geo data:', error);
    return NextResponse.json([], { status: 500 });
  }
} 