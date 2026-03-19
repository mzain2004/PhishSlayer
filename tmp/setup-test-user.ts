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

async function setupTestUser() {
  const email = 'audit@example.com';
  const password = 'Password123!';
  
  // 1. Create User in auth.users
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Audit User', org_name: 'Audit Org' }
  });
  
  if (userError) {
    console.error('Error creating user:', userError);
    // If user already exists, we might need to update it
    if (userError.message.includes('already exists')) {
        // try to get user id
        const { data: users } = await supabase.auth.admin.listUsers();
        const existingUser = users.users.find(u => u.email === email);
        if (existingUser) {
            console.log('User already exists, updating profile...');
            await updateProfile(existingUser.id);
        }
    }
    return;
  }
  
  console.log('User created:', userData.user.id);
  await updateProfile(userData.user.id);
}

async function updateProfile(userId: string) {
  // 2. Ensure Profile exists and set tier
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email: 'audit@example.com',
      display_name: 'Audit User',
      subscription_tier: 'free',
      role: 'analyst'
    });
    
  if (profileError) {
    console.error('Error creating/updating profile:', profileError);
  } else {
    console.log('Profile setup complete for Audit User (Free Tier)');
  }
}

setupTestUser();
