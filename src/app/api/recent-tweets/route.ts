import { NextResponse } from 'next/server';
import { readPostedArticles } from '@/app/lib/xposter/utils';
import { PATHS } from '@/app/lib/xposter/config';

export async function GET() {
  try {
    // Read our posted tweets
    const posted = await readPostedArticles(PATHS.postedJson);
    
    // Sort by timestamp descending and take only the most recent
    const mostRecent = posted
      .sort((a, b) => b.timestamp - a.timestamp)
      [0];

    if (!mostRecent) {
      return NextResponse.json({
        success: true,
        tweets: []
      });
    }

    return NextResponse.json({
      success: true,
      tweets: [mostRecent.tweetId]
    });
  } catch (error) {
    console.error('Error fetching recent tweets:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recent tweets' },
      { status: 500 }
    );
  }
} 