import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { claude } from '../lib/claude.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { billedClaudeCall } from '../lib/billing.js';

export const tagRoutes = Router();

// Get tags for a scope (optionally filtered by user)
tagRoutes.get('/:scopeType/:scopeId', optionalAuth, async (req, res) => {
  try {
    const { scopeType, scopeId } = req.params;
    const { userId: filterUserId } = req.query;

    // Build where clause
    const where: any = {
      scopeType: scopeType.toUpperCase() as any,
      scopeId,
    };

    // If filterUserId is specified, filter by that user
    // If current user is logged in and no filter specified, show their own tags
    // IMPORTANT: Always filter by user - never return orphaned (null userId) data
    if (filterUserId) {
      where.userId = filterUserId as string;
    } else if (req.userId) {
      where.userId = req.userId;
    } else {
      // No user context - return empty results (don't show orphaned data)
      return res.json({ all: [], latest: [] });
    }

    const tags = await prisma.qualitativeTag.findMany({
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
      orderBy: { createdAt: 'desc' },
    });

    // Get latest per category
    const latestTags = await prisma.qualitativeTag.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      distinct: ['category'],
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

    res.json({ all: tags, latest: latestTags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// Bulk tag fetch for many scopes (map coloring, etc.)
// POST /api/tags/bulk
// Body: { scopeType: 'country' | 'region', scopeIds: string[], userId?: string }
// - If userId is omitted, uses the current authenticated user (req.userId)
// - If no user context exists, returns empty results
tagRoutes.post('/bulk', optionalAuth, async (req, res) => {
  try {
    const { scopeType, scopeIds, userId: filterUserId } = req.body || {};

    if (!scopeType || !Array.isArray(scopeIds)) {
      return res.status(400).json({ error: 'scopeType and scopeIds are required' });
    }

    const normalizedScopeType = String(scopeType).toUpperCase();
    const effectiveUserId = filterUserId || req.userId;

    if (!effectiveUserId) {
      return res.json({ byScopeId: {} });
    }

    // Defensive: cap request size
    const limitedScopeIds = scopeIds.slice(0, 500).map((id: any) => String(id));

    const tags = await prisma.qualitativeTag.findMany({
      where: {
        scopeType: normalizedScopeType as any,
        scopeId: { in: limitedScopeIds },
        userId: effectiveUserId,
      },
      select: {
        scopeId: true,
        category: true,
        value: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const byScopeId: Record<string, Array<{ category: string; value: number }>> = {};
    for (const t of tags) {
      if (!byScopeId[t.scopeId]) byScopeId[t.scopeId] = [];
      byScopeId[t.scopeId].push({ category: t.category, value: t.value });
    }

    res.json({ byScopeId });
  } catch (error) {
    console.error('Error fetching tags (bulk):', error);
    res.status(500).json({ error: 'Failed to fetch tags (bulk)' });
  }
});

// Create new qualitative tag
tagRoutes.post('/', optionalAuth, async (req, res) => {
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

    res.json(tag);
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// Delete a qualitative tag
tagRoutes.delete('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if tag exists and belongs to user (if authenticated)
    const tag = await prisma.qualitativeTag.findUnique({
      where: { id },
    });

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // If tag has a user and current user is different, deny
    if (tag.userId && req.userId && tag.userId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this tag' });
    }

    await prisma.qualitativeTag.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

// Generate AI scores from aggregated data
tagRoutes.post('/generate-scores/:countryId', requireAuth, async (req, res) => {
  try {
    const { countryId } = req.params;
    const { year } = req.body;
    
    // Get country info
    const country = await prisma.country.findUnique({
      where: { id: countryId },
    });
    
    if (!country) {
      return res.status(404).json({ error: 'Country not found' });
    }
    
    // Get aggregated metric data for this country (ALWAYS user-scoped)
    const where: any = {
      countryId,
      year: year || new Date().getFullYear(),
      quarter: 0,
      userId: req.userId,
    };

    const metricData = await prisma.countryMetricData.findMany({
      where,
      include: {
        metric: true,
      },
    });
    
    if (metricData.length === 0) {
      return res.status(400).json({ error: 'No aggregated data found for this country. Run aggregation first.' });
    }
    
    // Format data for Claude
    const dataForClaude = metricData
      .filter(d => d.valueNumeric !== null || d.valueText !== null)
      .map(d => ({
        metric: d.metric.name,
        category: d.metric.category,
        value: d.valueNumeric ?? d.valueText,
        unit: d.metric.unit,
        confidence: d.confidenceScore,
      }));
    
    const prompt = `Based on the following aggregated data for ${country.name}, provide qualitative assessment scores.

DATA:
${JSON.stringify(dataForClaude, null, 2)}

Analyze this data and provide scores for these four dimensions:
1. ECONOMIC: Economic health/growth outlook (-5 very negative to +5 very positive)
2. SOCIAL: Social cohesion/stability (-5 fragmented to +5 cohesive)
3. POLITICAL: Political stability (-5 very unstable to +5 very stable)
4. IDEOLOGICAL: Political leaning (-5 very conservative to +5 very progressive)

Respond ONLY with JSON in this exact format:
{
  "economic": <number -5 to 5>,
  "social": <number -5 to 5>,
  "political": <number -5 to 5>,
  "ideological": <number -5 to 5>,
  "reasoning": {
    "economic": "<one sentence explanation>",
    "social": "<one sentence explanation>",
    "political": "<one sentence explanation>",
    "ideological": "<one sentence explanation>"
  }
}`;

    let text = '';
    
    // Use billed call if user is authenticated
    if (req.userId) {
      const result = await billedClaudeCall(
        req.userId,
        'score-generation',
        {
          model: 'claude-sonnet-4-5',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }],
        }
      );
      
      for (const block of result.response.content) {
        if (block.type === 'text') {
          text += block.text;
        }
      }
    } else {
      // Non-authenticated call (legacy support)
      const response = await claude.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });
      
      for (const block of response.content) {
        if (block.type === 'text') {
          text += block.text;
        }
      }
    }
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }
    
    const scores = JSON.parse(jsonMatch[0]);
    
    res.json({
      countryName: country.name,
      year: year || new Date().getFullYear(),
      dataPointsUsed: metricData.length,
      scores,
    });
  } catch (error: any) {
    console.error('Error generating scores:', error);
    if (error.message === 'Insufficient credits') {
      return res.status(402).json({ error: 'Insufficient credits' });
    }
    res.status(500).json({ error: 'Failed to generate scores' });
  }
});
