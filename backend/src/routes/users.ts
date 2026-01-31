import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { getUsageStats, getCreditBalance } from '../lib/billing.js';

export const userRoutes = Router();

// GET /api/users/me - Get current user profile
userRoutes.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        _count: {
          select: {
            followers: true,
            following: true,
            articles: true,
            tags: true,
            notes: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get usage stats
    const usageStats = await getUsageStats(user.id);

    res.json({
      ...user,
      usageStats,
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// PATCH /api/users/me - Update current user profile
userRoutes.patch('/me', requireAuth, async (req, res) => {
  try {
    const { username, displayName, bio, isPublic } = req.body;

    // If updating username, check if it's available
    if (username && username !== req.user?.username) {
      const existing = await prisma.user.findUnique({
        where: { username },
      });
      if (existing) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(username && { username }),
        ...(displayName !== undefined && { displayName }),
        ...(bio !== undefined && { bio }),
        ...(isPublic !== undefined && { isPublic }),
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/users/search - Search users by username or display name
userRoutes.get('/search', optionalAuth, async (req, res) => {
  try {
    const { q, limit = '20' } = req.query;

    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const users = await prisma.user.findMany({
      where: {
        isPublic: true,
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
      },
      take: Math.min(parseInt(limit as string), 50),
      orderBy: [
        { followers: { _count: 'desc' } },
        { username: 'asc' },
      ],
    });

    // If logged in, also return if current user is following each user
    if (req.userId) {
      const followingIds = await prisma.follow.findMany({
        where: {
          followerId: req.userId,
          followingId: { in: users.map(u => u.id) },
        },
        select: { followingId: true },
      });
      const followingSet = new Set(followingIds.map(f => f.followingId));

      const usersWithFollowStatus = users.map(u => ({
        ...u,
        isFollowing: followingSet.has(u.id),
      }));

      return res.json(usersWithFollowStatus);
    }

    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// GET /api/users/:id - Get a user's public profile
userRoutes.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        isPublic: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
            articles: true,
            tags: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if profile is public or if viewer is the owner
    if (!user.isPublic && req.userId !== id) {
      return res.status(403).json({ error: 'This profile is private' });
    }

    // Check if current user is following this user
    let isFollowing = false;
    let isFollowedBy = false;
    if (req.userId && req.userId !== id) {
      const [following, followedBy] = await Promise.all([
        prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: req.userId,
              followingId: id,
            },
          },
        }),
        prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: id,
              followingId: req.userId,
            },
          },
        }),
      ]);
      isFollowing = !!following;
      isFollowedBy = !!followedBy;
    }

    res.json({
      ...user,
      isFollowing,
      isFollowedBy,
      isOwner: req.userId === id,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// GET /api/users/:id/world - Get a user's world data (read-only)
userRoutes.get('/:id/world', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { countryId } = req.query;

    // Check if user exists and is public
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, isPublic: true, username: true, displayName: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.isPublic && req.userId !== id) {
      return res.status(403).json({ error: 'This profile is private' });
    }

    // Get user's data for a specific country or all countries
    const where = countryId 
      ? { userId: id, scopeId: countryId as string }
      : { userId: id };

    const [tags, articles, notes] = await Promise.all([
      prisma.qualitativeTag.findMany({
        where: countryId 
          ? { userId: id, scopeType: 'COUNTRY', scopeId: countryId as string }
          : { userId: id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.article.findMany({
        where: { userId: id },
        include: {
          countryLinks: {
            include: { country: true },
            ...(countryId && { where: { countryId: countryId as string } }),
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.note.findMany({
        where: countryId 
          ? { userId: id, scopeType: 'COUNTRY', scopeId: countryId as string }
          : { userId: id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Filter articles to only those linked to the requested country
    const filteredArticles = countryId 
      ? articles.filter(a => a.countryLinks.some(l => l.countryId === countryId))
      : articles;

    res.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
      },
      tags,
      articles: filteredArticles,
      notes,
    });
  } catch (error) {
    console.error('Error fetching user world:', error);
    res.status(500).json({ error: 'Failed to fetch user world data' });
  }
});

// GET /api/users/:id/followers - Get user's followers
userRoutes.get('/:id/followers', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = '50', cursor } = req.query;

    const followers = await prisma.follow.findMany({
      where: { followingId: id },
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

    res.json({
      followers: followers.map(f => f.follower),
      nextCursor: followers.length > 0 ? followers[followers.length - 1].id : null,
    });
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// GET /api/users/:id/following - Get users this user is following
userRoutes.get('/:id/following', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = '50', cursor } = req.query;

    const following = await prisma.follow.findMany({
      where: { followerId: id },
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

    res.json({
      following: following.map(f => f.following),
      nextCursor: following.length > 0 ? following[following.length - 1].id : null,
    });
  } catch (error) {
    console.error('Error fetching following:', error);
    res.status(500).json({ error: 'Failed to fetch following' });
  }
});
