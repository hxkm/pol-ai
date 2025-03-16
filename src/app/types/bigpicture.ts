export interface Theme {
  name: string;
  frequency: number;
  keywords: string[];
}

export interface Sentiment {
  name: string;
  intensity: number;  // 0-100 scale
  keywords: string[];
}

export interface BigPictureAnalysis {
  overview: {
    article: string;
    generatedAt: number;
  };
  themes: Theme[];
  sentiments: Sentiment[];
} 