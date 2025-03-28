import { XConfig } from './types';
import path from 'path';
import dotenv from 'dotenv';
import { paths } from '@/app/utils/paths';

// Load environment variables first
dotenv.config({
  path: path.resolve(process.cwd(), '.env.local')
});

function validateConfig() {
  const required = ['X_API_KEY', 'X_API_KEY_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_TOKEN_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Validate after loading
validateConfig();

export const X_CONFIG: XConfig = {
  apiKey: process.env.X_API_KEY!,
  apiKeySecret: process.env.X_API_KEY_SECRET!,
  accessToken: process.env.X_ACCESS_TOKEN!,
  accessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET!
};

export const PATHS = {
  articlesJson: path.resolve(paths.analysisDir, 'articles.json'),
  postedJson: path.resolve(paths.xposterDir, 'posted.json'),
};

export const X_API = {
  baseUrl: 'https://api.twitter.com',
  apiVersion: '2',
  tweetEndpoint: '/2/tweets',
  callbackUrl: 'https://pol-ai-production.up.railway.app/callback',
  websiteUrl: 'https://pol-ai-production.up.railway.app/',
  appType: 'automated',
  permissions: 'read-write',
  rateLimit: {
    tweetsPerWindow: 50,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
};

export const TWEET_CONFIG = {
  maxLength: 280,
  urlLength: 23, // URLs are counted as 23 chars regardless of length
  suffix: ' #4chan',
  threadUrlBase: 'https://4plebs.org/pol/thread/',
}; 