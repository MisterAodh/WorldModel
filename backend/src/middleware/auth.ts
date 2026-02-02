import { Request, Response, NextFunction } from 'express';
import { clerkClient, verifyToken } from '@clerk/clerk-sdk-node';
import { prisma } from '../lib/prisma.js';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      clerkUserId?: string;
      user?: {
        id: string;
        clerkId: string;
        username: string;
        displayName: string | null;
        creditBalance: number;
      };
    }
  }
}

/**
 * Middleware that requires authentication.
 * Verifies the Clerk JWT token and attaches user info to the request.
 * Creates the user in the database if they don't exist yet.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    
    if (!process.env.CLERK_SECRET_KEY) {
      console.error('CLERK_SECRET_KEY not configured');
      return res.status(500).json({ error: 'Authentication not configured' });
    }

    // Verify the JWT token with Clerk
    let payload;
    try {
      payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
    } catch (verifyError) {
      console.error('Token verification failed:', verifyError);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const clerkUserId = payload.sub;
    if (!clerkUserId) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    req.clerkUserId = clerkUserId;

    // Try to find the user in our database
    let user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: {
        id: true,
        clerkId: true,
        username: true,
        displayName: true,
        creditBalance: true,
      },
    });

    // If user doesn't exist, create them
    if (!user) {
      // Fetch user details from Clerk
      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      
      // Generate a unique username
      let baseUsername = clerkUser.username || 
        clerkUser.emailAddresses[0]?.emailAddress?.split('@')[0] || 
        `user_${clerkUserId.slice(-8)}`;
      
      // Ensure username is unique
      let username = baseUsername;
      let counter = 1;
      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      try {
        user = await prisma.user.create({
          data: {
            clerkId: clerkUserId,
            username,
            displayName: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null,
            avatarUrl: clerkUser.imageUrl,
            creditBalance: 100, // $1.00 in cents
          },
          select: {
            id: true,
            clerkId: true,
            username: true,
            displayName: true,
            creditBalance: true,
          },
        });

        console.log(`Created new user: ${user.username} (${user.id})`);
      } catch (err: any) {
        if (err?.code === 'P2002') {
          user = await prisma.user.findUnique({
            where: { clerkId: clerkUserId },
            select: {
              id: true,
              clerkId: true,
              username: true,
              displayName: true,
              creditBalance: true,
            },
          });
        } else {
          throw err;
        }
      }
    }

    req.userId = user.id;
    req.user = user;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * Middleware that optionally attaches user info if a token is provided.
 * Does not reject requests without authentication.
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No auth header, continue without user
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    if (!process.env.CLERK_SECRET_KEY) {
      // Auth not configured, continue without user
      return next();
    }

    // Try to verify the token
    let payload;
    try {
      payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
    } catch {
      // Invalid token, continue without user
      return next();
    }

    const clerkUserId = payload.sub;
    if (!clerkUserId) {
      return next();
    }

    req.clerkUserId = clerkUserId;

    // Try to find the user in our database
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: {
        id: true,
        clerkId: true,
        username: true,
        displayName: true,
        creditBalance: true,
      },
    });

    if (user) {
      req.userId = user.id;
      req.user = user;
    }

    next();
  } catch (error) {
    // On any error, continue without user
    console.error('Optional auth error:', error);
    next();
  }
}

/**
 * Middleware that checks if the user has sufficient credits.
 * Must be used after requireAuth.
 */
export function requireCredits(minCents: number = 1) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.creditBalance < minCents) {
      return res.status(402).json({ 
        error: 'Insufficient credits',
        creditBalance: req.user.creditBalance,
        required: minCents,
      });
    }

    next();
  };
}
