import { Thread, Post } from '../../../types/interfaces';
import { BaseAnalyzer } from '../base';
import { GetAnalyzerResult, GetType } from './types';

/**
 * Analyzer for finding posts with repeating digits (GETs) and tracking how many times they are checked
 */
export class GetAnalyzer extends BaseAnalyzer<GetAnalyzerResult> {
  private static readonly CHECK_KEYWORDS = ['check', 'checked', 'get', 'digits', 'dubs', 'trips', 'quads', 'quints'];
  private static readonly MAX_RESULTS = 1000;

  public readonly name = 'get';
  public readonly description = 'Tracks posts with repeating digits (GETs) and how many times they were checked';

  /**
   * Find repeating digits in a post number
   */
  private findRepeatingDigits(postNo: number): { repeatingDigits: string; digitCount: number } | null {
    const postStr = postNo.toString();
    let maxRepeating = '';
    let maxCount = 0;

    for (let i = 0; i < postStr.length; i++) {
      let count = 1;
      const digit = postStr[i];
      
      while (i + count < postStr.length && postStr[i + count] === digit) {
        count++;
      }

      if (count > maxCount) {
        maxCount = count;
        maxRepeating = digit.repeat(count);
      }
    }

    return maxCount >= 2 ? { repeatingDigits: maxRepeating, digitCount: maxCount } : null;
  }

  /**
   * Determine the type of GET based on number of repeating digits
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
      default: return GetType.SPECIAL;
    }
  }

  /**
   * Check if a post is checking a GET
   */
  private isCheckingPost(post: Post, targetPostNo: number): boolean {
    if (!post.com) return false;
    
    const comment = post.com.toLowerCase();
    return GetAnalyzer.CHECK_KEYWORDS.some(keyword => comment.includes(keyword)) &&
           comment.includes(targetPostNo.toString());
  }

  /**
   * Analyze threads to find GETs and count their checks
   */
  public async analyze(threads: Thread[]): Promise<GetAnalyzerResult[]> {
    const getResults = new Map<number, GetAnalyzerResult>();

    // First pass: find all GETs
    for (const thread of threads) {
      if (!thread.posts) continue;

      for (const post of thread.posts) {
        const repeatingInfo = this.findRepeatingDigits(post.no);
        if (!repeatingInfo) continue;

        getResults.set(post.no, {
          timestamp: Date.now(),
          threadId: thread.no,
          postId: post.no,
          getType: this.getGetType(repeatingInfo.digitCount),
          repeatingDigits: repeatingInfo.repeatingDigits,
          digitCount: repeatingInfo.digitCount,
          metadata: {
            postNo: post.no,
            checkCount: 0
          }
        });
      }
    }

    // Second pass: count checks for each GET
    for (const thread of threads) {
      if (!thread.posts) continue;

      for (const post of thread.posts) {
        for (const [getPostNo, result] of getResults) {
          if (this.isCheckingPost(post, getPostNo)) {
            result.metadata.checkCount++;
          }
        }
      }
    }

    // Sort results by check count and limit to MAX_RESULTS
    const sortedResults = Array.from(getResults.values())
      .sort((a, b) => b.metadata.checkCount - a.metadata.checkCount)
      .slice(0, GetAnalyzer.MAX_RESULTS);

    return sortedResults;
  }
} 