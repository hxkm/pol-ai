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
  try {
    const analysisPath = path.resolve(paths.dataDir, 'analysis', 'get', 'results.json');
    
    // Ensure directory exists
    const dirPath = path.dirname(analysisPath);
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch {
      // Ignore directory already exists error
    }

    // Try to read file, use default if it doesn't exist
    let data;
    try {
      const content = await fs.readFile(analysisPath, 'utf-8');
      data = JSON.parse(content);
    } catch (err: unknown) {
      if (isFileSystemError(err) && err.code === 'ENOENT') {
        // File doesn't exist, create it with default data
        data = DEFAULT_DATA;
        await fs.writeFile(analysisPath, JSON.stringify(data, null, 2), 'utf-8');
      } else {
        throw err;
      }
    }
    
    if (!data.results || !Array.isArray(data.results)) {
      data = DEFAULT_DATA;
      await fs.writeFile(analysisPath, JSON.stringify(data, null, 2), 'utf-8');
    }

    const results: GetAnalyzerResult[] = data.results;

    // If no results, return empty data
    if (results.length === 0) {
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

    // If no GETs found, return null
    if (gets.length === 0) {
      return NextResponse.json({
        getOne: null,
        getTwo: null
      });
    }

    // Find GETone (most checked GET)
    const getOne = gets.reduce((max, current) => 
      current.checkCount > max.checkCount ? current : max
    , gets[0]);

    // Find GETtwo (most repeating trailing digits among remaining GETs)
    const remainingGets = gets.filter(get => get.postNumber !== getOne.postNumber);
    const getTwo = remainingGets.length > 0 ? remainingGets.reduce((max, current) => {
      const maxRepeating = countRepeatingTrailingDigits(max.postNumber);
      const currentRepeating = countRepeatingTrailingDigits(current.postNumber);
      return currentRepeating > maxRepeating ? current : max;
    }, remainingGets[0]) : null;

    return NextResponse.json({
      getOne,
      getTwo
    });
  } catch (error) {
    console.error('Error fetching significant GETs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch significant GETs' },
      { status: 500 }
    );
  }
} 