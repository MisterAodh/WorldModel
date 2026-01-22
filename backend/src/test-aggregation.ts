/**
 * Quick test script to verify the aggregation Claude call works
 * Run with: npx tsx src/test-aggregation.ts
 */

import { claude } from './lib/claude.js';

async function testSearch() {
  console.log('Testing aggregation search...\n');
  
  const prompt = `Search the web and tell me: What is United States's GDP (Nominal USD) for 2024?

The unit should be: USD

Reply with a SHORT answer in this format:
VALUE: [the number or text value]
SOURCE: [source name, e.g. "World Bank" or "Trading Economics"]
URL: [the URL where you found this]
CONFIDENCE: [1-10, where 10 = official government/IMF data, 5 = aggregator site, 1 = rough estimate]
TYPE: [OFFICIAL if government/IMF/World Bank, AGGREGATOR if trading economics/similar, NEWS_DERIVED if from news]
NOTE: [one sentence about the source or any caveats]

If you absolutely cannot find any data, reply with: NOT_FOUND`;

  console.log('Prompt:', prompt);
  console.log('\n--- Calling Claude ---\n');

  try {
    const response = await claude.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 3,
        } as any
      ],
    });

    console.log('Stop reason:', response.stop_reason);
    console.log('Usage:', response.usage);
    console.log('\nContent blocks:');
    
    for (const block of response.content) {
      if (block.type === 'text') {
        console.log('\n--- TEXT ---');
        console.log(block.text);
      } else if (block.type === 'tool_use') {
        console.log('\n--- TOOL USE ---');
        console.log('Tool:', block.name);
        console.log('Input:', JSON.stringify(block.input, null, 2));
      } else {
        console.log('\n--- OTHER ---');
        console.log(JSON.stringify(block, null, 2));
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testSearch();
