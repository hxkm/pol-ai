import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { paths } from '@/app/utils/paths';

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

function determineLevel(percentage: number): AntisemitismStats['level'] {
  if (percentage < 3) return 'Low';
  if (percentage < 10) return 'Medium';
  if (percentage < 19) return 'High';
  return 'Critical';
}

export async function GET() {
  try {
    // Read the latest analysis file
    const analysisPath = path.resolve(paths.dataDir, 'analysis', 'latest-summary.json');
    const trendsPath = path.resolve(paths.dataDir, 'analysis', 'antisemitism-trends.json');

    // Read both files
    const [analysisContent, trendsContent] = await Promise.all([
      fs.readFile(analysisPath, 'utf-8'),
      fs.readFile(trendsPath, 'utf-8')
    ]);

    const analysis = JSON.parse(analysisContent);
    const trends = JSON.parse(trendsContent);

    // Calculate trend
    const sortedTrends = trends.sort((a: any, b: any) => b.timestamp - a.timestamp);
    const currentPercentage = sortedTrends[0]?.percentage ?? analysis.matrix.statistics.mean;
    const previousPercentage = sortedTrends[1]?.percentage ?? currentPercentage;
    
    const trendChange = currentPercentage - previousPercentage;
    const trendDirection = 
      Math.abs(trendChange) < 0.1 ? 'stable' :
      trendChange > 0 ? 'up' : 'down';

    // Prepare response
    const stats: AntisemitismStats = {
      mean: Number(analysis.matrix.statistics.mean.toFixed(1)),
      level: determineLevel(analysis.matrix.statistics.mean),
      trend: {
        direction: trendDirection,
        change: Number(Math.abs(trendChange).toFixed(1))
      },
      themes: analysis.matrix.themes
        .sort((a: any, b: any) => b.frequency - a.frequency)
        .slice(0, 5)
        .map((theme: any) => ({
          name: theme.name,
          frequency: theme.frequency
        }))
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching antisemitism stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch antisemitism statistics' },
      { status: 500 }
    );
  }
} 