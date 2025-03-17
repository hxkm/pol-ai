import { DeepSeekClient } from './deepseek';

async function testDeepSeek() {
  const apiKey = 'sk-3f1398530f2e450eac9016f894ac787b';
  const client = new DeepSeekClient(apiKey);

  try {
    console.log('Starting DeepSeek test...');
    
    // Create a timeout promise
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000);
    });

    // Race between the actual request and the timeout
    const response = await Promise.race([
      client.chat({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a test message. Please respond with a short greeting.'
          }
        ],
        temperature: 0.7,
        max_tokens: 100
      }),
      timeout
    ]);

    console.log('Test completed successfully!');
    console.log('Response:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('Test failed:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
  }
}

// Run the test
console.log('Test script started');
testDeepSeek(); 