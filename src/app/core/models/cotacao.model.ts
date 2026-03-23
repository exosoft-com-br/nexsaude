export type CotacaoStatus = 'rascunho' | 'enviada' | 'aceita' | 'recusada';

export interface TabelaPreco {
  id:              string;
  operadora_id:    string;
  operadora?:      string;
  codigo_plano:    string;
  nome_plano:      string;
  tipo_contratacao: string;
  modalidade:      string;
  cobertura:       string;
  acomodacao:      string;
  faixa_00_18:     number;
  faixa_19_23:     number;
  faixa_24_28:     number;
  faixa_29_33:     number;
  faixa_34_38:     number;
  faixa_39_43:     number;
  faixa_44_48:     number;
  faixa_49_53:     number;
  faixa_54_58:     number;
  faixa_59_mais:   number;
  ativo:           boolean;
}

export interface ResultadoComparativo {
  ranking:          number;
  plano_id:         string;
  nome_plano:       string;
  operadora:        string;
  valor_total:      number;
  valor_per_capita: number;
  detalhamento:     DetalheIdade[];
}

export interface DetalheIdade {
  idade:         number;
  faixa:         string;
  valor_mensal:  number;
}

export interface CotacaoRealizada {
  id?:                    string;
  corretor_id?:           string;
  empresa_lead_id?:       string;
  nome_contato:           string;
  email_contato?:         string;
  telefone_contato?:      string;
  idades_beneficiarios:   number[];
  planos_cotados:         string[];    // array de IDs de planos
  resultado_comparativo?: ResultadoComparativo[];
  status:                 CotacaoStatus;
  pdf_url?:               string;
  observacoes?:           string;
  criado_em?:             string;
  atualizado_em?:         string;
}
