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

async function resetPassword() {
  const userId = '1aff8a08-94e4-492a-a28a-ed592a939ead'; // test@test.com
  const { data, error } = await supabase.auth.admin.updateUserById(
    userId,
    { password: 'Password123!' }
  );

  if (error) {
    console.error('Error resetting password:', error);
  } else {
    console.log('Password reset successfully for:', data.user.email);
  }
}

resetPassword();
