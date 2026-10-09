import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, fullName, phone, email, password } = req.body || {};

  try {
    if (action === 'register') {
      if (!fullName || !phone || !email || !password) {
        return res.status(400).json({ error: 'Name, Phone, Email and Password are required!' });
      }

      // Check phone exists
      const { data: phoneCheck } = await supabase.from('users').select('phone').eq('phone', phone.trim()).maybeSingle();
      if (phoneCheck) return res.status(400).json({ error: 'Phone number already registered! Please login.' });

      // Check email exists
      const { data: emailCheck } = await supabase.from('users').select('email').eq('email', email.trim().toLowerCase()).maybeSingle();
      if (emailCheck) return res.status(400).json({ error: 'Email already registered! Please use another email.' });

      const newUser = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        balance: 0.00,
        membership: 'Free / Inactive'
      };

      const { data, error } = await supabase.from('users').insert([newUser]).select().single();
      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json({ success: true, message: 'Account registered successfully!', user: data });
    }

    if (action === 'login') {
      const { identifier, password: inputPassword } = req.body || {};
      if (!identifier || !inputPassword) {
        return res.status(400).json({ error: 'Please enter your phone/email and password!' });
      }

      const isEmail = identifier.includes('@');
      let query = supabase.from('users').select('*');
      if (isEmail) {
        query = query.eq('email', identifier.trim().toLowerCase());
      } else {
        query = query.eq('phone', identifier.trim());
      }

      const { data: user, error } = await query.maybeSingle();
      if (error || !user || user.password !== inputPassword.trim()) {
        return res.status(401).json({ error: 'Invalid email/phone or password!' });
      }

      if (user.is_banned) {
        return res.status(403).json({ error: 'This account has been suspended by Admin!' });
      }

      return res.status(200).json({ success: true, user });
    }

    return res.status(400).json({ error: 'Invalid auth action' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
