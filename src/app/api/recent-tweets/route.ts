import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch the latest tweet URL from xposter
    const response = await fetch('https://xposter-production.up.railway.app/latest');
    const html = await response.text();
    
    // Extract the tweet ID from the URL
    const match = html.match(/https:\/\/x\.com\/i\/web\/status\/(\d+)/);
    const tweetId = match ? match[1] : null;
    
    if (!tweetId) {
      console.log('No tweet ID found in xposter response');
      return NextResponse.json({
        success: true,
        tweets: []
      });
    }

    console.log('Found tweet ID:', tweetId);
    return NextResponse.json({
      success: true,
      tweets: [tweetId]
    });
  } catch (error) {
    console.error('Error in recent-tweets route:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recent tweets' },
      { status: 500 }
    );
  }
} 