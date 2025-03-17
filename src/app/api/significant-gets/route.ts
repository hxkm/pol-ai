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
  getType: string;
  repeatingDigits: string;
  digitCount: number;
  metadata: {
    postNo: number;
    checkCount: number;
    comment: string;
  };
}

function isValidGetResult(value: unknown): value is GetAnalyzerResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'timestamp' in value &&
    'threadId' in value &&
    'postId' in value &&
    'getType' in value &&
    'repeatingDigits' in value &&
    'digitCount' in value &&
    'metadata' in value &&
    typeof (value as GetAnalyzerResult).metadata === 'object' &&
    (value as GetAnalyzerResult).metadata !== null &&
    'postNo' in (value as GetAnalyzerResult).metadata &&
    'checkCount' in (value as GetAnalyzerResult).metadata &&
    'comment' in (value as GetAnalyzerResult).metadata
  );
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

    // Initialize with empty results
    let results: GetAnalyzerResult[] = [];

    // Try to read and parse data if file exists
    if (fs.existsSync(analysisPath)) {
      try {
        const content = fs.readFileSync(analysisPath, 'utf-8');
        const data = JSON.parse(content);
        
        if (data.results && Array.isArray(data.results)) {
          results = data.results.filter(isValidGetResult);
          console.log(`Successfully loaded ${results.length} valid GET results`);
        }
      } catch (err) {
        console.error('Error reading analysis file:', err);
      }
    }

    // If no results, return empty data
    if (results.length === 0) {
      console.log('No valid results found, returning null values');
      return NextResponse.json({
        getOne: null,
        getTwo: null
      });
    }

    // Sort results by check count and digit count
    const sortedResults = results.sort((a, b) => {
      // First prioritize check count
      const checkDiff = b.metadata.checkCount - a.metadata.checkCount;
      if (checkDiff !== 0) return checkDiff;
      // Then prioritize digit count
      return b.digitCount - a.digitCount;
    });

    // Convert top result to getOne
    const getOne: Get = {
      postNumber: sortedResults[0].metadata.postNo.toString(),
      comment: sortedResults[0].metadata.comment,
      checkCount: sortedResults[0].metadata.checkCount
    };

    console.log('Found GETone:', getOne);

    // Find getTwo from remaining results, ensuring it's different from getOne
    const getTwo = sortedResults.slice(1).find(result => 
      result.metadata.postNo.toString() !== getOne.postNumber
    );

    const getTwoResponse = getTwo ? {
      postNumber: getTwo.metadata.postNo.toString(),
      comment: getTwo.metadata.comment,
      checkCount: getTwo.metadata.checkCount
    } : null;

    console.log('Found GETtwo:', getTwoResponse);

    return NextResponse.json({
      getOne,
      getTwo: getTwoResponse
    });
  } catch (error) {
    console.error('Error fetching significant GETs:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to fetch significant GETs' },
      { status: 500 }
    );
  }
} 