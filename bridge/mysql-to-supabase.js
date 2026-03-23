#!/usr/bin/env node
/**
 * ExoSoft Saúde — Bridge MySQL (Hostgator) → Supabase
 *
 * Uso:
 *   node mysql-to-supabase.js               # sync incremental (últimas 24h)
 *   node mysql-to-supabase.js --full        # sync completa (todos os registros)
 *   node mysql-to-supabase.js --operadora 1 # sync de uma operadora específica
 *
 * Configurar variáveis de ambiente no arquivo .env deste diretório.
 */

'use strict';

require('dotenv').config();

const mysql    = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');

// ----------------------------------------------------------------
// Config
// ----------------------------------------------------------------
const MYSQL_CONFIG = {
  host:     process.env.MYSQL_HOST,
  port:     parseInt(process.env.MYSQL_PORT || '3306'),
  user:     process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  ssl:      process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // service_role ignora RLS
);

const BATCH_SIZE = 100;  // upsert em lotes para evitar timeout

// ----------------------------------------------------------------
// Mapeamento: coluna MySQL → campo da tabela Supabase
// Ajuste os nomes de coluna conforme sua tabela MySQL real
// ----------------------------------------------------------------
function mapRowToSupabase(row, operadoraId) {
  return {
    operadora_id:    operadoraId,
    codigo_plano:    String(row.codigo_plano || row.id_plano),
    nome_plano:      row.nome_plano || row.descricao,
    tipo_contratacao: row.tipo_contratacao || 'PME',
    modalidade:      row.modalidade || 'coletivo',
    cobertura:       row.cobertura || 'Nacional',
    acomodacao:      row.acomodacao || 'Apartamento',

    // Faixas etárias — adapte os nomes das colunas MySQL
    faixa_00_18:  parseFloat(row.faixa_00_18  || row.fx_0_18   || 0),
    faixa_19_23:  parseFloat(row.faixa_19_23  || row.fx_19_23  || 0),
    faixa_24_28:  parseFloat(row.faixa_24_28  || row.fx_24_28  || 0),
    faixa_29_33:  parseFloat(row.faixa_29_33  || row.fx_29_33  || 0),
    faixa_34_38:  parseFloat(row.faixa_34_38  || row.fx_34_38  || 0),
    faixa_39_43:  parseFloat(row.faixa_39_43  || row.fx_39_43  || 0),
    faixa_44_48:  parseFloat(row.faixa_44_48  || row.fx_44_48  || 0),
    faixa_49_53:  parseFloat(row.faixa_49_53  || row.fx_49_53  || 0),
    faixa_54_58:  parseFloat(row.faixa_54_58  || row.fx_54_58  || 0),
    faixa_59_mais: parseFloat(row.faixa_59_mais || row.fx_59_mais || 0),

    mysql_id:        row.id,
    vigencia_inicio: row.vigencia_inicio || row.data_inicio || null,
    vigencia_fim:    row.vigencia_fim    || row.data_fim    || null,
    ativo:           row.ativo !== undefined ? Boolean(row.ativo) : true,
    sincronizado_em: new Date().toISOString(),
  };
}

// ----------------------------------------------------------------
// Buscar mapa de operadoras no Supabase (nome → UUID)
// ----------------------------------------------------------------
async function getOperadorasMap() {
  const { data, error } = await supabase
    .schema('saas_saude')
    .from('operadoras')
    .select('id, nome');

  if (error) throw new Error(`Erro ao buscar operadoras: ${error.message}`);

  const map = {};
  data.forEach(op => { map[op.nome.toLowerCase()] = op.id; });
  return map;
}

// ----------------------------------------------------------------
// Upsert em lotes no Supabase
-- ----------------------------------------------------------------
async function upsertBatch(rows) {
  const { error } = await supabase
    .schema('saas_saude')
    .from('tabelas_precos')
    .upsert(rows, {
      onConflict: 'operadora_id,codigo_plano,vigencia_inicio',
      ignoreDuplicates: false,
    });

  if (error) throw new Error(`Erro no upsert: ${error.message}`);
}

// ----------------------------------------------------------------
// Sync de uma tabela MySQL de preços
-- ----------------------------------------------------------------
async function syncOperadora(conn, mysqlTable, operadoraId, since) {
  const whereClause = since
    ? `WHERE updated_at >= '${since.toISOString().slice(0, 19).replace('T', ' ')}'`
    : '';

  const [rows] = await conn.execute(
    `SELECT * FROM \`${mysqlTable}\` ${whereClause} ORDER BY id`
  );

  console.log(`  → ${rows.length} registros encontrados em ${mysqlTable}`);
  if (rows.length === 0) return;

  // Processar em batches
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map(r => mapRowToSupabase(r, operadoraId));
    await upsertBatch(batch);
    process.stdout.write(`    Lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(rows.length / BATCH_SIZE)} ✓\r`);
  }
  console.log(`  ✅ ${rows.length} registros sincronizados em ${mysqlTable}              `);
}

// ----------------------------------------------------------------
// Mapeamento: nome da operadora → tabela MySQL correspondente
-- (ajuste conforme sua estrutura real no MySQL)
-- ----------------------------------------------------------------
const OPERADORA_TABLE_MAP = {
  'bradesco saúde':       'planos_bradesco',
  'sulamerica':           'planos_sulamerica',
  'amil':                 'planos_amil',
  'unimed':               'planos_unimed',
  'porto seguro saúde':   'planos_porto',
};

// ----------------------------------------------------------------
// Entry point
// ----------------------------------------------------------------
async function main() {
  const args          = process.argv.slice(2);
  const isFullSync    = args.includes('--full');
  const opFilter      = args.includes('--operadora')
                          ? args[args.indexOf('--operadora') + 1]
                          : null;

  const since = isFullSync ? null : (() => {
    const d = new Date();
    d.setHours(d.getHours() - 24);
    return d;
  })();

  console.log(`\n🔄 ExoSoft Saúde — Bridge MySQL → Supabase`);
  console.log(`   Modo: ${isFullSync ? 'COMPLETO' : 'Incremental (últimas 24h)'}`);
  console.log(`   Início: ${new Date().toLocaleString('pt-BR')}\n`);

  let conn;
  try {
    conn = await mysql.createConnection(MYSQL_CONFIG);
    console.log('✅ Conexão MySQL estabelecida');

    const operadorasMap = await getOperadorasMap();
    console.log(`✅ ${Object.keys(operadorasMap).length} operadoras carregadas do Supabase\n`);

    for (const [opNome, mysqlTable] of Object.entries(OPERADORA_TABLE_MAP)) {
      if (opFilter && !opNome.includes(opFilter.toLowerCase())) continue;

      const operadoraId = operadorasMap[opNome];
      if (!operadoraId) {
        console.warn(`⚠️  Operadora "${opNome}" não encontrada no Supabase. Pulando.`);
        continue;
      }

      console.log(`📋 Sincronizando: ${opNome}`);
      try {
        await syncOperadora(conn, mysqlTable, operadoraId, since);
      } catch (err) {
        console.error(`❌ Erro ao sincronizar ${opNome}: ${err.message}`);
      }
    }

    console.log(`\n✅ Sincronização concluída em ${new Date().toLocaleString('pt-BR')}`);
  } catch (err) {
    console.error(`\n❌ Erro fatal: ${err.message}`);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

main();
