import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { paths } from '@/app/utils/paths';

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

interface FileSystemError extends Error {
  code?: string;
}

const DEFAULT_DATA = {
  lastUpdated: Date.now(),
  results: []
};

function isFileSystemError(error: unknown): error is FileSystemError {
  return error instanceof Error && 'code' in error;
}

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
  console.log('GET request received for significant-gets');
  
  try {
    const analysisPath = path.resolve(paths.dataDir, 'analysis', 'get', 'results.json');
    console.log('Analysis path:', analysisPath);
    
    // Ensure directory exists
    const dirPath = path.dirname(analysisPath);
    console.log('Creating directory if needed:', dirPath);
    
    try {
      await fs.mkdir(dirPath, { recursive: true });
      console.log('Directory created/verified');
      
      // In Railway, ensure proper permissions
      if (process.env.RAILWAY_ENVIRONMENT === 'production') {
        await fs.chmod(dirPath, 0o777);
        console.log('Set directory permissions to 777 in Railway');
      }
    } catch (err) {
      console.error('Error creating directory:', err);
      // Continue since directory might already exist
    }

    // Try to read file, use default if it doesn't exist
    let data;
    try {
      console.log('Reading analysis file...');
      const content = await fs.readFile(analysisPath, 'utf-8');
      data = JSON.parse(content);
      console.log('Successfully read and parsed analysis file');
    } catch (err: unknown) {
      if (isFileSystemError(err) && err.code === 'ENOENT') {
        console.log('Analysis file does not exist, using default data');
        data = DEFAULT_DATA;
        await fs.writeFile(analysisPath, JSON.stringify(data, null, 2), 'utf-8');
        console.log('Created default analysis file');
      } else {
        console.error('Error reading analysis file:', err);
        throw err;
      }
    }
    
    if (!data.results || !Array.isArray(data.results)) {
      console.log('Invalid data format, using default data');
      data = DEFAULT_DATA;
      await fs.writeFile(analysisPath, JSON.stringify(data, null, 2), 'utf-8');
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