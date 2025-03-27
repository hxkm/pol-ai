export interface XConfig {
  apiKey: string;
  apiKeySecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

export interface PostedArticle {
  threadId: number;
  timestamp: number;
  tweetId: string;
}

export interface Article {
  threadId: number;
  headline: string;
  article: string;
  metadata: {
    totalPosts: number;
    analyzedPosts: number;
    generatedAt: number;
  };
}

export interface PostResult {
  success: boolean;
  tweetId?: string;
  error?: string;
} 