import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { claude } from '../lib/claude.js';

export const tagRoutes = Router();

// Get tags for a scope
tagRoutes.get('/:scopeType/:scopeId', async (req, res) => {
  try {
    const { scopeType, scopeId } = req.params;

    const tags = await prisma.qualitativeTag.findMany({
      where: {
        scopeType: scopeType.toUpperCase() as any,
        scopeId,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get latest per category
    const latestTags = await prisma.qualitativeTag.findMany({
      where: {
        scopeType: scopeType.toUpperCase() as any,
        scopeId,
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['category'],
    });

    res.json({ all: tags, latest: latestTags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// Create new qualitative tag
tagRoutes.post('/', async (req, res) => {
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
      },
    });

    res.json(tag);
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// Delete a qualitative tag
tagRoutes.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

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
tagRoutes.post('/generate-scores/:countryId', async (req, res) => {
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
    
    // Get aggregated metric data for this country
    const metricData = await prisma.countryMetricData.findMany({
      where: {
        countryId,
        year: year || new Date().getFullYear(),
        quarter: null,
      },
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

    const response = await claude.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });
    
    // Extract text response
    let text = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        text += block.text;
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
  } catch (error) {
    console.error('Error generating scores:', error);
    res.status(500).json({ error: 'Failed to generate scores' });
  }
});
