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
  };
}

function countRepeatingTrailingDigits(postNumber: string): number {
  const digits = postNumber.split('');
  let maxCount = 1;
  let currentCount = 1;
  let currentDigit = digits[digits.length - 1];

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

export async function GET() {
  try {
    const analysisPath = path.resolve(paths.dataDir, 'analysis', 'get', 'results.json');
    const content = await fs.readFile(analysisPath, 'utf-8');
    const data = JSON.parse(content);
    
    if (!data.results || !Array.isArray(data.results)) {
      throw new Error('Invalid data format');
    }

    const results: GetAnalyzerResult[] = data.results;

    // Convert analyzer results to Get format
    const gets: Get[] = results.map(result => ({
      postNumber: result.metadata.postNo.toString(),
      comment: `Post #${result.metadata.postNo}`,
      checkCount: result.metadata.checkCount
    }));

    // Find GETone (most checked)
    const getOne = gets.reduce((max, current) => 
      current.checkCount > max.checkCount ? current : max
    , gets[0]);

    // Find GETtwo (most repeating trailing digits, excluding GETone)
    const getTwo = gets
      .filter(get => get.postNumber !== getOne.postNumber && get.checkCount > 0)
      .reduce((max, current) => {
        const maxRepeating = countRepeatingTrailingDigits(max.postNumber);
        const currentRepeating = countRepeatingTrailingDigits(current.postNumber);
        return currentRepeating > maxRepeating ? current : max;
      }, gets[0]);

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