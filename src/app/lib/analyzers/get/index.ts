import { Thread, Post } from '../../../types/interfaces';
import { BaseAnalyzer } from '../base';
import { GetAnalyzerResult, GetType } from './types';

/**
 * Analyzer for finding and tracking checked GETs (posts with repeating digits)
 */
export class GetAnalyzer extends BaseAnalyzer<GetAnalyzerResult> {
  name = 'get';
  description = 'Analyzes posts with repeating digits (GETs) and their checking posts';

  // Keywords that indicate a post is checking a GET
  private static CHECK_KEYWORDS = ['checked', 'get','digits', 'dubs', 'trips', 'quads', 'quints'];

  /**
   * Find repeating digits at the end of a post number
   */
  private findRepeatingDigits(postNo: number): { digits: string; count: number } | null {
    const postStr = postNo.toString();
    
    // Start with maximum possible length of repeating digits
    const maxLength = postStr.length;
    
    // Check for repeating digits from longest to shortest
    for (let length = maxLength; length >= 2; length--) {
      const endDigits = postStr.slice(-length);
      const firstDigit = endDigits[0];
      
      // Check if all digits are the same
      if (endDigits.split('').every(d => d === firstDigit)) {
        return {
          digits: endDigits,
          count: length
        };
      }
    }
    
    return null;
  }

  /**
   * Get the GET type based on number of repeating digits
   */
  private getGetType(digitCount: number): GetType {
    switch (digitCount) {
      case 2: return GetType.DUBS;
      case 3: return GetType.TRIPS;
      case 4: return GetType.QUADS;
      case 5: return GetType.QUINTS;
      case 6: return GetType.SEXTS;
      case 7: return GetType.SEPTS;
      case 8: return GetType.OCTS;
      default: return GetType.SPECIAL; // 9 or more repeating digits
    }
  }

  /**
   * Check if a post is checking a GET
   */
  private isCheckingPost(post: Post, getPostNo: number): boolean {
    // Post must be a reply to the GET
    if (post.no === getPostNo) return false;
    
    const content = post.com?.toLowerCase() || '';
    return GetAnalyzer.CHECK_KEYWORDS.some(keyword => content.includes(keyword));
  }

  /**
   * Convert thread to a post object (for OP)
   */
  private threadToPost(thread: Thread): Post {
    return {
      no: thread.no,
      resto: 0, // OP posts have resto = 0
      time: thread.time,
      name: thread.name,
      trip: undefined,
      id: undefined,
      com: thread.com,
      tim: thread.tim,
      filename: thread.filename,
      ext: thread.ext,
      fsize: thread.fsize,
      md5: thread.md5,
      w: thread.w,
      h: thread.h,
      tn_w: thread.tn_w,
      tn_h: thread.tn_h,
      country: undefined,
      country_name: undefined
    };
  }

  /**
   * Find all checked GETs in all threads
   */
  async analyze(threads: Thread[]): Promise<GetAnalyzerResult[]> {
    const results: GetAnalyzerResult[] = [];
    
    for (const thread of threads) {
      // Skip if thread has no posts
      if (!thread.posts) continue;

      // Convert thread to post for OP analysis
      const opPost = this.threadToPost(thread);

      // Check each post for GETs
      for (const post of [opPost, ...thread.posts]) {
        // Look for repeating digits
        const repeating = this.findRepeatingDigits(post.no);
        if (!repeating) continue;

        // Find posts that checked this GET across all threads
        const checkingPosts: Post[] = [];
        
        // Check current thread
        checkingPosts.push(...thread.posts.filter(p => 
          this.isCheckingPost(p, post.no)
        ));
        
        // Check other threads for cross-thread checks
        for (const otherThread of threads) {
          if (otherThread.no === thread.no || !otherThread.posts) continue;
          
          checkingPosts.push(...otherThread.posts.filter(p =>
            this.isCheckingPost(p, post.no)
          ));
        }

        // Only record GETs that were checked
        if (checkingPosts.length === 0) continue;

        // Create result
        results.push({
          timestamp: Date.now(),
          threadId: thread.no,
          postId: post.no,
          getType: this.getGetType(repeating.count),
          getPost: post,
          checkingPosts,
          repeatingDigits: repeating.digits,
          digitCount: repeating.count,
          metadata: {
            checkCount: checkingPosts.length,
            threadSubject: thread.sub || '',
            isOp: post.no === thread.no,
            crossThreadChecks: checkingPosts.some(p => p.resto !== thread.no)
          }
        });
      }
    }

    return results;
  }
} 