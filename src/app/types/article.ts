import { Thread } from './interfaces';

export interface ArticleAnalysis {
  threadId: number;
  headline: string;
  article: string;
  antisemiticStats: {
    analyzedComments: number;
    antisemiticComments: number;
    percentage: number;
  };
  metadata: {
    totalPosts: number;
    analyzedPosts: number;
    generatedAt: number;
  };
}

export interface ArticleGeneratorConfig {
  analysisPercentage: number;  // Percentage of comments to analyze (e.g., 30)
}

export interface ArticleBatch {
  articles: ArticleAnalysis[];
  batchStats: {
    totalThreads: number;
    totalAnalyzedPosts: number;
    averageAntisemiticPercentage: number;
    generatedAt: number;
  };
} 