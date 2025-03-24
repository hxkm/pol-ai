import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Get the data directory path
    const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
    const filePath = path.resolve(dataDir, 'analysis', 'latest-summary.json');

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      console.error('Latest summary file not found:', filePath);
      return NextResponse.json({ error: 'Latest summary not found' }, { status: 404 });
    }

    // Read and parse the file
    const jsonData = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(jsonData);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading latest summary:', error);
    return NextResponse.json({ error: 'Failed to get latest summary' }, { status: 500 });
  }
} 