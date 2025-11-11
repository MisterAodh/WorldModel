import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { claude } from '../lib/claude.js';

export const chatRoutes = Router();

// Chat endpoint
chatRoutes.post('/', async (req, res) => {
  try {
    const { message, contextType, contextId, conversationHistory = [] } = req.body;

    // Gather context data
    let contextData: any = {};

    if (contextType === 'country' && contextId) {
      // Get country details
      const country = await prisma.country.findUnique({
        where: { id: contextId },
      });

      // Get latest tags
      const tags = await prisma.qualitativeTag.findMany({
        where: {
          scopeType: 'COUNTRY',
          scopeId: contextId,
        },
        orderBy: { createdAt: 'desc' },
        distinct: ['category'],
      });

      // Get latest metrics
      const metrics = await prisma.countryMetrics.findFirst({
        where: { countryId: contextId },
        orderBy: { year: 'desc' },
      });

      // Get recent industries
      const industries = await prisma.industryShare.findMany({
        where: {
          countryId: contextId,
          year: metrics?.year || new Date().getFullYear(),
        },
        orderBy: { gdpSharePercent: 'desc' },
        take: 10,
      });

      // Get recent articles
      const articleLinks = await prisma.articleCountryLink.findMany({
        where: { countryId: contextId },
        include: {
          article: true,
        },
        orderBy: {
          article: {
            publishDate: 'desc',
          },
        },
        take: 5,
      });

      // Get notes
      const notes = await prisma.note.findMany({
        where: {
          scopeType: 'COUNTRY',
          scopeId: contextId,
        },
        orderBy: { updatedAt: 'desc' },
        take: 3,
      });

      contextData = {
        type: 'country',
        country: country?.name,
        iso3: country?.iso3,
        tags: tags.map(t => ({
          category: t.category,
          value: t.value,
          note: t.note,
        })),
        metrics: metrics ? {
          year: metrics.year,
          population: metrics.population?.toString(),
          immigrationRate: metrics.immigrationRate,
          emigrationRate: metrics.emigrationRate,
          murdersPerCapita: metrics.murdersPerCapita,
          warDeathsPercent: metrics.warDeathsPercent,
          famineDeathsPercent: metrics.famineDeathsPercent,
        } : null,
        industries: industries.map(i => ({
          name: i.industryName,
          gdpShare: i.gdpSharePercent,
        })),
        recentArticles: articleLinks.map(link => ({
          title: link.article.title,
          url: link.article.url,
          summary: link.article.summary,
        })),
        notes: notes.map(n => n.content),
      };
    } else if (contextType === 'region' && contextId) {
      // Get region details
      const region = await prisma.region.findUnique({
        where: { id: contextId },
        include: {
          memberships: {
            include: {
              country: true,
            },
          },
        },
      });

      const countryIds = region?.memberships.map(m => m.countryId) || [];

      // Get region-specific tags
      const tags = await prisma.qualitativeTag.findMany({
        where: {
          scopeType: 'REGION',
          scopeId: contextId,
        },
        orderBy: { createdAt: 'desc' },
        distinct: ['category'],
      });

      // Get aggregated metrics
      const metrics = await Promise.all(
        countryIds.map(countryId =>
          prisma.countryMetrics.findFirst({
            where: { countryId },
            orderBy: { year: 'desc' },
          })
        )
      );

      const validMetrics = metrics.filter(m => m !== null);
      const aggregatedMetrics = validMetrics.length > 0 ? {
        totalPopulation: validMetrics.reduce((sum, m) => sum + (m?.population || BigInt(0)), BigInt(0)).toString(),
        avgImmigrationRate: validMetrics.reduce((sum, m) => sum + (m?.immigrationRate || 0), 0) / validMetrics.length,
        avgEmigrationRate: validMetrics.reduce((sum, m) => sum + (m?.emigrationRate || 0), 0) / validMetrics.length,
      } : null;

      contextData = {
        type: 'region',
        region: region?.name,
        memberCountries: region?.memberships.map(m => m.country.name),
        tags: tags.map(t => ({
          category: t.category,
          value: t.value,
          note: t.note,
        })),
        aggregatedMetrics,
      };
    }

    // Build system prompt for Claude
    const systemPrompt = `You are an intelligent assistant for a Geopolitical Intelligence Workspace.

The user is currently viewing: ${contextData.type === 'country' ? `Country: ${contextData.country}` : contextData.type === 'region' ? `Region: ${contextData.region}` : 'the global map'}

Context data from our database:
${JSON.stringify(contextData, null, 2)}

Your capabilities:
1. Answer questions using both the context data AND your knowledge base
2. Use web search for current information, recent news, and real-time data - you HAVE web search available!
3. Provide geopolitical analysis with sources when using search
4. When asked to suggest updates, be specific with numerical scores
5. Always cite URLs when using search results

Important: Be direct and helpful. Don't say you can't browse or access the web - you CAN and SHOULD use web search when asked for recent information or news.`;

    // Prepare messages for Claude
    const claudeMessages = [
      ...conversationHistory.map((msg: any) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    // Call Claude API
    console.log('Calling Claude API...');
    
    const response = await claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      system: systemPrompt,
      messages: claudeMessages,
    });

    let assistantMessage = '';
    const searchResults: any[] = [];

    // Process response blocks
    for (const block of response.content) {
      if (block.type === 'text') {
        assistantMessage += block.text;
      }
    }

    // Extract search results from stop_reason metadata if available
    if ((response as any).search_results) {
      const results = (response as any).search_results;
      if (Array.isArray(results)) {
        searchResults.push(...results.map((r: any) => ({
          title: r.title || 'Untitled',
          url: r.url || '',
          snippet: r.snippet || r.content?.substring(0, 200) || '',
        })));
      }
    }

    console.log('Claude response received with', searchResults.length, 'search results');

    // Check if user is asking for structured suggestions
    const isRequestingUpdates = message.toLowerCase().includes('suggest') || 
                                 message.toLowerCase().includes('propose') ||
                                 message.toLowerCase().includes('scan') ||
                                 message.toLowerCase().includes('analyze') ||
                                 message.toLowerCase().includes('label');

    // If requesting updates, generate structured suggestions
    if (isRequestingUpdates && contextId) {
      try {
        const suggestionResponse = await claude.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1000,
          system: `Based on the conversation, generate structured suggestions for updating the database.

Return ONLY valid JSON in this format:
{
  "suggestions": [
    {
      "type": "qualitative_tag",
      "category": "ECONOMIC|SOCIAL|POLITICAL",
      "value": -5 to +5 (integer),
      "note": "Brief explanation",
      "citations": ["url1", "url2"]
    }
  ]
}

Only return suggestions if you have enough information. If not, return {"suggestions": []}.`,
          messages: [
            ...claudeMessages,
            { role: 'assistant', content: assistantMessage },
          ],
        });

        let suggestionsText = '';
        for (const block of suggestionResponse.content) {
          if (block.type === 'text') {
            suggestionsText += block.text;
          }
        }

        const parsedSuggestions = JSON.parse(suggestionsText);
        
        if (parsedSuggestions.suggestions && parsedSuggestions.suggestions.length > 0) {
          // Store suggestions in database
          for (const suggestion of parsedSuggestions.suggestions) {
            await prisma.aISuggestion.create({
              data: {
                scopeType: contextType === 'country' ? 'COUNTRY' : 'REGION',
                scopeId: contextId,
                suggestionType: suggestion.type,
                payload: suggestion,
                citations: suggestion.citations || [],
                status: 'PENDING',
              },
            });
          }
        }
      } catch (parseError) {
        console.error('Error parsing suggestions:', parseError);
      }
    }

    res.json({
      message: assistantMessage,
      contextUsed: contextData,
      searchResults: searchResults.length > 0 ? searchResults : undefined,
    });
  } catch (error: any) {
    console.error('Error in chat:', error);
    const errorMessage = error?.message || 'Failed to process chat message';
    res.status(500).json({ 
      error: errorMessage,
      message: 'Sorry, I encountered an error processing your request. Please try again.'
    });
  }
});
