import { z } from 'zod';
import logger from '../middlewares/logger.js';

const TAVILY_API_URL = 'https://api.tavily.com/search';

export const webSearch = {
  description: 'Search the web for current information. Use this to find up-to-date data, documentation, pricing, tech stack details, best practices, or anything else that requires recent or external knowledge.',
  schema: z.object({
    query: z.string().describe('The search query (clear, specific, and concise for best results)'),
  }),
  execute: async ({ query }) => {
    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
      return {
        searched: false,
        message: 'Web search is not configured. Ask the user to set TAVILY_API_KEY in the agent environment.',
      };
    }

    try {
      const response = await fetch(TAVILY_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: 'basic',
          include_answer: true,
          max_results: 5,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.detail?.error || `Tavily returned ${response.status}`);
      }

      const data = await response.json();

      const results = (data.results || []).map(r => ({
        title: r.title,
        url: r.url,
        content: r.content?.slice(0, 1000) || '',
        score: r.score,
      }));

      return {
        searched: true,
        answer: data.answer || null,
        results,
        resultCount: results.length,
      };
    } catch (err) {
      logger.error('Web search failed', { error: err.message, query });
      return {
        searched: false,
        message: `Search failed: ${err.message}`,
      };
    }
  },
};
