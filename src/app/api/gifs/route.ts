import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { paths } from '@/app/utils/paths';

export async function GET(request: NextRequest) {
  try {
    const gifDir = path.resolve(paths.dataDir, 'media', 'gif');

    // Create directory if it doesn't exist
    if (!fs.existsSync(gifDir)) {
      await fs.promises.mkdir(gifDir, { recursive: true });
      console.log('Created GIF directory:', gifDir);
      return new Response(JSON.stringify({ gifs: [] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if a specific GIF is requested
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('file');

    if (filename) {
      // Serve specific GIF
      const gifPath = path.resolve(gifDir, filename);
      const normalizedPath = path.normalize(gifPath);

      // Security check: ensure the file exists and is within the gif directory
      if (!normalizedPath.startsWith(gifDir)) {
        console.error('Security: Attempted path traversal:', normalizedPath);
        return new Response('Not Found', { status: 404 });
      }

      // Check if file exists
      if (!fs.existsSync(normalizedPath)) {
        console.error('File not found:', normalizedPath);
        return new Response('Not Found', { status: 404 });
      }

      // Read and serve the GIF
      const fileBuffer = await fs.promises.readFile(normalizedPath);
      return new Response(fileBuffer, {
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        },
      });
    } else {
      // List all GIFs
      const files = await fs.promises.readdir(gifDir);
      const gifs = files.filter(file => file.toLowerCase().endsWith('.gif'));

      // Sort by timestamp (newest first)
      gifs.sort((a, b) => {
        const timestampA = parseInt(a.split('_')[0]);
        const timestampB = parseInt(b.split('_')[0]);
        return timestampB - timestampA;
      });

      return new Response(JSON.stringify({ gifs }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error handling GIF request:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 