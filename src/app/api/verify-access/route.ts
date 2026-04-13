import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ success: false, error: 'No code provided' }, { status: 400 });
    }

    // 1. Check server-side Master Member Key (never exposed to the browser)
    const masterKey = process.env.FOURTHWALL_MASTER_KEY;
    if (masterKey && code === masterKey) {
      return NextResponse.json({ 
        success: true, 
        type: 'membership',
        message: 'Active Fourthwall Membership' 
      });
    }

    // 2. Check Etsy license key in Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[API/VerifyAccess] Missing Supabase credentials');
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
    }

    // Prefer service role key (bypasses RLS), fall back to anon key for local testing
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: keyData, error: keyError } = await supabase
      .from('license_keys')
      .select('*')
      .eq('code', code)
      .eq('is_used', false)
      .single();

    if (keyError || !keyData) {
      return NextResponse.json({ success: false, error: 'Invalid or expired Access Code.' }, { status: 401 });
    }

    // Mark the key as redeemed
    await supabase
      .from('license_keys')
      .update({ is_used: true })
      .eq('id', keyData.id);

    return NextResponse.json({ 
      success: true, 
      type: 'lifetime',
      message: 'Lifetime Etsy Voucher' 
    });

  } catch (error) {
    console.error('[API/VerifyAccess] Internal error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
