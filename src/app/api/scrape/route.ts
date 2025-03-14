import { NextResponse } from 'next/server';
import { scrape } from '@/app/lib/scraper';

export async function POST() {
  try {
    // Run scraper in the background
    scrape().catch(error => {
      console.error('Scraper failed:', error);
    });

    return NextResponse.json({ message: 'Scraper started' });
  } catch (error) {
    console.error('Failed to start scraper:', error);
    return NextResponse.json(
      { error: 'Failed to start scraper' },
      { status: 500 }
    );
  }
} 