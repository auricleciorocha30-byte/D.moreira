
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

// Configuração da conexão com o banco de dados Supabase
const supabaseUrl = 'https://lktaussreukarhvbltai.supabase.co';
const supabaseKey = 'sb_publishable_VRrXBKVa4cT-4E93te6hXg_aqWeKSIJ';

export const supabase = createClient(supabaseUrl, supabaseKey);

/* 
ESTRUTURA SQL PARA O SUPABASE (Copie e cole no SQL Editor do Supabase):

-- 1. Tabela de Produtos
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    image TEXT,
    is_available BOOLEAN DEFAULT true
);

-- 2. Tabela de Categorias
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

-- 3. Tabela de Mesas e Pedidos Ativos
CREATE TABLE IF NOT EXISTS public.tables (
    id INT PRIMARY KEY,
    status TEXT DEFAULT 'free',
    current_order JSONB
);

-- 4. Tabela de Cupons
CREATE TABLE IF NOT EXISTS public.coupons (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    percentage NUMERIC NOT NULL,
    is_active BOOLEAN DEFAULT true,
    scope_type TEXT DEFAULT 'all', -- 'all', 'category', 'product'
    scope_value TEXT
);

-- 5. Tabela de Configuração de Fidelidade
CREATE TABLE IF NOT EXISTS public.loyalty_config (
    id INT PRIMARY KEY DEFAULT 1,
    isActive BOOLEAN DEFAULT false,
    spendingGoal NUMERIC DEFAULT 100,
    scopeType TEXT DEFAULT 'all',
    scopeValue TEXT
);

-- 6. Tabela de Usuários Fidelidade (Clientes)
CREATE TABLE IF NOT EXISTS public.loyalty_users (
    phone TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    accumulated NUMERIC DEFAULT 0
);

-- Inserir dados iniciais se necessário
INSERT INTO public.loyalty_config (id, isActive, spendingGoal, scopeType, scopeValue)
VALUES (1, false, 100, 'all', '')
ON CONFLICT (id) DO NOTHING;
*/
