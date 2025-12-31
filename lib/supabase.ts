
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const supabaseUrl = 'https://lktaussreukarhvbltai.supabase.co';
const supabaseKey = 'sb_publishable_VRrXBKVa4cT-4E93te6hXg_aqWeKSIJ';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * COPIE O CÓDIGO ABAIXO E COLE NO "SQL EDITOR" DO SUPABASE:
 * 
 * -- 1. CRIAR TABELA DE PRODUTOS
 * CREATE TABLE IF NOT EXISTS public.products (
 *     id TEXT PRIMARY KEY,
 *     name TEXT NOT NULL,
 *     description TEXT,
 *     price DECIMAL(10,2) NOT NULL,
 *     category TEXT NOT NULL,
 *     image TEXT,
 *     savings TEXT,
 *     is_available BOOLEAN DEFAULT true,
 *     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
 * );
 * 
 * -- 2. CRIAR TABELA DE MESAS
 * CREATE TABLE IF NOT EXISTS public.tables (
 *     id INTEGER PRIMARY KEY,
 *     status TEXT DEFAULT 'free',
 *     current_order JSONB,
 *     updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
 * );
 * 
 * -- 3. CRIAR TABELA DE VENDAS
 * CREATE TABLE IF NOT EXISTS public.sales (
 *     id BIGSERIAL PRIMARY KEY,
 *     customer_name TEXT,
 *     items JSONB,
 *     total DECIMAL(10,2),
 *     payment_method TEXT,
 *     table_id INTEGER,
 *     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
 * );
 * 
 * -- 4. HABILITAR REALTIME (IMPORTANTE)
 * alter publication supabase_realtime add table products;
 * alter publication supabase_realtime add table tables;
 */
