import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const metricDefinitionRoutes = Router();

// GET /api/metric-definitions
metricDefinitionRoutes.get('/', async (req, res) => {
  try {
    const metrics = await prisma.metricDefinition.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    const grouped = metrics.reduce((acc, metric) => {
      if (!acc[metric.category]) {
        acc[metric.category] = [];
      }
      acc[metric.category].push(metric);
      return acc;
    }, {} as Record<string, typeof metrics>);

    res.json({ metrics, grouped });
  } catch (error) {
    console.error('Error fetching metric definitions:', error);
    res.status(500).json({ error: 'Failed to fetch metric definitions' });
  }
});

// GET /api/metric-definitions/:code
metricDefinitionRoutes.get('/:code', async (req, res) => {
  try {
    const metric = await prisma.metricDefinition.findUnique({
      where: { code: req.params.code },
    });

    if (!metric) {
      return res.status(404).json({ error: 'Metric not found' });
    }

    res.json(metric);
  } catch (error) {
    console.error('Error fetching metric definition:', error);
    res.status(500).json({ error: 'Failed to fetch metric definition' });
  }
});
