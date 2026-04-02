import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';

interface Operadora { id: string; nome: string; }

const FAIXAS = [
  { campo: 'faixa_00_18',   label: '0 – 18' },
  { campo: 'faixa_19_23',   label: '19 – 23' },
  { campo: 'faixa_24_28',   label: '24 – 28' },
  { campo: 'faixa_29_33',   label: '29 – 33' },
  { campo: 'faixa_34_38',   label: '34 – 38' },
  { campo: 'faixa_39_43',   label: '39 – 43' },
  { campo: 'faixa_44_48',   label: '44 – 48' },
  { campo: 'faixa_49_53',   label: '49 – 53' },
  { campo: 'faixa_54_58',   label: '54 – 58' },
  { campo: 'faixa_59_mais', label: '59+' },
] as const;

@Component({
  selector: 'app-importar-plano',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-3xl mx-auto px-4 py-8">

      <!-- Header -->
      <div class="mb-6">
        <a routerLink="/planos" (click)="voltar()"
           class="text-sm text-blue-600 hover:underline mb-2 inline-block">← Voltar para Convênios</a>
        <h1 class="text-2xl font-bold text-gray-900">Adicionar / Atualizar Plano</h1>
        <p class="text-gray-500 mt-1 text-sm">
          Cadastre manualmente os preços de um plano por faixa etária.
          Use a tabela que você recebe do portal da operadora.
        </p>
      </div>

      <!-- Erro / Sucesso -->
      <div *ngIf="erro" class="bg-red-50 text-red-700 rounded-lg p-4 text-sm mb-4">{{ erro }}</div>
      <div *ngIf="sucesso" class="bg-green-50 text-green-700 rounded-lg p-4 text-sm mb-4">
        Plano salvo com sucesso!
        <a (click)="novoPlano()" class="underline cursor-pointer ml-2">Adicionar outro</a>
      </div>

      <form (ngSubmit)="salvar()" #f="ngForm" class="space-y-6">

        <!-- Operadora -->
        <div class="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 class="font-semibold text-gray-800 text-sm uppercase tracking-wide">Operadora</h2>

          <div class="flex gap-3 items-end flex-wrap">
            <div class="flex-1 min-w-[200px]">
              <label class="block text-xs text-gray-500 mb-1">Selecionar existente</label>
              <select [(ngModel)]="operadoraId" name="operadoraId"
                      (ngModelChange)="onOperadoraChange()"
                      class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="">— Nova operadora —</option>
                <option *ngFor="let op of operadoras" [value]="op.id">{{ op.nome }}</option>
              </select>
            </div>
            <div *ngIf="!operadoraId" class="flex-1 min-w-[200px]">
              <label class="block text-xs text-gray-500 mb-1">Nome da nova operadora</label>
              <input [(ngModel)]="novaOperadora" name="novaOperadora" type="text"
                     placeholder="Ex: Bradesco Saúde"
                     class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>
        </div>

        <!-- Dados do plano -->
        <div class="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 class="font-semibold text-gray-800 text-sm uppercase tracking-wide">Dados do Plano</h2>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Nome do plano <span class="text-red-500">*</span></label>
              <input [(ngModel)]="plano.nome_plano" name="nome_plano" required type="text"
                     placeholder="Ex: Amil 500 Nacional PME"
                     class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Código ANS / interno</label>
              <input [(ngModel)]="plano.codigo_plano" name="codigo_plano" type="text"
                     placeholder="Ex: 123456"
                     class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Cobertura</label>
              <select [(ngModel)]="plano.cobertura" name="cobertura"
                      class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="Nacional">Nacional</option>
                <option value="Regional">Regional</option>
                <option value="Grupo de municípios">Grupo de municípios</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Acomodação</label>
              <select [(ngModel)]="plano.acomodacao" name="acomodacao"
                      class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="Apartamento">Apartamento</option>
                <option value="Enfermaria">Enfermaria</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Tipo de contratação</label>
              <select [(ngModel)]="plano.tipo_contratacao" name="tipo_contratacao"
                      class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="PME">PME</option>
                <option value="Adesão">Adesão</option>
                <option value="Individual">Individual</option>
                <option value="Coletivo">Coletivo por Adesão</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Vigência (início)</label>
              <input [(ngModel)]="plano.vigencia_inicio" name="vigencia_inicio" type="date"
                     class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>
        </div>

        <!-- Preços por faixa etária -->
        <div class="bg-white rounded-xl border border-gray-200 p-5">
          <h2 class="font-semibold text-gray-800 text-sm uppercase tracking-wide mb-1">Preços por Faixa Etária (R$)</h2>
          <p class="text-xs text-gray-400 mb-4">Valores mensais por beneficiário. Use ponto ou vírgula como separador decimal.</p>

          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <div *ngFor="let f of faixas">
              <label class="block text-xs font-medium text-gray-600 mb-1">{{ f.label }}</label>
              <input [(ngModel)]="faixaValores[f.campo]"
                     [name]="f.campo"
                     type="text"
                     inputmode="decimal"
                     placeholder="0,00"
                     (blur)="normalizarValor(f.campo)"
                     class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <!-- Preview do total -->
          <div *ngIf="valorTotalFaixas > 0"
               class="mt-4 text-right text-xs text-gray-400">
            Soma das faixas: <span class="font-semibold text-gray-700">{{ valorTotalFaixas | currency:'BRL':'symbol':'1.2-2' }}</span>
          </div>
        </div>

        <!-- Ações -->
        <div class="flex justify-end gap-3">
          <button type="button" (click)="voltar()"
                  class="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit"
                  [disabled]="salvando || !podeSalvar"
                  class="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            <span *ngIf="salvando" class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            {{ salvando ? 'Salvando...' : 'Salvar Plano' }}
          </button>
        </div>

      </form>
    </div>
  `,
})
export class ImportarPlanoComponent implements OnInit {
  operadoras: Operadora[] = [];
  operadoraId   = '';
  novaOperadora = '';
  salvando      = false;
  sucesso       = false;
  erro: string | null = null;

  readonly faixas = FAIXAS;

  plano = {
    nome_plano:       '',
    codigo_plano:     '',
    cobertura:        'Nacional',
    acomodacao:       'Apartamento',
    tipo_contratacao: 'PME',
    vigencia_inicio:  '',
  };

  faixaValores: Record<string, string> = {
    faixa_00_18: '', faixa_19_23: '', faixa_24_28: '',
    faixa_29_33: '', faixa_34_38: '', faixa_39_43: '',
    faixa_44_48: '', faixa_49_53: '', faixa_54_58: '',
    faixa_59_mais: '',
  };

  constructor(private supa: SupabaseService, private router: Router) {}

  ngOnInit(): void {
    this.supa.listarOperadoras().subscribe({
      next: ops => this.operadoras = ops,
      error: err => this.erro = err.message,
    });
  }

  onOperadoraChange(): void {
    if (this.operadoraId) this.novaOperadora = '';
  }

  normalizarValor(campo: string): void {
    const v = this.faixaValores[campo].replace(',', '.').trim();
    const n = parseFloat(v);
    this.faixaValores[campo] = isNaN(n) ? '' : n.toFixed(2);
  }

  get valorTotalFaixas(): number {
    return Object.values(this.faixaValores)
      .reduce((s, v) => s + (parseFloat(v.replace(',', '.')) || 0), 0);
  }

  get podeSalvar(): boolean {
    return !!(
      (this.operadoraId || this.novaOperadora.trim()) &&
      this.plano.nome_plano.trim()
    );
  }

  async salvar(): Promise<void> {
    if (!this.podeSalvar) return;
    this.salvando = true;
    this.erro     = null;
    this.sucesso  = false;

    try {
      // Criar operadora se necessário
      let opId = this.operadoraId;
      if (!opId && this.novaOperadora.trim()) {
        opId = await this.supa.criarOperadora(this.novaOperadora.trim());
      }

      const faixas: Record<string, number> = {};
      for (const f of FAIXAS) {
        faixas[f.campo] = parseFloat(this.faixaValores[f.campo].replace(',', '.')) || 0;
      }

      await this.supa.upsertPlano({
        operadora_id:     opId,
        nome_plano:       this.plano.nome_plano.trim(),
        codigo_plano:     this.plano.codigo_plano.trim() || this.plano.nome_plano.trim(),
        cobertura:        this.plano.cobertura,
        acomodacao:       this.plano.acomodacao,
        tipo_contratacao: this.plano.tipo_contratacao,
        vigencia_inicio:  this.plano.vigencia_inicio || null,
        ativo:            true,
        ...faixas,
      });

      this.sucesso = true;
    } catch (e: any) {
      this.erro = e.message ?? 'Erro ao salvar plano.';
    } finally {
      this.salvando = false;
    }
  }

  novoPlano(): void {
    this.sucesso       = false;
    this.plano         = { nome_plano: '', codigo_plano: '', cobertura: 'Nacional', acomodacao: 'Apartamento', tipo_contratacao: 'PME', vigencia_inicio: '' };
    this.faixaValores  = Object.fromEntries(FAIXAS.map(f => [f.campo, '']));
  }

  voltar(): void {
    this.router.navigate(['/planos']);
  }
}
