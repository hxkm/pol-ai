import { Thread, Analyzer, AnalyzerResult } from '../../types/interfaces';

/**
 * Registry for managing all thread analyzers
 */
class AnalyzerRegistry {
  private analyzers: Map<string, Analyzer<any>> = new Map();
  private initialized = false;

  /**
   * Register a new analyzer
   */
  register<T extends AnalyzerResult>(analyzer: Analyzer<T>): void {
    if (this.analyzers.has(analyzer.name)) {
      throw new Error(`Analyzer '${analyzer.name}' is already registered`);
    }
    
    // Validate analyzer implementation
    if (!analyzer.analyze || !analyzer.saveResults || !analyzer.loadResults || !analyzer.purgeOldResults) {
      throw new Error(`Analyzer '${analyzer.name}' is missing required methods`);
    }
    
    this.analyzers.set(analyzer.name, analyzer);
    console.log(`Registered analyzer: ${analyzer.name} - ${analyzer.description}`);
  }

  /**
   * Get an analyzer by name
   */
  get<T extends AnalyzerResult>(name: string): Analyzer<T> | undefined {
    return this.analyzers.get(name);
  }

  /**
   * Get all registered analyzers
   */
  getAll(): Analyzer<any>[] {
    return Array.from(this.analyzers.values());
  }

  /**
   * Initialize all registered analyzers
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('Initializing analyzers...');
    const initPromises = this.getAll().map(async (analyzer) => {
      try {
        // Load existing results to verify storage
        await analyzer.loadResults();
        console.log(`Initialized analyzer: ${analyzer.name}`);
      } catch (error) {
        console.error(`Failed to initialize analyzer ${analyzer.name}:`, error);
        // Remove failed analyzer from registry
        this.analyzers.delete(analyzer.name);
      }
    });

    await Promise.all(initPromises);
    this.initialized = true;
    console.log(`Initialized ${this.analyzers.size} analyzers`);
  }

  /**
   * Run all registered analyzers on a collection of threads
   */
  async analyzeThreads(threads: Thread[]): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const errors: Error[] = [];
    
    for (const analyzer of this.analyzers.values()) {
      try {
        console.log(`Running analyzer: ${analyzer.name}`);
        const results = await analyzer.analyze(threads);
        await analyzer.saveResults(results);
        console.log(`${analyzer.name}: Found ${results.length} results`);
      } catch (error) {
        console.error(`Error in analyzer ${analyzer.name}:`, error);
        errors.push(error as Error);
      }
    }

    // If all analyzers failed, throw an error
    if (errors.length === this.analyzers.size) {
      throw new Error('All analyzers failed to process threads');
    }
  }

  /**
   * Purge old results from all analyzers
   */
  async purgeOldResults(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const errors: Error[] = [];

    for (const analyzer of this.analyzers.values()) {
      try {
        console.log(`Purging old results from ${analyzer.name}`);
        await analyzer.purgeOldResults();
      } catch (error) {
        console.error(`Error purging results for ${analyzer.name}:`, error);
        errors.push(error as Error);
      }
    }

    // If all purge operations failed, throw an error
    if (errors.length === this.analyzers.size) {
      throw new Error('Failed to purge results from all analyzers');
    }
  }
}

// Export a singleton instance
export const analyzerRegistry = new AnalyzerRegistry(); 