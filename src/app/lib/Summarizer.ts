import { Thread } from '../types/interfaces';
import { ArticleGenerator } from './ArticleGenerator';
import { ArticleBatch } from '../types/article';
import { AntisemitismMatrix } from '../types/antisemitism';
import { AntisemitismMatrixAnalyzer } from './analyzers/AntisemitismMatrix';

export class Summarizer {
  private articleGenerator: ArticleGenerator;
  private matrixAnalyzer: AntisemitismMatrixAnalyzer;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('DeepSeek API key is required');
    }
    this.articleGenerator = new ArticleGenerator(apiKey);
    this.matrixAnalyzer = new AntisemitismMatrixAnalyzer(apiKey);
  }

  async analyze(threads: Thread[]): Promise<{
    articles: ArticleBatch;
    matrix: AntisemitismMatrix;
  }> {
    console.log(`Starting analysis of ${threads.length} threads...`);
    
    // Generate articles first
    const articles = await this.articleGenerator.generateArticles(threads, (threadId) => {
      console.log(`Progress: ${threadId} completed`);
    });
    
    // Generate antisemitism matrix
    const matrix = await this.matrixAnalyzer.analyze(articles.articles);
    
    console.log('\nAnalysis complete:');
    console.log(`- Analyzed ${articles.batchStats.totalAnalyzedPosts} posts across ${articles.batchStats.totalThreads} threads`);
    console.log(`- Average antisemitic content: ${articles.batchStats.averageAntisemiticPercentage.toFixed(2)}%`);
    console.log(`- Identified ${matrix.themes.length} dominant themes`);
    console.log(`- Mean antisemitic percentage: ${matrix.statistics.mean.toFixed(2)}%`);
    console.log(`- Median antisemitic percentage: ${matrix.statistics.median.toFixed(2)}%`);
    
    return { articles, matrix };
  }
} 