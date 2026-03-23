-- ============================================================
-- ExoSoft Saúde — Row Level Security (RLS)
-- ============================================================

-- ----------------------------------------------------------------
-- Helper: retorna o role do usuário autenticado
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION saas_saude.meu_role()
RETURNS saas_saude.perfil_role
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM saas_saude.perfis WHERE id = auth.uid()
$$;

-- ----------------------------------------------------------------
-- PERFIS
-- ----------------------------------------------------------------
ALTER TABLE saas_saude.perfis ENABLE ROW LEVEL SECURITY;

-- Usuário vê/edita apenas o próprio perfil; admin vê tudo
CREATE POLICY perfis_select ON saas_saude.perfis
  FOR SELECT USING (
    id = auth.uid()
    OR saas_saude.meu_role() = 'admin'
  );

CREATE POLICY perfis_insert ON saas_saude.perfis
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY perfis_update ON saas_saude.perfis
  FOR UPDATE USING (
    id = auth.uid()
    OR saas_saude.meu_role() = 'admin'
  );

CREATE POLICY perfis_delete ON saas_saude.perfis
  FOR DELETE USING (saas_saude.meu_role() = 'admin');

-- ----------------------------------------------------------------
-- EMPRESAS / LEADS
-- ----------------------------------------------------------------
ALTER TABLE saas_saude.empresas_leads ENABLE ROW LEVEL SECURITY;

-- Correto vê apenas seus leads; admin vê todos
CREATE POLICY leads_select ON saas_saude.empresas_leads
  FOR SELECT USING (
    corretor_id = auth.uid()
    OR saas_saude.meu_role() = 'admin'
  );

CREATE POLICY leads_insert ON saas_saude.empresas_leads
  FOR INSERT WITH CHECK (corretor_id = auth.uid());

CREATE POLICY leads_update ON saas_saude.empresas_leads
  FOR UPDATE USING (
    corretor_id = auth.uid()
    OR saas_saude.meu_role() = 'admin'
  );

CREATE POLICY leads_delete ON saas_saude.empresas_leads
  FOR DELETE USING (
    corretor_id = auth.uid()
    OR saas_saude.meu_role() = 'admin'
  );

-- ----------------------------------------------------------------
-- TABELAS DE PREÇOS — somente leitura para autenticados; escrita apenas service_role
-- ----------------------------------------------------------------
ALTER TABLE saas_saude.tabelas_precos ENABLE ROW LEVEL SECURITY;

CREATE POLICY precos_select ON saas_saude.tabelas_precos
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

-- Apenas service_role (bridge) pode inserir/atualizar
CREATE POLICY precos_insert ON saas_saude.tabelas_precos
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY precos_update ON saas_saude.tabelas_precos
  FOR UPDATE USING (auth.role() = 'service_role');

-- ----------------------------------------------------------------
-- OPERADORAS — leitura pública para autenticados
-- ----------------------------------------------------------------
ALTER TABLE saas_saude.operadoras ENABLE ROW LEVEL SECURITY;

CREATE POLICY operadoras_select ON saas_saude.operadoras
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY operadoras_manage ON saas_saude.operadoras
  FOR ALL USING (saas_saude.meu_role() = 'admin');

-- ----------------------------------------------------------------
-- COTAÇÕES
-- ----------------------------------------------------------------
ALTER TABLE saas_saude.cotacoes_realizadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY cotacoes_select ON saas_saude.cotacoes_realizadas
  FOR SELECT USING (
    corretor_id = auth.uid()
    OR saas_saude.meu_role() = 'admin'
  );

CREATE POLICY cotacoes_insert ON saas_saude.cotacoes_realizadas
  FOR INSERT WITH CHECK (corretor_id = auth.uid());

CREATE POLICY cotacoes_update ON saas_saude.cotacoes_realizadas
  FOR UPDATE USING (
    corretor_id = auth.uid()
    OR saas_saude.meu_role() = 'admin'
  );

CREATE POLICY cotacoes_delete ON saas_saude.cotacoes_realizadas
  FOR DELETE USING (
    corretor_id = auth.uid()
    OR saas_saude.meu_role() = 'admin'
  );

-- ----------------------------------------------------------------
-- Grants finais
-- ----------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA saas_saude TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA saas_saude TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA saas_saude TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA saas_saude TO service_role;
