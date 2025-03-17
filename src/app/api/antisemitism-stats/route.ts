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

    // Read the latest analysis file
    const analysisPath = path.resolve(paths.dataDir, 'analysis', 'latest-summary.json');
    const trendsPath = path.resolve(paths.dataDir, 'analysis', 'antisemitism-trends.json');

    console.log('Reading analysis files from:');
    console.log('Analysis path:', analysisPath);
    console.log('Trends path:', trendsPath);

    // Log directory structure
    console.log('Directory exists check:');
    console.log('- Data dir exists:', fs.existsSync(paths.dataDir));
    console.log('- Analysis dir exists:', fs.existsSync(path.dirname(analysisPath)));
    console.log('- Analysis file exists:', fs.existsSync(analysisPath));
    console.log('- Trends file exists:', fs.existsSync(trendsPath));

    // Initialize data with defaults
    let analysis: unknown = DEFAULT_ANALYSIS_DATA;
    let trends: unknown = DEFAULT_TRENDS;

    // Try to read analysis file
    if (fs.existsSync(analysisPath)) {
      try {
        const analysisContent = fs.readFileSync(analysisPath, 'utf-8');
        analysis = JSON.parse(analysisContent);
        console.log('Successfully read analysis file');
      } catch (err) {
        console.error('Error reading analysis file:', err);
        analysis = DEFAULT_ANALYSIS_DATA;
      }
    } else {
      console.log('Analysis file does not exist, using default data');
      fs.writeFileSync(analysisPath, JSON.stringify(DEFAULT_ANALYSIS_DATA, null, 2), 'utf-8');
    }

    // Try to read trends file
    if (fs.existsSync(trendsPath)) {
      try {
        const trendsContent = fs.readFileSync(trendsPath, 'utf-8');
        trends = JSON.parse(trendsContent);
        console.log('Successfully read trends file');
      } catch (err) {
        console.error('Error reading trends file:', err);
        trends = DEFAULT_TRENDS;
      }
    } else {
      console.log('Trends file does not exist, using default data');
      fs.writeFileSync(trendsPath, JSON.stringify(DEFAULT_TRENDS, null, 2), 'utf-8');
    }

    if (!isAnalysisData(analysis) || !Array.isArray(trends) || !trends.every(isTrendPoint)) {
      // If data is invalid, reset to defaults
      analysis = DEFAULT_ANALYSIS_DATA;
      trends = DEFAULT_TRENDS;
      
      // Write default data to files
      fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2), 'utf-8');
      fs.writeFileSync(trendsPath, JSON.stringify(trends, null, 2), 'utf-8');
      
      console.log('Invalid data format, reset to defaults');
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