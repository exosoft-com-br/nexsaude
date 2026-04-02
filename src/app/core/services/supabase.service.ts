import { Injectable } from '@angular/core';
import {
  createClient, SupabaseClient, AuthChangeEvent,
  Session, User,
} from '@supabase/supabase-js';
import { BehaviorSubject, Observable, from, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { EmpresaLead } from '../models/lead.model';
import type { CotacaoRealizada, ResultadoComparativo } from '../models/cotacao.model';

@Injectable({ providedIn: 'root' })
export class SupabaseService {

  private supabase: SupabaseClient;
  private _session$ = new BehaviorSubject<Session | null>(null);

  readonly session$: Observable<Session | null> = this._session$.asObservable();
  readonly user$: Observable<User | null> = this._session$.pipe(
    map(s => s?.user ?? null)
  );

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.anonKey
    );

    // Inicializar sessão
    this.supabase.auth.getSession().then(({ data }) => {
      this._session$.next(data.session);
    });

    // Reagir a mudanças de autenticação
    this.supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        this._session$.next(session);
      }
    );
  }

  // ----------------------------------------------------------------
  // Auth
  // ----------------------------------------------------------------
  signIn(email: string, password: string) {
    return from(
      this.supabase.auth.signInWithPassword({ email, password })
    ).pipe(catchError(err => throwError(() => err)));
  }

  signUp(email: string, password: string, nomeCompleto: string) {
    return from(
      this.supabase.auth.signUp({
        email, password,
        options: { data: { nome_completo: nomeCompleto } },
      })
    ).pipe(catchError(err => throwError(() => err)));
  }

  signOut() {
    return from(this.supabase.auth.signOut());
  }

  get currentUser(): User | null {
    return this._session$.value?.user ?? null;
  }

  // ----------------------------------------------------------------
  // Leads
  // ----------------------------------------------------------------

  /** Buscar leads do corretor autenticado com filtros opcionais */
  buscarLeads(termo?: string, status?: string, limit = 20, offset = 0) {
    return from(
      this.supabase
        .schema('saas_saude')
        .rpc('buscar_leads', { p_termo: termo ?? null, p_status: status ?? null, p_limit: limit, p_offset: offset })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as EmpresaLead[];
      })
    );
  }

  /** Inserir ou atualizar um lead */
  upsertLead(lead: Partial<EmpresaLead>) {
    return from(
      this.supabase
        .schema('saas_saude')
        .from('empresas_leads')
        .upsert({ ...lead, corretor_id: this.currentUser?.id }, { onConflict: 'place_id' })
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as EmpresaLead;
      })
    );
  }

  /** Atualizar status de um lead */
  atualizarStatusLead(id: string, status: EmpresaLead['status']) {
    return from(
      this.supabase
        .schema('saas_saude')
        .from('empresas_leads')
        .update({ status })
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as EmpresaLead;
      })
    );
  }

  /** Deletar lead */
  deletarLead(id: string) {
    return from(
      this.supabase
        .schema('saas_saude')
        .from('empresas_leads')
        .delete()
        .eq('id', id)
    ).pipe(map(({ error }) => { if (error) throw error; }));
  }

  // ----------------------------------------------------------------
  // Cotações
  // ----------------------------------------------------------------

  /** Comparar planos usando a function PL/pgSQL */
  compararPlanos(planoIds: string[], idades: number[]) {
    return from(
      this.supabase
        .schema('saas_saude')
        .rpc('comparar_planos', {
          p_plano_ids: planoIds,
          p_idades:    idades,
        })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const rows = (data ?? []) as any[];
        return rows.map(r => ({
          ...r,
          detalhamento: typeof r.detalhamento === 'string'
            ? JSON.parse(r.detalhamento)
            : (r.detalhamento ?? []),
        })) as ResultadoComparativo[];
      })
    );
  }

  /** Salvar cotação realizada */
  salvarCotacao(cotacao: Partial<CotacaoRealizada>) {
    return from(
      this.supabase
        .schema('saas_saude')
        .from('cotacoes_realizadas')
        .upsert({ ...cotacao, corretor_id: this.currentUser?.id })
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as CotacaoRealizada;
      })
    );
  }

  /** Buscar cotações do corretor autenticado */
  minhasCotacoes(limit = 20) {
    return from(
      this.supabase
        .schema('saas_saude')
        .from('cotacoes_realizadas')
        .select('*, empresas_leads(nome_empresa)')
        .order('criado_em', { ascending: false })
        .limit(limit)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as CotacaoRealizada[];
      })
    );
  }

  // ----------------------------------------------------------------
  // Planos / Tabelas de Preço
  // ----------------------------------------------------------------

  /** Listar planos ativos com nome da operadora.
   *  Converte campos NUMERIC(10,2) de string → number (PostgREST retorna NUMERIC como string JSON). */
  listarPlanos(operadoraId?: string) {
    let query = this.supabase
      .schema('saas_saude')
      .from('tabelas_precos')
      .select('*, operadoras(nome, logo_url)')
      .eq('ativo', true)
      .order('operadora_id');

    if (operadoraId) {
      query = query.eq('operadora_id', operadoraId);
    }

    return from(query).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []).map((p: any) => ({
          ...p,
          faixa_00_18:   parseFloat(p.faixa_00_18)   || 0,
          faixa_19_23:   parseFloat(p.faixa_19_23)   || 0,
          faixa_24_28:   parseFloat(p.faixa_24_28)   || 0,
          faixa_29_33:   parseFloat(p.faixa_29_33)   || 0,
          faixa_34_38:   parseFloat(p.faixa_34_38)   || 0,
          faixa_39_43:   parseFloat(p.faixa_39_43)   || 0,
          faixa_44_48:   parseFloat(p.faixa_44_48)   || 0,
          faixa_49_53:   parseFloat(p.faixa_49_53)   || 0,
          faixa_54_58:   parseFloat(p.faixa_54_58)   || 0,
          faixa_59_mais: parseFloat(p.faixa_59_mais) || 0,
        }));
      })
    );
  }

  /** Listar operadoras ativas */
  listarOperadoras() {
    return from(
      this.supabase
        .schema('saas_saude')
        .from('operadoras')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome')
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []) as { id: string; nome: string }[];
      })
    );
  }

  /** Criar nova operadora, retorna o id gerado */
  async criarOperadora(nome: string): Promise<string> {
    const { data, error } = await this.supabase
      .schema('saas_saude')
      .from('operadoras')
      .insert({ nome, ativo: true })
      .select('id')
      .single();
    if (error) throw error;
    return (data as any).id as string;
  }

  /** Inserir ou atualizar plano em tabelas_precos (vinculado ao corretor autenticado) */
  async upsertPlano(plano: Record<string, any>): Promise<void> {
    const { error } = await this.supabase
      .schema('saas_saude')
      .from('tabelas_precos')
      .upsert(
        { ...plano, corretor_id: this.currentUser?.id },
        { onConflict: 'idx_tabelas_precos_unique' }
      );
    if (error) throw error;
  }

  /** Deletar plano do corretor */
  deletarPlano(id: string) {
    return from(
      this.supabase
        .schema('saas_saude')
        .from('tabelas_precos')
        .delete()
        .eq('id', id)
    ).pipe(map(({ error }) => { if (error) throw error; }));
  }

  // ----------------------------------------------------------------
  // Dashboard stats
  // ----------------------------------------------------------------
  meuDashboard() {
    return from(
      this.supabase.schema('saas_saude').rpc('meu_dashboard')
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as {
          total_leads:         number;
          leads_novos:         number;
          leads_em_andamento:  number;
          leads_convertidos:   number;
          cotacoes_mes:        number;
        };
      })
    );
  }
}
