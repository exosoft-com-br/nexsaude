import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoogleMapsService } from '../../../core/services/google-maps.service';
import { BrasilApiService } from '../../../core/services/brasil-api.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import type { PlaceResult, EmpresaLead } from '../../../core/models/lead.model';
import { switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-busca-maps',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-7xl mx-auto px-4 py-8">

      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Buscar Empresas</h1>
        <p class="text-gray-500 mt-1">Capture leads via Google Maps e enriqueça com dados do CNPJ</p>
      </div>

      <!-- Formulário de busca -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div class="flex flex-col sm:flex-row gap-3">

          <input
            [(ngModel)]="termoBusca"
            (keyup.enter)="buscar()"
            placeholder="Ex: clínicas médicas em São Paulo SP"
            class="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            (click)="usarLocalizacaoAtual()"
            [disabled]="carregandoGeo"
            class="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors disabled:opacity-50 whitespace-nowrap">
            {{ carregandoGeo ? 'Obtendo...' : '📍 Minha localização' }}
          </button>

          <button
            (click)="buscar()"
            [disabled]="carregando"
            class="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
            {{ carregando ? 'Buscando...' : 'Buscar' }}
          </button>

        </div>

        <!-- Filtros de raio -->
        <div class="flex gap-2 mt-3">
          <span class="text-xs text-gray-500 self-center">Raio:</span>
          <button
            *ngFor="let r of raiosDisponiveis"
            (click)="raioSelecionado = r"
            [class.bg-blue-600]="raioSelecionado === r"
            [class.text-white]="raioSelecionado === r"
            [class.bg-gray-100]="raioSelecionado !== r"
            class="px-3 py-1 rounded-full text-xs transition-colors">
            {{ r >= 1000 ? (r/1000) + 'km' : r + 'm' }}
          </button>
        </div>
      </div>

      <!-- Erro -->
      <div *ngIf="erro" class="bg-red-50 text-red-700 rounded-lg p-4 text-sm mb-4">{{ erro }}</div>

      <!-- Resultados -->
      <div *ngIf="resultados.length > 0">
        <p class="text-sm text-gray-500 mb-3">{{ resultados.length }} empresas encontradas</p>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            *ngFor="let place of resultados"
            class="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">

            <!-- Nome e rating -->
            <div class="flex justify-between items-start mb-2">
              <h3 class="font-semibold text-gray-900 text-sm leading-tight flex-1 pr-2">
                {{ place.nome_empresa }}
              </h3>
              <span *ngIf="place.rating" class="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                ⭐ {{ place.rating }}
              </span>
            </div>

            <p class="text-xs text-gray-500 mb-3 leading-relaxed">{{ place.endereco_formatado }}</p>

            <div class="flex flex-wrap gap-2 text-xs text-gray-500 mb-4">
              <span *ngIf="place.telefone_maps">📞 {{ place.telefone_maps }}</span>
              <span *ngIf="place.categoria_maps" class="bg-gray-100 px-2 py-0.5 rounded">
                {{ place.categoria_maps | titlecase }}
              </span>
            </div>

            <!-- Ações -->
            <div class="flex gap-2">
              <button
                (click)="salvarLead(place)"
                [disabled]="salvando[place.place_id]"
                class="flex-1 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                {{ salvando[place.place_id] ? 'Salvando...' : '+ Adicionar Lead' }}
              </button>

              <button
                *ngIf="place.website"
                (click)="abrirSite(place.website!)"
                class="px-3 py-2 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200 transition-colors">
                🌐
              </button>
            </div>

          </div>
        </div>
      </div>

      <!-- Estado vazio -->
      <div *ngIf="!carregando && resultados.length === 0 && !erro"
           class="text-center py-16 text-gray-400">
        <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <p class="text-sm">Use a busca acima para encontrar empresas</p>
      </div>

    </div>
  `,
})
export class BuscaMapsComponent {
  termoBusca     = '';
  raioSelecionado = 2000;
  raiosDisponiveis = [500, 1000, 2000, 5000, 10000];

  carregando   = false;
  carregandoGeo = false;
  resultados: PlaceResult[] = [];
  salvando: Record<string, boolean> = {};
  erro: string | null = null;

  private latAtual?: number;
  private lngAtual?: number;

  constructor(
    private maps:   GoogleMapsService,
    private brasil: BrasilApiService,
    private supa:   SupabaseService,
    private router: Router,
  ) {}

  buscar(): void {
    if (!this.termoBusca.trim()) return;
    this.carregando = true;
    this.erro = null;

    this.maps.buscarPorTexto(this.termoBusca, this.latAtual, this.lngAtual).subscribe({
      next:  results => { this.resultados = results; this.carregando = false; },
      error: err     => { this.erro = err.message;   this.carregando = false; },
    });
  }

  usarLocalizacaoAtual(): void {
    this.carregandoGeo = true;
    this.maps.obterLocalizacaoAtual().subscribe({
      next: coords => {
        this.latAtual  = coords.latitude;
        this.lngAtual  = coords.longitude;
        this.carregandoGeo = false;

        // Buscar empresas próximas automaticamente
        this.carregando = true;
        this.maps.buscarEmpresasProximas(coords.latitude, coords.longitude, this.raioSelecionado).subscribe({
          next:  results => { this.resultados = results; this.carregando = false; },
          error: err     => { this.erro = err.message;   this.carregando = false; },
        });
      },
      error: err => {
        this.erro = 'Não foi possível obter sua localização: ' + err.message;
        this.carregandoGeo = false;
      },
    });
  }

  salvarLead(place: PlaceResult): void {
    this.salvando[place.place_id] = true;

    const lead: Partial<EmpresaLead> = {
      place_id:           place.place_id,
      nome_empresa:       place.nome_empresa,
      endereco_formatado: place.endereco_formatado,
      latitude:           place.latitude,
      longitude:          place.longitude,
      telefone_maps:      place.telefone_maps,
      website:            place.website,
      rating:             place.rating,
      total_avaliacoes:   place.total_avaliacoes,
      categoria_maps:     place.categoria_maps,
      status:             'novo',
    };

    this.supa.upsertLead(lead).subscribe({
      next: saved => {
        this.salvando[place.place_id] = false;
        // Redirecionar para enriquecimento via CNPJ
        this.router.navigate(['/leads', saved.id, 'enriquecimento']);
      },
      error: err => {
        this.salvando[place.place_id] = false;
        this.erro = err.message;
      },
    });
  }

  abrirSite(url: string): void {
    window.open(url, '_blank');
  }
}
