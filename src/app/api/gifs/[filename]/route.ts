import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { paths } from '@/app/utils/paths';

export async function GET(
  _req: NextRequest,
  { params }: { params: { filename: string } }
): Promise<Response> {
  try {
    const filename = params.filename;
    const gifDir = path.resolve(paths.dataDir, 'media', 'gif');
    const gifPath = path.resolve(gifDir, filename);

    // Security check: ensure the file exists and is within the gif directory
    const normalizedPath = path.normalize(gifPath);
    
    if (!normalizedPath.startsWith(gifDir)) {
      console.error('Security: Attempted path traversal:', normalizedPath);
      return new Response('Not Found', { status: 404 });
    }

    // Create directory if it doesn't exist
    if (!fs.existsSync(gifDir)) {
      await fs.promises.mkdir(gifDir, { recursive: true });
      console.log('Created GIF directory:', gifDir);
      return new Response('Not Found', { status: 404 });
    }

    // Check if file exists
    if (!fs.existsSync(normalizedPath)) {
      console.error('File not found:', normalizedPath);
      return new Response('Not Found', { status: 404 });
    }

    // Read the file
    const fileBuffer = await fs.promises.readFile(normalizedPath);
    
    // Return the GIF with proper headers
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    });
  } catch (error) {
    console.error('Error serving GIF:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 