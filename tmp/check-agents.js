const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAgentsTable() {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .order('last_seen', { ascending: false });
    
  if (error) {
    console.log('AGENT_TABLE_CHECK: FAILED');
    console.log('Error:', error.message);
  } else {
    console.log('AGENT_TABLE_CHECK: SUCCESS');
    console.log('Data:', JSON.stringify(data, null, 2));
  }
}

checkAgentsTable();
