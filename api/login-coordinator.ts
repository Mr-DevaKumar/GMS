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
    // --- FAST PATH ---
    // 1. Try to find the coordinator using the pin_lookup column
    const { data: profile } = await admin
      .from('profiles')
      .select('id, email')
      .eq('pin_lookup', String(pin))
      .maybeSingle();

    if (profile && profile.email) {
      const { data, error } = await admin.auth.signInWithPassword({
        email: profile.email,
        password: String(pin),
      });
      if (!error && data.session) {
        return res.json({ session: data.session });
      }
    }

    // --- FALLBACK PATH (For old coordinators) ---
    // 2. If not found, fetch all coordinators and try to match the PIN
    const { data: allCoordinators } = await admin
      .from('profiles')
      .select('id, email, pin_lookup')
      .eq('role', 'coordinator');

    if (!allCoordinators || allCoordinators.length === 0) {
      return res.status(401).json({ error: 'No coordinators found' });
    }

    for (const coord of allCoordinators) {
      if (!coord.email) continue;
      
      // Try signing in
      const { data, error } = await admin.auth.signInWithPassword({
        email: coord.email,
        password: String(pin),
      });

      if (!error && data.session) {
        // Success! This is the right coordinator.
        // Let's silently update their pin_lookup so next time it's fast.
        if (!coord.pin_lookup) {
          await admin.from('profiles').update({ pin_lookup: String(pin) }).eq('id', coord.id);
        }
        return res.json({ session: data.session });
      }
    }

    // 3. If we get here, the PIN truly doesn't exist
    return res.status(401).json({ error: 'PIN not found. Check with admin.' });

  } catch (err: any) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: 'Server error during login' });
  }
}
