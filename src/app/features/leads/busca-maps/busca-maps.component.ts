import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoogleMapsService } from '../../../core/services/google-maps.service';
import { BrasilApiService, CnpjSugestao } from '../../../core/services/brasil-api.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import type { PlaceResult, EmpresaLead } from '../../../core/models/lead.model';
import { catchError } from 'rxjs/operators';
import { forkJoin as forkJoinStatic, of } from 'rxjs';

interface PlaceComCnpj extends PlaceResult {
  cnpj?:         string;
  razao_social?: string;
  porte?:        string;
  situacao?:     string;
  buscandoCnpj?: boolean;
}

const CATEGORIAS_PME = [
  { label: '🏗️ Construtoras',        query: 'construtoras' },
  { label: '⚖️ Escritórios Advocacia', query: 'escritórios de advocacia' },
  { label: '💻 Empresas de TI',       query: 'empresas de tecnologia' },
  { label: '🏥 Clínicas Médicas',     query: 'clínicas médicas' },
  { label: '🦷 Clínicas Odontológicas', query: 'clínicas odontológicas' },
  { label: '📊 Contabilidade',        query: 'escritórios contabilidade' },
  { label: '🏭 Indústrias',           query: 'indústrias' },
  { label: '🚛 Transportadoras',      query: 'transportadoras' },
  { label: '🏪 Comércio Atacado',     query: 'comércio atacadista' },
  { label: '🏨 Hotéis e Pousadas',    query: 'hotéis e pousadas' },
];

