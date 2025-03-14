/**
 * Core type definitions for the application
 */

// 4chan Thread structure
export interface Thread {
  no: number;           // Thread ID
  time: number;         // Unix timestamp
  name: string;         // Name field
  sub?: string;         // Subject
  com?: string;         // Comment HTML
  replies: number;      // Number of replies
  images: number;       // Number of images
  sticky?: number;      // If thread is stickied
  closed?: number;      // If thread is closed
  archived?: number;    // If thread is archived
  posts?: Post[];       // Array of posts in thread
  lastModified?: number; // When we last fetched this thread
  // Image fields (from Post interface, as OP is also a post)
  tim?: number;         // Renamed filename
  ext?: string;         // File extension
  filename?: string;    // Original filename
  fsize?: number;       // File size
  md5?: string;         // File MD5
  w?: number;           // Image width
  h?: number;           // Image height
  tn_w?: number;        // Thumbnail width
  tn_h?: number;        // Thumbnail height
}

// 4chan Post structure
export interface Post {
  no: number;           // Post ID
  resto: number;        // Reply to thread ID (0 for OP)
  time: number;         // Unix timestamp
  name: string;         // Name field
  trip?: string;        // Tripcode
  id?: string;          // ID
  country?: string;     // Country code
  country_name?: string; // Country name
  com?: string;         // Comment HTML
  tim?: number;         // Renamed filename
  filename?: string;    // Original filename
  ext?: string;         // File extension
  fsize?: number;       // File size
  md5?: string;         // File MD5
  w?: number;           // Image width
  h?: number;           // Image height
  tn_w?: number;        // Thumbnail width
  tn_h?: number;        // Thumbnail height
}

// Thread Summary structure
export interface ThreadSummary {
  threadId: number;     // Thread ID
  title: string;        // Thread title/subject
  summary: string;      // AI-generated summary
  postCount: number;    // Number of posts
  imageCount: number;   // Number of images
  created: number;      // Creation timestamp
  lastUpdated: number;  // Last update timestamp
  countries: Record<string, number>; // Country distribution
  keywords: string[];   // Key topics/themes
  sentiment: string;    // Overall sentiment
}

// API Response structure
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// Axios error interface
export interface AxiosErrorResponse {
  status: number;
  data: unknown;
}

export interface AxiosError {
  isAxiosError: boolean;
  response?: AxiosErrorResponse;
}

// Axios error type guard
export function isAxiosError(error: unknown): error is AxiosError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  );
}

/**
 * Base interface for all analyzer results
 */
export interface AnalyzerResult {
  timestamp: number;      // When this result was generated
  threadId: number;      // Source thread ID
  postId: number;        // Source post ID
  metadata: Record<string, unknown>; // Flexible metadata storage
}

/**
 * Base interface for analyzer storage
 */
export interface AnalyzerStorage<T extends AnalyzerResult> {
  lastUpdated: number;   // Last time this storage was updated
  results: T[];         // Array of analysis results
}

/**
 * Base interface for all analyzers
 */
export interface Analyzer<T extends AnalyzerResult> {
  name: string;         // Unique identifier for this analyzer
  description: string;  // Human readable description
  analyze(threads: Thread[]): Promise<T[]>;  // Analysis function for all threads
  saveResults(results: T[]): Promise<void>;  // Save results to disk
  loadResults(): Promise<T[]>;  // Load results from disk
  purgeOldResults(): Promise<void>;  // Remove old results
} 