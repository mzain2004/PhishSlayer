import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function upgradeUser() {
  const userId = '1aff8a08-94e4-492a-a28a-ed592a939ead'; // test@test.com
  const { error } = await supabase
    .from('profiles')
    .update({ subscription_tier: 'pro' })
    .eq('id', userId);

  if (error) {
    console.error('Error upgrading user tier:', error);
  } else {
    console.log('User test@test.com upgraded to PRO tier successfully.');
  }
}

upgradeUser();
