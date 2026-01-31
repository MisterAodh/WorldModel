import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { optionalAuth } from '../middleware/auth.js';

export const noteRoutes = Router();

// Get notes for a scope (optionally filtered by user)
noteRoutes.get('/:scopeType/:scopeId', optionalAuth, async (req, res) => {
  try {
    const { scopeType, scopeId } = req.params;
    const { userId: filterUserId } = req.query;

    // Build where clause
    const where: any = {
      scopeType: scopeType.toUpperCase() as any,
      scopeId,
    };

    // If filterUserId is specified, filter by that user
    // If current user is logged in and no filter specified, show their own notes
    // IMPORTANT: Always filter by user - never return orphaned (null userId) data
    if (filterUserId) {
      where.userId = filterUserId as string;
    } else if (req.userId) {
      where.userId = req.userId;
    } else {
      // No user context - return empty results (don't show orphaned data)
      return res.json([]);
    }

    const notes = await prisma.note.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Create or update note
noteRoutes.post('/', optionalAuth, async (req, res) => {
  try {
    const { id, scopeType, scopeId, content } = req.body;

    if (id) {
      // Check ownership before updating
      const existing = await prisma.note.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({ error: 'Note not found' });
      }

      if (existing.userId && req.userId && existing.userId !== req.userId) {
        return res.status(403).json({ error: 'Not authorized to update this note' });
      }

      // Update existing note
      const note = await prisma.note.update({
        where: { id },
        data: { content },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      });
      res.json(note);
    } else {
      // Create new note
      const note = await prisma.note.create({
        data: {
          scopeType: scopeType.toUpperCase(),
          scopeId,
          content,
          userId: req.userId || null,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      });
      res.json(note);
    }
  } catch (error) {
    console.error('Error saving note:', error);
    res.status(500).json({ error: 'Failed to save note' });
  }
});

// Delete note
noteRoutes.delete('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const existing = await prisma.note.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (existing.userId && req.userId && existing.userId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this note' });
    }

    await prisma.note.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});
