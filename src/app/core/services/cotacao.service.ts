import { Injectable } from '@angular/core';
import { Observable, from, combineLatest } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SupabaseService } from './supabase.service';
import type { ResultadoComparativo, CotacaoRealizada } from '../models/cotacao.model';

@Injectable({ providedIn: 'root' })
export class CotacaoService {

  constructor(private supa: SupabaseService) {}

  // ----------------------------------------------------------------
  // Calcular comparativo chamando a function PL/pgSQL
  // ----------------------------------------------------------------
  calcularComparativo(
    planoIds: string[],
    idades: number[]
  ): Observable<ResultadoComparativo[]> {
    return this.supa.compararPlanos(planoIds, idades);
  }

  // ----------------------------------------------------------------
  // Salvar cotação e retornar com resultados
  // ----------------------------------------------------------------
  salvarComResultados(
    cotacao: Partial<CotacaoRealizada>,
    resultados: ResultadoComparativo[]
  ): Observable<CotacaoRealizada> {
    return this.supa.salvarCotacao({
      ...cotacao,
      resultado_comparativo: resultados,
    });
  }

  // ----------------------------------------------------------------
  // Gerar PDF do comparativo
  // ----------------------------------------------------------------
  gerarPdf(
    cotacao: CotacaoRealizada,
    resultados: ResultadoComparativo[]
  ): void {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    // Cabeçalho
    doc.setFontSize(20);
    doc.setTextColor(30, 120, 200);
    doc.text('ExoSoft Saúde', pageW / 2, 20, { align: 'center' });

    doc.setFontSize(13);
    doc.setTextColor(60, 60, 60);
    doc.text('Comparativo de Planos de Saúde', pageW / 2, 30, { align: 'center' });

    // Dados do contato
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Contato: ${cotacao.nome_contato}`, 14, 45);
    doc.text(`Email: ${cotacao.email_contato ?? '-'}`, 14, 52);
    doc.text(`Telefone: ${cotacao.telefone_contato ?? '-'}`, 14, 59);
    doc.text(
      `Beneficiários: ${cotacao.idades_beneficiarios.length} pessoas (idades: ${cotacao.idades_beneficiarios.join(', ')})`,
      14, 66
    );
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 73);

    // Tabela comparativa
    autoTable(doc, {
      startY: 82,
      head: [['#', 'Operadora', 'Plano', 'Valor Total', 'Per Capita']],
      body: resultados.map(r => [
        r.ranking,
        r.operadora,
        r.nome_plano,
        `R$ ${r.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${r.valor_per_capita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      ]),
      headStyles: { fillColor: [30, 120, 200] },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      styles: { fontSize: 9 },
    });

    // Detalhamento por pessoa (primeiro plano como referência)
    if (resultados[0]?.detalhamento) {
      const detalhe = resultados[0].detalhamento;
      const startY  = (doc as any).lastAutoTable.finalY + 12;

      doc.setFontSize(11);
      doc.setTextColor(30, 120, 200);
      doc.text('Detalhamento por Beneficiário (Plano Mais Econômico)', 14, startY);

      autoTable(doc, {
        startY: startY + 6,
        head: [['Idade', 'Faixa ANS', 'Valor Mensal']],
        body: detalhe.map(d => [
          `${d.idade} anos`,
          d.faixa.replace(/_/g, ' '),
          `R$ ${d.valor_mensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        ]),
        styles: { fontSize: 9 },
      });
    }

    // Rodapé
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        'ExoSoft Saúde — exosoft.com.br  |  Cotação gerada automaticamente',
        pageW / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    }

    doc.save(`cotacao_${cotacao.nome_contato.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  }

  // ----------------------------------------------------------------
  // Compartilhar via WhatsApp
  // ----------------------------------------------------------------
  compartilharWhatsApp(
    telefone: string,
    cotacao: CotacaoRealizada,
    resultados: ResultadoComparativo[]
  ): void {
    const melhor = resultados[0];
    const total  = melhor?.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    const mensagem = encodeURIComponent(
      `Olá ${cotacao.nome_contato}! 👋\n\n` +
      `Segue o comparativo de planos de saúde para ${cotacao.idades_beneficiarios.length} beneficiário(s):\n\n` +
      resultados.slice(0, 3).map(r =>
        `✅ *${r.operadora}* — ${r.nome_plano}\n   Valor: R$ ${r.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês`
      ).join('\n\n') +
      `\n\n📋 Para mais detalhes, entre em contato!\n_ExoSoft Saúde — exosoft.com.br_`
    );

    const numero = telefone.replace(/\D/g, '');
    window.open(`https://wa.me/55${numero}?text=${mensagem}`, '_blank');
  }
}
