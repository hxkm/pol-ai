import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { paths, ensureDirectories } from '@/app/utils/paths';

interface AntisemitismStats {
  mean: number;
  level: 'Low' | 'Medium' | 'High' | 'Critical';
  trend: {
    direction: 'up' | 'down' | 'stable';
    change: number;
  };
  themes: Array<{
    name: string;
    frequency: number;
  }>;
}

interface TrendPoint {
  timestamp: number;
  percentage: number;
  threadCount: number;
}

function determineLevel(percentage: number): AntisemitismStats['level'] {
  if (percentage < 3) return 'Low';
  if (percentage < 10) return 'Medium';
  if (percentage < 19) return 'High';
  return 'Critical';
}

function isTrendPoint(value: unknown): value is TrendPoint {
  return (
    typeof value === 'object' &&
    value !== null &&
    'timestamp' in value &&
    'percentage' in value &&
    'threadCount' in value &&
    typeof (value as TrendPoint).timestamp === 'number' &&
    typeof (value as TrendPoint).percentage === 'number' &&
    typeof (value as TrendPoint).threadCount === 'number'
  );
}

export async function GET() {
  console.log('=== Antisemitism Stats API Debug Info ===');
  console.log('Environment:', process.env.RAILWAY_ENVIRONMENT || 'local');
  console.log('CWD:', process.cwd());
  console.log('Data Dir:', paths.dataDir);
  
  try {
    // Ensure all directories exist first
    console.log('Ensuring directories exist...');
    ensureDirectories();
    console.log('Directories ensured');

    // Read the trends file
    const trendsPath = path.resolve(paths.dataDir, 'analysis', 'antisemitism-trends.json');
    const bigPicturePath = path.resolve(paths.dataDir, 'analysis', 'big-picture.json');

    console.log('Reading analysis files from:');
    console.log('Trends path:', trendsPath);
    console.log('Big Picture path:', bigPicturePath);

    // Log directory structure
    console.log('Directory exists check:');
    console.log('- Data dir exists:', fs.existsSync(paths.dataDir));
    console.log('- Analysis dir exists:', fs.existsSync(path.dirname(trendsPath)));
    console.log('- Trends file exists:', fs.existsSync(trendsPath));
    console.log('- Big Picture file exists:', fs.existsSync(bigPicturePath));

    // Initialize data with defaults
    let trends: TrendPoint[] = [];
    let themes: Array<{name: string; frequency: number}> = [];

    // Try to read trends file
    if (fs.existsSync(trendsPath)) {
      try {
        const trendsContent = fs.readFileSync(trendsPath, 'utf-8');
        const parsedTrends = JSON.parse(trendsContent);
        if (Array.isArray(parsedTrends) && parsedTrends.every(isTrendPoint)) {
          trends = parsedTrends;
          console.log('Successfully read trends file');
        }
      } catch (err) {
        console.error('Error reading trends file:', err);
      }
    }

    // Try to read big picture file for themes
    if (fs.existsSync(bigPicturePath)) {
      try {
        const bigPictureContent = fs.readFileSync(bigPicturePath, 'utf-8');
        const bigPicture = JSON.parse(bigPictureContent);
        if (bigPicture?.themes && Array.isArray(bigPicture.themes)) {
          themes = bigPicture.themes;
          console.log('Successfully read themes from big picture');
        }
      } catch (err) {
        console.error('Error reading big picture file:', err);
      }
    }

    // Calculate current mean from latest trend point
    const sortedTrends = [...trends].sort((a, b) => b.timestamp - a.timestamp);
    const currentPercentage = sortedTrends[0]?.percentage ?? 0;
    const previousPercentage = sortedTrends[1]?.percentage ?? currentPercentage;
    
    const trendChange = currentPercentage - previousPercentage;
    const trendDirection = 
      Math.abs(trendChange) < 0.1 ? 'stable' :
      trendChange > 0 ? 'up' : 'down';

    // Prepare response
    const stats: AntisemitismStats = {
      mean: Number(currentPercentage.toFixed(1)),
      level: determineLevel(currentPercentage),
      trend: {
        direction: trendDirection as AntisemitismStats['trend']['direction'],
        change: Number(Math.abs(trendChange).toFixed(1))
      },
      themes: themes
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 5)
        .map(theme => ({
          name: theme.name,
          frequency: theme.frequency
        }))
    };

    console.log('Returning stats:', stats);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching antisemitism stats:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to fetch antisemitism statistics' },
      { status: 500 }
    );
  }
} 