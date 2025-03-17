import { Thread, Post } from '../../../types/interfaces';
import { BaseAnalyzer } from '../base';
import { SlurAnalyzerResult, TermStats } from './types';

/**
 * Analyzer for tracking occurrences of specific terms
 */
export class SlurAnalyzer extends BaseAnalyzer<SlurAnalyzerResult> {
  name = 'slur';
  description = 'Tracks occurrences of specific discriminatory terms for research purposes';

  // Terms to track (case-insensitive)
  private static TRACKED_TERMS = [
    'nigger', 'kike', 'fag', 'chink', 'jeet', 'chud', 'spic', 'incel',
    'boomer', 'burger', 'zoomer', 'roach', 'groyper', 'mudslime', 'brownoid',
    'shitskin', 'roastie'
  ];

  /**
   * Count term occurrences in text
   */
  private countTerms(text: string): Map<string, number> {
    const counts = new Map<string, number>();
    const lowerText = text.toLowerCase();

    for (const term of SlurAnalyzer.TRACKED_TERMS) {
      // Create a regex that matches whole words only
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) {
        counts.set(term, matches.length);
      }
    }

    return counts;
  }

  /**
   * Process a post to count term occurrences
   */
  private processPost(
    post: Post,
    termTotals: Map<string, number>,
    postsWithTerms: Set<number>
  ): void {
    if (!post.com) return;

    const termCounts = this.countTerms(post.com);
    
    if (termCounts.size > 0) {
      postsWithTerms.add(post.no);
    }

    // Update totals
    for (const [term, count] of termCounts) {
      const currentTotal = termTotals.get(term) || 0;
      termTotals.set(term, currentTotal + count);
    }
  }

  /**
   * Calculate percentage change from previous count
   */
  private calculatePercentChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Analyze threads for term occurrences
   */
  async analyze(threads: Thread[]): Promise<SlurAnalyzerResult[]> {
    console.log('Starting term analysis...');
    
    const termTotals = new Map<string, number>();
    const postsWithTerms = new Set<number>();
    let totalPosts = 0;

    // Initialize counts for all tracked terms
    SlurAnalyzer.TRACKED_TERMS.forEach(term => termTotals.set(term, 0));

    // Process each thread
    for (const thread of threads) {
      if (!thread.posts) continue;

      // Process OP post
      if (thread.com) {
        this.processPost(
          {
            no: thread.no,
            resto: 0,
            time: thread.time,
            name: thread.name || 'Anonymous',
            com: thread.com
          },
          termTotals,
          postsWithTerms
        );
        totalPosts++;
      }

      // Process each reply
      for (const post of thread.posts) {
        this.processPost(post, termTotals, postsWithTerms);
        totalPosts++;
      }
    }

    // Load previous results to calculate changes
    const previousResults = await this.loadResults();
    const lastResult = previousResults[previousResults.length - 1];
    const previousTermStats = lastResult?.termStats || [];

    // Create term statistics with percentage changes
    const termStats: TermStats[] = SlurAnalyzer.TRACKED_TERMS.map(term => {
      const count = termTotals.get(term) || 0;
      const previousStat = previousTermStats.find(stat => stat.term === term);
      const previousCount = previousStat?.count || 0;

      return {
        term,
        count,
        previousCount,
        percentChange: this.calculatePercentChange(count, previousCount),
        lastSeen: Date.now()
      };
    });

    // Calculate total occurrences
    const totalTermsFound = Array.from(termTotals.values())
      .reduce((sum, count) => sum + count, 0);

    // Create single result
    return [{
      timestamp: Date.now(),
      threadId: threads[0]?.no || -1,
      postId: threads[0]?.posts?.[0]?.no || -1,
      termStats,
      metadata: {
        totalPostsAnalyzed: totalPosts,
        postsWithTerms: postsWithTerms.size,
        totalTermsFound,
        lastAnalysis: lastResult?.timestamp || Date.now()
      }
    }];
  }
} 