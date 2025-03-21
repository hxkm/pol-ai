import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { paths } from '@/app/utils/paths';

export async function GET() {
  try {
    console.log('Reading big-picture.json from:', paths.bigPicturePath);
    const fileContents = await fs.readFile(paths.bigPicturePath, 'utf8');
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