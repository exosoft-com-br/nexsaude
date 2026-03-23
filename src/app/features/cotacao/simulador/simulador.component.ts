import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';
import { CotacaoService } from '../../../core/services/cotacao.service';
import type { TabelaPreco, ResultadoComparativo, CotacaoRealizada } from '../../../core/models/cotacao.model';

@Component({
  selector: 'app-simulador',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe],
  template: `
    <div class="max-w-5xl mx-auto px-4 py-8">

      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Simulador de Cotação</h1>
        <p class="text-gray-500 mt-1">Compare planos de múltiplas operadoras</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Painel de configuração -->
        <div class="lg:col-span-1 space-y-5">

          <!-- Dados do contato -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 class="text-sm font-semibold text-gray-700 mb-4">Dados do Contato</h3>

            <div class="space-y-3">
              <input [(ngModel)]="cotacao.nome_contato"     placeholder="Nome *"
                     class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              <input [(ngModel)]="cotacao.email_contato"    placeholder="E-mail"    type="email"
                     class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              <input [(ngModel)]="cotacao.telefone_contato" placeholder="WhatsApp"  type="tel"
                     class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <!-- Idades dos beneficiários -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">Beneficiários</h3>

            <div *ngFor="let idade of idades; let i = index" class="flex gap-2 mb-2">
              <input
                [(ngModel)]="idades[i]"
                type="number" min="0" max="99"
                placeholder="Idade"
                class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                (click)="removerIdade(i)"
                class="text-red-400 hover:text-red-600 px-2 text-sm">✕</button>
            </div>

            <button
              (click)="adicionarIdade()"
              class="w-full mt-1 py-2 border border-dashed border-gray-300 text-gray-500 rounded-lg text-sm hover:border-blue-400 hover:text-blue-500 transition-colors">
              + Adicionar beneficiário
            </button>
          </div>

          <!-- Seleção de planos -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">Planos para Comparar</h3>

            <div *ngFor="let plano of planosDisponiveis" class="flex items-start gap-2 mb-2">
              <input
                type="checkbox"
                [id]="'plano-' + plano.id"
                [value]="plano.id"
                (change)="togglePlano(plano.id, $event)"
                class="mt-1 accent-blue-600"
              />
              <label [for]="'plano-' + plano.id" class="text-sm text-gray-700 cursor-pointer leading-tight">
                <span class="font-medium">{{ plano['operadoras']?.nome ?? 'Operadora' }}</span>
                <br/>
                <span class="text-gray-400 text-xs">{{ plano.nome_plano }}</span>
              </label>
            </div>

            <p *ngIf="planosDisponiveis.length === 0" class="text-gray-400 text-xs">
              Nenhum plano cadastrado.
            </p>
          </div>

          <!-- Botão simular -->
          <button
            (click)="simular()"
            [disabled]="simulando || planosSelecionados.length === 0 || idades.length === 0"
            class="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {{ simulando ? 'Calculando...' : 'Simular Cotação' }}
          </button>

          <p *ngIf="erro" class="text-red-600 text-sm">{{ erro }}</p>

        </div>

        <!-- Resultado do comparativo -->
        <div class="lg:col-span-2">

          <div *ngIf="resultados.length === 0 && !simulando"
               class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400 h-full flex flex-col items-center justify-center">
            <svg class="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
            <p class="text-sm">Configure e clique em "Simular Cotação"</p>
          </div>

          <!-- Cards de resultados -->
          <div *ngIf="resultados.length > 0" class="space-y-4">

            <div
              *ngFor="let r of resultados"
              class="bg-white rounded-xl shadow-sm border p-5 transition-all"
              [class.border-green-300]="r.ranking === 1"
              [class.bg-green-50]="r.ranking === 1"
              [class.border-gray-100]="r.ranking !== 1">

              <!-- Badge ranking -->
              <div class="flex justify-between items-start mb-3">
                <div class="flex items-center gap-2">
                  <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                        [class.bg-green-500]="r.ranking === 1"
                        [class.text-white]="r.ranking === 1"
                        [class.bg-gray-200]="r.ranking !== 1"
                        [class.text-gray-600]="r.ranking !== 1">
                    {{ r.ranking }}
                  </span>
                  <div>
                    <p class="font-semibold text-gray-900">{{ r.operadora }}</p>
                    <p class="text-xs text-gray-500">{{ r.nome_plano }}</p>
                  </div>
                </div>

                <div class="text-right">
                  <p class="text-2xl font-bold text-gray-900">
                    {{ r.valor_total | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </p>
                  <p class="text-xs text-gray-400">/mês · per capita: {{ r.valor_per_capita | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</p>
                </div>
              </div>

              <!-- Detalhamento por faixa -->
              <details class="mt-2">
                <summary class="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                  Ver detalhamento por beneficiário
                </summary>
                <table class="w-full mt-2 text-xs">
                  <thead>
                    <tr class="text-gray-400 border-b">
                      <th class="text-left py-1">Idade</th>
                      <th class="text-left py-1">Faixa ANS</th>
                      <th class="text-right py-1">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let d of r.detalhamento" class="border-b border-gray-50">
                      <td class="py-1">{{ d.idade }} anos</td>
                      <td class="py-1 text-gray-500">{{ d.faixa | titlecase }}</td>
                      <td class="py-1 text-right font-medium">
                        {{ d.valor_mensal | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </details>

            </div>

            <!-- Ações pós-comparativo -->
            <div class="flex gap-3 mt-4">
              <button
                (click)="exportarPdf()"
                class="flex-1 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors">
                📄 Exportar PDF
              </button>

              <button
                *ngIf="cotacao.telefone_contato"
                (click)="enviarWhatsApp()"
                class="flex-1 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors">
                💬 Enviar WhatsApp
              </button>

              <button
                (click)="salvarCotacao()"
                [disabled]="salvandoCotacao"
                class="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {{ salvandoCotacao ? 'Salvando...' : '💾 Salvar' }}
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  `,
})
export class SimuladorComponent implements OnInit {
  idades:            number[] = [30, 28];
  planosSelecionados: string[] = [];
  planosDisponiveis:  any[]    = [];

