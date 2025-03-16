import { DeepSeekClient } from '../deepseek';
import { ArticleAnalysis } from '@/app/types/article';
import { AntisemitismMatrix, AntisemitismTheme, AntisemitismTrend } from '@/app/types/antisemitism';
import { DeepSeekMessage } from '@/app/types/deepseek';
import path from 'path';
import fs from 'fs/promises';

// Constants for data management
const HOURS_TO_KEEP = 48; // Keep 48 hours of data
const MAX_TRENDS_PER_HOUR = 3; // Maximum 3 data points per hour (since we run daily)
const MAX_STORED_TRENDS = HOURS_TO_KEEP * MAX_TRENDS_PER_HOUR; // 144 total possible data points
const TREND_INTERVAL = 60 * 60 * 1000; // Minimum 1 hour between updates since we run daily

interface ThemeData {
  themes: {
    name: string;
    frequency: number;
    keywords: string[];
  }[];
}

export class AntisemitismMatrixAnalyzer {
  private client: DeepSeekClient;
  private historicalDataPath: string;
  private latestAnalysisPath: string;

  constructor(apiKey: string) {
    this.client = new DeepSeekClient(apiKey);
    const analysisDir = path.resolve(process.cwd(), 'data', 'analysis');
    this.historicalDataPath = path.resolve(analysisDir, 'antisemitism-trends.json');
    this.latestAnalysisPath = path.resolve(analysisDir, 'latest-analysis.json');
  }

  private async rotateLogs() {
    try {
      // Check if latest analysis exists and is too large (>10MB)
      try {
        const stats = await fs.stat(this.latestAnalysisPath);
        if (stats.size > 10 * 1024 * 1024) { // 10MB
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const backupPath = this.latestAnalysisPath.replace('.json', `-${timestamp}.json`);
          await fs.rename(this.latestAnalysisPath, backupPath);
        }
      } catch (e) {
        // File doesn't exist yet, ignore
      }

      // Clean up old backups (keep last 5)
      const dir = path.dirname(this.latestAnalysisPath);
      const files = await fs.readdir(dir);
      const backups = files
        .filter(f => f.startsWith('latest-analysis-') && f.endsWith('.json'))
        .sort()
        .reverse();

      // Remove all but the last 5 backups
      for (const backup of backups.slice(5)) {
        await fs.unlink(path.join(dir, backup));
      }
    } catch (error) {
      console.error('Error rotating logs:', error);
    }
  }

  private async saveAnalysis(data: any) {
    await this.rotateLogs();
    await fs.mkdir(path.dirname(this.latestAnalysisPath), { recursive: true });
    await fs.writeFile(
      this.latestAnalysisPath,
      JSON.stringify(data, null, 2),
      'utf-8'
    );
  }

  private shouldUpdateTrend(trends: AntisemitismTrend[]): boolean {
    if (trends.length === 0) return true;
    
    const lastUpdate = trends[trends.length - 1].timestamp;
    return Date.now() - lastUpdate >= TREND_INTERVAL;
  }

  private calculateStatistics(articles: ArticleAnalysis[]) {
    const percentages = articles.map(a => a.antisemiticStats.percentage);
    const totalAnalyzed = articles.reduce((sum, a) => sum + a.antisemiticStats.analyzedComments, 0);
    const totalAntisemitic = articles.reduce((sum, a) => sum + a.antisemiticStats.antisemiticComments, 0);

    // Calculate mean
    const mean = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;

    // Calculate median
    const sorted = [...percentages].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle];

