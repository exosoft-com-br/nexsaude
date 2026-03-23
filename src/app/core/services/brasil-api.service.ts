import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { EmpresaLead, CnaeItem, Socio, EnderecoCnpj } from '../models/lead.model';

/** Resposta bruta da BrasilAPI para CNPJ */
interface BrasilApiCnpjResponse {
  cnpj:                         string;
  razao_social:                 string;
  nome_fantasia:                string;
  descricao_situacao_cadastral: string;
  descricao_natureza_juridica:  string;
  porte:                        string;
  capital_social:               number;
  data_inicio_atividade:        string;
  cnae_fiscal:                  number;
  cnae_fiscal_descricao:        string;
  cnaes_secundarios:            Array<{ codigo: number; descricao: string }>;
  qsa:                          Array<{
    nome_socio:                   string;
    qualificacao_socio:           string;
    cpf_cnpj_socio:               string;
    data_entrada_sociedade:       string;
  }>;
  logradouro:                   string;
  numero:                       string;
  complemento:                  string;
  bairro:                       string;
  municipio:                    string;
  uf:                           string;
  cep:                          string;
  ddd_telefone_1:               string;
}

@Injectable({ providedIn: 'root' })
export class BrasilApiService {

  private readonly baseUrl = environment.brasilApi.baseUrl;

  constructor(private http: HttpClient) {}

  // ----------------------------------------------------------------
  // Consultar CNPJ na BrasilAPI
  // ----------------------------------------------------------------
  consultarCnpj(cnpj: string): Observable<Partial<EmpresaLead>> {
    const cnpjLimpo = cnpj.replace(/\D/g, '');

    if (cnpjLimpo.length !== 14) {
      return throwError(() => new Error('CNPJ deve conter 14 dígitos'));
    }

    return this.http
      .get<BrasilApiCnpjResponse>(`${this.baseUrl}/cnpj/v1/${cnpjLimpo}`)
      .pipe(
        map(res => this.mapToEmpresaLead(res)),
        catchError(this.handleError)
      );
  }

  // ----------------------------------------------------------------
  // Validar formato de CNPJ (sem chamada à API)
  // ----------------------------------------------------------------
  validarFormatoCnpj(cnpj: string): boolean {
    const c = cnpj.replace(/\D/g, '');
    if (c.length !== 14) return false;
    if (/^(\d)\1+$/.test(c)) return false;  // todos dígitos iguais

    const calc = (c: string, n: number) => {
      let sum = 0;
      const weights = n === 13
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      for (let i = 0; i < weights.length; i++) {
        sum += parseInt(c[i]) * weights[i];
      }
      const rem = sum % 11;
      return rem < 2 ? 0 : 11 - rem;
    };

    return (
      calc(c, 13) === parseInt(c[12]) &&
      calc(c, 14) === parseInt(c[13])
    );
  }

  /** Formatar CNPJ para exibição: 00.000.000/0000-00 */
  formatarCnpj(cnpj: string): string {
    const c = cnpj.replace(/\D/g, '');
    return c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  // ----------------------------------------------------------------
  // Mapper
  // ----------------------------------------------------------------
  private mapToEmpresaLead(res: BrasilApiCnpjResponse): Partial<EmpresaLead> {
    const cnaes: CnaeItem[] = [
      { codigo: String(res.cnae_fiscal), descricao: res.cnae_fiscal_descricao },
      ...(res.cnaes_secundarios ?? []).map(c => ({
        codigo:   String(c.codigo),
        descricao: c.descricao,
      })),
    ];

    const socios: Socio[] = (res.qsa ?? []).map(s => ({
      nome:            s.nome_socio,
      qualificacao:    s.qualificacao_socio,
      cpf_cnpj_socio:  s.cpf_cnpj_socio,
      data_entrada:    s.data_entrada_sociedade,
    }));

    const enderecoObj: EnderecoCnpj = {
      logradouro:  res.logradouro,
      numero:      res.numero,
      complemento: res.complemento,
      bairro:      res.bairro,
      municipio:   res.municipio,
      uf:          res.uf,
      cep:         res.cep?.replace(/\D/g, ''),
    };

    return {
      cnpj:               res.cnpj,
      razao_social:       res.razao_social,
      nome_fantasia:      res.nome_fantasia || res.razao_social,
      situacao_cadastral: res.descricao_situacao_cadastral,
      natureza_juridica:  res.descricao_natureza_juridica,
      porte:              res.porte,
      capital_social:     res.capital_social,
      data_abertura:      res.data_inicio_atividade,
      cnaes_principais:   cnaes,
      socios,
      endereco_cnpj:      enderecoObj,
    };
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    let msg = 'Erro ao consultar BrasilAPI';
    if (err.status === 404) msg = 'CNPJ não encontrado na base da Receita Federal';
    if (err.status === 400) msg = 'CNPJ inválido';
    if (err.status === 429) msg = 'Limite de requisições excedido. Tente novamente em alguns instantes.';
    return throwError(() => new Error(msg));
  }
}
