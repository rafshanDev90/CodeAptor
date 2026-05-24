import supabase from '../config/database.js';

const dbService = {
  async saveLead({ userId, username, issue, contact, source = 'audit' }) {
    const { data, error } = await supabase
      .from('leads')
      .insert({ user_id: userId, username, issue, contact, source, status: 'new' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getLeads({ status, page = 1, limit = 20 } = {}) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return { leads: data || [], total: count, page, limit };
  },

  async getLeadById(id) {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async updateLeadStatus(id, status) {
    const { data, error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

export default dbService;
