import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pix',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-7xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-gray-900">Área Pix</h1>
      <p class="text-gray-500 mt-1">Dados para pagamento via Pix</p>

      <div class="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p class="text-sm text-gray-500">Banco</p>
            <p class="font-semibold text-gray-800">{{ bankInfo.bankName }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Agência</p>
            <p class="font-semibold text-gray-800">{{ bankInfo.agency }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Conta</p>
            <p class="font-semibold text-gray-800">{{ bankInfo.account }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Nome do Titular</p>
            <p class="font-semibold text-gray-800">{{ bankInfo.accountHolder }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">CNPJ</p>
            <p class="font-semibold text-gray-800">{{ bankInfo.cnpj }}</p>
          </div>
        </div>

        <div class="mt-8 p-4 bg-yellow-50 text-yellow-700 rounded-lg">
          <p><strong>Atenção:</strong> As informações acima são apenas um exemplo. Por favor, edite o componente para incluir os dados bancários corretos.</p>
        </div>
      </div>
    </div>
  `
})
export class PixComponent {
  bankInfo = {
    bankName: 'Exemplo Bank',
    agency: '0001',
    account: '12345-6',
    accountHolder: 'Nome do Titular Exemplo',
    cnpj: '00.000.000/0001-00'
  };
}
