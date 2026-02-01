import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const countryRoutes = Router();

// Get all countries
countryRoutes.get('/', async (req, res) => {
  try {
    console.log('[countries] GET /api/countries');
    const countries = await prisma.country.findMany({
      orderBy: { name: 'asc' },
    });
    console.log('[countries] returning', { count: countries.length });
    res.json(countries);
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
});

// Get country by ID with full details
countryRoutes.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[countries] GET /api/countries/:id', { id });
    
    const country = await prisma.country.findUnique({
      where: { id },
    });

    if (!country) {
      return res.status(404).json({ error: 'Country not found' });
    }

    // Get user-scoped qualitative tags (for history)
    const tags = await prisma.qualitativeTag.findMany({
      where: {
        scopeType: 'COUNTRY',
        scopeId: id,
        userId: req.userId!,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get latest metrics
    const latestMetrics = await prisma.countryMetrics.findFirst({
      where: { countryId: id },
      orderBy: { year: 'desc' },
    });

    // Get latest industries
    const latestYear = latestMetrics?.year || new Date().getFullYear();
    const industries = await prisma.industryShare.findMany({
      where: {
        countryId: id,
        year: latestYear,
      },
      orderBy: { gdpSharePercent: 'desc' },
    });

    // Get user-scoped articles
    const articleLinks = await prisma.articleCountryLink.findMany({
      where: {
        countryId: id,
        article: { userId: req.userId! },
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

    // Get user-scoped notes
    const notes = await prisma.note.findMany({
      where: {
        scopeType: 'COUNTRY',
        scopeId: id,
        userId: req.userId!,
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({
      country,
      tags,
      metrics: latestMetrics,
      industries,
      articles: articleLinks.map(link => link.article),
      notes,
    });
  } catch (error) {
    console.error('Error fetching country details:', error);
    res.status(500).json({ error: 'Failed to fetch country details' });
  }
});
