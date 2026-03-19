import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAgentsTable() {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .limit(1);
    
  if (error) {
    console.log('AGENT_TABLE_CHECK: FAILED');
    console.log('Error:', error.message);
  } else {
    console.log('AGENT_TABLE_CHECK: SUCCESS');
    console.log('Sample Data:', JSON.stringify(data, null, 2));
  }
}

checkAgentsTable();
