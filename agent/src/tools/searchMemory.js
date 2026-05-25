import memory from '../memory.js';

export const searchMemory = {
  description: 'Search past conversations with this user for relevant context. Use this to remember what the user has said or asked about before.',
  parameters: {
    query: { type: 'string', description: 'The search query to find relevant past conversations' },
  },
  execute: async ({ query }, context) => {
    const results = await memory.searchSimilar({
      userId: context.userId,
      query,
      limit: 5,
    });

    if (results.length === 0) {
      return { found: false, message: 'No relevant past conversations found.' };
    }

    return {
      found: true,
      count: results.length,
      conversations: results.map(r => ({
        role: r.role,
        content: r.content.slice(0, 500),
        timestamp: r.created_at,
      })),
    };
  },
};
