import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Routes
import { countryRoutes } from './routes/countries.js';
import { regionRoutes } from './routes/regions.js';
import { tagRoutes } from './routes/tags.js';
import { metricRoutes } from './routes/metrics.js';
import { industryRoutes } from './routes/industries.js';
import { articleRoutes } from './routes/articles.js';
import { suggestionRoutes } from './routes/suggestions.js';
import { chatRoutes } from './routes/chat.js';
import { noteRoutes } from './routes/notes.js';
import { metricDefinitionRoutes } from './routes/metricDefinitions.js';
import { countryMetricsRoutes } from './routes/countryMetrics.js';
import { aggregationJobRoutes } from './routes/aggregationJobs.js';

// New social/billing routes
import { userRoutes } from './routes/users.js';
import { followRoutes } from './routes/follows.js';
import { messageRoutes } from './routes/messages.js';
import { billingRoutes } from './routes/billing.js';

// Load .env from workspace root (two levels up from this file)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL,
  'https://atlascast.org',
  'https://www.atlascast.org',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow anyway for now, but log it
    }
  },
  credentials: true,
}));

// Stripe webhook needs raw body - must be before express.json()
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

// Standard JSON parsing for other routes
app.use(express.json());

// ============================================
// PUBLIC ROUTES (no auth required)
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Countries and regions are public (read-only geography data)
app.use('/api/countries', countryRoutes);
app.use('/api/regions', regionRoutes);

// Metric definitions are public reference data
app.use('/api/metric-definitions', metricDefinitionRoutes);

// ============================================
// USER & SOCIAL ROUTES
// ============================================

app.use('/api/users', userRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/messages', messageRoutes);

// ============================================
// BILLING ROUTES
// ============================================

app.use('/api/billing', billingRoutes);

// ============================================
// DATA ROUTES (support both auth and optional auth)
// ============================================

// Tags (qualitative scores)
app.use('/api/tags', tagRoutes);

// Metrics (legacy)
app.use('/api/metrics', metricRoutes);

// Industries
app.use('/api/industries', industryRoutes);

// Articles
app.use('/api/articles', articleRoutes);

// Suggestions
app.use('/api/suggestions', suggestionRoutes);

// AI Chat
app.use('/api/chat', chatRoutes);

// Notes
app.use('/api/notes', noteRoutes);

// Country metrics data (deep aggregation)
app.use('/api/country-metrics', countryMetricsRoutes);

// Aggregation jobs
app.use('/api/aggregation-jobs', aggregationJobRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  
  // Check for required environment variables
  const requiredVars = ['DATABASE_URL', 'CLERK_SECRET_KEY'];
  const missing = requiredVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
  }
  
  // Optional warnings
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('⚠️  STRIPE_SECRET_KEY not set - billing will not work');
  }
  if (!process.env.CLAUDE_API_KEY) {
    console.warn('⚠️  CLAUDE_API_KEY not set - AI features will not work');
  }
});
