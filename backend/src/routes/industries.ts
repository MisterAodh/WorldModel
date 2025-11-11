import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const industryRoutes = Router();

// Get industries for a country and year
industryRoutes.get('/:countryId/:year', async (req, res) => {
  try {
    const { countryId, year } = req.params;

    const industries = await prisma.industryShare.findMany({
      where: {
        countryId,
        year: parseInt(year),
      },
      orderBy: { gdpSharePercent: 'desc' },
    });

    res.json(industries);
  } catch (error) {
    console.error('Error fetching industries:', error);
    res.status(500).json({ error: 'Failed to fetch industries' });
  }
});

// Create or update industry
industryRoutes.post('/', async (req, res) => {
  try {
    const { countryId, year, industryName, gdpSharePercent } = req.body;

    const industry = await prisma.industryShare.upsert({
      where: {
        countryId_year_industryName: {
          countryId,
          year,
          industryName,
        },
      },
      update: {
        gdpSharePercent,
      },
      create: {
        countryId,
        year,
        industryName,
        gdpSharePercent,
      },
    });

    res.json(industry);
  } catch (error) {
    console.error('Error updating industry:', error);
    res.status(500).json({ error: 'Failed to update industry' });
  }
});

// Delete industry
industryRoutes.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.industryShare.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting industry:', error);
    res.status(500).json({ error: 'Failed to delete industry' });
  }
});

