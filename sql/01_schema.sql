-- ============================================================
-- ExoSoft Saúde — Schema Principal
-- Executa no Supabase SQL Editor com permissão de superuser
-- ============================================================

-- 1. Criar schema dedicado
CREATE SCHEMA IF NOT EXISTS saas_saude;

-- Garantir que o schema fique visível para autenticados
GRANT USAGE ON SCHEMA saas_saude TO authenticated;
GRANT USAGE ON SCHEMA saas_saude TO service_role;

-- 2. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"  SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_trgm"    SCHEMA extensions;   -- busca fuzzy em nomes
CREATE EXTENSION IF NOT EXISTS "unaccent"   SCHEMA extensions;   -- normalização de acentos

-- 3. Enum types dentro do schema
CREATE TYPE saas_saude.perfil_role   AS ENUM ('admin', 'corretor', 'visualizador');
CREATE TYPE saas_saude.lead_status   AS ENUM ('novo', 'contatado', 'proposta_enviada', 'convertido', 'perdido');
CREATE TYPE saas_saude.cotacao_status AS ENUM ('rascunho', 'enviada', 'aceita', 'recusada');
