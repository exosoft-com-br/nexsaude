import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';

interface PlanoRow {
  id:            string;
  nome_plano:    string;
  codigo_plano:  string;
  cobertura:     string;
  acomodacao:    string;
  tipo_contratacao: string;
  operadora:     string;
  faixa_00_18:   number;
  faixa_19_23:   number;
  faixa_24_28:   number;
  faixa_29_33:   number;
  faixa_34_38:   number;
  faixa_39_43:   number;
  faixa_44_48:   number;
  faixa_49_53:   number;
  faixa_54_58:   number;
  faixa_59_mais: number;
}

interface GrupoOperadora {
  nome:   string;
  planos: PlanoRow[];
}

@Component({
  selector: 'app-tabela-planos',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe],
  template: `
    <div class="max-w-full mx-auto px-4 py-8">

      <!-- Header -->
      <div class="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Tabela de Convênios</h1>
          <p class="text-gray-500 mt-1">Preços por faixa etária — {{ totalPlanos }} planos de {{ grupos.length }} operadoras</p>
        </div>

        <!-- Filtro operadora -->
        <div class="flex gap-3 flex-wrap">
          <select [(ngModel)]="filtroOperadora"
                  class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="">Todas as operadoras</option>
            <option *ngFor="let g of grupos" [value]="g.nome">{{ g.nome }}</option>
          </select>
          <select [(ngModel)]="filtroAcomodacao"
                  class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="">Toda acomodação</option>
            <option value="Apartamento">Apartamento</option>
            <option value="Enfermaria">Enfermaria</option>
          </select>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="carregando" class="text-center py-16 text-gray-400">
        <div class="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p class="text-sm">Carregando tabela de preços...</p>
      </div>

      <!-- Erro -->
      <div *ngIf="erro" class="bg-red-50 text-red-700 rounded-lg p-4 text-sm mb-4">{{ erro }}</div>

      <!-- Tabela por operadora -->
      <div *ngFor="let g of gruposFiltrados" class="mb-8">

        <!-- Header da operadora -->
        <div class="flex items-center gap-3 mb-2">
          <span class="inline-block bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
            {{ g.nome }}
          </span>
          <span class="text-xs text-gray-400">{{ g.planos.length }} plano(s)</span>
        </div>

        <!-- Tabela com scroll horizontal -->
        <div class="overflow-x-auto rounded-xl shadow-sm border border-gray-100">
          <table class="w-full text-xs min-w-[900px]">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="text-left px-4 py-3 font-semibold text-gray-600 w-48 sticky left-0 bg-gray-50 z-10">Plano</th>
                <th class="text-left px-3 py-3 font-semibold text-gray-600 whitespace-nowrap">Cobertura</th>
                <th class="text-left px-3 py-3 font-semibold text-gray-600 whitespace-nowrap">Acomod.</th>
                <th class="text-right px-3 py-3 font-semibold text-blue-700 whitespace-nowrap">0–18</th>
                <th class="text-right px-3 py-3 font-semibold text-blue-700 whitespace-nowrap">19–23</th>
                <th class="text-right px-3 py-3 font-semibold text-blue-700 whitespace-nowrap">24–28</th>
                <th class="text-right px-3 py-3 font-semibold text-blue-700 whitespace-nowrap">29–33</th>
                <th class="text-right px-3 py-3 font-semibold text-blue-700 whitespace-nowrap">34–38</th>
                <th class="text-right px-3 py-3 font-semibold text-blue-700 whitespace-nowrap">39–43</th>
                <th class="text-right px-3 py-3 font-semibold text-blue-700 whitespace-nowrap">44–48</th>
                <th class="text-right px-3 py-3 font-semibold text-blue-700 whitespace-nowrap">49–53</th>
                <th class="text-right px-3 py-3 font-semibold text-blue-700 whitespace-nowrap">54–58</th>
                <th class="text-right px-3 py-3 font-semibold text-orange-600 whitespace-nowrap">59+</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-50">
              <tr *ngFor="let p of g.planos; let even = even"
                  [class.bg-gray-50]="!even"
                  class="hover:bg-blue-50 transition-colors">
                <td class="px-4 py-3 sticky left-0 z-10 font-medium text-gray-900"
                    [class.bg-white]="even" [class.bg-gray-50]="!even">
                  {{ p.nome_plano }}
                </td>
                <td class="px-3 py-3 text-gray-500 whitespace-nowrap">{{ p.cobertura }}</td>
                <td class="px-3 py-3 text-gray-500 whitespace-nowrap">{{ p.acomodacao }}</td>
                <td class="px-3 py-3 text-right text-gray-800">{{ p.faixa_00_18  | currency:'BRL':'symbol':'1.2-2' }}</td>
                <td class="px-3 py-3 text-right text-gray-800">{{ p.faixa_19_23  | currency:'BRL':'symbol':'1.2-2' }}</td>
                <td class="px-3 py-3 text-right text-gray-800">{{ p.faixa_24_28  | currency:'BRL':'symbol':'1.2-2' }}</td>
                <td class="px-3 py-3 text-right text-gray-800">{{ p.faixa_29_33  | currency:'BRL':'symbol':'1.2-2' }}</td>
                <td class="px-3 py-3 text-right text-gray-800">{{ p.faixa_34_38  | currency:'BRL':'symbol':'1.2-2' }}</td>
                <td class="px-3 py-3 text-right text-gray-800">{{ p.faixa_39_43  | currency:'BRL':'symbol':'1.2-2' }}</td>
                <td class="px-3 py-3 text-right text-gray-800">{{ p.faixa_44_48  | currency:'BRL':'symbol':'1.2-2' }}</td>
                <td class="px-3 py-3 text-right text-gray-800">{{ p.faixa_49_53  | currency:'BRL':'symbol':'1.2-2' }}</td>
                <td class="px-3 py-3 text-right text-gray-800">{{ p.faixa_54_58  | currency:'BRL':'symbol':'1.2-2' }}</td>
                <td class="px-3 py-3 text-right font-semibold text-orange-700">{{ p.faixa_59_mais | currency:'BRL':'symbol':'1.2-2' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Vazio -->
      <div *ngIf="!carregando && gruposFiltrados.length === 0 && !erro"
           class="text-center py-16 text-gray-400">
        <p class="text-sm">Nenhum plano encontrado com os filtros selecionados.</p>
      </div>

    </div>
  `,
})
export class TabelaPlanosComponent implements OnInit {
  carregando = true;
  erro: string | null = null;
  grupos: GrupoOperadora[] = [];

