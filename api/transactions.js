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

  if (req.method === 'GET') {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Phone parameter required' });

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_phone', phone)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { type, user_phone, provider, amount, trx_id, plan, sender_or_recipient } = req.body || {};

    if (!user_phone || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid parameters provided' });
    }

    try {
      if (type === 'deposit') {
        if (!trx_id) return res.status(400).json({ error: 'TrxID is required' });

        const { data: existing } = await supabase
          .from('transactions')
          .select('id')
          .eq('trx_id', trx_id.trim().toUpperCase())
          .maybeSingle();

        if (existing) {
          return res.status(400).json({ error: 'This TrxID has already been submitted!' });
        }

        const { error } = await supabase.from('transactions').insert([{
          user_phone,
          type: 'deposit',
          provider: provider || 'bKash',
          sender_or_recipient: sender_or_recipient || user_phone,
          amount: Number(amount),
          trx_id: trx_id.trim().toUpperCase(),
          plan: plan || 'Direct Balance',
          status: 'pending'
        }]);

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, message: 'Deposit reference submitted for Admin verification' });
      }

      if (type === 'withdraw') {
        const { data: user } = await supabase.from('users').select('balance').eq('phone', user_phone).maybeSingle();
        if (!user || Number(user.balance) < Number(amount)) {
          return res.status(400).json({ error: 'Insufficient wallet balance' });
        }

        await supabase.from('users').update({ balance: Number(user.balance) - Number(amount) }).eq('phone', user_phone);

        const { error } = await supabase.from('transactions').insert([{
          user_phone,
          type: 'withdraw',
          provider: provider || 'bKash',
          sender_or_recipient: sender_or_recipient || user_phone,
          amount: Number(amount),
          status: 'pending'
        }]);

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, message: 'Cashout request submitted to Admin' });
      }

      return res.status(400).json({ error: 'Invalid transaction type' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
