import { NextResponse } from 'next/server';
import fs from 'fs';
import { paths, ensureDirectories } from '@/app/lib/utils/paths';

export async function GET() {
  try {
    // Ensure directories exist
    ensureDirectories();

    // Use paths utility to get threads directory
    const threadsDir = paths.threadsDir;

    // Debug logging
    console.log('=== Thread Count Debug Info ===');
    console.log('Threads Dir:', threadsDir);
    
    // Check if directory exists
    const dirExists = fs.existsSync(threadsDir);
    console.log('Directory exists:', dirExists);

    if (!dirExists) {
      return NextResponse.json({ count: 0, exists: false });
    }

    // List directory contents
    const allFiles = fs.readdirSync(threadsDir);
    console.log('All files in directory:', allFiles);

    // Filter JSON files
    const jsonFiles = allFiles.filter(file => file.endsWith('.json'));
    console.log('JSON files count:', jsonFiles.length);
    
    return NextResponse.json({
      count: jsonFiles.length,
      exists: true,
      debug: {
        threadsDir,
        dirExists,
        fileCount: allFiles.length,
        jsonCount: jsonFiles.length
      }
    });
  } catch (error: any) {
    console.error('=== Thread Count Error ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return NextResponse.json(
      { 
        error: 'Failed to get thread count', 
        details: error?.message || 'Unknown error',
        stack: error?.stack
      },
      { status: 500 }
    );
  }
} 