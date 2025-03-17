import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { paths } from '@/app/utils/paths';

interface FileInfo {
  name: string;
  size: number;
  permissions: string;
  lastModified: number;
  contents?: any;
}

interface DirectoryInfo {
  path: string;
  exists: boolean;
  permissions?: string;
  files: FileInfo[];
  subdirectories: DirectoryInfo[];
}

function getFileInfo(filePath: string): FileInfo {
  const stats = fs.statSync(filePath);
  const info: FileInfo = {
    name: path.basename(filePath),
    size: stats.size,
    permissions: stats.mode.toString(8),
    lastModified: stats.mtimeMs
  };

  // Only read JSON files that are under 1MB
  if (filePath.endsWith('.json') && stats.size < 1024 * 1024) {
    try {
      const contents = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      info.contents = contents;
    } catch (error) {
      console.error(`Error reading ${filePath}:`, error);
    }
  }

  return info;
}

function scanDirectory(dirPath: string): DirectoryInfo {
  const info: DirectoryInfo = {
    path: dirPath,
    exists: fs.existsSync(dirPath),
    files: [],
    subdirectories: []
  };

  if (!info.exists) {
    return info;
  }

  try {
    const stats = fs.statSync(dirPath);
    info.permissions = stats.mode.toString(8);

    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const itemStats = fs.statSync(itemPath);

      if (itemStats.isDirectory()) {
        info.subdirectories.push(scanDirectory(itemPath));
      } else {
        info.files.push(getFileInfo(itemPath));
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dirPath}:`, error);
  }

  return info;
}

export async function GET() {
  try {
    console.log('Starting data directory scan...');
    console.log('Data directory:', paths.dataDir);

    const directoryInfo = scanDirectory(paths.dataDir);

    return NextResponse.json({
      timestamp: Date.now(),
      environment: process.env.RAILWAY_ENVIRONMENT || 'local',
      cwd: process.cwd(),
      dataDir: paths.dataDir,
      info: directoryInfo
    });
  } catch (error) {
    console.error('Error scanning data directory:', error);
    return NextResponse.json(
      { error: 'Failed to scan data directory', details: error },
      { status: 500 }
    );
  }
} 