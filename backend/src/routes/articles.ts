import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { openai } from '../lib/openai.js';
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
    const { url, countryIds = [] } = req.body;

    // Check if article already exists
    const existing = await prisma.article.findUnique({
      where: { url },
    });

    if (existing) {
      return res.status(400).json({ error: 'Article already exists' });
    }

    // Fetch and parse the URL
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract metadata
    const title = $('meta[property="og:title"]').attr('content') || 
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

    // Generate summary using OpenAI
    let summary = null;
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a news summarization assistant. Create a concise 2-3 sentence summary of the article.',
          },
          {
            role: 'user',
            content: `Summarize this article:\n\nTitle: ${title}\n\nContent: ${articleText.slice(0, 3000)}`,
          },
        ],
        max_tokens: 200,
      });

      summary = completion.choices[0]?.message?.content || null;
    } catch (openaiError) {
      console.error('Error generating summary:', openaiError);
      // Continue without summary if OpenAI fails
    }

    // Create article
    const article = await prisma.article.create({
      data: {
        url,
        title,
        source,
        publishDate,
        summary,
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
