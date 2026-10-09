-- EarnTaskPro Database Schema (Clean Version - No Referral)

-- 1. Users Table (Name, Phone, Email, Password, Balance, Membership)
CREATE TABLE IF NOT EXISTS users (
  phone VARCHAR(20) PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  balance NUMERIC(12,2) DEFAULT 0.00,
  membership VARCHAR(50) DEFAULT 'Free / Inactive',
  tasks_done_today INT DEFAULT 0,
  last_task_date DATE DEFAULT CURRENT_DATE,
  is_banned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. System Settings (Payment Numbers, Notice, Social Links)
CREATE TABLE IF NOT EXISTS system_settings (
  id INT PRIMARY KEY DEFAULT 1,
  bkash VARCHAR(20) DEFAULT '01737966207',
  nagad VARCHAR(20) DEFAULT '01737966207',
  rocket VARCHAR(20) DEFAULT '01737966207',
  notice TEXT DEFAULT 'Welcome to EarnTask Pro! Send money to our Personal bKash/Nagad/Rocket number, submit TrxID, and get activated instantly.',
  telegram_link VARCHAR(200) DEFAULT 'https://t.me/earntaskpro_support',
  whatsapp_number VARCHAR(20) DEFAULT '+8801737966207'
);
INSERT INTO system_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 3. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  reward NUMERIC(8,2) NOT NULL,
  duration INT NOT NULL,
  category VARCHAR(50) DEFAULT 'AI Micro-Tasks',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO tasks (title, reward, duration, category, description) VALUES
('AI Sentiment Review: Smartwatch Product Feedback', 12.00, 15, 'AI Micro-Tasks', 'Evaluate consumer feedback, proofread brief translations, or categorize products graded automatically.'),
('AI Language Translation: Bengali to English Micro-Phrase', 15.00, 15, 'AI Micro-Tasks', 'Phrase: আমরা গ্রাহকদের সর্বোত্তম সেবা ও দ্রুত ক্যাশআউট প্রদানের প্রতিশ্রুতি দিচ্ছি।'),
('AI Product Categorization: Tech Accessory Item', 10.00, 15, 'AI Micro-Tasks', 'Multi-port 65W GaN Fast Charger with USB-C Power Delivery and dual USB-A ports for laptops.'),
('Sponsored Ad: TechGadget BD Promo Showcase', 10.00, 15, 'Sponsored Video', 'Watch this sponsored ad video for 15 seconds to receive your cash reward.'),
('Sponsored Ad: Daraz Mega Flash Sale Announcement', 12.00, 12, 'Sponsored Video', 'View the exclusive Daraz discount campaign preview for 12 seconds.'),
('Visit Partner Website: Best Mobile Banking Guides 2026', 8.00, 10, 'Partner Articles', 'Visit our partner financial education portal and stay on page for 10 seconds.')
ON CONFLICT DO NOTHING;

-- 4. Transactions Table (Deposit & Withdraw)
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  user_phone VARCHAR(20) REFERENCES users(phone) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'deposit', 'withdraw'
  provider VARCHAR(20) NOT NULL,
  sender_or_recipient VARCHAR(20) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  trx_id VARCHAR(100),
  plan VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
