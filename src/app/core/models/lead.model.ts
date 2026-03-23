export type LeadStatus = 'novo' | 'contatado' | 'proposta_enviada' | 'convertido' | 'perdido';

export interface EmpresaLead {
  id?:                  string;
  corretor_id?:         string;

  // Google Maps
  place_id?:            string;
  nome_empresa:         string;
  endereco_formatado?:  string;
  latitude?:            number;
  longitude?:           number;
  telefone_maps?:       string;
  website?:             string;
  rating?:              number;
  total_avaliacoes?:    number;
  categoria_maps?:      string;

  // BrasilAPI
  cnpj?:                string;
  razao_social?:        string;
  nome_fantasia?:       string;
  situacao_cadastral?:  string;
  natureza_juridica?:   string;
  porte?:               string;
  capital_social?:      number;
  data_abertura?:       string;
  cnaes_principais?:    CnaeItem[];
  socios?:              Socio[];
  endereco_cnpj?:       EnderecoCnpj;

  // Controle
  status:               LeadStatus;
  observacoes?:         string;
  tags?:                string[];
  criado_em?:           string;
  atualizado_em?:       string;
}

export interface CnaeItem {
  codigo:     string;
  descricao:  string;
}

export interface Socio {
  nome:              string;
  qualificacao:      string;
  cpf_cnpj_socio?:   string;
  data_entrada?:     string;
}

export interface EnderecoCnpj {
  logradouro:   string;
  numero:       string;
  complemento?: string;
  bairro:       string;
  municipio:    string;
  uf:           string;
  cep:          string;
}

// Resultado da busca no Google Maps (antes de salvar)
export interface PlaceResult {
  place_id:           string;
  nome_empresa:       string;
  endereco_formatado: string;
  latitude:           number;
  longitude:          number;
  telefone_maps?:     string;
  website?:           string;
  rating?:            number;
  total_avaliacoes?:  number;
  categoria_maps?:    string;
}
