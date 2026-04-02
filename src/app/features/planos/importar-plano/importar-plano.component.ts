import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { SupabaseService } from '../../../core/services/supabase.service';

interface Operadora { id: string; nome: string; }

const FAIXAS = [
  { campo: 'faixa_00_18',   label: '0–18' },
  { campo: 'faixa_19_23',   label: '19–23' },
  { campo: 'faixa_24_28',   label: '24–28' },
  { campo: 'faixa_29_33',   label: '29–33' },
  { campo: 'faixa_34_38',   label: '34–38' },
  { campo: 'faixa_39_43',   label: '39–43' },
  { campo: 'faixa_44_48',   label: '44–48' },
  { campo: 'faixa_49_53',   label: '49–53' },
  { campo: 'faixa_54_58',   label: '54–58' },
  { campo: 'faixa_59_mais', label: '59+' },
] as const;

// Mapeamento flexível de cabeçalhos de planilha → campo interno
const HEADER_MAP: Record<string, string> = {
  '0-18': 'faixa_00_18', '0 a 18': 'faixa_00_18', '00-18': 'faixa_00_18', '0_18': 'faixa_00_18',
  '19-23': 'faixa_19_23', '19 a 23': 'faixa_19_23',
  '24-28': 'faixa_24_28', '24 a 28': 'faixa_24_28',
  '29-33': 'faixa_29_33', '29 a 33': 'faixa_29_33',
  '34-38': 'faixa_34_38', '34 a 38': 'faixa_34_38',
  '39-43': 'faixa_39_43', '39 a 43': 'faixa_39_43',
  '44-48': 'faixa_44_48', '44 a 48': 'faixa_44_48',
  '49-53': 'faixa_49_53', '49 a 53': 'faixa_49_53',
  '54-58': 'faixa_54_58', '54 a 58': 'faixa_54_58',
  '59+': 'faixa_59_mais', '59 em diante': 'faixa_59_mais', '59 ou mais': 'faixa_59_mais', 'acima de 58': 'faixa_59_mais',
};

interface PlanoImport {
  nome_plano:       string;
  codigo_plano:     string;
  cobertura:        string;
  acomodacao:       string;
  tipo_contratacao: string;
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
  selecionado:   boolean;
}

