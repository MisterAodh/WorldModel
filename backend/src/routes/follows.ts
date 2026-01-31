import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const followRoutes = Router();

// POST /api/follows - Follow a user
followRoutes.post('/', requireAuth, async (req, res) => {
  try {
    const { userId: targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (targetUserId === req.userId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, isPublic: true },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already following
    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: req.userId!,
          followingId: targetUserId,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    // Create follow relationship
    const follow = await prisma.follow.create({
      data: {
        followerId: req.userId!,
        followingId: targetUserId,
      },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.json({
      message: 'Successfully followed user',
      follow,
    });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// DELETE /api/follows/:userId - Unfollow a user
followRoutes.delete('/:userId', requireAuth, async (req, res) => {
  try {
    const { userId: targetUserId } = req.params;

    if (targetUserId === req.userId) {
      return res.status(400).json({ error: 'Cannot unfollow yourself' });
    }

    // Check if follow exists
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: req.userId!,
          followingId: targetUserId,
        },
      },
    });

    if (!follow) {
      return res.status(404).json({ error: 'Not following this user' });
    }

    // Delete follow relationship
    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: req.userId!,
          followingId: targetUserId,
        },
      },
    });

    res.json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// GET /api/follows/followers - Get my followers
followRoutes.get('/followers', requireAuth, async (req, res) => {
  try {
    const { limit = '50', cursor } = req.query;

    const followers = await prisma.follow.findMany({
      where: { followingId: req.userId },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
          },
        },
      },
      take: Math.min(parseInt(limit as string), 100),
      ...(cursor && { cursor: { id: cursor as string }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
    });

    // Also check if I'm following each of them back
    const followerIds = followers.map(f => f.follower.id);
    const myFollowing = await prisma.follow.findMany({
      where: {
        followerId: req.userId,
        followingId: { in: followerIds },
      },
      select: { followingId: true },
    });
    const followingBackSet = new Set(myFollowing.map(f => f.followingId));

    const result = followers.map(f => ({
      ...f.follower,
      isFollowingBack: followingBackSet.has(f.follower.id),
      followedAt: f.createdAt,
    }));

    res.json({
      followers: result,
      nextCursor: followers.length > 0 ? followers[followers.length - 1].id : null,
      total: await prisma.follow.count({ where: { followingId: req.userId } }),
    });
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// GET /api/follows/following - Get users I'm following
followRoutes.get('/following', requireAuth, async (req, res) => {
  try {
    const { limit = '50', cursor } = req.query;

    const following = await prisma.follow.findMany({
      where: { followerId: req.userId },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
          },
        },
      },
      take: Math.min(parseInt(limit as string), 100),
      ...(cursor && { cursor: { id: cursor as string }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
    });

    const result = following.map(f => ({
      ...f.following,
      followedAt: f.createdAt,
    }));

    res.json({
      following: result,
      nextCursor: following.length > 0 ? following[following.length - 1].id : null,
      total: await prisma.follow.count({ where: { followerId: req.userId } }),
    });
  } catch (error) {
    console.error('Error fetching following:', error);
    res.status(500).json({ error: 'Failed to fetch following' });
  }
});

// GET /api/follows/network/:countryId - Get network analysis data for a country
// This returns all tags/articles/notes from users I follow for a specific country
followRoutes.get('/network/:countryId', requireAuth, async (req, res) => {
  try {
    const { countryId } = req.params;

    // Get list of users I'm following
    const following = await prisma.follow.findMany({
      where: { followerId: req.userId },
      select: { followingId: true },
    });
    const followingIds = following.map(f => f.followingId);

    if (followingIds.length === 0) {
      return res.json({
        users: [],
        tags: [],
        articles: [],
        notes: [],
      });
    }

    // Get all data from followed users for this country
    const [users, tags, articles, notes] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: followingIds } },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      }),
      prisma.qualitativeTag.findMany({
        where: {
          userId: { in: followingIds },
          scopeType: 'COUNTRY',
          scopeId: countryId,
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
        orderBy: { createdAt: 'desc' },
      }),
      prisma.article.findMany({
        where: {
          userId: { in: followingIds },
          countryLinks: {
            some: { countryId },
          },
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
          countryLinks: {
            include: { country: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.note.findMany({
        where: {
          userId: { in: followingIds },
          scopeType: 'COUNTRY',
          scopeId: countryId,
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
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Group data by user
    const dataByUser = users.map(user => ({
      user,
      tags: tags.filter(t => t.userId === user.id),
      articles: articles.filter(a => a.userId === user.id),
      notes: notes.filter(n => n.userId === user.id),
    }));

    res.json({
      users,
      dataByUser,
      // Also return flat arrays for convenience
      tags,
      articles,
      notes,
    });
  } catch (error) {
    console.error('Error fetching network data:', error);
    res.status(500).json({ error: 'Failed to fetch network data' });
  }
});
