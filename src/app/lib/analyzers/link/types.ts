import { AnalyzerResult, Post } from '../../../types/interfaces';

/**
 * Categories for different types of links
 */
export enum LinkCategory {
  NEWS = 'news',           // News articles, blogs
  IMAGE = 'image',         // Image hosting sites
  SOCIAL = 'social',       // Social media, forums
  ARCHIVE = 'archive',     // Archive.org, archives.is
  REFERENCE = 'reference', // Wikipedia, documentation
  OTHER = 'other'          // Uncategorized
}

/**
 * Structure for tracking domain frequency
 */
export interface DomainStats {
  domain: string;          // The domain (e.g., "example.com")
  count: number;          // How many times this domain appears
  lastSeen: number;       // Timestamp of last appearance
}

/**
 * Structure for a link found in a post
 */
export interface TrackedLink {
  url: string;            // Full URL of the link
  domain: string;         // Extracted domain
  category: LinkCategory; // Categorized type of link
  title?: string;        // Title or text describing the link
}

/**
 * Structure for a post containing a link
 */
export interface LinkPost {
  sourcePost: Post;       // The post containing the link
  link: TrackedLink;      // The link found in the post
  threadId: number;       // ID of the thread containing this post
  timestamp: number;      // When this post was made
}

/**
 * Result structure for Link analysis
 */
export interface LinkAnalyzerResult extends AnalyzerResult {
  // Top domains across all posts
  topDomains: DomainStats[];
  
  // Random selection of links
  randomLinks: LinkPost[];
  
  // Metadata about the analysis
  metadata: {
    totalLinksFound: number;      // Total number of links processed
    uniqueDomains: number;        // Number of unique domains found
    excludedYoutubeLinks: number; // Number of YouTube links skipped
    excludedOpLinks: number;      // Number of OP links skipped
  };
} 