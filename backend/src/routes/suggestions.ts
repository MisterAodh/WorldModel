import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const suggestionRoutes = Router();

// Get suggestions for a scope
suggestionRoutes.get('/:scopeType/:scopeId', async (req, res) => {
  try {
    const { scopeType, scopeId } = req.params;
    const { status = 'PENDING' } = req.query;

    const suggestions = await prisma.aISuggestion.findMany({
      where: {
        scopeType: scopeType.toUpperCase() as any,
        scopeId,
        status: status as any,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// Approve suggestion
suggestionRoutes.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    const suggestion = await prisma.aISuggestion.findUnique({
      where: { id },
    });

    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    if (suggestion.status !== 'PENDING') {
      return res.status(400).json({ error: 'Suggestion already processed' });
    }

    // Apply the suggestion based on type
    const payload = suggestion.payload as any;

    switch (suggestion.suggestionType) {
      case 'qualitative_tag':
        await prisma.qualitativeTag.create({
          data: {
            scopeType: suggestion.scopeType,
            scopeId: suggestion.scopeId,
            category: payload.category,
            value: payload.value,
            source: 'ai_suggested',
            note: payload.note,
          },
        });
        break;

      case 'metric_update':
        await prisma.countryMetrics.upsert({
          where: {
            countryId_year: {
              countryId: suggestion.scopeId,
              year: payload.year,
            },
          },
          update: payload.metrics,
          create: {
            countryId: suggestion.scopeId,
            year: payload.year,
            ...payload.metrics,
          },
        });
        break;

      case 'industry_update':
        await prisma.industryShare.upsert({
          where: {
            countryId_year_industryName: {
              countryId: suggestion.scopeId,
              year: payload.year,
              industryName: payload.industryName,
            },
          },
          update: {
            gdpSharePercent: payload.gdpSharePercent,
          },
          create: {
            countryId: suggestion.scopeId,
            year: payload.year,
            industryName: payload.industryName,
            gdpSharePercent: payload.gdpSharePercent,
          },
        });
        break;

      case 'note':
        await prisma.note.create({
          data: {
            scopeType: suggestion.scopeType,
            scopeId: suggestion.scopeId,
            content: payload.content,
          },
        });
        break;
    }

    // Update suggestion status
    const updatedSuggestion = await prisma.aISuggestion.update({
      where: { id },
      data: { status: 'APPROVED' },
    });

    res.json(updatedSuggestion);
  } catch (error) {
    console.error('Error approving suggestion:', error);
    res.status(500).json({ error: 'Failed to approve suggestion' });
  }
});

// Reject suggestion
suggestionRoutes.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;

    const suggestion = await prisma.aISuggestion.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    res.json(suggestion);
  } catch (error) {
    console.error('Error rejecting suggestion:', error);
    res.status(500).json({ error: 'Failed to reject suggestion' });
  }
});
