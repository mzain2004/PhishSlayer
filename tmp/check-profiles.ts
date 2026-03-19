import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProfiles() {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) console.error('Error fetching profiles:', error);
  else console.log('Profiles:', JSON.stringify(data, null, 2));
}

async function checkWhitelist() {
  const { data, error } = await supabase.from('whitelist').select('*');
  if (error) console.error('Error fetching whitelist:', error);
  else console.log('Whitelist:', JSON.stringify(data, null, 2));
}

async function checkIntel() {
  const { data, error } = await supabase.from('proprietary_intel').select('*');
  if (error) console.error('Error fetching intel:', error);
  else console.log('Proprietary Intel:', JSON.stringify(data, null, 2));
}

async function listTables() {
  const { data, error } = await supabase
    .from('information_schema.tables' as any)
    .select('table_name')
    .eq('table_schema', 'public');
  
  if (error) {
    // If information_schema.tables is blocked, try a common table to see if it exists
    console.log('Trying to check for "agents" table directly...');
    const { error: agentsError } = await supabase.from('agents').select('*').limit(1);
    if (agentsError) console.log('Agents table seems missing:', agentsError.message);
    else console.log('Agents table exists.');
    
    console.log('Trying to check for "incidents" table directly...');
    const { error: incidentsError } = await supabase.from('incidents').select('*').limit(1);
    if (incidentsError) console.log('Incidents table seems missing:', incidentsError.message);
    else console.log('Incidents table exists.');

    console.log('Trying to check for "audit_logs" table directly...');
    const { error: auditError } = await supabase.from('audit_logs').select('*').limit(1);
    if (auditError) console.log('Audit Logs table seems missing:', auditError.message);
    else console.log('Audit Logs table exists.');
  } else {
    console.log('Tables:', JSON.stringify(data, null, 2));
  }
}

async function main() {
  await listTables();
  await checkProfiles();
  // await checkWhitelist();
  // await checkIntel();
}

main();
