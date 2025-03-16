import { loadEnvConfig } from '@next/env';
import { AntisemitismMatrixAnalyzer } from '../app/lib/analyzers/AntisemitismMatrix';
import { ArticleAnalysis } from '../app/types/article';

// Load environment variables
loadEnvConfig(process.cwd());

// Sample article data for testing
const sampleArticles: ArticleAnalysis[] = [
  {
    threadId: 1,
    headline: "Anti-Semitic and Anti-Muslim Sentiments Online",
    article: "A series of posts reveal virulent anti-Semitic and anti-Muslim sentiments, with users expressing hatred toward Jews, Muslims, and Israel. One user claims their \"boomer mom\" is \"waking up to how evil Jews are,\" while another states, \"Fuck Israel, Jews, and Muslims.\" Anti-Semitic slurs are used frequently.",
    antisemiticStats: {
      analyzedComments: 100,
      antisemiticComments: 25,
      percentage: 25.0
    },
    metadata: {
      totalPosts: 300,
      analyzedPosts: 100,
      generatedAt: Date.now()
    }
  },
  {
    threadId: 2,
    headline: "Anti-Israel Sentiment and Racial Slurs Dominate Online Discourse",
    article: "A series of posts reveals intense anti-Israel sentiment and conspiracy theories. Users express hostile views about Israel's influence on U.S. foreign policy. Some users defend certain positions while others criticize alignment with Israel. Conspiracy theories about Jewish influence are prevalent.",
    antisemiticStats: {
      analyzedComments: 80,
      antisemiticComments: 15,
      percentage: 18.75
    },
    metadata: {
      totalPosts: 250,
      analyzedPosts: 80,
      generatedAt: Date.now()
    }
  },
  {
    threadId: 3,
    headline: "Online Debate on Global Politics",
    article: "Discussion covers various global political topics including Middle East conflicts, international relations, and economic policies. Users express strong opinions about foreign influence, global banking systems, and media control. Some comments suggest conspiracy theories about global power structures.",
    antisemiticStats: {
      analyzedComments: 90,
      antisemiticComments: 10,
      percentage: 11.11
    },
    metadata: {
      totalPosts: 280,
      analyzedPosts: 90,
      generatedAt: Date.now()
    }
  }
];

async function main() {
  try {
    // Check API key
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY environment variable is not set');
    }
    console.log('✓ DeepSeek API key found');

    // Initialize matrix analyzer
    console.log('Initializing matrix analyzer...');
    const analyzer = new AntisemitismMatrixAnalyzer(apiKey);

    // Run analysis
    console.log('Running matrix analysis...');
    const matrix = await analyzer.analyze(sampleArticles);

    // Log results
    console.log('\nAnalysis Results:');
    console.log('Statistics:', matrix.statistics);
    console.log('\nThemes:', matrix.themes);
    console.log('\nTrends:', matrix.trends);

  } catch (error) {
    console.error('Error running matrix test:', error);
    process.exit(1);
  }
}

// Run the test
main(); 