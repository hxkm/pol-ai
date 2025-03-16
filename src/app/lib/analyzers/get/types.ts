import { AnalyzerResult } from '../../../types/interfaces';

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
  repeatingDigits: string;    // The actual repeating digits
  digitCount: number;         // Number of repeating digits
  metadata: {
    postNo: number;          // The post number that got the GET
    checkCount: number;      // Number of times this GET was checked
  };
} 