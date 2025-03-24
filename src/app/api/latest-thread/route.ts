import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { paths, ensureDirectories } from '@/app/lib/utils/paths';

export async function GET() {
  try {
    // Ensure directories exist
    ensureDirectories();

    // Use paths utility to get threads directory
    const threadsDir = paths.threadsDir;

    // Check if directory exists
    if (!fs.existsSync(threadsDir)) {
      return NextResponse.json({ error: 'Threads directory not found' }, { status: 404 });
    }

    // List all JSON files
    const files = fs.readdirSync(threadsDir)
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(threadsDir, file),
        mtime: fs.statSync(path.join(threadsDir, file)).mtime
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    if (files.length === 0) {
      return NextResponse.json({ error: 'No thread files found' }, { status: 404 });
    }

    // Return the most recent file's modified time
    return NextResponse.json({
      lastModified: files[0].mtime.getTime(),
      threadId: files[0].name.replace('.json', '')
    });
  } catch (error) {
    console.error('Error getting latest thread:', error);
    return NextResponse.json({ error: 'Failed to get latest thread' }, { status: 500 });
  }
} 