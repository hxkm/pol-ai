import { Thread } from '../types/interfaces';
import { ArticleGenerator } from './ArticleGenerator';
import { ArticleBatch } from '../types/article';
import { AntisemitismMatrix } from '../types/antisemitism';
import { AntisemitismMatrixAnalyzer } from './analyzers/AntisemitismMatrix';
import { BigPictureGenerator } from './analyzers/BigPictureGenerator';
import { BigPictureAnalysis } from '../types/bigpicture';

export class Summarizer {
  private articleGenerator: ArticleGenerator;
  private matrixAnalyzer: AntisemitismMatrixAnalyzer;
  private bigPictureGenerator: BigPictureGenerator;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('DeepSeek API key is required');
    }
    this.articleGenerator = new ArticleGenerator(apiKey);
    this.matrixAnalyzer = new AntisemitismMatrixAnalyzer(apiKey);
    this.bigPictureGenerator = new BigPictureGenerator(apiKey);
  }

  async analyze(threads: Thread[]): Promise<{
    articles: ArticleBatch;
    matrix: AntisemitismMatrix;
    bigPicture: BigPictureAnalysis;
  }> {
    console.log(`Starting analysis of ${threads.length} threads...`);
    
    // Generate articles first
    const articles = await this.articleGenerator.generateArticles(threads, (threadId) => {
      console.log(`Progress: ${threadId} completed`);
    });
    
    // Run matrix and big picture analysis in parallel
    const [matrix, bigPicture] = await Promise.all([
      this.matrixAnalyzer.analyze(articles.articles),
      this.bigPictureGenerator.analyze(threads, articles.articles)
    ]);
    
    console.log('\nAnalysis complete:');
    console.log(`- Analyzed ${articles.batchStats.totalAnalyzedPosts} posts across ${articles.batchStats.totalThreads} threads`);
    console.log(`- Average antisemitic content: ${articles.batchStats.averageAntisemiticPercentage.toFixed(2)}%`);
    console.log(`- Identified ${matrix.themes.length} antisemitic themes`);
    console.log(`- Mean antisemitic percentage: ${matrix.statistics.mean.toFixed(2)}%`);
    console.log(`- Median antisemitic percentage: ${matrix.statistics.median.toFixed(2)}%`);
    console.log(`- Generated big picture overview with ${bigPicture.themes.length} general themes`);
    console.log(`- Identified ${bigPicture.sentiments.length} major sentiments`);
    
    return { articles, matrix, bigPicture };
  }
} 