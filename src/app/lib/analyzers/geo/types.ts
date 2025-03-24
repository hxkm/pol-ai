import { AnalyzerResult } from '../../../types/interfaces';

/**
 * Statistics for a single country
 */
export interface CountryStats {
  code: string;         // Country code
  name: string;         // Full country name
  postCount: number;    // Total number of posts from this country
  uniquePosters: number; // Number of unique posters from this country
  lastSeen: number;     // Timestamp of last appearance
}

/**
 * Result structure for Geo analysis
 */
export interface GeoAnalyzerResult extends AnalyzerResult {
  totalUniqueCountries: number;        // Total count of unique countries seen
  mostCommonCountries: CountryStats[]; // Top 4 countries with most total posts
  rarestCountries: CountryStats[];     // Bottom 4 countries with least total posts
  metadata: {
    totalPostsAnalyzed: number;        // Total number of posts processed
    postsWithLocation: number;         // Number of posts that had country data
  };
} 