  filtroOperadora  = '';
  filtroAcomodacao = '';

  constructor(private supa: SupabaseService) {}

  ngOnInit(): void {
    this.supa.listarPlanos().subscribe({
      next: planos => {
        const mapa = new Map<string, PlanoRow[]>();
        for (const p of (planos ?? [])) {
          const op = p['operadoras']?.nome ?? 'Outros';
          if (!mapa.has(op)) mapa.set(op, []);
          mapa.get(op)!.push({
            id:               p.id,
            nome_plano:       p.nome_plano,
            codigo_plano:     p.codigo_plano,
            cobertura:        p.cobertura,
            acomodacao:       p.acomodacao,
            tipo_contratacao: p.tipo_contratacao,
            operadora:        op,
            faixa_00_18:   Number(p.faixa_00_18  ?? 0),
            faixa_19_23:   Number(p.faixa_19_23  ?? 0),
            faixa_24_28:   Number(p.faixa_24_28  ?? 0),
            faixa_29_33:   Number(p.faixa_29_33  ?? 0),
            faixa_34_38:   Number(p.faixa_34_38  ?? 0),
            faixa_39_43:   Number(p.faixa_39_43  ?? 0),
            faixa_44_48:   Number(p.faixa_44_48  ?? 0),
            faixa_49_53:   Number(p.faixa_49_53  ?? 0),
            faixa_54_58:   Number(p.faixa_54_58  ?? 0),
            faixa_59_mais: Number(p.faixa_59_mais ?? 0),
          });
        }
        this.grupos = [...mapa.entries()]
          .map(([nome, planos]) => ({ nome, planos }))
          .sort((a, b) => a.nome.localeCompare(b.nome));
        this.carregando = false;
      },
      error: err => {
        this.erro = err.message;
        this.carregando = false;
      },
    });
  }

  get gruposFiltrados(): GrupoOperadora[] {
    return this.grupos
      .filter(g => !this.filtroOperadora || g.nome === this.filtroOperadora)
      .map(g => ({
        ...g,
        planos: g.planos.filter(p =>
          !this.filtroAcomodacao || p.acomodacao === this.filtroAcomodacao
        ),
      }))
      .filter(g => g.planos.length > 0);
  }

  get totalPlanos(): number {
    return this.grupos.reduce((s, g) => s + g.planos.length, 0);
  }
}
