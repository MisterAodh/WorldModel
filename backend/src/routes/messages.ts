import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const messageRoutes = Router();

// GET /api/messages - Get conversations list (users you've messaged with)
messageRoutes.get('/', requireAuth, async (req, res) => {
  try {
    // Get unique conversations (users we've sent to or received from)
    const sentTo = await prisma.message.findMany({
      where: { senderId: req.userId },
      select: { receiverId: true },
      distinct: ['receiverId'],
    });

    const receivedFrom = await prisma.message.findMany({
      where: { receiverId: req.userId },
      select: { senderId: true },
      distinct: ['senderId'],
    });

    // Combine unique user IDs
    const userIds = new Set([
      ...sentTo.map(m => m.receiverId),
      ...receivedFrom.map(m => m.senderId),
    ]);

    // Get user info and last message for each conversation
    const conversations = await Promise.all(
      Array.from(userIds).map(async (otherUserId) => {
        const [user, lastMessage, unreadCount] = await Promise.all([
          prisma.user.findUnique({
            where: { id: otherUserId },
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          }),
          prisma.message.findFirst({
            where: {
              OR: [
                { senderId: req.userId, receiverId: otherUserId },
                { senderId: otherUserId, receiverId: req.userId },
              ],
            },
            orderBy: { createdAt: 'desc' },
            include: {
              article: {
                select: {
                  id: true,
                  title: true,
                  url: true,
                },
              },
            },
          }),
          prisma.message.count({
            where: {
              senderId: otherUserId,
              receiverId: req.userId,
              isRead: false,
            },
          }),
        ]);

        return {
          user,
          lastMessage,
          unreadCount,
        };
      })
    );

    // Sort by last message date
    conversations.sort((a, b) => {
      const dateA = a.lastMessage?.createdAt || new Date(0);
      const dateB = b.lastMessage?.createdAt || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    // Calculate total unread
    const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

    res.json({
      conversations,
      totalUnread,
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// GET /api/messages/:userId - Get messages with a specific user
messageRoutes.get('/:userId', requireAuth, async (req, res) => {
  try {
    const { userId: otherUserId } = req.params;
    const { limit = '50', before } = req.query;

    // Check if other user exists
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    if (!otherUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get messages between the two users
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: req.userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: req.userId },
        ],
        ...(before && { createdAt: { lt: new Date(before as string) } }),
      },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            url: true,
            source: true,
            keyNotes: true,
          },
        },
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit as string), 100),
    });

    // Mark received messages as read
    await prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: req.userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    // Reverse to get chronological order (oldest first)
    messages.reverse();

    res.json({
      user: otherUser,
      messages,
      hasMore: messages.length === parseInt(limit as string),
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/messages - Send a message
messageRoutes.post('/', requireAuth, async (req, res) => {
  try {
    const { receiverId, content, articleId } = req.body;

    if (!receiverId) {
      return res.status(400).json({ error: 'receiverId is required' });
    }

    if (!content && !articleId) {
      return res.status(400).json({ error: 'Either content or articleId is required' });
    }

    if (receiverId === req.userId) {
      return res.status(400).json({ error: 'Cannot message yourself' });
    }

    // Check if receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true },
    });

    if (!receiver) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If sharing an article, verify it exists
    if (articleId) {
      const article = await prisma.article.findUnique({
        where: { id: articleId },
      });
      if (!article) {
        return res.status(404).json({ error: 'Article not found' });
      }
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        senderId: req.userId!,
        receiverId,
        content: content || '',
        articleId: articleId || null,
      },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            url: true,
            source: true,
            keyNotes: true,
          },
        },
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// PATCH /api/messages/:id/read - Mark a message as read
messageRoutes.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const message = await prisma.message.findUnique({
      where: { id },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only the receiver can mark as read
    if (message.receiverId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await prisma.message.update({
      where: { id },
      data: { isRead: true },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// GET /api/messages/unread/count - Get total unread message count
messageRoutes.get('/unread/count', requireAuth, async (req, res) => {
  try {
    const count = await prisma.message.count({
      where: {
        receiverId: req.userId,
        isRead: false,
      },
    });

    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});
