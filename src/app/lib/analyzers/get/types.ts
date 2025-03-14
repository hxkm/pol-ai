import { AnalyzerResult, Post } from '../../../types/interfaces';

/**
 * Types of GETs based on number of repeating digits
 */
export enum GetType {
  DUBS = 'dubs',     // Two repeating digits
  TRIPS = 'trips',   // Three repeating digits
  QUADS = 'quads',   // Four repeating digits
  QUINTS = 'quints', // Five repeating digits
  SEXTS = 'sexts',   // Six repeating digits
  SEPTS = 'septs',   // Seven repeating digits
  OCTS = 'octs',     // Eight repeating digits
  SPECIAL = 'special' // Nine or more repeating digits
}

/**
 * Result structure for GET analysis
 */
export interface GetAnalyzerResult extends AnalyzerResult {
  getType: GetType;           // Type of GET (dubs/trips/etc)
  getPost: Post;             // The post that got the GET
  checkingPosts: Post[];     // Posts that checked the GET
  repeatingDigits: string;   // The actual repeating digits
  digitCount: number;        // Number of repeating digits
} 