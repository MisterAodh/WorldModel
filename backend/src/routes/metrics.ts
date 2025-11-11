import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const metricRoutes = Router();

// Get metrics for a country
metricRoutes.get('/:countryId', async (req, res) => {
  try {
    const { countryId } = req.params;

    const metrics = await prisma.countryMetrics.findMany({
      where: { countryId },
      orderBy: { year: 'desc' },
    });

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Create or update metrics
metricRoutes.post('/', async (req, res) => {
  try {
    const {
      countryId,
      year,
      population,
      immigrationRate,
      emigrationRate,
      murdersPerCapita,
      warDeathsPercent,
      famineDeathsPercent,
    } = req.body;

    const metrics = await prisma.countryMetrics.upsert({
      where: {
        countryId_year: {
          countryId,
          year,
        },
      },
      update: {
        population: population !== undefined ? BigInt(population) : undefined,
        immigrationRate,
        emigrationRate,
        murdersPerCapita,
        warDeathsPercent,
        famineDeathsPercent,
      },
      create: {
        countryId,
        year,
        population: population !== undefined ? BigInt(population) : null,
        immigrationRate,
        emigrationRate,
        murdersPerCapita,
        warDeathsPercent,
        famineDeathsPercent,
      },
    });

    // Convert BigInt to string for JSON serialization
    const metricsJson = {
      ...metrics,
      population: metrics.population?.toString(),
    };

    res.json(metricsJson);
  } catch (error) {
    console.error('Error updating metrics:', error);
    res.status(500).json({ error: 'Failed to update metrics' });
  }
});
