import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const tagRoutes = Router();

// Get tags for a scope
tagRoutes.get('/:scopeType/:scopeId', async (req, res) => {
  try {
    const { scopeType, scopeId } = req.params;

    const tags = await prisma.qualitativeTag.findMany({
      where: {
        scopeType: scopeType.toUpperCase() as any,
        scopeId,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get latest per category
    const latestTags = await prisma.qualitativeTag.findMany({
      where: {
        scopeType: scopeType.toUpperCase() as any,
        scopeId,
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['category'],
    });

    res.json({ all: tags, latest: latestTags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// Create new qualitative tag
tagRoutes.post('/', async (req, res) => {
  try {
    const { scopeType, scopeId, category, value, source, note } = req.body;

    const tag = await prisma.qualitativeTag.create({
      data: {
        scopeType: scopeType.toUpperCase(),
        scopeId,
        category: category.toUpperCase(),
        value,
        source: source || 'manual',
        note,
      },
    });

    res.json(tag);
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// Delete a qualitative tag
tagRoutes.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.qualitativeTag.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});
