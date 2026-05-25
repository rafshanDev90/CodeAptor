import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import logger from '../middlewares/logger.js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_PUBLIC_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('CRITICAL: SUPABASE_PUBLIC_URL and SUPABASE_SECRET_KEY are required');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const connectDB = async () => {
  logger.info('Supabase client initialized');
};

export { supabase, connectDB };
export default supabase;
