import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Directive, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxEasyCaptchaService } from '@angx/ngx-easy-captcha';

/**
 * Shared behaviour for the two example pages, which differ only in which
 * captcha provider they configure.
 */
@Directive()
export abstract class CaptchaExampleBase {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly captcha = inject(NgxEasyCaptchaService);

  readonly registering = signal(false);
  readonly token = signal('');
  readonly error = signal('');

  constructor() {
    // Read the fragment, but never navigate from inside this subscription:
    // the original did, which fed the router's own emission back into itself.
    this.route.fragment.pipe(takeUntilDestroyed()).subscribe((fragment) => {
      this.registering.set(fragment === 'register');
    });

    this.captcha.$.pipe(takeUntilDestroyed()).subscribe((token) => {
      this.token.set(token);
      this.error.set('');
    });

    // Errors arrive on their own channel, so a failed or expired challenge
    // never terminates the token stream.
    this.captcha.errors$.pipe(takeUntilDestroyed()).subscribe((error) => {
      this.error.set(`${error.message} (${error.code})`);
    });
  }

  showSignIn(): void {
    void this.router.navigate([], { fragment: 'login' });
  }

  showSignUp(): void {
    void this.router.navigate([], { fragment: 'register' });
  }

  onSubmit(): void {
    if (!this.token()) {
      return;
    }
    // Send `this.token()` to your backend for verification here.
  }
}
