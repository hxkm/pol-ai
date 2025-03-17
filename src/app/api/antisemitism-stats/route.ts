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

interface TrendPoint {
  timestamp: number;
  percentage: number;
}

interface Theme {
  name: string;
  frequency: number;
}

interface AnalysisData {
  matrix: {
    statistics: {
      mean: number;
    };
    themes: Theme[];
  };
}

interface FileSystemError extends Error {
  code?: string;
}

const DEFAULT_ANALYSIS_DATA: AnalysisData = {
  matrix: {
    statistics: {
      mean: 0
    },
    themes: []
  }
};

const DEFAULT_TRENDS: TrendPoint[] = [];

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
    typeof (value as TrendPoint).timestamp === 'number' &&
    typeof (value as TrendPoint).percentage === 'number'
  );
}

function isAnalysisData(value: unknown): value is AnalysisData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'matrix' in value &&
    typeof (value as AnalysisData).matrix === 'object' &&
    (value as AnalysisData).matrix !== null &&
    'statistics' in (value as AnalysisData).matrix &&
    'themes' in (value as AnalysisData).matrix &&
    typeof (value as AnalysisData).matrix.statistics.mean === 'number' &&
    Array.isArray((value as AnalysisData).matrix.themes)
  );
}

function isFileSystemError(error: unknown): error is FileSystemError {
  return error instanceof Error && 'code' in error;
}

export async function GET() {
  try {
    // Read the latest analysis file
    const analysisPath = path.resolve(paths.dataDir, 'analysis', 'latest-summary.json');
    const trendsPath = path.resolve(paths.dataDir, 'analysis', 'antisemitism-trends.json');

    // Ensure analysis directory exists
    const dirPath = path.dirname(analysisPath);
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch {
      // Ignore directory already exists error
    }

    // Try to read both files, use defaults if they don't exist
    let analysis: unknown;
    let trends: unknown;

    try {
      const analysisContent = await fs.readFile(analysisPath, 'utf-8');
      analysis = JSON.parse(analysisContent);
    } catch (err: unknown) {
      if (isFileSystemError(err) && err.code === 'ENOENT') {
        analysis = DEFAULT_ANALYSIS_DATA;
        await fs.writeFile(analysisPath, JSON.stringify(analysis, null, 2), 'utf-8');
      } else {
        throw err;
      }
    }

    try {
      const trendsContent = await fs.readFile(trendsPath, 'utf-8');
      trends = JSON.parse(trendsContent);
    } catch (err: unknown) {
      if (isFileSystemError(err) && err.code === 'ENOENT') {
        trends = DEFAULT_TRENDS;
        await fs.writeFile(trendsPath, JSON.stringify(trends, null, 2), 'utf-8');
      } else {
        throw err;
      }
    }

    if (!isAnalysisData(analysis) || !Array.isArray(trends) || !trends.every(isTrendPoint)) {
      // If data is invalid, reset to defaults
      analysis = DEFAULT_ANALYSIS_DATA;
      trends = DEFAULT_TRENDS;
      await Promise.all([
        fs.writeFile(analysisPath, JSON.stringify(analysis, null, 2), 'utf-8'),
        fs.writeFile(trendsPath, JSON.stringify(trends, null, 2), 'utf-8')
      ]);
    }

    // Calculate trend
    const sortedTrends = (trends as TrendPoint[]).sort((a: TrendPoint, b: TrendPoint) => b.timestamp - a.timestamp);
    const currentPercentage = sortedTrends[0]?.percentage ?? (analysis as AnalysisData).matrix.statistics.mean;
    const previousPercentage = sortedTrends[1]?.percentage ?? currentPercentage;
    
    const trendChange = currentPercentage - previousPercentage;
    const trendDirection = 
      Math.abs(trendChange) < 0.1 ? 'stable' :
      trendChange > 0 ? 'up' : 'down';

    // Prepare response
    const stats: AntisemitismStats = {
      mean: Number((analysis as AnalysisData).matrix.statistics.mean.toFixed(1)),
      level: determineLevel((analysis as AnalysisData).matrix.statistics.mean),
      trend: {
        direction: trendDirection as AntisemitismStats['trend']['direction'],
        change: Number(Math.abs(trendChange).toFixed(1))
      },
      themes: (analysis as AnalysisData).matrix.themes
        .sort((a: Theme, b: Theme) => b.frequency - a.frequency)
        .slice(0, 5)
        .map((theme: Theme) => ({
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