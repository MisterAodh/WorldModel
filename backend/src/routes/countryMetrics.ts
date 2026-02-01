import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const countryMetricsRoutes = Router();

// GET /api/country-metrics/:countryId
countryMetricsRoutes.get('/:countryId', requireAuth, async (req, res) => {
  try {
    const { countryId } = req.params;
    const { year } = req.query;

    const where: { countryId: string; year?: number; userId: string } = {
      countryId,
      userId: req.userId!,
    };
    if (year) {
      where.year = parseInt(year as string, 10);
    }

    const data = await prisma.countryMetricData.findMany({
      where,
      include: { metric: true },
      orderBy: [{ year: 'desc' }, { quarter: 'asc' }],
    });

    res.json(data);
  } catch (error) {
    console.error('Error fetching country metrics:', error);
    res.status(500).json({ error: 'Failed to fetch country metrics' });
  }
});

// GET /api/country-metrics/:countryId/spreadsheet
countryMetricsRoutes.get('/:countryId/spreadsheet', requireAuth, async (req, res) => {
  try {
    const { countryId } = req.params;
    const { year } = req.query;

    // Use a single year (default to current year)
    const targetYear = year ? parseInt(year as string, 10) : new Date().getFullYear();

    const metricDefs = await prisma.metricDefinition.findMany({
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    });

    // Fetch data for the target year only
    const data = await prisma.countryMetricData.findMany({
      where: {
        countryId,
        year: targetYear,
        quarter: 0, // Only annual data
        userId: req.userId!,
      },
      include: { metric: true },
    });

    // Build metrics object
    const metrics: Record<string, any> = {};
    metricDefs.forEach((def) => {
      const dataPoint = data.find((d) => d.metricId === def.id);
      metrics[def.code] = dataPoint
        ? {
            value: dataPoint.valueNumeric ?? dataPoint.valueText,
            sourceType: dataPoint.sourceType,
            confidenceScore: dataPoint.confidenceScore,
            sourceUrl: dataPoint.sourceUrl,
            aiReasoning: dataPoint.aiReasoning,
            id: dataPoint.id,
            sourceName: dataPoint.sourceName,
          }
        : null;
    });

    // Always return the requested year
    res.json({
      columns: metricDefs,
      year: targetYear,
      metrics,
      dataPointCount: data.length,
    });
  } catch (error) {
    console.error('Error building spreadsheet:', error);
    res.status(500).json({ error: 'Failed to build spreadsheet data' });
  }
});

const createMetricSchema = z.object({
  countryId: z.string(),
  metricCode: z.string(),
  year: z.number(),
  quarter: z.number().min(1).max(4).optional(),
  valueNumeric: z.number().optional(),
  valueText: z.string().optional(),
  sourceType: z.enum(['OFFICIAL', 'AGGREGATOR', 'NEWS_DERIVED', 'INTERPOLATED', 'MANUAL']),
  sourceUrl: z.string().url().optional(),
  sourceName: z.string().optional(),
  confidenceScore: z.number().min(1).max(10).optional(),
  aiReasoning: z.string().optional(),
  articleIds: z.array(z.string()).optional(),
});

// POST /api/country-metrics
countryMetricsRoutes.post('/', requireAuth, async (req, res) => {
  try {
    const validated = createMetricSchema.parse(req.body);
    const quarter = validated.quarter ?? 0;

    const metricDef = await prisma.metricDefinition.findUnique({
      where: { code: validated.metricCode },
    });

    if (!metricDef) {
      return res.status(400).json({ error: `Unknown metric code: ${validated.metricCode}` });
    }

    if (validated.valueNumeric !== undefined) {
      if (metricDef.minValue !== null && metricDef.minValue !== undefined && validated.valueNumeric < metricDef.minValue) {
        return res.status(400).json({
          error: `Value ${validated.valueNumeric} below minimum ${metricDef.minValue}`,
        });
      }
      if (metricDef.maxValue !== null && metricDef.maxValue !== undefined && validated.valueNumeric > metricDef.maxValue) {
        return res.status(400).json({
          error: `Value ${validated.valueNumeric} above maximum ${metricDef.maxValue}`,
        });
      }
    }

    const dataPoint = await prisma.countryMetricData.upsert({
      where: {
        userId_countryId_metricId_year_quarter: {
          userId: req.userId!,
          countryId: validated.countryId,
          metricId: metricDef.id,
          year: validated.year,
          quarter,
        },
      },
      create: {
        userId: req.userId!,
        countryId: validated.countryId,
        metricId: metricDef.id,
        year: validated.year,
        quarter,
        valueNumeric: validated.valueNumeric,
        valueText: validated.valueText,
        sourceType: validated.sourceType,
        sourceUrl: validated.sourceUrl,
        sourceName: validated.sourceName,
        confidenceScore: validated.confidenceScore,
        aiReasoning: validated.aiReasoning,
        articleIds: validated.articleIds ?? [],
        createdBy: 'api',
      },
      update: {
        valueNumeric: validated.valueNumeric,
        valueText: validated.valueText,
        sourceType: validated.sourceType,
        sourceUrl: validated.sourceUrl,
        sourceName: validated.sourceName,
        confidenceScore: validated.confidenceScore,
        aiReasoning: validated.aiReasoning,
        articleIds: validated.articleIds ?? [],
      },
      include: { metric: true },
    });

    res.json(dataPoint);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error saving country metric:', error);
    res.status(500).json({ error: 'Failed to save metric data' });
  }
});

// DELETE /api/country-metrics/:id
countryMetricsRoutes.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await prisma.countryMetricData.findUnique({
      where: { id: req.params.id },
      select: { id: true, userId: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Metric data not found' });
    }

    if (existing.userId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this metric data' });
    }

    await prisma.countryMetricData.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting metric data:', error);
    res.status(500).json({ error: 'Failed to delete metric data' });
  }
});
