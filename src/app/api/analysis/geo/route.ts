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
    
    // Create a map to store all countries and their counts
    const countryMap = new Map<string, ProcessedCountry>();

    // Function to add countries to the map
    const addCountriesToMap = (countries: CountryData[]) => {
      countries.forEach((country) => {
        // Only update if count is lower or country doesn't exist
        if (!countryMap.has(country.code) || 
            countryMap.get(country.code)!.count > country.postCount) {
          countryMap.set(country.code, {
            country: country.code,
            count: country.postCount,
            name: country.name
          });
        }
      });
    };

    // Add countries from both arrays
    addCountriesToMap(latestResult.mostCommonCountries);
    addCountriesToMap(latestResult.mostUniqueCountries);

    // Convert map to array and sort by count ascending
    const allCountries = Array.from(countryMap.values());
    console.log(`Total countries found: ${allCountries.length} out of ${latestResult.totalUniqueCountries} total`);
    
    // Sort by count ascending to get the rarest
    const rareCountries = allCountries
      .sort((a: ProcessedCountry, b: ProcessedCountry) => a.count - b.count)
      .slice(0, 4);

    console.log('Rarest countries:', rareCountries);
    return NextResponse.json(rareCountries);
  } catch (error) {
    console.error('Error reading geo data:', error);
    return NextResponse.json([], { status: 500 });
  }
} 