export const escalate = {
  description: 'Escalate the conversation to a human engineer. Use this when the user explicitly asks to speak with a person, has urgent issues, or their needs are beyond what you can handle.',
  parameters: {
    reason: { type: 'string', description: 'The reason for escalation and any context the engineer should know' },
  },
  execute: async ({ reason }, context) => {
    const adminChatId = process.env.ADMIN_CHAT_ID || null;

    return {
      escalated: true,
      adminNotified: !!adminChatId,
      message: 'Your request has been escalated to our engineering team. They will reach out to you shortly.',
      reason,
      userId: context.userId,
      username: context.username,
      timestamp: new Date().toISOString(),
    };
  },
};
