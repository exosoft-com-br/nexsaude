import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrasilApiService } from '../../../core/services/brasil-api.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import type { EmpresaLead } from '../../../core/models/lead.model';

@Component({
  selector: 'app-enriquecimento',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-3xl mx-auto px-4 py-8">

      <div class="flex items-center gap-3 mb-6">
        <a routerLink="/leads" class="text-gray-400 hover:text-gray-600">
          ← Voltar
        </a>
        <h1 class="text-2xl font-bold text-gray-900">Enriquecimento do Lead</h1>
      </div>

      <div *ngIf="lead" class="space-y-6">

        <!-- Card: Dados do Maps -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Google Maps</h2>
          <p class="text-xl font-bold text-gray-900">{{ lead.nome_empresa }}</p>
          <p class="text-gray-500 text-sm mt-1">{{ lead.endereco_formatado }}</p>
          <div class="flex gap-4 mt-3 text-sm text-gray-500">
            <span *ngIf="lead.telefone_maps">📞 {{ lead.telefone_maps }}</span>
            <span *ngIf="lead.rating">⭐ {{ lead.rating }}</span>
          </div>
        </div>

        <!-- Card: Consulta CNPJ -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Enriquecimento via CNPJ</h2>

          <div class="flex gap-3">
            <input
              [(ngModel)]="cnpjInput"
              placeholder="00.000.000/0000-00"
              maxlength="18"
              class="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              (click)="consultarCnpj()"
              [disabled]="carregandoCnpj"
              class="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {{ carregandoCnpj ? 'Consultando...' : 'Consultar' }}
            </button>
          </div>

          <p *ngIf="erroCnpj" class="text-red-600 text-sm mt-2">{{ erroCnpj }}</p>

          <!-- Dados retornados -->
          <div *ngIf="dadosCnpj" class="mt-5 space-y-4">

            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p class="text-gray-400 text-xs">Razão Social</p>
                <p class="font-medium text-gray-800">{{ dadosCnpj.razao_social }}</p>
              </div>
              <div>
                <p class="text-gray-400 text-xs">Nome Fantasia</p>
                <p class="font-medium text-gray-800">{{ dadosCnpj.nome_fantasia || '-' }}</p>
              </div>
              <div>
                <p class="text-gray-400 text-xs">Situação Cadastral</p>
                <span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                      [class.bg-green-100]="dadosCnpj.situacao_cadastral === 'ATIVA'"
                      [class.text-green-700]="dadosCnpj.situacao_cadastral === 'ATIVA'"
                      [class.bg-red-100]="dadosCnpj.situacao_cadastral !== 'ATIVA'"
                      [class.text-red-700]="dadosCnpj.situacao_cadastral !== 'ATIVA'">
                  {{ dadosCnpj.situacao_cadastral }}
                </span>
              </div>
              <div>
                <p class="text-gray-400 text-xs">Porte</p>
                <p class="font-medium text-gray-800">{{ dadosCnpj.porte || '-' }}</p>
              </div>
              <div>
                <p class="text-gray-400 text-xs">Capital Social</p>
                <p class="font-medium text-gray-800">
                  {{ dadosCnpj.capital_social | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                </p>
              </div>
              <div>
                <p class="text-gray-400 text-xs">Data de Abertura</p>
                <p class="font-medium text-gray-800">
                  {{ dadosCnpj.data_abertura | date:'dd/MM/yyyy' }}
                </p>
              </div>
            </div>

            <!-- Sócios -->
            <div *ngIf="dadosCnpj.socios?.length">
              <p class="text-gray-400 text-xs mb-2">Sócios</p>
              <div *ngFor="let socio of dadosCnpj.socios" class="bg-gray-50 rounded-lg px-3 py-2 mb-2 text-sm">
                <p class="font-medium text-gray-800">{{ socio.nome }}</p>
                <p class="text-gray-400 text-xs">{{ socio.qualificacao }}</p>
              </div>
            </div>

          </div>
        </div>

        <!-- Status e Observações -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Status e Notas</h2>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="text-xs text-gray-500">Status</label>
              <select
                [(ngModel)]="lead.status"
                class="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="novo">Novo</option>
                <option value="contatado">Contatado</option>
                <option value="proposta_enviada">Proposta Enviada</option>
                <option value="convertido">Convertido</option>
                <option value="perdido">Perdido</option>
              </select>
            </div>
          </div>

          <div class="mt-4">
            <label class="text-xs text-gray-500">Observações</label>
            <textarea
              [(ngModel)]="lead.observacoes"
              rows="3"
              class="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none">
            </textarea>
          </div>
        </div>

        <!-- Botões de ação -->
        <div class="flex gap-3">
          <button
            (click)="salvar()"
            [disabled]="salvando"
            class="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {{ salvando ? 'Salvando...' : 'Salvar Lead' }}
          </button>

          <button
            (click)="irParaCotacao()"
            class="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors">
            Cotar Planos →
          </button>
        </div>

        <p *ngIf="erroSalvar" class="text-red-600 text-sm text-center">{{ erroSalvar }}</p>

      </div>

      <!-- Carregando lead -->
      <div *ngIf="!lead && !erroCarregar" class="text-center py-16 text-gray-400">
        <p>Carregando lead...</p>
      </div>

      <div *ngIf="erroCarregar" class="bg-red-50 text-red-700 rounded-lg p-4 text-sm">
        {{ erroCarregar }}
      </div>

    </div>
  `,
})
export class EnriquecimentoComponent implements OnInit {
  lead: EmpresaLead | null = null;
  cnpjInput = '';
  dadosCnpj: Partial<EmpresaLead> | null = null;

  carregandoCnpj = false;
  salvando       = false;

  erroCnpj:      string | null = null;
  erroSalvar:    string | null = null;
  erroCarregar:  string | null = null;

  private leadId!: string;

  constructor(
    private route:  ActivatedRoute,
    private router: Router,
    private brasil: BrasilApiService,
    private supa:   SupabaseService,
  ) {}

  ngOnInit(): void {
    this.leadId = this.route.snapshot.paramMap.get('id')!;
    this.carregarLead();
  }

  private carregarLead(): void {
    this.supa.buscarLeads().subscribe({
      next: leads => {
        const found = leads.find(l => l.id === this.leadId);
        if (found) {
          this.lead     = found;
          this.cnpjInput = this.brasil.formatarCnpj(found.cnpj ?? '');
        } else {
          this.erroCarregar = 'Lead não encontrado.';
        }
      },
      error: err => this.erroCarregar = err.message,
    });
  }

  consultarCnpj(): void {
    this.erroCnpj = null;
    if (!this.cnpjInput.trim()) return;

    if (!this.brasil.validarFormatoCnpj(this.cnpjInput)) {
      this.erroCnpj = 'CNPJ inválido. Verifique os dígitos.';
      return;
    }

    this.carregandoCnpj = true;
    this.brasil.consultarCnpj(this.cnpjInput).subscribe({
      next: dados => {
        this.dadosCnpj      = dados;
        this.carregandoCnpj = false;
        // Mesclar dados no lead
        if (this.lead) Object.assign(this.lead, dados);
      },
      error: err => {
        this.erroCnpj      = err.message;
        this.carregandoCnpj = false;
      },
    });
  }

  salvar(): void {
    if (!this.lead) return;
    this.salvando   = true;
    this.erroSalvar = null;

    this.supa.upsertLead(this.lead).subscribe({
      next: () => {
        this.salvando = false;
        this.router.navigate(['/leads']);
      },
      error: err => {
        this.salvando   = false;
        this.erroSalvar = err.message;
      },
    });
  }

  irParaCotacao(): void {
    this.router.navigate(['/cotacao/simulador', this.leadId]);
  }
}
