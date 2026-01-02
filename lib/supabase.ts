
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const supabaseUrl = 'https://lktaussreukarhvbltai.supabase.co';
const supabaseKey = 'sb_publishable_VRrXBKVa4cT-4E93te6hXg_aqWeKSIJ';

// Cliente Supabase configurado para o projeto D.Moreira
export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * --- SCRIPT SQL PARA CRIAR AS TABELAS ---
 * Se você receber erros de "relation does not exist", cole este código no SQL EDITOR do Supabase:
 * 
 * -- 1. Tabela de Categorias
 * CREATE TABLE IF NOT EXISTS categories (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   name TEXT NOT NULL UNIQUE
 * );
 * 
 * -- 2. Tabela de Produtos
 * CREATE TABLE IF NOT EXISTS products (
 *   id TEXT PRIMARY KEY,
 *   name TEXT NOT NULL,
 *   description TEXT,
 *   price DECIMAL NOT NULL,
 *   category TEXT NOT NULL,
 *   image TEXT,
 *   savings TEXT,
 *   is_available BOOLEAN DEFAULT TRUE
 * );
 * 
 * -- 3. Tabela de Mesas
 * CREATE TABLE IF NOT EXISTS tables (
 *   id INTEGER PRIMARY KEY,
 *   status TEXT DEFAULT 'free',
 *   current_order JSONB
 * );
 */
