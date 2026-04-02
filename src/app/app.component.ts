import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AsyncPipe, NgIf } from '@angular/common';
import { SupabaseService } from './core/services/supabase.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe, NgIf],
  template: `
    <div class="min-h-screen bg-gray-50">

      <!-- Navbar (só exibe se autenticado) -->
      <nav *ngIf="supa.session$ | async" class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16 items-center">

            <!-- Logo -->
            <a routerLink="/dashboard" class="flex items-center gap-2">
              <span class="text-xl font-bold text-blue-600">Next</span>
              <span class="text-xl font-light text-gray-600">Saúde</span>
            </a>

            <!-- Nav links -->
            <div class="hidden md:flex gap-6">
              <a routerLink="/dashboard"
                 routerLinkActive="text-blue-600 font-semibold"
                 class="text-gray-600 hover:text-blue-600 transition-colors text-sm">
                Dashboard
              </a>
              <a routerLink="/leads"
                 routerLinkActive="text-blue-600 font-semibold"
                 class="text-gray-600 hover:text-blue-600 transition-colors text-sm">
                Leads
              </a>
              <a routerLink="/leads/busca"
                 routerLinkActive="text-blue-600 font-semibold"
                 class="text-gray-600 hover:text-blue-600 transition-colors text-sm">
                Buscar Empresas
              </a>
              <a routerLink="/planos"
                 routerLinkActive="text-blue-600 font-semibold"
                 class="text-gray-600 hover:text-blue-600 transition-colors text-sm">
                Convênios
              </a>
              <a routerLink="/cotacao/simulador"
                 routerLinkActive="text-blue-600 font-semibold"
                 class="text-gray-600 hover:text-blue-600 transition-colors text-sm">
                Simulador
              </a>
            </div>

            <!-- User menu -->
            <div class="flex items-center gap-3">
              <span class="text-sm text-gray-500">
                {{ (supa.user$ | async)?.email }}
              </span>
              <button
                (click)="signOut()"
                class="text-sm bg-red-50 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-100 transition-colors">
                Sair
              </button>
            </div>

          </div>
        </div>
      </nav>

      <!-- Router outlet -->
      <main>
        <router-outlet />
      </main>

    </div>
  `,
})
export class AppComponent implements OnInit {
  constructor(
    public supa: SupabaseService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Redirecionar para login se não autenticado e tentando acessar rota protegida
    this.supa.session$.subscribe(session => {
      if (!session && !this.router.url.startsWith('/auth')) {
        this.router.navigate(['/auth/login']);
      }
    });
  }

  signOut(): void {
    this.supa.signOut().subscribe(() => {
      this.router.navigate(['/auth/login']);
    });
  }
}
