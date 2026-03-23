import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div class="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">

        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold text-blue-600">ExoSoft <span class="font-light text-gray-600">Saúde</span></h1>
          <p class="text-gray-500 text-sm mt-1">Crie sua conta de corretor</p>
        </div>

        <div *ngIf="sucesso" class="bg-green-50 text-green-700 rounded-lg p-4 text-sm text-center mb-4">
          ✅ Conta criada! Verifique seu e-mail para confirmar o cadastro.
        </div>

        <form *ngIf="!sucesso" (ngSubmit)="cadastrar()" class="space-y-4">

          <div>
            <label class="text-xs text-gray-500 font-medium">Nome Completo</label>
            <input [(ngModel)]="nome" name="nome" required
                   class="w-full mt-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                   placeholder="João da Silva" />
          </div>

          <div>
            <label class="text-xs text-gray-500 font-medium">E-mail</label>
            <input [(ngModel)]="email" name="email" type="email" required
                   class="w-full mt-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                   placeholder="seu@email.com" />
          </div>

          <div>
            <label class="text-xs text-gray-500 font-medium">Senha</label>
            <input [(ngModel)]="senha" name="senha" type="password" required minlength="6"
                   class="w-full mt-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                   placeholder="Mínimo 6 caracteres" />
          </div>

          <p *ngIf="erro" class="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{{ erro }}</p>

          <button type="submit" [disabled]="carregando"
                  class="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {{ carregando ? 'Criando conta...' : 'Criar Conta' }}
          </button>
        </form>

        <p class="text-center text-sm text-gray-500 mt-6">
          Já tem conta? <a routerLink="/auth/login" class="text-blue-600 hover:underline">Entrar</a>
        </p>

      </div>
    </div>
  `,
})
export class RegisterComponent {
  nome      = '';
  email     = '';
  senha     = '';
  carregando = false;
  sucesso    = false;
  erro: string | null = null;

  constructor(private supa: SupabaseService, private router: Router) {}

  cadastrar(): void {
    this.carregando = true;
    this.erro = null;

    this.supa.signUp(this.email, this.senha, this.nome).subscribe({
      next: ({ error }) => {
        this.carregando = false;
        if (error) {
          this.erro = error.message;
        } else {
          this.sucesso = true;
        }
      },
      error: err => {
        this.carregando = false;
        this.erro = err.message;
      },
    });
  }
}
