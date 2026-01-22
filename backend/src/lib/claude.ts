import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// backend/src/lib -> backend -> project root
const envPath = path.resolve(__dirname, '../../..', '.env');

// load env BEFORE checking process.env
dotenv.config({ path: envPath });

if (!process.env.CLAUDE_API_KEY) {
  console.warn(`CLAUDE_API_KEY not set - chat will not work (dotenv path: ${envPath})`);
}

export const claude = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY || '',
});