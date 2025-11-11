import Anthropic from '@anthropic-ai/sdk';

if (!process.env.CLAUDE_API_KEY) {
  console.warn('CLAUDE_API_KEY not set - chat will not work');
}

export const claude = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY || '',
});

