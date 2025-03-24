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
  rarestCountries: CountryData[];
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
    const data: { results: GeoResultData[] } = JSON.parse(jsonData);

    // Ensure we have valid data
    if (!data?.results?.[0]) {
      console.error('Invalid data format in geo results');
      return NextResponse.json([], { status: 500 });
    }

    // Get the most recent result
    const latestResult: GeoResultData = data.results[0];
    
    // Debug log the data we're working with
    console.log('Total unique countries:', latestResult.totalUniqueCountries);
    console.log('Most common countries length:', latestResult.mostCommonCountries.length);
    console.log('Most unique countries length:', latestResult.rarestCountries.length);
    console.log('Posts with location:', latestResult.metadata.postsWithLocation);
    console.log('Total posts analyzed:', latestResult.metadata.totalPostsAnalyzed);

    // Return the rarest countries directly
    const rareCountries = latestResult.rarestCountries.map((country): ProcessedCountry => ({
      country: country.code,
      count: country.postCount,
      name: country.name
    }));

    console.log('Rarest countries:', rareCountries);
    return NextResponse.json(rareCountries);
  } catch (error) {
    console.error('Error reading geo data:', error);
    return NextResponse.json([], { status: 500 });
  }
} 