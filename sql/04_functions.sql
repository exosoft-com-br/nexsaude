-- ============================================================
-- ExoSoft Saúde — Database Functions (PL/pgSQL)
-- ============================================================

-- ----------------------------------------------------------------
-- Função auxiliar: mapeia idade para faixa etária da ANS
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION saas_saude.faixa_etaria_ans(p_idade INT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN CASE
    WHEN p_idade <= 18             THEN 'faixa_00_18'
    WHEN p_idade BETWEEN 19 AND 23 THEN 'faixa_19_23'
    WHEN p_idade BETWEEN 24 AND 28 THEN 'faixa_24_28'
    WHEN p_idade BETWEEN 29 AND 33 THEN 'faixa_29_33'
    WHEN p_idade BETWEEN 34 AND 38 THEN 'faixa_34_38'
    WHEN p_idade BETWEEN 39 AND 43 THEN 'faixa_39_43'
    WHEN p_idade BETWEEN 44 AND 48 THEN 'faixa_44_48'
    WHEN p_idade BETWEEN 49 AND 53 THEN 'faixa_49_53'
    WHEN p_idade BETWEEN 54 AND 58 THEN 'faixa_54_58'
    ELSE                                'faixa_59_mais'
  END;
END;
$$;

-- ----------------------------------------------------------------
-- Função: calcular valor total de uma cotação para um plano
-- Entrada: p_plano_id UUID, p_idades INT[] (ex: ARRAY[32, 28, 5])
-- Retorna: valor_total NUMERIC, detalhamento JSONB
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION saas_saude.calcular_cotacao(
  p_plano_id UUID,
  p_idades   INT[]
)
RETURNS TABLE (
  plano_id          UUID,
  nome_plano        TEXT,
  operadora         TEXT,
  valor_total       NUMERIC,
  valor_per_capita  NUMERIC,
  detalhamento      JSONB
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_plano     saas_saude.tabelas_precos%ROWTYPE;
  v_total     NUMERIC := 0;
  v_detalhe   JSONB   := '[]'::JSONB;
  v_idade     INT;
  v_faixa     TEXT;
  v_valor     NUMERIC;
  v_operadora TEXT;
BEGIN
  -- Buscar plano
  SELECT * INTO v_plano
  FROM saas_saude.tabelas_precos
  WHERE id = p_plano_id AND ativo = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plano % não encontrado ou inativo', p_plano_id;
  END IF;

  SELECT nome INTO v_operadora
  FROM saas_saude.operadoras
  WHERE id = v_plano.operadora_id;

  -- Iterar sobre cada idade
  FOREACH v_idade IN ARRAY p_idades LOOP
    v_faixa := saas_saude.faixa_etaria_ans(v_idade);

    -- Valor da faixa via CASE (evita SQL dinâmico)
    v_valor := CASE v_faixa
      WHEN 'faixa_00_18'   THEN v_plano.faixa_00_18
      WHEN 'faixa_19_23'   THEN v_plano.faixa_19_23
      WHEN 'faixa_24_28'   THEN v_plano.faixa_24_28
      WHEN 'faixa_29_33'   THEN v_plano.faixa_29_33
      WHEN 'faixa_34_38'   THEN v_plano.faixa_34_38
      WHEN 'faixa_39_43'   THEN v_plano.faixa_39_43
      WHEN 'faixa_44_48'   THEN v_plano.faixa_44_48
      WHEN 'faixa_49_53'   THEN v_plano.faixa_49_53
      WHEN 'faixa_54_58'   THEN v_plano.faixa_54_58
      ELSE                      v_plano.faixa_59_mais
    END;

    v_total := v_total + v_valor;

    v_detalhe := v_detalhe || jsonb_build_object(
      'idade',       v_idade,
      'faixa',       v_faixa,
      'valor_mensal', v_valor
    );
  END LOOP;

  RETURN QUERY SELECT
    v_plano.id,
    v_plano.nome_plano,
    v_operadora,
    ROUND(v_total, 2),
    ROUND(v_total / array_length(p_idades, 1), 2),
    v_detalhe;
END;
$$;

-- ----------------------------------------------------------------
-- Função: comparar múltiplos planos de uma vez
-- Retorna linha para cada plano, ordenado por valor_total ASC
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION saas_saude.comparar_planos(
  p_plano_ids UUID[],
  p_idades    INT[]
)
RETURNS TABLE (
  ranking          INT,
  plano_id         UUID,
  nome_plano       TEXT,
  operadora        TEXT,
  valor_total      NUMERIC,
  valor_per_capita NUMERIC,
  detalhamento     JSONB
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_pid UUID;
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY c.valor_total)::INT AS ranking,
    c.plano_id,
    c.nome_plano,
    c.operadora,
    c.valor_total,
    c.valor_per_capita,
    c.detalhamento
  FROM UNNEST(p_plano_ids) AS pid
  CROSS JOIN LATERAL saas_saude.calcular_cotacao(pid, p_idades) AS c
  ORDER BY c.valor_total;
END;
$$;

-- ----------------------------------------------------------------
-- Função: dashboard stats para o corretor autenticado
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION saas_saude.meu_dashboard()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_resultado JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_leads',        COUNT(*)                                     FILTER (WHERE TRUE),
    'leads_novos',        COUNT(*)                                     FILTER (WHERE status = 'novo'),
    'leads_em_andamento', COUNT(*)                                     FILTER (WHERE status IN ('contatado','proposta_enviada')),
    'leads_convertidos',  COUNT(*)                                     FILTER (WHERE status = 'convertido'),
    'cotacoes_mes',      (SELECT COUNT(*) FROM saas_saude.cotacoes_realizadas
                          WHERE corretor_id = v_uid
                          AND criado_em >= DATE_TRUNC('month', NOW()))
  )
  INTO v_resultado
  FROM saas_saude.empresas_leads
  WHERE corretor_id = v_uid;

  RETURN v_resultado;
END;
$$;

-- ----------------------------------------------------------------
-- Função: busca de leads com filtros (usada na listagem)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION saas_saude.buscar_leads(
  p_termo     TEXT    DEFAULT NULL,
  p_status    TEXT    DEFAULT NULL,
  p_limit     INT     DEFAULT 20,
  p_offset    INT     DEFAULT 0
)
RETURNS SETOF saas_saude.empresas_leads
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM saas_saude.empresas_leads
  WHERE
    (p_termo IS NULL OR nome_empresa ILIKE '%' || p_termo || '%'
                     OR razao_social ILIKE '%' || p_termo || '%'
                     OR cnpj = p_termo)
    AND (p_status IS NULL OR status::TEXT = p_status)
    AND (
      corretor_id = auth.uid()
      OR saas_saude.meu_role() = 'admin'
    )
  ORDER BY criado_em DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
