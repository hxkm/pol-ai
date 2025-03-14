import fs from 'fs';
import path from 'path';
import { ensureDirectories, paths } from '../utils/paths';
import { Thread, AnalyzerResult, AnalyzerStorage, Analyzer } from '../../types/interfaces';

// Maximum age of results to keep (in days)
const MAX_RESULT_AGE_DAYS = 3;

/**
 * Base class for all analyzers
 */
export abstract class BaseAnalyzer<T extends AnalyzerResult> implements Analyzer<T> {
  abstract name: string;
  abstract description: string;
  abstract analyze(threads: Thread[]): Promise<T[]>;

  protected get storagePath(): string {
    return path.join(paths.dataDir, 'analysis', this.name);
  }

  protected get storageFile(): string {
    return path.join(this.storagePath, 'results.json');
  }

  /**
   * Validate a result before saving
   */
  protected validateResult(result: T): boolean {
    if (!result.timestamp || !result.threadId || !result.postId) {
      console.error(`Invalid result in ${this.name}:`, result);
      return false;
    }
    return true;
  }

  /**
   * Initialize storage for this analyzer
   */
  protected async initStorage(): Promise<void> {
    try {
      // Ensure the analyzer's directory exists
      if (!fs.existsSync(this.storagePath)) {
        await fs.promises.mkdir(this.storagePath, { recursive: true });
      }

      // Create empty storage if it doesn't exist
      if (!fs.existsSync(this.storageFile)) {
        const emptyStorage: AnalyzerStorage<T> = {
          lastUpdated: Date.now(),
          results: []
        };
        await this.writeStorage(emptyStorage);
      }
    } catch (error) {
      console.error(`Error initializing storage for ${this.name}:`, error);
      throw new Error(`Storage initialization failed for ${this.name}`);
    }
  }

  /**
   * Read the current storage state
   */
  protected async readStorage(): Promise<AnalyzerStorage<T>> {
    try {
      await this.initStorage();
      const data = await fs.promises.readFile(this.storageFile, 'utf-8');
      const storage = JSON.parse(data) as AnalyzerStorage<T>;
      
      // Validate storage structure
      if (!storage.lastUpdated || !Array.isArray(storage.results)) {
        throw new Error('Invalid storage format');
      }
      
      return storage;
    } catch (error) {
      console.error(`Error reading storage for ${this.name}:`, error);
      // Return empty storage on error
      return { lastUpdated: Date.now(), results: [] };
    }
  }

  /**
   * Write storage state to disk
   */
  protected async writeStorage(storage: AnalyzerStorage<T>): Promise<void> {
    const tempFile = `${this.storageFile}.tmp`;
    try {
      await fs.promises.writeFile(tempFile, JSON.stringify(storage, null, 2));
      await fs.promises.rename(tempFile, this.storageFile);
    } catch (error) {
      console.error(`Error writing storage for ${this.name}:`, error);
      // Clean up temp file if it exists
      if (fs.existsSync(tempFile)) {
        await fs.promises.unlink(tempFile).catch(() => {});
      }
      throw error;
    }
  }

  /**
   * Save new results to storage
   */
  async saveResults(results: T[]): Promise<void> {
    try {
      // Validate results before saving
      const validResults = results.filter(result => this.validateResult(result));
      
      if (validResults.length !== results.length) {
        console.warn(`${this.name}: ${results.length - validResults.length} invalid results were filtered out`);
      }

      const storage = await this.readStorage();
      
      // Add new results
      storage.results = [...storage.results, ...validResults];
      storage.lastUpdated = Date.now();
      
      await this.writeStorage(storage);
    } catch (error) {
      console.error(`Error saving results for ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Load all current results
   */
  async loadResults(): Promise<T[]> {
    try {
      const storage = await this.readStorage();
      return storage.results;
    } catch (error) {
      console.error(`Error loading results for ${this.name}:`, error);
      return [];
    }
  }

  /**
   * Remove results older than MAX_RESULT_AGE_DAYS
   */
  async purgeOldResults(): Promise<void> {
    try {
      const storage = await this.readStorage();
      const cutoff = Date.now() - (MAX_RESULT_AGE_DAYS * 24 * 60 * 60 * 1000);
      
      const originalCount = storage.results.length;
      storage.results = storage.results.filter(result => result.timestamp >= cutoff);
      storage.lastUpdated = Date.now();
      
      const purgedCount = originalCount - storage.results.length;
      if (purgedCount > 0) {
        console.log(`${this.name}: Purged ${purgedCount} old results`);
      }
      
      await this.writeStorage(storage);
    } catch (error) {
      console.error(`Error purging results for ${this.name}:`, error);
      throw error;
    }
  }
} 