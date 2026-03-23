import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../core/services/supabase.service';

interface DashStats {
  total_leads:        number;
  leads_novos:        number;
  leads_em_andamento: number;
  leads_convertidos:  number;
  cotacoes_mes:       number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="max-w-7xl mx-auto px-4 py-8">

      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p class="text-gray-500 mt-1">Resumo das suas atividades</p>
      </div>

      <!-- Cards de Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p class="text-xs text-gray-500 uppercase tracking-wide">Total Leads</p>
          <p class="text-3xl font-bold text-gray-900 mt-1">{{ stats?.total_leads ?? '-' }}</p>
        </div>

        <div class="bg-blue-50 rounded-xl shadow-sm border border-blue-100 p-5">
          <p class="text-xs text-blue-600 uppercase tracking-wide">Novos</p>
          <p class="text-3xl font-bold text-blue-700 mt-1">{{ stats?.leads_novos ?? '-' }}</p>
        </div>

        <div class="bg-yellow-50 rounded-xl shadow-sm border border-yellow-100 p-5">
          <p class="text-xs text-yellow-600 uppercase tracking-wide">Em Andamento</p>
          <p class="text-3xl font-bold text-yellow-700 mt-1">{{ stats?.leads_em_andamento ?? '-' }}</p>
        </div>

        <div class="bg-green-50 rounded-xl shadow-sm border border-green-100 p-5">
          <p class="text-xs text-green-600 uppercase tracking-wide">Convertidos</p>
          <p class="text-3xl font-bold text-green-700 mt-1">{{ stats?.leads_convertidos ?? '-' }}</p>
        </div>

        <div class="bg-purple-50 rounded-xl shadow-sm border border-purple-100 p-5">
          <p class="text-xs text-purple-600 uppercase tracking-wide">Cotações (mês)</p>
          <p class="text-3xl font-bold text-purple-700 mt-1">{{ stats?.cotacoes_mes ?? '-' }}</p>
        </div>

      </div>

      <!-- Ações rápidas -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">

        <a routerLink="/leads/busca"
           class="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow group">
          <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <h3 class="font-semibold text-gray-900">Buscar Empresas</h3>
          <p class="text-sm text-gray-500 mt-1">Capture leads via Google Maps</p>
        </a>

        <a routerLink="/leads"
           class="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow group">
          <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
            <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
          <h3 class="font-semibold text-gray-900">Meus Leads</h3>
          <p class="text-sm text-gray-500 mt-1">Gerencie seu pipeline</p>
        </a>

        <a routerLink="/cotacao/simulador"
           class="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow group">
          <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-200 transition-colors">
            <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <h3 class="font-semibold text-gray-900">Simulador de Cotação</h3>
          <p class="text-sm text-gray-500 mt-1">Compare planos instantaneamente</p>
        </a>

      </div>

      <!-- Erro -->
      <div *ngIf="erro" class="mt-6 bg-red-50 text-red-700 rounded-lg p-4 text-sm">
        {{ erro }}
      </div>

    </div>
  `,
})
export class DashboardComponent implements OnInit {
  stats: DashStats | null = null;
  erro: string | null     = null;

  constructor(private supa: SupabaseService) {}

  ngOnInit(): void {
    this.supa.meuDashboard().subscribe({
      next:  data  => this.stats = data,
      error: err   => this.erro  = err.message,
    });
  }
}
