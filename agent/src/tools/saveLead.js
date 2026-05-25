import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_PUBLIC_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

let supabase = null;

function getClient() {
  if (!supabase) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase not configured');
    }
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
  }
  return supabase;
}

export const saveLead = {
  description: 'Save a new lead to the database with the user\'s issue description and contact information. An engineer will follow up within 2 hours.',
  parameters: {
    issue: { type: 'string', description: 'Description of the user\'s website issue or infrastructure needs' },
    contact: { type: 'string', description: 'User\'s email or phone number for follow-up' },
  },
  execute: async ({ issue, contact }, context) => {
    const db = getClient();

    const { data, error } = await db
      .from('leads')
      .insert({
        user_id: context.userId,
        username: context.username || 'unknown',
        issue,
        contact,
        source: 'agent',
        status: 'new',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save lead: ${error.message}`);
    }

    return {
      saved: true,
      leadId: data.id,
      message: 'Lead saved successfully. An engineer will follow up within 2 hours.',
    };
  },
};
