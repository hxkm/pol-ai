import { Thread, Post } from '../../../types/interfaces';
import { BaseAnalyzer } from '../base';
import { GetAnalyzerResult, GetType } from './types';

/**
 * Analyzer for finding posts with repeating digits (GETs) and tracking how many times they are checked
 */
export class GetAnalyzer extends BaseAnalyzer<GetAnalyzerResult> {
  private static readonly CHECK_KEYWORDS = ['check', 'checked', 'get', 'digits', 'dubs', 'trips', 'quads', 'quints'];
  private static readonly MAX_RESULTS = 50;
  private static readonly MAX_AGE_DAYS = 7;
  private static readonly MIN_CHECK_COUNT = 1;  // Minimum checks to be considered

  public readonly name = 'get';
  public readonly description = 'Tracks posts with repeating trailing digits (GETs) and how many times they were checked';

  /**
   * Find repeating trailing digits in a post number
   */
  private findTrailingDigits(postNo: number): { repeatingDigits: string; digitCount: number } | null {
    const postStr = postNo.toString();
    let count = 1;
    const lastDigit = postStr[postStr.length - 1];
    
    // Count from right to left until we hit a different digit
    for (let i = postStr.length - 2; i >= 0; i--) {
      if (postStr[i] === lastDigit) {
        count++;
      } else {
        break;
      }
    }

    return count >= 2 ? {
      repeatingDigits: lastDigit.repeat(count),
      digitCount: count
    } : null;
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
   * Calculate a score for ranking GETs based on both digit count and check count
   */
  private calculateGetScore(digitCount: number, checkCount: number): number {
    // Exponential weight for digit count (e.g., quads are much more valuable than dubs)
    const digitScore = Math.pow(2, digitCount);
    // Linear weight for check count
    const checkScore = checkCount;
    // Combine scores with digit count having higher priority
    return (digitScore * 1000) + checkScore;
  }

  /**
   * Check if a post is checking a GET
   */
  private isCheckingPost(post: Post, targetPostNo: number): boolean {
    if (!post.com) return false;
    
    const comment = post.com.toLowerCase();
    const postNoStr = targetPostNo.toString();
    
    // Check if the comment contains both a keyword and the post number
    return GetAnalyzer.CHECK_KEYWORDS.some(keyword => comment.includes(keyword)) &&
           comment.includes(postNoStr);
  }

  /**
   * Clean old results before saving new ones
   */
  private cleanOldResults(results: GetAnalyzerResult[]): GetAnalyzerResult[] {
    const cutoffTime = Date.now() - (GetAnalyzer.MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
    return results.filter(result => result.timestamp > cutoffTime);
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
        const repeatingInfo = this.findTrailingDigits(post.no);
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
            checkCount: 0,
            comment: post.com || ''
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

    // Filter out GETs with too few checks and old results
    const significantGets = Array.from(getResults.values())
      .filter(result => result.metadata.checkCount >= GetAnalyzer.MIN_CHECK_COUNT);

    // Try to load existing results
    let existingResults: GetAnalyzerResult[] = [];
    try {
      const previousResults = await this.loadResults();
      if (Array.isArray(previousResults)) {
        existingResults = this.cleanOldResults(previousResults);
      }
    } catch {
      // If loading fails, continue with empty existing results
    }

    // Merge new and existing results, removing duplicates
    const allResults = [...existingResults];
    for (const newResult of significantGets) {
      const existingIndex = allResults.findIndex(r => r.postId === newResult.postId);
      if (existingIndex >= 0) {
        // Update existing result if new one has more checks
        if (newResult.metadata.checkCount > allResults[existingIndex].metadata.checkCount) {
          allResults[existingIndex] = newResult;
        }
      } else {
        allResults.push(newResult);
      }
    }

    // Sort by combined score of digit count and check count
    return allResults
      .sort((a, b) => 
        this.calculateGetScore(b.digitCount, b.metadata.checkCount) - 
        this.calculateGetScore(a.digitCount, a.metadata.checkCount)
      )
      .slice(0, GetAnalyzer.MAX_RESULTS);
  }
} 