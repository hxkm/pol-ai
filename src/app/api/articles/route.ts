import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Handle both development and production environments
    const dataDirectory = process.env.NODE_ENV === 'production' 
      ? '/data/analysis'
      : path.resolve(process.cwd(), 'data/analysis');

    const fileContents = await fs.readFile(path.join(dataDirectory, 'articles.json'), 'utf8');
    
    if (!fileContents) {
      throw new Error('Articles file is empty');
    }

    const data = JSON.parse(fileContents);

    if (!data || !data.articles) {
      throw new Error('Invalid articles data format');
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading articles:', error);
    return NextResponse.json(
      { error: 'Failed to load articles', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 