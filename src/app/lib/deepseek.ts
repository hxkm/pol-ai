import { DeepSeekAPIError, DeepSeekChatRequest, DeepSeekChatResponse, DeepSeekError } from '../types/deepseek';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

export class DeepSeekClient {
  private apiKey: string;
  
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('DeepSeek API key is required');
    }
    this.apiKey = apiKey;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = MAX_RETRIES,
    delay = INITIAL_RETRY_DELAY
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);
      
      // If rate limited, server overloaded, or other 5xx errors
      if (response.status === 429 || response.status >= 500) {
        if (retries > 0) {
          console.log(`API error ${response.status}, retrying in ${delay}ms...`);
          await this.sleep(delay);
          return this.fetchWithRetry(
            url,
            options,
            retries - 1,
            delay * 2
          );
        }
      }
      
      return response;
    } catch (error) {
      // Handle network errors and socket timeouts
      if (retries > 0) {
        const isNetworkError = error instanceof TypeError || 
          (typeof error === 'object' && error !== null && 'code' in error && error.code === 'UND_ERR_SOCKET');
        
        if (isNetworkError) {
          console.log(`Network error occurred, retrying in ${delay}ms...`);
          await this.sleep(delay);
          return this.fetchWithRetry(
            url,
            options,
            retries - 1,
            delay * 2
          );
        }
      }
      throw error;
    }
  }

  async chat(request: DeepSeekChatRequest, maxAttempts = 3): Promise<DeepSeekChatResponse> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.fetchWithRetry(
          `${DEEPSEEK_API_URL}/chat/completions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(request),
          }
        );

        // Get raw response text
        const rawText = await response.text();
        
        // Try to parse the response
        let data;
        try {
          data = JSON.parse(rawText);
        } catch (parseError) {
          console.error('Failed to parse DeepSeek response:', parseError);
          throw parseError;
        }

        if (!response.ok) {
          const error = data as DeepSeekError;
          throw new DeepSeekAPIError(
            error.error.message,
            error.error.code,
            error.error.type
          );
        }

        return data as DeepSeekChatResponse;
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxAttempts) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
          console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  async summarize(text: string, maxTokens = 500): Promise<string> {
    const request: DeepSeekChatRequest = {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant that provides clear and concise summaries.'
        },
        {
          role: 'user',
          content: `Please summarize the following text:\n\n${text}`
        }
      ],
      temperature: 0.7,
      max_tokens: maxTokens
    };

    const response = await this.chat(request);
    return response.choices[0].message.content;
  }
} 