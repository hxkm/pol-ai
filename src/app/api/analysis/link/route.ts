import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { paths, ensureDirectories } from '@/app/utils/paths';
import path from 'path';

interface LinkDomain {
  domain: string;
  count: number;
  lastSeen: number;
}

interface ResultItem {
  timestamp: number;
  threadId: number;
  postId: number;
  topDomains: LinkDomain[];
}

interface LinkData {
  lastUpdated: number;
  results: ResultItem[];
}

export async function GET() {
  try {
    // Ensure directories exist first
    ensureDirectories();
    
    // Use consistent path resolution
    const filePath = path.resolve(paths.dataDir, 'analysis', 'link', 'results.json');
    console.log('Reading link domains from:', filePath);
    console.log('Environment:', process.env.RAILWAY_ENVIRONMENT || 'local');
    console.log('Data directory:', paths.dataDir);
    console.log('File exists:', await fs.stat(filePath).then(() => true).catch(() => false));
    
    const fileContents = await fs.readFile(filePath, 'utf8');
    console.log('File contents length:', fileContents.length);
    
    const data: LinkData = JSON.parse(fileContents);
    console.log('Parsed data structure:', {
      hasResults: Boolean(data?.results),
      resultsLength: data?.results?.length || 0
    });
    
    // Get the most recent result (last item in the results array)
    if (!data?.results?.length) {
      console.error('No results found in data:', data);
      throw new Error('No results found in data');
    }

    const latestResult = data.results[data.results.length - 1];
    console.log('Latest result timestamp:', new Date(latestResult.timestamp).toISOString());
    
    if (!Array.isArray(latestResult.topDomains)) {
      console.error('Invalid topDomains structure:', latestResult);
      throw new Error('Invalid topDomains structure');
    }

    // Map to simpler structure
    const domains = latestResult.topDomains.map(({ domain, count }) => ({
      domain,
      count
    }));
    
    console.log('Returning domains:', domains.length);
    return NextResponse.json(domains);
  } catch (error) {
    console.error('Error reading link domains data:', error);
    return NextResponse.json(
      { error: 'Failed to read link domains data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 