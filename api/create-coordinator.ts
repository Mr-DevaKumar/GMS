import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: userData, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !userData.user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: prof } = await admin.from('profiles').select('role').eq('id', userData.user.id).single();
  if (prof?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { name, pin } = req.body || {};
  
  if (!name || !pin) {
    return res.status(400).json({ error: 'Name and PIN required' });
  }
  
  if (String(pin).length > 10) {
    return res.status(400).json({ error: 'PIN cannot exceed 10 digits' });
  }

  // Check if PIN is already in use
  const { data: existing } = await admin.from('profiles').select('id').eq('pin_lookup', String(pin)).single();
  if (existing) {
    return res.status(400).json({ error: 'PIN already in use. Please choose another.' });
  }

  const slug = String(name).toLowerCase().replace(/[^a-z0-9]/g, '-');
  const email = `coord-${slug}-${Date.now()}@contest.local`;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: String(pin),
    email_confirm: true,
  });
  
  if (createErr) return res.status(500).json({ error: createErr.message });

  const { error: profErr } = await admin.from('profiles').insert({
    id: created.user.id,
    role: 'coordinator',
    display_name: name,
    email,
    pin_lookup: String(pin)
  });
  
  if (profErr) return res.status(500).json({ error: profErr.message });

  res.json({ id: created.user.id, name, email });
}