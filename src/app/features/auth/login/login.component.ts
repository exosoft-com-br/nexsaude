import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div class="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">

        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold text-blue-600">ExoSoft <span class="font-light text-gray-600">Saúde</span></h1>
          <p class="text-gray-500 text-sm mt-1">Plataforma de Leads para Corretores</p>
        </div>

        <form (ngSubmit)="entrar()" class="space-y-4">
          <div>
            <label class="text-xs text-gray-500 font-medium">E-mail</label>
            <input
              [(ngModel)]="email" name="email" type="email" required
              class="w-full mt-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label class="text-xs text-gray-500 font-medium">Senha</label>
            <input
              [(ngModel)]="senha" name="senha" type="password" required
              class="w-full mt-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          <p *ngIf="erro" class="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{{ erro }}</p>

          <button
            type="submit"
            [disabled]="carregando"
            class="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {{ carregando ? 'Entrando...' : 'Entrar' }}
          </button>
        </form>

        <p class="text-center text-sm text-gray-500 mt-6">
          Não tem conta?
          <a routerLink="/auth/register" class="text-blue-600 hover:underline">Cadastre-se</a>
        </p>

      </div>
    </div>
  `,
})
export class LoginComponent {
  email     = '';
  senha     = '';
  carregando = false;
  erro: string | null = null;

  constructor(private supa: SupabaseService, private router: Router) {}

  entrar(): void {
    this.carregando = true;
    this.erro       = null;

    this.supa.signIn(this.email, this.senha).subscribe({
      next: ({ error }) => {
        this.carregando = false;
        if (error) {
          this.erro = error.message === 'Invalid login credentials'
            ? 'E-mail ou senha incorretos.'
            : error.message;
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: err => {
        this.carregando = false;
        this.erro = err.message;
      },
    });
  }
}
