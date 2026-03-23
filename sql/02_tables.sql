-- ============================================================
-- ExoSoft Saúde — Tabelas
-- ============================================================

-- ----------------------------------------------------------------
-- PERFIS — extensão de auth.users
-- ----------------------------------------------------------------
CREATE TABLE saas_saude.perfis (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo TEXT        NOT NULL,
  email         TEXT        UNIQUE NOT NULL,
  telefone      TEXT,
  role          saas_saude.perfil_role NOT NULL DEFAULT 'corretor',
  avatar_url    TEXT,
  ativo         BOOLEAN     NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE saas_saude.perfis IS 'Perfis estendidos vinculados ao auth.users do Supabase';

-- ----------------------------------------------------------------
-- EMPRESAS / LEADS
-- ----------------------------------------------------------------
CREATE TABLE saas_saude.empresas_leads (
  id                  UUID        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  corretor_id         UUID        NOT NULL REFERENCES saas_saude.perfis(id) ON DELETE CASCADE,

  -- Dados do Google Maps / Places
  place_id            TEXT        UNIQUE,
  nome_empresa        TEXT        NOT NULL,
  endereco_formatado  TEXT,
  latitude            NUMERIC(10,7),
  longitude           NUMERIC(10,7),
  telefone_maps       TEXT,
  website             TEXT,
  rating              NUMERIC(2,1),
  total_avaliacoes    INT,
  categoria_maps      TEXT,

  -- Dados enriquecidos via BrasilAPI
  cnpj                TEXT,
  razao_social        TEXT,
  nome_fantasia       TEXT,
  situacao_cadastral  TEXT,
  natureza_juridica   TEXT,
  porte               TEXT,
  capital_social      NUMERIC(15,2),
  data_abertura       DATE,
  cnaes_principais    JSONB,       -- array de objetos {codigo, descricao}
  socios              JSONB,       -- array de sócios da BrasilAPI
  endereco_cnpj       JSONB,       -- endereço completo do CNPJ

  -- Controle interno
  status              saas_saude.lead_status NOT NULL DEFAULT 'novo',
  observacoes         TEXT,
  tags                TEXT[],
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_empresas_leads_corretor   ON saas_saude.empresas_leads(corretor_id);
CREATE INDEX idx_empresas_leads_cnpj       ON saas_saude.empresas_leads(cnpj);
CREATE INDEX idx_empresas_leads_status     ON saas_saude.empresas_leads(status);
CREATE INDEX idx_empresas_leads_nome_trgm  ON saas_saude.empresas_leads
  USING GIN (nome_empresa extensions.gin_trgm_ops);

COMMENT ON TABLE saas_saude.empresas_leads IS
  'Leads de empresas capturados via Google Maps e enriquecidos com BrasilAPI';

-- ----------------------------------------------------------------
-- OPERADORAS
-- ----------------------------------------------------------------
CREATE TABLE saas_saude.operadoras (
  id         UUID  PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  nome       TEXT  NOT NULL UNIQUE,
  logo_url   TEXT,
  ativo      BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO saas_saude.operadoras (nome) VALUES
  ('Bradesco Saúde'),
  ('SulAmérica'),
  ('Amil'),
  ('Unimed'),
  ('Porto Seguro Saúde');

-- ----------------------------------------------------------------
-- TABELAS DE PREÇOS (sincronizado via Bridge MySQL)
-- ----------------------------------------------------------------
CREATE TABLE saas_saude.tabelas_precos (
  id              UUID        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  operadora_id    UUID        NOT NULL REFERENCES saas_saude.operadoras(id) ON DELETE CASCADE,
  codigo_plano    TEXT        NOT NULL,
  nome_plano      TEXT        NOT NULL,
  tipo_contratacao TEXT       NOT NULL DEFAULT 'PME',   -- PME, Adesão, Individual
  modalidade      TEXT        NOT NULL DEFAULT 'coletivo',
  cobertura       TEXT        NOT NULL DEFAULT 'Nacional',
  acomodacao      TEXT        NOT NULL DEFAULT 'Apartamento',

  -- Preços por faixa etária (BRL)
  faixa_00_18     NUMERIC(10,2) NOT NULL DEFAULT 0,
  faixa_19_23     NUMERIC(10,2) NOT NULL DEFAULT 0,
  faixa_24_28     NUMERIC(10,2) NOT NULL DEFAULT 0,
  faixa_29_33     NUMERIC(10,2) NOT NULL DEFAULT 0,
  faixa_34_38     NUMERIC(10,2) NOT NULL DEFAULT 0,
  faixa_39_43     NUMERIC(10,2) NOT NULL DEFAULT 0,
  faixa_44_48     NUMERIC(10,2) NOT NULL DEFAULT 0,
  faixa_49_53     NUMERIC(10,2) NOT NULL DEFAULT 0,
  faixa_54_58     NUMERIC(10,2) NOT NULL DEFAULT 0,
  faixa_59_mais   NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Metadados de sincronização
  mysql_id        INT,          -- ID original no MySQL Hostgator
  vigencia_inicio DATE,
  vigencia_fim    DATE,
  ativo           BOOLEAN     NOT NULL DEFAULT TRUE,
  sincronizado_em TIMESTAMPTZ,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(operadora_id, codigo_plano, vigencia_inicio)
);

CREATE INDEX idx_tabelas_precos_operadora ON saas_saude.tabelas_precos(operadora_id);
CREATE INDEX idx_tabelas_precos_ativo     ON saas_saude.tabelas_precos(ativo);

-- ----------------------------------------------------------------
-- COTAÇÕES REALIZADAS
-- ----------------------------------------------------------------
CREATE TABLE saas_saude.cotacoes_realizadas (
  id              UUID        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  corretor_id     UUID        NOT NULL REFERENCES saas_saude.perfis(id),
  empresa_lead_id UUID        REFERENCES saas_saude.empresas_leads(id) ON DELETE SET NULL,

  -- Dados da cotação
  nome_contato    TEXT        NOT NULL,
  email_contato   TEXT,
  telefone_contato TEXT,
  idades_beneficiarios INT[]  NOT NULL,  -- ex: [32, 28, 5] para calcular valores
  planos_cotados  JSONB       NOT NULL,  -- array com detalhes de cada plano cotado

  -- Comparativo calculado (snapshot do momento)
  resultado_comparativo JSONB,

  status          saas_saude.cotacao_status NOT NULL DEFAULT 'rascunho',
  pdf_url         TEXT,
  observacoes     TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cotacoes_corretor    ON saas_saude.cotacoes_realizadas(corretor_id);
CREATE INDEX idx_cotacoes_lead        ON saas_saude.cotacoes_realizadas(empresa_lead_id);
CREATE INDEX idx_cotacoes_status      ON saas_saude.cotacoes_realizadas(status);
CREATE INDEX idx_cotacoes_criado_em   ON saas_saude.cotacoes_realizadas(criado_em DESC);

-- ----------------------------------------------------------------
-- Trigger: atualizar updated_at automaticamente
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION saas_saude.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_perfis_updated_at
  BEFORE UPDATE ON saas_saude.perfis
  FOR EACH ROW EXECUTE FUNCTION saas_saude.set_updated_at();

CREATE TRIGGER trg_empresas_leads_updated_at
  BEFORE UPDATE ON saas_saude.empresas_leads
  FOR EACH ROW EXECUTE FUNCTION saas_saude.set_updated_at();

CREATE TRIGGER trg_tabelas_precos_updated_at
  BEFORE UPDATE ON saas_saude.tabelas_precos
  FOR EACH ROW EXECUTE FUNCTION saas_saude.set_updated_at();

CREATE TRIGGER trg_cotacoes_updated_at
  BEFORE UPDATE ON saas_saude.cotacoes_realizadas
  FOR EACH ROW EXECUTE FUNCTION saas_saude.set_updated_at();

-- ----------------------------------------------------------------
-- Trigger: criar perfil automaticamente ao sign up
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION saas_saude.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO saas_saude.perfis (id, nome_completo, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION saas_saude.handle_new_user();
