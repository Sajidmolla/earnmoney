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
    try {
      const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).maybeSingle();
      const { data: tasks } = await supabase.from('tasks').select('*').order('id', { ascending: true });
      const { data: pending } = await supabase.from('transactions').select('*').eq('status', 'pending').order('created_at', { ascending: false });
      const { data: users } = await supabase.from('users').select('phone, full_name, email, balance, membership, is_banned, created_at').order('created_at', { ascending: false }).limit(50);

      return res.status(200).json({
        settings: settings || { bkash: '01737966207', nagad: '01737966207', rocket: '01737966207', notice: 'Welcome to EarnTask Pro!' },
        tasks: tasks || [],
        pending: pending || [],
        users: users || []
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { action, payload } = req.body || {};

    try {
      if (action === 'save_settings') {
        const { bkash, nagad, rocket, notice, telegram_link } = payload || {};
        await supabase.from('system_settings').upsert({ id: 1, bkash, nagad, rocket, notice, telegram_link });
        return res.status(200).json({ success: true, message: 'Settings saved' });
      }

      if (action === 'add_task') {
        const { title, reward, duration, category, description } = payload || {};
        await supabase.from('tasks').insert([{
          title,
          reward: Number(reward),
          duration: Number(duration),
          category: category || 'AI Micro-Tasks',
          description
        }]);
        return res.status(200).json({ success: true, message: 'Task published' });
      }

      if (action === 'delete_task') {
        await supabase.from('tasks').delete().eq('id', payload.id);
        return res.status(200).json({ success: true, message: 'Task deleted' });
      }

      if (action === 'toggle_ban') {
        const { phone, is_banned } = payload || {};
        await supabase.from('users').update({ is_banned }).eq('phone', phone);
        return res.status(200).json({ success: true, message: 'User status updated' });
      }

      if (action === 'resolve_transaction') {
        const { id, status } = payload || {};
        const { data: tx } = await supabase.from('transactions').select('*').eq('id', id).maybeSingle();
        if (!tx || tx.status !== 'pending') {
          return res.status(400).json({ error: 'Transaction already processed or not found' });
        }

        await supabase.from('transactions').update({ status }).eq('id', id);

        if (status === 'approved' && tx.type === 'deposit') {
          const { data: user } = await supabase.from('users').select('*').eq('phone', tx.user_phone).maybeSingle();
          if (tx.plan && tx.plan !== 'Direct Balance') {
            await supabase.from('users').update({ membership: tx.plan }).eq('phone', tx.user_phone);
          } else {
            const newBal = Number(user ? user.balance : 0) + Number(tx.amount);
            await supabase.from('users').update({ balance: newBal }).eq('phone', tx.user_phone);
          }
        } else if (status === 'rejected' && tx.type === 'withdraw') {
          const { data: user } = await supabase.from('users').select('balance').eq('phone', tx.user_phone).maybeSingle();
          const refundBal = Number(user ? user.balance : 0) + Number(tx.amount);
          await supabase.from('users').update({ balance: refundBal }).eq('phone', tx.user_phone);
        }

        return res.status(200).json({ success: true, message: `Transaction marked as ${status}` });
      }

      return res.status(400).json({ error: 'Unknown admin action' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
