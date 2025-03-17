import { Thread, Post } from '../../../types/interfaces';
import { BaseAnalyzer } from '../base';
import { ReplyAnalyzerResult } from './types';

/**
 * Analyzer for finding posts with the most replies
 */
export class ReplyAnalyzer extends BaseAnalyzer<ReplyAnalyzerResult> {
  name = 'reply';
  description = 'Tracks posts with the most replies across all threads';
  
  // Maximum number of top posts to track
  private static MAX_RESULTS = 10;

  /**
   * Check if a post is replying to another post
   */
  private isReplyingTo(post: Post, targetPostId: number): boolean {
    if (!post.com) return false;
    
    // Check for post quotes in the format >>12345678 or #p12345678
    const quoteRegex1 = new RegExp(`>>${targetPostId}\\b`, 'g');
    const quoteRegex2 = new RegExp(`#p${targetPostId}\\b`, 'g');
    return quoteRegex1.test(post.com) || quoteRegex2.test(post.com);
  }

  /**
   * Find posts with the most replies across all threads
   */
  async analyze(threads: Thread[]): Promise<ReplyAnalyzerResult[]> {
    console.log('Analyzing replies across all threads...');
    
    // Map to track replies to each post
    const replyMap = new Map<number, {
      sourcePost: Post;
      replies: Post[];
      threadId: number;
      threadSubject: string;
      isOp: boolean;
    }>();
    
    // Process each thread
    for (const thread of threads) {
      // Skip if thread has no posts
      if (!thread.posts) continue;
      
      const threadSubject = thread.sub || `Thread #${thread.no}`;
      
      // Create a map of all posts in this thread for quick lookup
      const postsMap = new Map<number, Post>();
      thread.posts.forEach(post => postsMap.set(post.no, post));
      
      // Add OP to the map
      const opPost: Post = {
        no: thread.no,
        resto: 0,
        time: thread.time,
        name: thread.name || 'Anonymous',
        com: thread.com,
        // Include other fields from thread as needed
      };
      postsMap.set(thread.no, opPost);
      
      // First pass: Build a map of direct replies based on the resto field
      // This tracks which posts are replies to which thread/post
      for (const post of thread.posts) {
        // Skip if post is a direct reply to the thread (OP)
        if (post.resto === thread.no) continue;
        
        // If resto is not 0 and not the thread ID, it's a direct reply to another post
        if (post.resto !== 0 && post.resto !== thread.no) {
          const targetPostId = post.resto;
          
          // Skip if the target post doesn't exist in this thread
          if (!postsMap.has(targetPostId)) continue;
          
          // Get or create entry in the reply map
          if (!replyMap.has(targetPostId)) {
            replyMap.set(targetPostId, {
              sourcePost: postsMap.get(targetPostId)!,
              replies: [],
              threadId: thread.no,
              threadSubject,
              isOp: targetPostId === thread.no
            });
          }
          
          // Add this post to the replies
          replyMap.get(targetPostId)!.replies.push(post);
        }
      }
      
      // Second pass: Check for quote references in the post content
      for (const post of thread.posts) {
        // Skip if post has no content
        if (!post.com) continue;
        
        // Find all post references in the format >>12345678 or #p12345678
        const matches1 = post.com.match(/>>(\d+)\b/g);
        const matches2 = post.com.match(/#p(\d+)\b/g);
        const allMatches = [...(matches1 || []), ...(matches2 || [])];
        
        if (!allMatches || allMatches.length === 0) continue;
        
        // Process each reference
        for (const match of allMatches) {
          // Extract the post ID from the match
          const targetPostId = parseInt(
            match.startsWith('>>') ? match.substring(2) : match.substring(2), 
            10
          );
          
          // Skip if the target post doesn't exist in this thread
          if (!postsMap.has(targetPostId)) continue;
          
          // Skip if the target post is the OP (we're excluding OPs)
          if (targetPostId === thread.no) continue;
          
          // Get or create entry in the reply map
          if (!replyMap.has(targetPostId)) {
            replyMap.set(targetPostId, {
              sourcePost: postsMap.get(targetPostId)!,
              replies: [],
              threadId: thread.no,
              threadSubject,
              isOp: targetPostId === thread.no
            });
          }
          
          // Add this post to the replies if it's not already there
          const replies = replyMap.get(targetPostId)!.replies;
          if (!replies.some(r => r.no === post.no)) {
            replies.push(post);
          }
        }
      }
    }
    
    console.log(`Found ${replyMap.size} posts with replies`);
    
    // Convert map to array and sort by reply count (descending)
    const sortedResults = Array.from(replyMap.entries())
      .map(([postId, data]) => ({
        timestamp: Date.now(),
        threadId: data.threadId,
        postId,
        sourcePost: data.sourcePost,
        replyCount: data.replies.length,
        replies: data.replies,
        threadSubject: data.threadSubject,
        isOp: data.isOp,
        metadata: {
          replyCount: data.replies.length,
          threadSubject: data.threadSubject
        }
      }))
      .filter(result => !result.isOp) // Exclude OPs as requested
      .sort((a, b) => b.replyCount - a.replyCount)
      .slice(0, ReplyAnalyzer.MAX_RESULTS);
    
    console.log(`Top post has ${sortedResults[0]?.replyCount || 0} replies`);
    
    return sortedResults;
  }

  /**
   * Override saveResults to always keep only the top MAX_RESULTS
   */
  async saveResults(results: ReplyAnalyzerResult[]): Promise<void> {
    try {
      // Load existing results
      const existingResults = await this.loadResults();
      
      // Combine new and existing results
      const combinedResults = [...existingResults, ...results];
      
      // Sort by reply count and keep only the top MAX_RESULTS
      const topResults = combinedResults
        .sort((a, b) => b.replyCount - a.replyCount)
        .slice(0, ReplyAnalyzer.MAX_RESULTS);
      
      // Create storage object
      const storage = {
        lastUpdated: Date.now(),
        results: topResults
      };
      
      // Write to storage
      await this.writeStorage(storage);
      
      console.log(`${this.name}: Saved top ${topResults.length} most replied-to posts`);
    } catch (error) {
      console.error(`Error saving results for ${this.name}:`, error);
      throw error;
    }
  }
} 