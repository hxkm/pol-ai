import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Return empty data structure
    return NextResponse.json({
      success: true,
      tweets: []
    });
  } catch (error) {
    console.error('Error in recent-tweets route:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recent tweets' },
      { status: 500 }
    );
  }
} 