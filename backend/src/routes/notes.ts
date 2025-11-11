import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const noteRoutes = Router();

// Get notes for a scope
noteRoutes.get('/:scopeType/:scopeId', async (req, res) => {
  try {
    const { scopeType, scopeId } = req.params;

    const notes = await prisma.note.findMany({
      where: {
        scopeType: scopeType.toUpperCase() as any,
        scopeId,
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
noteRoutes.post('/', async (req, res) => {
  try {
    const { id, scopeType, scopeId, content } = req.body;

    if (id) {
      // Update existing note
      const note = await prisma.note.update({
        where: { id },
        data: { content },
      });
      res.json(note);
    } else {
      // Create new note
      const note = await prisma.note.create({
        data: {
          scopeType: scopeType.toUpperCase(),
          scopeId,
          content,
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
noteRoutes.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.note.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