  resultados:    ResultadoComparativo[] = [];
  simulando      = false;
  salvandoCotacao = false;
  erro: string | null = null;

  cotacao: Partial<CotacaoRealizada> = {
    nome_contato: '',
    status: 'rascunho',
  };

  constructor(
    private route:    ActivatedRoute,
    private supa:     SupabaseService,
    private cotacaoSvc: CotacaoService,
  ) {}

  ngOnInit(): void {
    const leadId = this.route.snapshot.paramMap.get('leadId');
    if (leadId) this.cotacao.empresa_lead_id = leadId;

    this.supa.listarPlanos().subscribe({
      next: planos => this.planosDisponiveis = planos ?? [],
      error: err   => this.erro = err.message,
    });
  }

  adicionarIdade():     void { this.idades.push(0); }
  removerIdade(i: number): void { this.idades.splice(i, 1); }

  togglePlano(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.planosSelecionados.push(id);
    } else {
      this.planosSelecionados = this.planosSelecionados.filter(p => p !== id);
    }
  }

  simular(): void {
    const idadesValidas = this.idades.filter(i => i > 0);
    if (!idadesValidas.length || !this.planosSelecionados.length) return;

    this.simulando = true;
    this.erro = null;

    this.cotacaoSvc.calcularComparativo(this.planosSelecionados, idadesValidas).subscribe({
      next: res => {
        this.resultados = res;
        this.simulando  = false;
        this.cotacao.idades_beneficiarios = idadesValidas;
        this.cotacao.planos_cotados       = this.planosSelecionados;
      },
      error: err => {
        this.erro     = err.message;
        this.simulando = false;
      },
    });
  }

  exportarPdf(): void {
    this.cotacaoSvc.gerarPdf(this.cotacao as CotacaoRealizada, this.resultados);
  }

  enviarWhatsApp(): void {
    if (!this.cotacao.telefone_contato) return;
    this.cotacaoSvc.compartilharWhatsApp(
      this.cotacao.telefone_contato,
      this.cotacao as CotacaoRealizada,
      this.resultados
    );
  }

  salvarCotacao(): void {
    this.salvandoCotacao = true;
    this.cotacaoSvc.salvarComResultados(this.cotacao, this.resultados).subscribe({
      next: () => { this.salvandoCotacao = false; },
      error: err => {
        this.erro          = err.message;
        this.salvandoCotacao = false;
      },
    });
  }
}
