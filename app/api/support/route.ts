import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const subject = formData.get('subject') as string;
    const category = formData.get('category') as string;
    const priority = formData.get('priority') as string;
    const message = formData.get('message') as string;
    const file = formData.get('file') as File | null;

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    let attachmentUrl = null;

    // Strict File Security Gates
    if (file && file.size > 0) {
      // 1. Enforce 5MB Limit
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
      }

      // 2. Enforce Strict MIME-type checking
      const allowedMimeTypes = ['image/png', 'image/jpeg', 'application/pdf', 'text/plain'];
      if (!allowedMimeTypes.includes(file.type)) {
        return NextResponse.json({ error: 'Invalid file type. Only PNG, JPG, PDF, and TXT allowed.' }, { status: 400 });
      }

      // 3. Explicitly reject and drop the request if the file extension is dangerous
      const dangerousExtensions = ['.exe', '.bat', '.sh', '.js', '.dll', '.msi', '.vbs'];
      const fileName = file.name.toLowerCase();
      if (dangerousExtensions.some(ext => fileName.endsWith(ext))) {
        return NextResponse.json({ error: 'Dangerous file extension rejected.' }, { status: 403 });
      }

      // Initialize Admin Client to bypass client-side RLS/Restrictions if needed
      const adminClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Sanitize Filename: use UUID to prevent path traversal or overwrites
      const fileExt = fileName.split('.').pop();
      const sanitizedPath = `${user.id}/${uuidv4()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await adminClient.storage
        .from('support-attachments')
        .upload(sanitizedPath, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) {
        console.error('Upload Error:', uploadError);
        return NextResponse.json({ error: 'Failed to upload attachment' }, { status: 500 });
      }

      // Get public URL
      const { data: { publicUrl } } = adminClient.storage
        .from('support-attachments')
        .getPublicUrl(sanitizedPath);
      
      attachmentUrl = publicUrl;
    }

    // Database Execution: Use Admin Client to securely insert
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: dbError } = await adminClient
      .from('support_tickets')
      .insert({
        user_id: user.id,
        subject,
        category,
        priority,
        message,
        attachment_url: attachmentUrl,
        status: 'Open'
      });

    if (dbError) {
      console.error('DB Error:', dbError);
      return NextResponse.json({ error: 'Failed to save ticket' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Support API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