@Component({
  selector: 'app-importar-plano',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-4xl mx-auto px-4 py-8">

      <!-- Header -->
      <div class="mb-6">
        <a routerLink="/planos" class="text-sm text-blue-600 hover:underline mb-2 inline-block">← Voltar para Convênios</a>
        <h1 class="text-2xl font-bold text-gray-900">Importar Tabela de Preços</h1>
        <p class="text-gray-500 mt-1 text-sm">
          Importe Excel/CSV baixado do portal da operadora ou cadastre manualmente.
        </p>
      </div>

      <!-- Erro / Sucesso -->
      <div *ngIf="erro" class="bg-red-50 text-red-700 rounded-lg p-4 text-sm mb-4">{{ erro }}</div>
      <div *ngIf="sucesso" class="bg-green-50 text-green-700 rounded-lg p-4 text-sm mb-4">
        {{ sucesso }}
        <a routerLink="/planos" class="underline ml-2">Ver tabela de convênios</a>
      </div>

      <!-- Abas -->
      <div class="flex border-b border-gray-200 mb-6">
        <button (click)="aba='upload'"
                [class.border-b-2]="aba==='upload'"
                [class.border-blue-600]="aba==='upload'"
                [class.text-blue-600]="aba==='upload'"
                class="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
          Upload Excel / CSV
        </button>
        <button (click)="aba='manual'"
                [class.border-b-2]="aba==='manual'"
                [class.border-blue-600]="aba==='manual'"
                [class.text-blue-600]="aba==='manual'"
                class="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
          Cadastro Manual
        </button>
      </div>

      <!-- ============ ABA UPLOAD ============ -->
      <div *ngIf="aba==='upload'" class="space-y-6">

        <!-- Operadora -->
        <div class="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 class="font-semibold text-gray-800 text-sm uppercase tracking-wide">Operadora</h2>
          <div class="flex gap-3 flex-wrap">
            <div class="flex-1 min-w-[200px]">
              <label class="block text-xs text-gray-500 mb-1">Selecionar existente</label>
              <select [(ngModel)]="uploadOperadoraId" name="uploadOp"
                      (ngModelChange)="uploadNovaOperadora=''"
                      class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="">— Nova operadora —</option>
                <option *ngFor="let op of operadoras" [value]="op.id">{{ op.nome }}</option>
              </select>
            </div>
            <div *ngIf="!uploadOperadoraId" class="flex-1 min-w-[200px]">
              <label class="block text-xs text-gray-500 mb-1">Nome da nova operadora</label>
              <input [(ngModel)]="uploadNovaOperadora" name="uploadNovaOp" type="text"
                     placeholder="Ex: Bradesco Saúde"
                     class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>
        </div>

        <!-- Zona de upload -->
        <div class="bg-white rounded-xl border-2 border-dashed border-gray-300 p-8 text-center"
             [class.border-blue-400]="arrastando"
             (dragover)="$event.preventDefault(); arrastando=true"
             (dragleave)="arrastando=false"
             (drop)="onDrop($event)">
          <div class="text-4xl mb-3">📄</div>
          <p class="text-gray-600 font-medium mb-1">Arraste o arquivo aqui ou</p>
          <label class="cursor-pointer text-blue-600 hover:underline text-sm font-medium">
            clique para selecionar
            <input type="file" class="hidden" accept=".xlsx,.xls,.csv"
                   (change)="onFileSelect($event)" />
          </label>
          <p class="text-xs text-gray-400 mt-2">Excel (.xlsx, .xls) ou CSV</p>
        </div>

        <!-- Dica de formato -->
        <div class="bg-blue-50 rounded-lg p-4 text-xs text-blue-700">
          <p class="font-semibold mb-1">Formato esperado da planilha:</p>
          <p>A planilha deve ter colunas para <strong>nome do plano</strong> e os <strong>10 valores por faixa etária</strong>.</p>
          <p class="mt-1">Cabeçalhos aceitos para faixas: <code>0-18</code>, <code>19-23</code>, <code>24-28</code> ... <code>59+</code> (com hífen, "a" ou espaço)</p>
          <p class="mt-1">Colunas opcionais: <code>cobertura</code>, <code>acomodacao</code>, <code>tipo_contratacao</code>, <code>codigo_plano</code></p>
        </div>

        <!-- Preview da planilha parseada -->
        <div *ngIf="planosParaImportar.length > 0" class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div class="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <h2 class="font-semibold text-gray-800 text-sm">
              {{ planosParaImportar.length }} plano(s) encontrados
            </h2>
            <div class="flex gap-2">
              <button (click)="toggleTodos()" class="text-xs text-blue-600 hover:underline">
                {{ todosSelecionados ? 'Desmarcar todos' : 'Selecionar todos' }}
              </button>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-xs min-w-[700px]">
              <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th class="w-8 px-3 py-2"></th>
                  <th class="text-left px-3 py-2 text-gray-600">Plano</th>
                  <th class="text-left px-3 py-2 text-gray-600">Cobertura</th>
                  <th class="text-left px-3 py-2 text-gray-600">Acomod.</th>
                  <th *ngFor="let f of faixas" class="text-right px-2 py-2 text-blue-700">{{ f.label }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                <tr *ngFor="let p of planosParaImportar"
                    [class.bg-blue-50]="p.selecionado"
                    class="hover:bg-gray-50">
                  <td class="px-3 py-2">
                    <input type="checkbox" [(ngModel)]="p.selecionado"
                           class="rounded border-gray-300 text-blue-600" />
                  </td>
                  <td class="px-3 py-2 font-medium text-gray-800">{{ p.nome_plano }}</td>
                  <td class="px-3 py-2 text-gray-500">{{ p.cobertura }}</td>
                  <td class="px-3 py-2 text-gray-500">{{ p.acomodacao }}</td>
                  <td *ngFor="let f of faixas" class="px-2 py-2 text-right text-gray-700">
                    {{ p[f.campo] | currency:'BRL':'symbol':'1.2-2' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="px-5 py-3 border-t border-gray-100 flex justify-end gap-3">
            <button (click)="planosParaImportar=[]"
                    class="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button (click)="importarSelecionados()"
                    [disabled]="salvando || selecionados.length === 0"
                    class="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              <span *ngIf="salvando" class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              {{ salvando ? 'Importando...' : 'Importar ' + selecionados.length + ' plano(s)' }}
            </button>
          </div>
        </div>

      </div>

      <!-- ============ ABA MANUAL ============ -->
      <div *ngIf="aba==='manual'">
        <form (ngSubmit)="salvarManual()" class="space-y-6">

          <!-- Operadora -->
          <div class="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 class="font-semibold text-gray-800 text-sm uppercase tracking-wide">Operadora</h2>
            <div class="flex gap-3 flex-wrap">
              <div class="flex-1 min-w-[200px]">
                <label class="block text-xs text-gray-500 mb-1">Selecionar existente</label>
                <select [(ngModel)]="operadoraId" name="operadoraId"
                        (ngModelChange)="novaOperadora=''"
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
                  <option value="Coletivo por Adesão">Coletivo por Adesão</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Vigência (início)</label>
                <input [(ngModel)]="plano.vigencia_inicio" name="vigencia_inicio" type="date"
                       class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
            </div>
          </div>

          <!-- Faixas -->
          <div class="bg-white rounded-xl border border-gray-200 p-5">
            <h2 class="font-semibold text-gray-800 text-sm uppercase tracking-wide mb-1">Preços por Faixa Etária (R$)</h2>
            <p class="text-xs text-gray-400 mb-4">Valores mensais por beneficiário. Use ponto ou vírgula como separador decimal.</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              <div *ngFor="let f of faixas">
                <label class="block text-xs font-medium text-gray-600 mb-1">{{ f.label }}</label>
                <input [(ngModel)]="faixaValores[f.campo]"
                       [name]="f.campo" type="text" inputmode="decimal" placeholder="0,00"
                       (blur)="normalizarValor(f.campo)"
                       class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3">
            <a routerLink="/planos"
               class="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
              Cancelar
            </a>
            <button type="submit"
                    [disabled]="salvando || !podeSalvarManual"
                    class="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              <span *ngIf="salvando" class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              {{ salvando ? 'Salvando...' : 'Salvar Plano' }}
            </button>
          </div>

        </form>
      </div>

    </div>
  `,
})
export class ImportarPlanoComponent implements OnInit {
  aba: 'upload' | 'manual' = 'upload';

  operadoras: Operadora[] = [];
  salvando  = false;
  erro: string | null = null;
  sucesso: string | null = null;
  arrastando = false;

  // Upload
  uploadOperadoraId    = '';
  uploadNovaOperadora  = '';
  planosParaImportar: PlanoImport[] = [];

  // Manual
  operadoraId   = '';
  novaOperadora = '';
  plano = { nome_plano: '', codigo_plano: '', cobertura: 'Nacional', acomodacao: 'Apartamento', tipo_contratacao: 'PME', vigencia_inicio: '' };
  faixaValores: Record<string, string> = Object.fromEntries(FAIXAS.map(f => [f.campo, '']));

  readonly faixas = FAIXAS;

  constructor(private supa: SupabaseService, private router: Router) {}

  ngOnInit(): void {
    this.supa.listarOperadoras().subscribe({
      next: ops => this.operadoras = ops,
      error: err => this.erro = err.message,
    });
  }

  // ── Upload ──────────────────────────────────────────────────────

  onFileSelect(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.processarArquivo(file);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.arrastando = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.processarArquivo(file);
  }

  private processarArquivo(file: File): void {
    this.erro = null;
    this.planosParaImportar = [];
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: result => this.parsearLinhas(result.data as Record<string, string>[]),
        error: (err: any) => this.erro = `Erro ao ler CSV: ${err.message}`,
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = e => {
        const wb = XLSX.read(e.target!.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
        this.parsearLinhas(rows);
      };
      reader.readAsArrayBuffer(file);
    } else {
      this.erro = 'Formato não suportado. Use .xlsx, .xls ou .csv';
    }
  }

  private parsearLinhas(rows: Record<string, any>[]): void {
    if (!rows.length) { this.erro = 'Arquivo vazio ou sem dados.'; return; }

    const planos: PlanoImport[] = [];
    for (const row of rows) {
      // Descobrir coluna de nome do plano
      const nomePlano = row['nome_plano'] ?? row['plano'] ?? row['nome'] ?? row['Plano'] ?? row['Nome do Plano'] ?? '';
      if (!nomePlano) continue;

      const p: PlanoImport = {
        nome_plano:       String(nomePlano).trim(),
        codigo_plano:     String(row['codigo_plano'] ?? row['codigo'] ?? row['Código ANS'] ?? '').trim(),
        cobertura:        String(row['cobertura'] ?? row['Cobertura'] ?? 'Nacional').trim(),
        acomodacao:       String(row['acomodacao'] ?? row['Acomodação'] ?? row['acomodacao'] ?? 'Apartamento').trim(),
        tipo_contratacao: String(row['tipo_contratacao'] ?? row['Tipo'] ?? 'PME').trim(),
        faixa_00_18: 0, faixa_19_23: 0, faixa_24_28: 0, faixa_29_33: 0, faixa_34_38: 0,
        faixa_39_43: 0, faixa_44_48: 0, faixa_49_53: 0, faixa_54_58: 0, faixa_59_mais: 0,
        selecionado: true,
      };

      // Mapear colunas de faixa pelo cabeçalho
      for (const [coluna, valor] of Object.entries(row)) {
        const chave = coluna.trim().toLowerCase();
        const campo = HEADER_MAP[chave] ?? HEADER_MAP[coluna.trim()] ?? null;
        if (campo) {
          (p as any)[campo] = parseFloat(String(valor).replace(',', '.')) || 0;
        }
      }

      planos.push(p);
    }

    if (!planos.length) {
      this.erro = 'Nenhum plano encontrado. Verifique se o arquivo tem coluna "nome_plano" ou "plano".';
      return;
    }
    this.planosParaImportar = planos;
  }

  get selecionados(): PlanoImport[] {
    return this.planosParaImportar.filter(p => p.selecionado);
  }

  get todosSelecionados(): boolean {
    return this.planosParaImportar.every(p => p.selecionado);
  }

  toggleTodos(): void {
    const val = !this.todosSelecionados;
    this.planosParaImportar.forEach(p => p.selecionado = val);
  }

  async importarSelecionados(): Promise<void> {
    if (!this.selecionados.length) return;
    this.salvando = true;
    this.erro = null;

    try {
      let opId = this.uploadOperadoraId;
      if (!opId && this.uploadNovaOperadora.trim()) {
        opId = await this.supa.criarOperadora(this.uploadNovaOperadora.trim());
        this.operadoras = [...this.operadoras, { id: opId, nome: this.uploadNovaOperadora.trim() }];
        this.uploadOperadoraId = opId;
      }
      if (!opId) { this.erro = 'Selecione ou informe a operadora antes de importar.'; this.salvando = false; return; }

      for (const p of this.selecionados) {
        const { selecionado, ...dados } = p;
        await this.supa.upsertPlano({ ...dados, operadora_id: opId });
      }

      this.sucesso = `${this.selecionados.length} plano(s) importados com sucesso!`;
      this.planosParaImportar = [];
    } catch (e: any) {
      this.erro = e.message ?? 'Erro ao importar planos.';
    } finally {
      this.salvando = false;
    }
  }

  // ── Manual ──────────────────────────────────────────────────────

  normalizarValor(campo: string): void {
    const v = this.faixaValores[campo].replace(',', '.').trim();
    const n = parseFloat(v);
    this.faixaValores[campo] = isNaN(n) ? '' : n.toFixed(2);
  }

  get podeSalvarManual(): boolean {
    return !!((this.operadoraId || this.novaOperadora.trim()) && this.plano.nome_plano.trim());
  }

  async salvarManual(): Promise<void> {
    if (!this.podeSalvarManual) return;
    this.salvando = true;
    this.erro = null;
    this.sucesso = null;

    try {
      let opId = this.operadoraId;
      if (!opId && this.novaOperadora.trim()) {
        opId = await this.supa.criarOperadora(this.novaOperadora.trim());
        this.operadoras = [...this.operadoras, { id: opId, nome: this.novaOperadora.trim() }];
        this.operadoraId = opId;
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

      this.sucesso = 'Plano salvo com sucesso!';
      this.plano = { nome_plano: '', codigo_plano: '', cobertura: 'Nacional', acomodacao: 'Apartamento', tipo_contratacao: 'PME', vigencia_inicio: '' };
      this.faixaValores = Object.fromEntries(FAIXAS.map(f => [f.campo, '']));
    } catch (e: any) {
      this.erro = e.message ?? 'Erro ao salvar plano.';
    } finally {
      this.salvando = false;
    }
  }
}
