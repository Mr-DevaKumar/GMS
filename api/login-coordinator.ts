import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { pin } = req.body || {};
  if (!pin) return res.status(400).json({ error: 'PIN required' });

  try {
    // 1. Look up the coordinator by their unique PIN using maybeSingle
    const { data: profile, error: fetchErr } = await admin
      .from('profiles')
      .select('email')
      .eq('pin_lookup', String(pin))
      .maybeSingle();

    if (fetchErr) {
      console.error("Fetch error:", fetchErr);
      return res.status(500).json({ error: 'Database connection error' });
    }

    if (!profile || !profile.email) {
      return res.status(401).json({ error: 'PIN not found. Check with admin.' });
    }

    // 2. Sign in with the found email and the PIN
    const { data, error } = await admin.auth.signInWithPassword({
      email: profile.email,
      password: String(pin),
    });

    if (error) {
      console.error("Auth error:", error.message);
      return res.status(401).json({ error: `Auth failed: ${error.message}` });
    }

    if (!data.session) {
      return res.status(401).json({ error: 'Failed to create session' });
    }

    return res.json({ session: data.session });
    
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
