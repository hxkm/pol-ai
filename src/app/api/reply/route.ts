import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { paths } from '@/app/utils/paths';

interface SourcePost {
  no: number;
  com?: string;
  time: number;
  filename?: string;
  ext?: string;
  tim?: number;
  // Add other possible fields
  sub?: string;
  name?: string;
  trip?: string;
  resto?: number;
}

interface ReplyResult {
  sourcePost: SourcePost;
  replyCount?: number;
  threadId?: number;
  timestamp?: number;
}

interface ReplyData {
  lastUpdated: number;
  results: ReplyResult[];
}

export async function GET() {
  try {
    // Read the results file
    const filePath = path.resolve(paths.analysisDir, 'reply', 'results.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent) as ReplyData;

    // Ensure we have results
    if (!data || !data.results || !Array.isArray(data.results)) {
      throw new Error('Invalid data structure in results.json');
    }

    // Sort by reply count (if available) and take top 3
    const sortedResults = data.results
      // First deduplicate by post number
      .filter((post, index, self) => 
        index === self.findIndex((p) => p.sourcePost.no === post.sourcePost.no)
      )
      .filter((post): post is ReplyResult => post && post.sourcePost !== undefined)
      .sort((a, b) => (b.replyCount || 0) - (a.replyCount || 0))
      .slice(0, 3);

    if (sortedResults.length === 0) {
      throw new Error('No valid posts found');
    }

    // Log the top 3 posts for debugging
    console.log('Top 3 most replied posts (deduplicated):', 
      sortedResults.map(p => ({
        no: p.sourcePost.no,
        replies: p.replyCount,
      }))
    );

    // Return array of top 3 posts
    return NextResponse.json(sortedResults.map(post => ({
      no: post.sourcePost.no,
      com: post.sourcePost.com || '',
      replies: post.replyCount || 0,
      time: post.sourcePost.time,
      filename: post.sourcePost.filename,
      ext: post.sourcePost.ext,
      tim: post.sourcePost.tim,
      sub: post.sourcePost.sub,
      name: post.sourcePost.name,
      trip: post.sourcePost.trip,
      resto: post.sourcePost.resto,
      threadId: post.threadId,
      timestamp: post.timestamp
    })));
  } catch (error) {
    console.error('Error reading reply data:', error);
    return NextResponse.json(
      { error: 'Failed to read reply data' },
      { status: 500 }
    );
  }
} 