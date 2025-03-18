import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { paths } from '@/app/utils/paths';

export async function GET() {
  try {
    const gifDir = path.resolve(paths.dataDir, 'media', 'gif');
    
    // Create directories if they don't exist
    if (!fs.existsSync(gifDir)) {
      await fs.promises.mkdir(gifDir, { recursive: true });
      console.log('Created GIF directory:', gifDir);
      return NextResponse.json({ gifs: [] });
    }

    // Read directory and filter for .gif files
    const files = await fs.promises.readdir(gifDir);
    const gifs = files.filter(file => file.toLowerCase().endsWith('.gif'));

    // Sort by timestamp (newest first)
    gifs.sort((a, b) => {
      const timestampA = parseInt(a.split('_')[0]);
      const timestampB = parseInt(b.split('_')[0]);
      return timestampB - timestampA;
    });

    return NextResponse.json({ gifs });
  } catch (error) {
    console.error('Error reading GIF directory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GIFs' },
      { status: 500 }
    );
  }
} 