export interface AntisemitismTheme {
  name: string;
  frequency: number;
  keywords: string[];
  examples: string[];  // Sanitized examples for research
}

export interface AntisemitismStatistics {
  mean: number;
  median: number;
  totalAnalyzed: number;
  totalAntisemitic: number;
}

export interface AntisemitismTrend {
  timestamp: number;
  percentage: number;
  threadCount: number;
}

export interface AntisemitismMatrix {
  statistics: AntisemitismStatistics;
  themes: AntisemitismTheme[];
  trends: AntisemitismTrend[];
  generatedAt: number;
} 