import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize SERVICE ROLE client (bypass RLS for admin creation)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error("CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing in .env.local");
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Fallback to avoid crash, though it might fail later
);

const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'OXEN_MASTER_KEY_2025'; // Default fallback secret

export async function POST(req: NextRequest) {
  try {
    if (!serviceRoleKey) {
       return NextResponse.json({ 
           error: 'Server Configuration Error: Admin Service Key missing. Please check .env.local' 
       }, { status: 500 });
    }

    const { email, password, fullName, secretKey } = await req.json();

    // 1. Verify Secret Key
    if (secretKey !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Invalid Security Clearance Key' }, { status: 403 });
    }

    // 2. Try to Create User via Admin Auth
    let userId;
    let existingUser;
    
    // First, try to retrieve user by email
    try {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        existingUser = existingUsers?.users.find(u => u.email === email);
    } catch (err) {
        console.warn('Failed to list users, proceeding to creation attempt:', err);
    }

    if (existingUser) {
        // User exists, upgrade them
        console.log('User found, upgrading:', existingUser.id);
        userId = existingUser.id;
        if (password) {
            await supabaseAdmin.auth.admin.updateUserById(userId, { 
                password: password,
                user_metadata: { full_name: fullName }
            });
        }
    } else {
        // Create new user
        console.log('Creating new user:', email);
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName }
        });

        if (authError) {
             console.error('Create User Error:', authError);
             // If error is "user already registered" but listUsers failed to find it, 
             // we are in an inconsistent state or pagination issue. 
             // We can't easily get the ID here, so we throw.
             throw new Error(`Authentication Error: ${authError.message}`);
        }
        userId = authData.user?.id;
    }

    if (userId) {
        // 3. Force Update Profile Role to 'admin'
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: userId,
                email: email,
                full_name: fullName,
                role: 'admin',
                updated_at: new Date().toISOString()
            });
            
        if (profileError) {
             console.error('Profile Upsert Error:', profileError);
             throw new Error(`Profile Error: ${profileError.message}`);
        }
    }

    return NextResponse.json({ success: true, message: 'Admin Access Granted' });

  } catch (error: any) {
    console.error('Admin Registration Error:', error);
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 });
  }
}
