import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { claude } from '../lib/claude.js';
import { optionalAuth } from '../middleware/auth.js';
import { billedClaudeCall } from '../lib/billing.js';

export const chatRoutes = Router();

// Chat endpoint
chatRoutes.post('/', optionalAuth, async (req, res) => {
  try {
    const { message, contextType, contextId, conversationHistory = [] } = req.body;

    // Gather context data - filter by user if authenticated
    let contextData: any = {};

    if (contextType === 'country' && contextId) {
      // Get country details
      const country = await prisma.country.findUnique({
        where: { id: contextId },
      });

      // Build user filter
      const userFilter = req.userId ? { userId: req.userId } : {};

      // Get latest tags (filtered by user if logged in)
      const tags = await prisma.qualitativeTag.findMany({
        where: {
          scopeType: 'COUNTRY',
          scopeId: contextId,
          ...userFilter,
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

      // Get recent articles (filtered by user if logged in)
      const articleLinks = await prisma.articleCountryLink.findMany({
        where: { 
          countryId: contextId,
          article: userFilter.userId ? { userId: userFilter.userId } : undefined,
        },
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

      // Get notes (filtered by user if logged in)
      const notes = await prisma.note.findMany({
        where: {
          scopeType: 'COUNTRY',
          scopeId: contextId,
          ...userFilter,
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
    }

    // Build system prompt for Claude
    const systemPrompt = `You are an intelligent assistant for a Geopolitical Intelligence Workspace.

The user is currently viewing: ${contextData.type === 'country' ? `Country: ${contextData.country}` : 'the global map'}

Context data from our database:
${JSON.stringify(contextData, null, 2)}

Your capabilities:
1. Answer questions using both the context data AND your knowledge base
2. You have access to web search for current information, recent news, and real-time data
3. Provide geopolitical analysis with sources
4. When asked to suggest updates, be specific with numerical scores
5. **ALWAYS cite sources using the special format below**

**CRITICAL: Source Citation Format**
You MUST cite sources using this EXACT format for EVERY piece of information from web search:
SOURCE{{https://example.com/article: Article Title or Brief Description}}

Rules:
- The URL must be the FULL URL including https://
- The descriptor should be a clean article title or brief description (NOT the source name like "BBC -")
- Just the title, like "Sudan Civil War Update 2025" not "BBC - Sudan Civil War Update 2025"
- Include SOURCE citations throughout your response, not just at the end
- If you use web search, you MUST cite the specific URLs you found

Example response with proper citations:
"Sudan is experiencing a civil war between the SAF and RSF SOURCE{{https://www.bbc.com/news/sudan-conflict-2025: Sudan Civil War Update}}. The humanitarian crisis has displaced over 8 million people SOURCE{{https://www.unhcr.org/sudan-crisis: UNHCR Sudan Displacement Report}}."

When users ask about recent events, news, or current data, you MUST:
1. Use web search to find current information
2. Include SOURCE{{URL: Title}} citations for every fact from search results
3. Make the citations clickable by using the exact format above

Do NOT respond with general knowledge for current events - USE WEB SEARCH and CITE THE SOURCES.`;

    // Prepare messages for Claude
    const claudeMessages = [
      ...conversationHistory.map((msg: any) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
      { role: 'user' as const, content: message },
    ];

    let assistantMessage = '';
    let searchResults: any[] = [];

    // Use billed call if user is authenticated
    if (req.userId) {
      try {
        const result = await billedClaudeCall(
          req.userId,
          'chat',
          {
            model: 'claude-sonnet-4-5',
            max_tokens: 2000,
            system: systemPrompt,
            messages: claudeMessages,
            tools: [
              {
                type: 'web_search_20250305',
                name: 'web_search',
                max_uses: 5,
              } as any
            ],
          },
          2000 // Estimated input tokens
        );

        // Extract assistant message from response
        for (const block of result.response.content) {
          if (block.type === 'text') {
            assistantMessage += block.text;
          }
        }

        // Extract search results
        const responseAny = result.response as any;
        const possibleLocations = [
          { path: 'search_results', data: responseAny.search_results },
          { path: 'metadata.search_results', data: responseAny.metadata?.search_results },
          { path: 'usage.search_results', data: responseAny.usage?.search_results },
          { path: 'search_queries', data: responseAny.search_queries },
        ];

        for (const location of possibleLocations) {
          if (location.data && Array.isArray(location.data)) {
            const results = location.data.map((r: any) => ({
              title: r.title || r.name || 'Untitled',
              url: r.url || r.link || '',
              snippet: r.content || r.snippet || r.description || '',
            }));
            searchResults.push(...results);
          }
        }
      } catch (error: any) {
        if (error.message === 'Insufficient credits') {
          return res.status(402).json({
            error: 'Insufficient credits',
            message: 'You need to purchase more credits to use the AI chat. Please go to Settings > Billing to add credits.',
          });
        }
        throw error;
      }
    } else {
      // Non-authenticated call (legacy support)
      const response = await claude.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 2000,
        system: systemPrompt,
        messages: claudeMessages,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
            max_uses: 5,
          } as any
        ],
      });

      // Extract assistant message from response
      for (const block of response.content) {
        if (block.type === 'text') {
          assistantMessage += block.text;
        }
      }

      // Extract search results
      const responseAny = response as any;
      const possibleLocations = [
        { path: 'search_results', data: responseAny.search_results },
        { path: 'metadata.search_results', data: responseAny.metadata?.search_results },
        { path: 'usage.search_results', data: responseAny.usage?.search_results },
        { path: 'search_queries', data: responseAny.search_queries },
      ];

      for (const location of possibleLocations) {
        if (location.data && Array.isArray(location.data)) {
          const results = location.data.map((r: any) => ({
            title: r.title || r.name || 'Untitled',
            url: r.url || r.link || '',
            snippet: r.content || r.snippet || r.description || '',
          }));
          searchResults.push(...results);
        }
      }
    }

    // Check if user is asking for structured suggestions
    const isRequestingUpdates = message.toLowerCase().includes('suggest') || 
                                 message.toLowerCase().includes('propose') ||
                                 message.toLowerCase().includes('scan') ||
                                 message.toLowerCase().includes('analyze') ||
                                 message.toLowerCase().includes('label');

    // If requesting updates, generate structured suggestions
    if (isRequestingUpdates && contextId) {
      try {
        const suggestionPrompt = {
          model: 'claude-3-sonnet-20240229' as const,
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
            { role: 'assistant' as const, content: assistantMessage },
          ],
        };

        let suggestionsText = '';
        
        if (req.userId) {
          const result = await billedClaudeCall(req.userId, 'suggestions', suggestionPrompt, 500);
          for (const block of result.response.content) {
            if (block.type === 'text') {
              suggestionsText += block.text;
            }
          }
        } else {
          const suggestionResponse = await claude.messages.create(suggestionPrompt);
          for (const block of suggestionResponse.content) {
            if (block.type === 'text') {
              suggestionsText += block.text;
            }
          }
        }

        const parsedSuggestions = JSON.parse(suggestionsText);
        
        if (parsedSuggestions.suggestions && parsedSuggestions.suggestions.length > 0) {
          // Store suggestions in database
          for (const suggestion of parsedSuggestions.suggestions) {
            await prisma.aISuggestion.create({
              data: {
                scopeType: 'COUNTRY',
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
