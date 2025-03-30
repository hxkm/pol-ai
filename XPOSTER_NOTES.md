# Xposter Integration Notes

## Overview
The Xposter will be a separate application that reads article summaries from the pol-ai data directory and posts them to X (Twitter). This document outlines the key data structures and requirements.

## Data Location
- Base Path: `/data/analysis/articles.json`
- Each article represents a summarized thread analysis

## Data Structure
```typescript
interface Article {
  id: string;              // Unique identifier (thread ID)
  title: string;          // Generated title for the thread
  summary: string;        // AI-generated summary
  timestamp: string;      // When the analysis was performed
  metrics: {
    replies: number;     // Total replies in thread
    images: number;      // Number of images
    uniquePosters: number; // Unique poster count
  };
  flags: {               // Country flag statistics
    [country: string]: number;
  };
  sentiment: {           // Sentiment analysis
    positive: number;
    negative: number;
    neutral: number;
  };
  keywords: string[];    // Key topics/terms
  links: string[];       // External links found
}

interface ArticlesFile {
  timestamp: string;     // Last update time
  articles: Article[];   // Array of analyzed threads
  batchStats: {         // Batch processing stats
    totalThreads: number;
    processedAt: string;
  };
}
```

## Key Considerations for Xposter

### Data Access
- Read-only access to articles.json required
- No need to modify the original data
- Should handle file not found/empty file cases

### Content Selection
- Need criteria for which articles to post
  - Minimum reply count
  - Recent timestamps
  - Interesting metrics/stats
  - Diverse topics

### Post Format
- Title + Summary combination
- Include key metrics
- Add relevant hashtags based on keywords
- Consider thread metrics for engagement

### Rate Limiting
- Respect X API limits
- Space out posts appropriately
- Track last posted article

### Error Handling
- Handle missing/malformed data
- Implement retry logic for API failures
- Log errors without crashing

## Example Article Data
```json
{
  "id": "123456789",
  "title": "Discussion on Global Economic Impact",
  "summary": "Thread analyzing current economic trends...",
  "timestamp": "2024-03-15T14:30:00Z",
  "metrics": {
    "replies": 150,
    "images": 12,
    "uniquePosters": 45
  },
  "flags": {
    "US": 25,
    "GB": 15,
    "DE": 10
  },
  "sentiment": {
    "positive": 0.3,
    "negative": 0.5,
    "neutral": 0.2
  },
  "keywords": ["economy", "markets", "inflation"],
  "links": ["reuters.com/article123", "bloomberg.com/news456"]
}
```

## Next Steps
1. Create basic Xposter app structure
2. Implement articles.json reader
3. Design post format/template
4. Add X API integration
5. Create posting schedule/logic
6. Implement error handling and logging
7. Add configuration options

## Notes
- Keep the implementation simple and focused
- Start with basic posting functionality
- Add features incrementally as needed
- Maintain clear logging for debugging 