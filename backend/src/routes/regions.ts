import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const regionRoutes = Router();

// Get all regions
regionRoutes.get('/', async (req, res) => {
  try {
    const regions = await prisma.region.findMany({
      include: {
        memberships: {
          include: {
            country: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(regions);
  } catch (error) {
    console.error('Error fetching regions:', error);
    res.status(500).json({ error: 'Failed to fetch regions' });
  }
});

// Get region by ID with aggregated data
regionRoutes.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const region = await prisma.region.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            country: true,
          },
        },
      },
    });

    if (!region) {
      return res.status(404).json({ error: 'Region not found' });
    }

    const countryIds = region.memberships.map(m => m.countryId);

    // Get all region-specific tags (for history)
    const regionTags = await prisma.qualitativeTag.findMany({
      where: {
        scopeType: 'REGION',
        scopeId: id,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get latest metrics for member countries
    const metrics = await Promise.all(
      countryIds.map(countryId =>
        prisma.countryMetrics.findFirst({
          where: { countryId },
          orderBy: { year: 'desc' },
        })
      )
    );

    // Aggregate metrics
    const validMetrics = metrics.filter(m => m !== null);
    const aggregatedMetrics = validMetrics.length > 0 ? {
      totalPopulation: validMetrics.reduce((sum, m) => sum + (m?.population || BigInt(0)), BigInt(0)),
      avgImmigrationRate: validMetrics.reduce((sum, m) => sum + (m?.immigrationRate || 0), 0) / validMetrics.length,
      avgEmigrationRate: validMetrics.reduce((sum, m) => sum + (m?.emigrationRate || 0), 0) / validMetrics.length,
      avgMurdersPerCapita: validMetrics.reduce((sum, m) => sum + (m?.murdersPerCapita || 0), 0) / validMetrics.length,
      avgWarDeathsPercent: validMetrics.reduce((sum, m) => sum + (m?.warDeathsPercent || 0), 0) / validMetrics.length,
      avgFamineDeathsPercent: validMetrics.reduce((sum, m) => sum + (m?.famineDeathsPercent || 0), 0) / validMetrics.length,
    } : null;

    // Get articles linked to any member country
    const articleLinks = await prisma.articleCountryLink.findMany({
      where: {
        countryId: { in: countryIds },
      },
      include: {
        article: {
          include: {
            countryLinks: {
              include: {
                country: true,
              },
            },
          },
        },
      },
      orderBy: {
        article: {
          publishDate: 'desc',
        },
      },
      take: 20,
    });

    // Deduplicate articles
    const uniqueArticles = Array.from(
      new Map(articleLinks.map(link => [link.article.id, link.article])).values()
    );

    // Get notes
    const notes = await prisma.note.findMany({
      where: {
        scopeType: 'REGION',
        scopeId: id,
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({
      region,
      tags: regionTags,
      aggregatedMetrics,
      articles: uniqueArticles,
      notes,
    });
  } catch (error) {
    console.error('Error fetching region details:', error);
    res.status(500).json({ error: 'Failed to fetch region details' });
  }
});

// Create region
regionRoutes.post('/', async (req, res) => {
  try {
    const { name, type, countryIds } = req.body;

    const region = await prisma.region.create({
      data: {
        name,
        type: type || 'LOGICAL_GROUP',
        memberships: {
          create: countryIds.map((countryId: string) => ({
            countryId,
          })),
        },
      },
      include: {
        memberships: {
          include: {
            country: true,
          },
        },
      },
    });

    res.json(region);
  } catch (error) {
    console.error('Error creating region:', error);
    res.status(500).json({ error: 'Failed to create region' });
  }
});

// Add country to region
regionRoutes.post('/:id/members', async (req, res) => {
  try {
    const { id } = req.params;
    const { countryId } = req.body;

    const membership = await prisma.regionMembership.create({
      data: {
        regionId: id,
        countryId,
      },
      include: {
        country: true,
      },
    });

    res.json(membership);
  } catch (error) {
    console.error('Error adding country to region:', error);
    res.status(500).json({ error: 'Failed to add country to region' });
  }
});

// Remove country from region
regionRoutes.delete('/:id/members/:countryId', async (req, res) => {
  try {
    const { id, countryId } = req.params;

    await prisma.regionMembership.deleteMany({
      where: {
        regionId: id,
        countryId,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing country from region:', error);
    res.status(500).json({ error: 'Failed to remove country from region' });
  }
});

// Delete region
regionRoutes.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.region.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting region:', error);
    res.status(500).json({ error: 'Failed to delete region' });
  }
});
