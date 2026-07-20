import { Injectable, inject, effect } from '@angular/core';
import { ClerkService as NgxClerkService } from 'ngx-clerk';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ClerkService {
  private readonly ngxClerk = inject(NgxClerkService);
  
  readonly isLoaded$ = new BehaviorSubject<boolean>(false);
  readonly isSignedIn$ = new BehaviorSubject<boolean>(false);
  readonly user$ = new BehaviorSubject<any>(null);
  readonly session$ = new BehaviorSubject<any>(null);

  constructor() {
    // Sincronizar las señales reactivas de ngx-clerk con los BehaviorSubjects tradicionales para mantener compatibilidad
    effect(() => {
      this.isLoaded$.next(this.ngxClerk.isLoaded());
    });

    effect(() => {
      this.isSignedIn$.next(this.ngxClerk.isSignedIn());
    });

    effect(() => {
      this.user$.next(this.ngxClerk.user());
    });

    effect(() => {
      this.session$.next(this.ngxClerk.session());
    });
  }

  getClerkInstance(): any {
    return this.ngxClerk.clerk();
  }

  async signOut(): Promise<void> {
    await this.ngxClerk.signOut();
  }

  async getToken(): Promise<string | null> {
    return await this.ngxClerk.getToken();
  }
}
