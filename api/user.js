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

  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: 'Phone parameter required' });

  // Get User Profile with daily reset check
  if (req.method === 'GET') {
    const { data: user, error } = await supabase.from('users').select('*').eq('phone', phone).maybeSingle();
    if (error || !user) return res.status(404).json({ error: 'User not found' });

    // Check if new day for task reset
    const todayStr = new Date().toISOString().split('T')[0];
    if (user.last_task_date !== todayStr) {
      await supabase.from('users').update({ tasks_done_today: 0, last_task_date: todayStr }).eq('phone', phone);
      user.tasks_done_today = 0;
      user.last_task_date = todayStr;
    }

    delete user.password;
    return res.status(200).json(user);
  }

  // Task Completion Endpoint
  if (req.method === 'POST') {
    const { reward } = req.body || {};
    const { data: user } = await supabase.from('users').select('*').eq('phone', phone).maybeSingle();
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.membership === 'Free / Inactive') {
      return res.status(403).json({ error: 'Active membership plan required to claim rewards' });
    }

    // Daily limits
    const limits = {
      'Basic Starter': 5,
      'Standard Pro': 10,
      'Premium Booster': 18,
      'VIP Master Elite': 30
    };
    const maxLimit = limits[user.membership] || 5;

    if ((user.tasks_done_today || 0) >= maxLimit) {
      return res.status(400).json({ error: `Daily limit reached! You have completed all ${maxLimit} tasks for today.` });
    }

    const newBal = Number(user.balance) + Number(reward);
    const newCount = (user.tasks_done_today || 0) + 1;

    await supabase.from('users').update({
      balance: newBal,
      tasks_done_today: newCount
    }).eq('phone', phone);

    return res.status(200).json({ success: true, newBalance: newBal, tasksDone: newCount, maxLimit });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
