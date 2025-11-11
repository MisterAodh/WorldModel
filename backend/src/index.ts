import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { countryRoutes } from './routes/countries.js';
import { regionRoutes } from './routes/regions.js';
import { tagRoutes } from './routes/tags.js';
import { metricRoutes } from './routes/metrics.js';
import { industryRoutes } from './routes/industries.js';
import { articleRoutes } from './routes/articles.js';
import { suggestionRoutes } from './routes/suggestions.js';
import { chatRoutes } from './routes/chat.js';
import { noteRoutes } from './routes/notes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/countries', countryRoutes);
app.use('/api/regions', regionRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/metrics', metricRoutes);
app.use('/api/industries', industryRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/suggestions', suggestionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notes', noteRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
