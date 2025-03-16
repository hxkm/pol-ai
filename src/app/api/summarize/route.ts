import { NextRequest, NextResponse } from 'next/server';
import { DeepSeekClient } from '@/app/lib/deepseek';
import { DeepSeekAPIError } from '@/app/types/deepseek';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'DeepSeek API key not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { text, maxTokens } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text to summarize is required' },
        { status: 400 }
      );
    }

    const client = new DeepSeekClient(apiKey);
    const summary = await client.summarize(text, maxTokens);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Summarization error:', error);

    if (error instanceof DeepSeekAPIError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 