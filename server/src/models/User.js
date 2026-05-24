import supabase from '../config/database.js';

const User = {
  async create({ name, email, password, role = 'user' }) {
    const { data, error } = await supabase
      .from('users')
      .insert({ name, email, password, role })
      .select('id, name, email, role, created_at')
      .single();

    if (error) throw error;
    return data;
  },

  async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async findAll({ page = 1, limit = 20 } = {}) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('users')
      .select('id, name, email, role, created_at, updated_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { users: data || [], total: count, page, limit };
  },

  async update(id, fields) {
    const allowed = ['name', 'email', 'role', 'password'];
    const updates = {};
    for (const key of allowed) {
      if (fields[key] !== undefined) updates[key] = fields[key];
    }

    if (Object.keys(updates).length === 0) return null;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, name, email, role, created_at, updated_at')
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    return data && data.length > 0;
  },
};

export default User;
