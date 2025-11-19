import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
// import { openai } from '../lib/openai.js';
import {claude } from '../lib/claude.js';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export const articleRoutes = Router();

// Get articles, optionally filtered by country
articleRoutes.get('/', async (req, res) => {
  try {
    const { countryId, regionId } = req.query;

    let where = {};
    
    if (countryId) {
      where = {
        countryLinks: {
          some: {
            countryId: countryId as string,
          },
        },
      };
    } else if (regionId) {
      // Get countries in the region
      const memberships = await prisma.regionMembership.findMany({
        where: { regionId: regionId as string },
        select: { countryId: true },
      });
      const countryIds = memberships.map(m => m.countryId);
      
      where = {
        countryLinks: {
          some: {
            countryId: { in: countryIds },
          },
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
articleRoutes.post('/', async (req, res) => {
  try {
    const { url, countryIds = [], keyNotes, title: providedTitle } = req.body;

    // Validate URL format
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).json({ error: 'URL must use http or https protocol' });
      }
    } catch (urlError) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Check if article already exists
    const existing = await prisma.article.findUnique({
      where: { url },
    });

    if (existing) {
      return res.status(400).json({ error: 'Article already exists' });
    }

    // Fetch and parse the URL
    let response;
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WorldTrackerBot/1.0)',
        },
        redirect: 'follow',
      });
      
      if (!response.ok) {
        return res.status(400).json({ 
          error: `Failed to fetch article: ${response.status} ${response.statusText}` 
        });
      }
    } catch (fetchError) {
      console.error('Error fetching URL:', fetchError);
      return res.status(400).json({ error: 'Failed to fetch article. Please check the URL is accessible.' });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Use provided title or extract metadata
    const title = providedTitle || 
                  $('meta[property="og:title"]').attr('content') || 
                  $('title').text() || 
                  'Untitled Article';
    
    const source = $('meta[property="og:site_name"]').attr('content') || 
                   new URL(url).hostname;
    
    const publishDateStr = $('meta[property="article:published_time"]').attr('content') ||
                           $('meta[name="publish-date"]').attr('content');
    
    const publishDate = publishDateStr ? new Date(publishDateStr) : null;

    // Extract article text for summarization
    const articleText = $('article').text() || 
                        $('main').text() || 
                        $('body').text().slice(0, 5000);

    // Generate summary using Claude
    let summary = null;
    try {
      const completion = await claude.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: `You are a news summarization assistant. Create a concise 2-3 sentence summary of this article.\n\nTitle: ${title}\n\nContent: ${articleText.slice(0, 3000)}`,
          },
        ],
      });

      summary = completion.content[0]?.type === 'text' ? completion.content[0].text : null;
    } catch (claudeError) {
      console.error('Error generating summary:', claudeError);
      // Continue without summary if Claude fails
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
      },
    });

    res.json(article);
  } catch (error) {
    console.error('Error adding article:', error);
    res.status(500).json({ error: 'Failed to add article' });
  }
});

// Update article (title and keyNotes)
articleRoutes.patch('/:articleId', async (req, res) => {
  try {
    const { articleId } = req.params;
    const { title, keyNotes } = req.body;

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
      },
    });

    res.json(article);
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({ error: 'Failed to update article' });
  }
});

// Link article to country
articleRoutes.post('/:articleId/countries', async (req, res) => {
  try {
    const { articleId } = req.params;
    const { countryId } = req.body;

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
articleRoutes.delete('/:articleId/countries/:countryId', async (req, res) => {
  try {
    const { articleId, countryId } = req.params;

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
