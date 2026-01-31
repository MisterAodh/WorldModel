import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { claude } from '../lib/claude.js';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { billedClaudeCall } from '../lib/billing.js';

export const articleRoutes = Router();

// Get articles, optionally filtered by country and/or user
articleRoutes.get('/', optionalAuth, async (req, res) => {
  try {
    const { countryId, regionId, userId: filterUserId } = req.query;

    let where: any = {};
    
    // Filter by user if specified, or by current user if logged in
    // IMPORTANT: Always filter by user - never return orphaned (null userId) data
    if (filterUserId) {
      where.userId = filterUserId as string;
    } else if (req.userId) {
      where.userId = req.userId;
    } else {
      // No user context - return empty results (don't show orphaned data)
      return res.json([]);
    }
    
    if (countryId) {
      where.countryLinks = {
        some: {
          countryId: countryId as string,
        },
      };
    } else if (regionId) {
      // Get countries in the region
      const memberships = await prisma.regionMembership.findMany({
        where: { regionId: regionId as string },
        select: { countryId: true },
      });
      const countryIds = memberships.map(m => m.countryId);
      
      where.countryLinks = {
        some: {
          countryId: { in: countryIds },
        },
      };
    }

    const articles = await prisma.article.findMany({
      where,
      include: {
        countryLinks: {
          include: {
            country: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { publishDate: 'desc' },
      take: 50,
    });

    res.json(articles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// Add article by URL
articleRoutes.post('/', optionalAuth, async (req, res) => {
  try {
    const { url, countryIds = [], keyNotes, title: providedTitle } = req.body;

    console.log('📝 Add article request:', { url, countryIds, keyNotes: keyNotes ? 'present' : 'none', providedTitle, userId: req.userId });

    // Validate URL format
    if (!url || typeof url !== 'string') {
      console.log('❌ URL validation failed: URL is required');
      return res.status(400).json({ error: 'URL is required' });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        console.log('❌ URL validation failed: Invalid protocol', parsedUrl.protocol);
        return res.status(400).json({ error: 'URL must use http or https protocol' });
      }
      console.log('✅ URL validated:', parsedUrl.href);
    } catch (urlError) {
      console.log('❌ URL parsing failed:', urlError);
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Check if article already exists for this user (or globally if no user)
    const existingWhere: any = { url };
    if (req.userId) {
      existingWhere.userId = req.userId;
    }
    
    const existing = await prisma.article.findFirst({
      where: existingWhere,
    });

    if (existing) {
      console.log('❌ Article already exists with this URL for this user');
      return res.status(400).json({ error: 'Article already exists' });
    }
    
    console.log('✅ No existing article found, proceeding to fetch...');

    // Fetch and parse the URL
    let html = '';
    let title = providedTitle || 'Untitled Article';
    let source = parsedUrl.hostname;
    let publishDate = null;
    let summary = null;
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
      
      if (!response.ok) {
        console.log(`⚠️  Failed to fetch article (${response.status}), but will continue with provided data`);
        throw new Error(`HTTP ${response.status}`);
      }
      
      html = await response.text();
      console.log('✅ Successfully fetched article HTML');
      
      const $ = cheerio.load(html);

      // Use provided title or extract metadata
      if (!providedTitle) {
        title = $('meta[property="og:title"]').attr('content') || 
                $('title').text() || 
                'Untitled Article';
      }
      
      source = $('meta[property="og:site_name"]').attr('content') || parsedUrl.hostname;
      
      const publishDateStr = $('meta[property="article:published_time"]').attr('content') ||
                             $('meta[name="publish-date"]').attr('content');
      
      publishDate = publishDateStr ? new Date(publishDateStr) : null;

      // Extract article text for summarization
      const articleText = $('article').text() || 
                          $('main').text() || 
                          $('body').text().slice(0, 5000);

      // Generate summary using Claude (with billing if user is authenticated)
      if (articleText.trim().length > 100) {
        try {
          const prompt = `You are a news summarization assistant. Create a concise 2-3 sentence summary of this article.\n\nTitle: ${title}\n\nContent: ${articleText.slice(0, 3000)}`;
          
          if (req.userId) {
            const result = await billedClaudeCall(
              req.userId,
              'article-summary',
              {
                model: 'claude-3-haiku-20240307',
                max_tokens: 200,
                messages: [{ role: 'user', content: prompt }],
              },
              500 // Estimated input tokens
            );
            summary = result.response.content[0]?.type === 'text' ? result.response.content[0].text : null;
          } else {
            const completion = await claude.messages.create({
              model: 'claude-3-haiku-20240307',
              max_tokens: 200,
              messages: [{ role: 'user', content: prompt }],
            });
            summary = completion.content[0]?.type === 'text' ? completion.content[0].text : null;
          }
          console.log('✅ Generated summary using Claude');
        } catch (claudeError: any) {
          console.error('⚠️  Error generating summary:', claudeError);
          // Continue without summary if Claude fails (including insufficient credits)
        }
      }
    } catch (fetchError: any) {
      console.error('⚠️  Error fetching URL:', fetchError.message);
      // If fetch fails but we have a provided title, continue anyway
      if (!providedTitle) {
        return res.status(400).json({ 
          error: 'Failed to fetch article content. Please provide a title manually.' 
        });
      }
      console.log('⚠️  Continuing with provided title since fetch failed');
    }

    // Create article
    const article = await prisma.article.create({
      data: {
        url,
        title,
        source,
        publishDate,
        summary,
        keyNotes,
        userId: req.userId || null,
        rawMetadata: {
          html: html.slice(0, 10000), // Store first 10k chars of HTML
        },
        countryLinks: {
          create: countryIds.map((countryId: string) => ({
            countryId,
          })),
        },
      },
      include: {
        countryLinks: {
          include: {
            country: true,
          },
        },
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

    console.log(`✅ Article created successfully: "${article.title}" (${article.id})`);
    res.json(article);
  } catch (error) {
    console.error('❌ Error adding article:', error);
    res.status(500).json({ error: 'Failed to add article' });
  }
});

// Update article (title and keyNotes)
articleRoutes.patch('/:articleId', optionalAuth, async (req, res) => {
  try {
    const { articleId } = req.params;
    const { title, keyNotes } = req.body;

    // Check ownership
    const existing = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Article not found' });
    }

    if (existing.userId && req.userId && existing.userId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to update this article' });
    }

    const article = await prisma.article.update({
      where: { id: articleId },
      data: {
        ...(title !== undefined && { title }),
        ...(keyNotes !== undefined && { keyNotes }),
      },
      include: {
        countryLinks: {
          include: {
            country: true,
          },
        },
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

    res.json(article);
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({ error: 'Failed to update article' });
  }
});

// Delete article
articleRoutes.delete('/:articleId', optionalAuth, async (req, res) => {
  try {
    const { articleId } = req.params;

    // Check ownership
    const existing = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Article not found' });
    }

    if (existing.userId && req.userId && existing.userId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this article' });
    }

    // Delete country links first, then the article
    await prisma.articleCountryLink.deleteMany({
      where: { articleId },
    });

    await prisma.article.delete({
      where: { id: articleId },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

// Link article to country
articleRoutes.post('/:articleId/countries', optionalAuth, async (req, res) => {
  try {
    const { articleId } = req.params;
    const { countryId } = req.body;

    // Check ownership
    const existing = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Article not found' });
    }

    if (existing.userId && req.userId && existing.userId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to modify this article' });
    }

    const link = await prisma.articleCountryLink.create({
      data: {
        articleId,
        countryId,
      },
      include: {
        country: true,
      },
    });

    res.json(link);
  } catch (error) {
    console.error('Error linking article to country:', error);
    res.status(500).json({ error: 'Failed to link article to country' });
  }
});

// Unlink article from country
articleRoutes.delete('/:articleId/countries/:countryId', optionalAuth, async (req, res) => {
  try {
    const { articleId, countryId } = req.params;

    // Check ownership
    const existing = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Article not found' });
    }

    if (existing.userId && req.userId && existing.userId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to modify this article' });
    }

    await prisma.articleCountryLink.deleteMany({
      where: {
        articleId,
        countryId,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error unlinking article from country:', error);
    res.status(500).json({ error: 'Failed to unlink article from country' });
  }
});
