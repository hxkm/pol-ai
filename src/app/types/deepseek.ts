export type DeepSeekMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type DeepSeekChatRequest = {
  model: string;
  messages: DeepSeekMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
};

export type DeepSeekChatResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: DeepSeekMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type DeepSeekError = {
  error: {
    message: string;
    type: string;
    code: number;
    param?: string;
  };
};

export class DeepSeekAPIError extends Error {
  constructor(
    message: string,
    public code: number,
    public type: string
  ) {
    super(message);
    this.name = 'DeepSeekAPIError';
  }
} 