import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.resolve(process.cwd(), 'data/analysis/big-picture.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(fileContents);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading big-picture.json:', error);
    return NextResponse.json(
      { error: 'Failed to read big picture data' },
      { status: 500 }
    );
  }
} 