    return {
      mean,
      median,
      totalAnalyzed,
      totalAntisemitic
    };
  }

  private async generateThemes(articles: ArticleAnalysis[]): Promise<AntisemitismTheme[]> {
    try {
      console.log("Generating themes from articles...");
      console.log(`Analyzing ${articles.length} articles for themes...`);

      const prompt = this.generateThemePrompt(articles);
      console.log("Sending theme analysis request to DeepSeek...");
      const response = await this.client.chat({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are an academic researcher analyzing antisemitic content patterns.
Your task is to identify exactly 5 dominant themes in the provided content.
For each theme:
1. Provide a clear, specific name
2. List 3-5 relevant keywords
3. Note frequency (percentage of content this theme appears in)
Do not include any commentary or recommendations.
Maintain strict academic objectivity.
Format your response as JSON matching this structure:
{
  "themes": [
    {
      "name": "theme name",
      "frequency": number,
      "keywords": ["word1", "word2", "word3"]
    }
  ]
}`
          },
          {
            role: 'user',
            content: `Analyze these summaries and identify exactly 5 dominant antisemitic themes:\n\n${prompt}`
          }
        ],
        temperature: 0.3
      });
      
      console.log('Parsing DeepSeek response...');
      console.log('Response content:', response.choices[0].message.content);

      // Extract JSON from markdown code block if present
      let jsonContent = response.choices[0].message.content;
      if (jsonContent.includes("```json")) {
        jsonContent = jsonContent.split("```json")[1].split("```")[0].trim();
      }

      const themeData = JSON.parse(jsonContent) as ThemeData;
      
      if (!themeData.themes || themeData.themes.length === 0) {
        console.error('No themes found in response');
        return [];
      }

      console.log(`Successfully generated ${themeData.themes.length} themes`);
      
      // Add empty examples array - examples will be populated in a future update
      return themeData.themes.map(theme => ({
        ...theme,
        examples: []
      }));
    } catch (error) {
      console.error("Failed to generate themes. Error details:", error);
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      return [];
    }
  }

  private generateThemePrompt(articles: ArticleAnalysis[]): string {
    return articles.map(article => {
      return `Thread ${article.threadId}:
Headline: ${article.headline}
Article: ${article.article}
Antisemitic content: ${article.antisemiticStats.antisemiticComments} out of ${article.antisemiticStats.analyzedComments} posts (${article.antisemiticStats.percentage.toFixed(2)}%)`;
    }).join('\n\n');
  }

  private async loadHistoricalTrends(): Promise<AntisemitismTrend[]> {
    try {
      const content = await fs.readFile(this.historicalDataPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  private async saveHistoricalTrends(trends: AntisemitismTrend[]) {
    try {
      await fs.mkdir(path.dirname(this.historicalDataPath), { recursive: true });
      
      // Ensure the file doesn't grow too large
      const cleanedTrends = this.cleanTrends(trends);
      
      await fs.writeFile(
        this.historicalDataPath,
        JSON.stringify(cleanedTrends, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Failed to save historical trends:', error);
    }
  }

  private cleanTrends(trends: AntisemitismTrend[]): AntisemitismTrend[] {
    const now = Date.now();
    const twoDaysAgo = now - (HOURS_TO_KEEP * 60 * 60 * 1000);
    
    // Group trends by hour
    const trendsByHour = new Map<number, AntisemitismTrend[]>();
    
    trends
      .filter(t => t.timestamp > twoDaysAgo) // Keep last 48 hours
      .forEach(trend => {
        const hour = Math.floor(trend.timestamp / (60 * 60 * 1000));
        if (!trendsByHour.has(hour)) {
          trendsByHour.set(hour, []);
        }
        trendsByHour.get(hour)!.push(trend);
      });
    
    // For each hour, keep only MAX_TRENDS_PER_HOUR most recent entries
    const cleanedTrends: AntisemitismTrend[] = [];
    for (const hourTrends of trendsByHour.values()) {
      cleanedTrends.push(
        ...hourTrends
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, MAX_TRENDS_PER_HOUR)
      );
    }
    
    // Sort by timestamp and limit total entries
    return cleanedTrends
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-MAX_STORED_TRENDS);
  }

  private async updateTrends(articles: ArticleAnalysis[]): Promise<AntisemitismTrend[]> {
    const historicalTrends = await this.loadHistoricalTrends();
    
    // Check if we should add a new trend point
    if (!this.shouldUpdateTrend(historicalTrends)) {
      return historicalTrends;
    }

    const currentTrend: AntisemitismTrend = {
      timestamp: Date.now(),
      percentage: articles.reduce((sum, a) => sum + a.antisemiticStats.percentage, 0) / articles.length,
      threadCount: articles.length
    };

    const updatedTrends = [...historicalTrends, currentTrend];
    await this.saveHistoricalTrends(updatedTrends);
    
    return updatedTrends;
  }

  async analyze(articles: ArticleAnalysis[]): Promise<AntisemitismMatrix> {
    console.log('\nGenerating antisemitism matrix...');
    
    try {
      // Run all analysis steps in parallel
      const [statistics, themes, trends] = await Promise.all([
        Promise.resolve(this.calculateStatistics(articles)),
        this.generateThemes(articles).catch(error => {
          console.error('Theme generation failed:', error);
          return []; // Fallback to empty themes but continue analysis
        }),
        this.updateTrends(articles).catch(error => {
          console.error('Trend update failed:', error);
          return []; // Fallback to empty trends but continue analysis
        })
      ]);

      const matrix = {
        statistics,
        themes,
        trends,
        generatedAt: Date.now()
      };

      // Save only the trends data - full analysis is saved by Summarizer
      if (trends.length > 0) {
        await this.saveHistoricalTrends(trends);
      }

      return matrix;
    } catch (error) {
      console.error('Error in matrix analysis:', error);
      throw error;
    }
  }
} 