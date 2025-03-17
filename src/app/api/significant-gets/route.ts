import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { paths, ensureDirectories } from '@/app/utils/paths';

interface Get {
  postNumber: string;
  comment: string;
  checkCount: number;
}

interface GetAnalyzerResult {
  timestamp: number;
  threadId: number;
  postId: number;
  metadata: {
    postNo: number;
    checkCount: number;
    comment: string;
  };
}

const DEFAULT_DATA = {
  lastUpdated: Date.now(),
  results: []
};

function countRepeatingTrailingDigits(postNumber: string): number {
  const digits = postNumber.split('');
  let maxCount = 1;
  let currentCount = 1;
  const currentDigit = digits[digits.length - 1];

  // Count from right to left
  for (let i = digits.length - 2; i >= 0; i--) {
    if (digits[i] === currentDigit) {
      currentCount++;
      maxCount = Math.max(maxCount, currentCount);
    } else {
      break; // Stop when we hit a different digit
    }
  }
  return maxCount;
}

function isGet(postNumber: string): boolean {
  return countRepeatingTrailingDigits(postNumber) >= 2;
}

export async function GET() {
  console.log('=== Significant GETs API Debug Info ===');
  console.log('Environment:', process.env.RAILWAY_ENVIRONMENT || 'local');
  console.log('CWD:', process.cwd());
  console.log('Data Dir:', paths.dataDir);
  
  try {
    // Ensure all directories exist first
    console.log('Ensuring directories exist...');
    ensureDirectories();
    console.log('Directories ensured');
    
    const analysisPath = path.resolve(paths.dataDir, 'analysis', 'get', 'results.json');
    console.log('Analysis path:', analysisPath);
    
    // Log directory structure
    console.log('Directory exists check:');
    console.log('- Data dir exists:', fs.existsSync(paths.dataDir));
    console.log('- Analysis dir exists:', fs.existsSync(path.dirname(analysisPath)));
    console.log('- Analysis file exists:', fs.existsSync(analysisPath));

    // Check if file exists
    if (!fs.existsSync(analysisPath)) {
      console.log('Analysis file does not exist, creating with default data');
      // Log directory creation attempt
      try {
        const dir = path.dirname(analysisPath);
        if (!fs.existsSync(dir)) {
          console.log('Creating directory:', dir);
          fs.mkdirSync(dir, { recursive: true });
          if (process.env.RAILWAY_ENVIRONMENT === 'production') {
            console.log('Setting directory permissions to 777');
            fs.chmodSync(dir, '777');
          }
        }
        fs.writeFileSync(analysisPath, JSON.stringify(DEFAULT_DATA, null, 2), 'utf-8');
        console.log('Successfully created default data file');
      } catch (err) {
        console.error('Error creating default data:', err);
        throw err;
      }
    }

    // Read and parse data
    console.log('Reading analysis file...');
    const content = fs.readFileSync(analysisPath, 'utf-8');
    const data = JSON.parse(content);
    console.log('Successfully read and parsed analysis file');

    if (!data.results || !Array.isArray(data.results)) {
      console.log('Invalid data format, using default data');
      fs.writeFileSync(analysisPath, JSON.stringify(DEFAULT_DATA, null, 2), 'utf-8');
      return NextResponse.json({
        getOne: null,
        getTwo: null
      });
    }

    const results: GetAnalyzerResult[] = data.results;
    console.log(`Found ${results.length} total results`);

    // If no results, return empty data
    if (results.length === 0) {
      console.log('No results found, returning null values');
      return NextResponse.json({
        getOne: null,
        getTwo: null
      });
    }

    // Convert analyzer results to Get format and filter for actual GETs
    const gets: Get[] = results
      .map(result => ({
        postNumber: result.metadata.postNo.toString(),
        comment: result.metadata.comment,
        checkCount: result.metadata.checkCount
      }))
      .filter(get => isGet(get.postNumber));

    console.log(`Found ${gets.length} valid GETs`);

    // If no GETs found, return null
    if (gets.length === 0) {
      console.log('No valid GETs found, returning null values');
      return NextResponse.json({
        getOne: null,
        getTwo: null
      });
    }

    // Find GETone (most checked GET)
    const getOne = gets.reduce((max, current) => 
      current.checkCount > max.checkCount ? current : max
    , gets[0]);

    console.log('Found GETone:', getOne);

    // Find GETtwo (most repeating trailing digits among remaining GETs)
    const remainingGets = gets.filter(get => get.postNumber !== getOne.postNumber);
    const getTwo = remainingGets.length > 0 ? remainingGets.reduce((max, current) => {
      const maxRepeating = countRepeatingTrailingDigits(max.postNumber);
      const currentRepeating = countRepeatingTrailingDigits(current.postNumber);
      return currentRepeating > maxRepeating ? current : max;
    }, remainingGets[0]) : null;

    console.log('Found GETtwo:', getTwo);

    return NextResponse.json({
      getOne,
      getTwo
    });
  } catch (error) {
    console.error('Error fetching significant GETs:', error);
    // Log the full error stack trace
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to fetch significant GETs' },
      { status: 500 }
    );
  }
} 