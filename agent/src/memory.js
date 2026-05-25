import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_PUBLIC_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

let supabase = null;

function getClient() {
  if (!supabase) {
    if (!supabaseUrl || !supabaseKey) {
      console.warn('[MEMORY] Supabase not configured — memory disabled');
      return null;
    }
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
  }
  return supabase;
}

const memory = {
  async addMessage({ userId, role, content, sessionId }) {
    const db = getClient();
    if (!db) return null;

    const { data, error } = await db
      .from('conversations')
      .insert({
        user_id: userId,
        session_id: sessionId || `${userId}`,
        role,
        content,
      })
      .select()
      .single();

    if (error) {
      console.error('[MEMORY] addMessage error:', error.message);
      return null;
    }
    return data;
  },

  async getRecent({ userId, limit = 10, sessionId }) {
    const db = getClient();
    if (!db) return [];

    let query = db
      .from('conversations')
      .select('role, content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[MEMORY] getRecent error:', error.message);
      return [];
    }
    return (data || []).reverse();
  },

  async searchSimilar({ userId, query, limit = 3 }) {
    const db = getClient();
    if (!db) return [];

    const { data, error } = await db
      .from('conversations')
      .select('role, content, created_at')
      .eq('user_id', userId)
      .textSearch('content', query, {
        type: 'plain',
        config: 'english',
      })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[MEMORY] searchSimilar error:', error.message);
      return [];
    }
    return data || [];
  },
};

export default memory;
