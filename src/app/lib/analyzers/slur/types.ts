import { AnalyzerResult } from '../../../types/interfaces';

/**
 * Statistics for a tracked term
 */
export interface TermStats {
  term: string;           // The term being tracked
  count: number;          // Current occurrence count
  previousCount: number;  // Count from previous scrape
  percentChange: number;  // Percentage change from previous count
  lastSeen: number;      // Timestamp of last occurrence
}

/**
 * Result structure for Slur analysis
 */
export interface SlurAnalyzerResult extends AnalyzerResult {
  termStats: TermStats[];  // Statistics for each tracked term
  metadata: {
    totalPostsAnalyzed: number;     // Total number of posts processed
    postsWithTerms: number;         // Number of posts containing tracked terms
    totalTermsFound: number;        // Total occurrences of all terms
    lastAnalysis: number;           // Timestamp of previous analysis
  };
} 