@Component({
  selector: 'app-busca-maps',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-7xl mx-auto px-4 py-8">

      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Buscar Empresas</h1>
        <p class="text-gray-500 mt-1">Capture leads via Google Maps com telefone e CNPJ</p>
      </div>

      <!-- Formulário de busca -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
        <div class="flex flex-col sm:flex-row gap-3">
          <input
            [(ngModel)]="termoBusca"
            (keyup.enter)="buscar()"
            placeholder="Ex: escritórios de advocacia em Campinas SP"
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

        <!-- Raio -->
        <div class="flex gap-2 mt-3 flex-wrap">
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

      <!-- Categorias PME -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Segmentos ideais para planos PME
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            *ngFor="let cat of categorias"
            (click)="buscarCategoria(cat.query)"
            [disabled]="carregando"
            class="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs hover:bg-blue-100 transition-colors disabled:opacity-50 whitespace-nowrap">
            {{ cat.label }}
          </button>
        </div>
        <p class="text-xs text-gray-400 mt-2">
          💡 Clique em um segmento para buscar automaticamente na sua região
        </p>
      </div>

      <!-- Erro -->
      <div *ngIf="erro" class="bg-red-50 text-red-700 rounded-lg p-4 text-sm mb-4">{{ erro }}</div>

      <!-- Loading -->
      <div *ngIf="carregando" class="text-center py-12 text-gray-400">
        <div class="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p class="text-sm">Buscando empresas e coletando dados...</p>
      </div>

      <!-- Resultados -->
      <div *ngIf="!carregando && resultados.length > 0">
        <p class="text-sm text-gray-500 mb-3">
          {{ resultados.length }} empresa(s) com telefone encontradas
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            *ngFor="let place of resultados"
            class="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">

            <!-- Nome e rating -->
            <div class="flex justify-between items-start mb-1">
              <h3 class="font-semibold text-gray-900 text-sm leading-tight flex-1 pr-2">
                {{ place.nome_empresa }}
              </h3>
              <span *ngIf="place.rating" class="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                ⭐ {{ place.rating }}
              </span>
            </div>

            <p class="text-xs text-gray-500 mb-2 leading-relaxed">{{ place.endereco_formatado }}</p>

            <!-- Dados de contato -->
            <div class="flex flex-wrap gap-2 text-xs mb-2">
              <span class="text-green-700 font-medium">📞 {{ place.telefone_maps }}</span>
              <span *ngIf="place.website" class="text-blue-600 truncate max-w-[120px]">🌐 {{ place.website }}</span>
            </div>

            <!-- CNPJ / Dados da Receita -->
            <div *ngIf="place.buscandoCnpj" class="text-xs text-gray-400 mb-2">
              🔍 Buscando CNPJ...
            </div>
            <div *ngIf="place.cnpj" class="bg-gray-50 rounded-lg px-3 py-2 mb-3 text-xs space-y-0.5">
              <p class="font-medium text-gray-700">{{ place.razao_social }}</p>
              <p class="text-gray-500">CNPJ: {{ place.cnpj }}</p>
              <div class="flex gap-2 mt-1">
                <span *ngIf="place.porte" class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{{ place.porte }}</span>
                <span
                  [class.bg-green-100]="place.situacao === 'ATIVA'"
                  [class.text-green-700]="place.situacao === 'ATIVA'"
                  [class.bg-red-100]="place.situacao !== 'ATIVA'"
                  [class.text-red-600]="place.situacao !== 'ATIVA'"
                  class="px-2 py-0.5 rounded-full">
                  {{ place.situacao }}
                </span>
              </div>
            </div>

            <!-- Categoria -->
            <span *ngIf="place.categoria_maps && !place.cnpj && !place.buscandoCnpj"
              class="inline-block bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded mb-3">
              {{ place.categoria_maps | titlecase }}
            </span>

            <!-- Ações -->
            <div class="flex gap-2 mt-auto">
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
        <p class="text-sm">Selecione um segmento ou use a busca acima</p>
      </div>

    </div>
  `,
})
export class BuscaMapsComponent {
  termoBusca      = '';
  raioSelecionado = 2000;
  raiosDisponiveis = [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000];
  categorias       = CATEGORIAS_PME;

  carregando    = false;
  carregandoGeo = false;
  resultados: PlaceComCnpj[] = [];
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
    this.resultados = [];

    this.maps.buscarPorTexto(this.termoBusca, this.latAtual, this.lngAtual, this.raioSelecionado).subscribe({
      next:  results => this.enriquecerComDetalhes(results),
      error: err     => { this.erro = err.message; this.carregando = false; },
    });
  }

  buscarCategoria(query: string): void {
    // Se tiver localização atual, usa ela; caso contrário pede ao usuário digitar cidade
    if (this.latAtual && this.lngAtual) {
      this.termoBusca = query;
      this.buscar();
    } else {
      const cidade = prompt(`Digite a cidade para buscar "${query}":`);
      if (!cidade?.trim()) return;
      this.termoBusca = `${query} em ${cidade.trim()}`;
      this.buscar();
    }
  }

  private enriquecerComDetalhes(results: PlaceResult[]): void {
    if (results.length === 0) {
      this.resultados = [];
      this.carregando = false;
      return;
    }

    const detalhes$ = results.map(r =>
      this.maps.detalharPlace(r.place_id).pipe(catchError(() => of(r)))
    );

    forkJoinStatic(detalhes$).subscribe({
      next: detalhados => {
        this.resultados = detalhados.filter(r => r.telefone_maps) as PlaceComCnpj[];
        this.carregando = false;

        if (this.resultados.length === 0) {
          this.erro = 'Nenhuma empresa com telefone encontrada. Tente outro termo ou região.';
          return;
        }

        // Buscar CNPJ automaticamente para cada resultado
        this.resultados.forEach(place => this.buscarCnpjDoCard(place));
      },
      error: err => { this.erro = err.message; this.carregando = false; },
    });
  }

  private buscarCnpjDoCard(place: PlaceComCnpj): void {
    place.buscandoCnpj = true;
    const cidade = this.extrairCidade(place.endereco_formatado ?? '');
    const query  = cidade ? `${place.nome_empresa} ${cidade}` : place.nome_empresa;

    this.brasil.buscarCnpjPorNome(query).subscribe({
      next: sugestoes => {
        place.buscandoCnpj = false;
        if (sugestoes.length > 0) {
          const s = sugestoes[0];
          place.cnpj         = s.cnpj;
          place.razao_social = s.razao_social;
          place.situacao     = s.situacao;
          // Busca detalhes completos para pegar porte
          this.brasil.consultarCnpj(s.cnpj).subscribe({
            next: dados => { place.porte = dados.porte; },
            error: () => {},
          });
        }
      },
      error: () => { place.buscandoCnpj = false; },
    });
  }

  private extrairCidade(endereco: string): string {
    const partes = endereco.split(',');
    if (partes.length >= 2) {
      return partes[partes.length - 2].trim().split('-')[0].trim();
    }
    return '';
  }

  usarLocalizacaoAtual(): void {
    this.carregandoGeo = true;
    this.maps.obterLocalizacaoAtual().subscribe({
      next: coords => {
        this.latAtual      = coords.latitude;
        this.lngAtual      = coords.longitude;
        this.carregandoGeo = false;
        this.carregando    = true;
        this.maps.buscarEmpresasProximas(coords.latitude, coords.longitude, this.raioSelecionado).subscribe({
          next:  results => this.enriquecerComDetalhes(results),
          error: err     => { this.erro = err.message; this.carregando = false; },
        });
      },
      error: err => {
        this.erro = 'Não foi possível obter sua localização: ' + err.message;
        this.carregandoGeo = false;
      },
    });
  }

  salvarLead(place: PlaceComCnpj): void {
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
      cnpj:               place.cnpj,
      razao_social:       place.razao_social,
      porte:              place.porte,
      situacao_cadastral: place.situacao,
      status:             'novo',
    };

    this.supa.upsertLead(lead).subscribe({
      next: saved => {
        this.salvando[place.place_id] = false;
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
