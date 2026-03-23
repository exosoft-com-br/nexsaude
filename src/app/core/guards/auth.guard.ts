import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { SupabaseService } from '../services/supabase.service';

export const authGuard: CanActivateFn = () => {
  const supa   = inject(SupabaseService);
  const router = inject(Router);

  return supa.session$.pipe(
    take(1),
    map(session => {
      if (session) return true;
      return router.createUrlTree(['/auth/login']);
    })
  );
};
