import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Get the absolute path to the articles.json file
    const dataDirectory = path.resolve(process.cwd(), 'data/analysis');
    const fileContents = await fs.readFile(path.join(dataDirectory, 'articles.json'), 'utf8');
    const data = JSON.parse(fileContents);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading articles:', error);
    return NextResponse.json(
      { error: 'Failed to load articles' },
      { status: 500 }
    );
  }
} 