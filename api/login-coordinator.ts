import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { pin } = req.body || {};
  if (!pin) return res.status(400).json({ error: 'PIN required' });

  // 1. Verify Environment Variables exist
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server config error: Missing Supabase credentials in Vercel.' });
  }

  const admin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 2. Fetch all coordinators (and explicitly count them)
    const { data: allCoordinators, error: fetchError, count } = await admin
      .from('profiles')
      .select('id, email, pin_lookup, role', { count: 'exact' })
      .eq('role', 'coordinator');

    if (fetchError) {
      console.error("DB Error:", fetchError);
      return res.status(500).json({ error: `Database error: ${fetchError.message}` });
    }

    // If the array is empty, return a detailed error
    if (!allCoordinators || allCoordinators.length === 0) {
      return res.status(401).json({ error: `No coordinators found in DB. (Found: ${count})` });
    }

    // 3. Loop through them and try to match the PIN
    for (const coord of allCoordinators) {
      if (!coord.email) continue;
      
      const { data, error } = await admin.auth.signInWithPassword({
        email: coord.email,
        password: String(pin),
      });

      if (!error && data.session) {
        // If they don't have a pin_lookup saved, heal the database
        if (!coord.pin_lookup) {
          await admin.from('profiles').update({ pin_lookup: String(pin) }).eq('id', coord.id);
        }
        return res.json({ session: data.session });
      }
    }

    return res.status(401).json({ error: 'Invalid PIN' });

  } catch (err: any) {
    console.error("Server Error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
