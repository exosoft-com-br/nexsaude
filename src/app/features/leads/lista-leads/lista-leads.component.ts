import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';
import type { EmpresaLead, LeadStatus } from '../../../core/models/lead.model';

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string }> = {
  novo:             { label: 'Novo',             color: 'bg-blue-100 text-blue-700'   },
  contatado:        { label: 'Contatado',        color: 'bg-yellow-100 text-yellow-700' },
  proposta_enviada: { label: 'Proposta Enviada', color: 'bg-purple-100 text-purple-700' },
  convertido:       { label: 'Convertido',       color: 'bg-green-100 text-green-700'  },
  perdido:          { label: 'Perdido',          color: 'bg-red-100 text-red-700'     },
};

@Component({
  selector: 'app-lista-leads',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="max-w-7xl mx-auto px-4 py-8">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Meus Leads</h1>
          <p class="text-gray-500 text-sm mt-1">{{ leads.length }} leads no pipeline</p>
        </div>
        <a routerLink="/leads/busca"
           class="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors self-start">
          + Capturar Novo Lead
        </a>
      </div>

      <!-- Filtros -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-5 flex flex-wrap gap-3">
        <input
          [(ngModel)]="filtroTermo"
          (ngModelChange)="filtrar()"
          placeholder="Buscar por nome ou CNPJ..."
          class="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        <select
          [(ngModel)]="filtroStatus"
          (ngModelChange)="filtrar()"
          class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">Todos os status</option>
          <option *ngFor="let s of statusOpcoes" [value]="s.value">{{ s.label }}</option>
        </select>
      </div>

      <!-- Tabela -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Empresa</th>
              <th class="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide hidden md:table-cell">CNPJ</th>
              <th class="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide hidden lg:table-cell">Endereço</th>
              <th class="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Status</th>
              <th class="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let lead of leads"
                class="border-b border-gray-50 hover:bg-gray-50 transition-colors">

              <td class="px-4 py-3">
                <p class="font-medium text-gray-900">{{ lead.nome_empresa }}</p>
                <p *ngIf="lead.razao_social && lead.razao_social !== lead.nome_empresa"
                   class="text-xs text-gray-400">{{ lead.razao_social }}</p>
              </td>

              <td class="px-4 py-3 text-gray-500 hidden md:table-cell">
                {{ lead.cnpj || '-' }}
              </td>

              <td class="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell max-w-xs truncate">
                {{ lead.endereco_formatado || '-' }}
              </td>

              <td class="px-4 py-3">
                <select
                  [(ngModel)]="lead.status"
                  (ngModelChange)="atualizarStatus(lead)"
                  class="border-0 bg-transparent text-xs font-medium cursor-pointer focus:outline-none"
                  [ngClass]="getStatusConfig(lead.status).color + ' px-2 py-1 rounded-full'">
                  <option *ngFor="let s of statusOpcoes" [value]="s.value">{{ s.label }}</option>
                </select>
              </td>

              <td class="px-4 py-3">
                <div class="flex gap-2">
                  <a [routerLink]="['/leads', lead.id, 'enriquecimento']"
                     class="text-xs text-blue-600 hover:text-blue-800 font-medium">
                    Editar
                  </a>
                  <a [routerLink]="['/cotacao/simulador', lead.id]"
                     class="text-xs text-green-600 hover:text-green-800 font-medium">
                    Cotar
                  </a>
                  <button
                    (click)="deletar(lead)"
                    class="text-xs text-red-400 hover:text-red-600">
                    Excluir
                  </button>
                </div>
              </td>

            </tr>

            <tr *ngIf="leads.length === 0 && !carregando">
              <td colspan="5" class="px-4 py-12 text-center text-gray-400 text-sm">
                Nenhum lead encontrado.
                <a routerLink="/leads/busca" class="text-blue-600 hover:underline ml-1">Capturar agora →</a>
              </td>
            </tr>

            <tr *ngIf="carregando">
              <td colspan="5" class="px-4 py-8 text-center text-gray-400 text-sm">
                Carregando leads...
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p *ngIf="erro" class="mt-4 text-red-600 text-sm">{{ erro }}</p>

    </div>
  `,
})
export class ListaLeadsComponent implements OnInit {
  leads:       EmpresaLead[] = [];
  carregando   = false;
  filtroTermo  = '';
  filtroStatus = '';
  erro: string | null = null;

  statusOpcoes = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
    value, label: cfg.label,
  }));

  constructor(private supa: SupabaseService) {}

  ngOnInit(): void { this.filtrar(); }

  filtrar(): void {
    this.carregando = true;
    this.supa.buscarLeads(
      this.filtroTermo || undefined,
      this.filtroStatus || undefined
    ).subscribe({
      next:  leads => { this.leads = leads;   this.carregando = false; },
      error: err   => { this.erro = err.message; this.carregando = false; },
    });
  }

  atualizarStatus(lead: EmpresaLead): void {
    if (!lead.id) return;
    this.supa.atualizarStatusLead(lead.id, lead.status).subscribe({
      error: err => this.erro = err.message,
    });
  }

  deletar(lead: EmpresaLead): void {
    if (!lead.id || !confirm(`Excluir "${lead.nome_empresa}"?`)) return;
    this.supa.deletarLead(lead.id).subscribe({
      next:  () => this.leads = this.leads.filter(l => l.id !== lead.id),
      error: err => this.erro = err.message,
    });
  }

  getStatusConfig(status: LeadStatus) {
    return STATUS_CONFIG[status] ?? STATUS_CONFIG.novo;
  }
}
