import { InjectionToken, Injectable, OnDestroy, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CloudFlareTurnstileService } from './cloudflare-turnstile.service';
import { CaptchaProvider } from './enums/captcha-provider';
import { GoogleRecaptchaService } from './google-recaptcha.service';
import type { ICaptchaError } from './interfaces/captcha-error';
import { ScriptLoaderService } from './script-loader.service';

/**
 * For `CaptchaProvider.Google` this is the reCAPTCHA **action**
 * (`login`, `register`, ...). For `CaptchaProvider.CloudFlare` it is the **id
 * prefix** of the element(s) the widget is rendered into.
 */
export const STRING_INITIALIZER = new InjectionToken<string>('STRING_INITIALIZER');

export const CAPTCHA_PROVIDER = new InjectionToken<CaptchaProvider>('CAPTCHA_PROVIDER');

export const CAPTCHA_SITE_KEY = new InjectionToken<string>('CAPTCHA_SITE_KEY');

@Injectable()
export class NgxEasyCaptchaService implements OnDestroy {
  private readonly scriptLoader = inject(ScriptLoaderService);
  private readonly provider = inject(CAPTCHA_PROVIDER);
  private readonly initializerString = inject(STRING_INITIALIZER);
  private readonly siteKey = inject(CAPTCHA_SITE_KEY);

  private readonly delegate: GoogleRecaptchaService | CloudFlareTurnstileService;

  constructor() {
    if (!this.siteKey) {
      throw new Error(
        'ngx-easy-captcha: no site key provided. Add ' +
          "{ provide: CAPTCHA_SITE_KEY, useValue: '<your site key>' } to your providers.",
      );
    }

    switch (this.provider) {
      case CaptchaProvider.Google:
        if (!this.initializerString) {
          throw new Error(
            'ngx-easy-captcha: a reCAPTCHA action is required. Add ' +
              '{ provide: STRING_INITIALIZER, useValue: "login" } to your providers.',
          );
        }
        this.delegate = new GoogleRecaptchaService(
          this.initializerString,
          this.scriptLoader,
          this.siteKey,
        );
        break;

      case CaptchaProvider.CloudFlare:
        if (!this.initializerString) {
          throw new Error(
            'ngx-easy-captcha: the DOM id used to render the Turnstile widget is required. ' +
              'Provide the id without the leading "#", e.g. ' +
              '{ provide: STRING_INITIALIZER, useValue: "turnstile-captcha" }.',
          );
        }
        this.delegate = new CloudFlareTurnstileService(
          this.initializerString,
          this.scriptLoader,
          this.siteKey,
        );
        break;

      default:
        throw new Error(
          `ngx-easy-captcha: unknown captcha provider "${this.provider}". ` +
            'Use CaptchaProvider.Google or CaptchaProvider.CloudFlare.',
        );
    }
  }

  /** Emits a captcha token each time one is issued. Never errors. */
  get $(): Observable<string> {
    return this.delegate.$;
  }

  /**
   * Non-fatal provider problems (script blocked, challenge failed, token
   * expired). Kept separate from `$` so a transient failure cannot terminate
   * the token stream.
   */
  get errors$(): Observable<ICaptchaError> {
    return this.delegate.errors$;
  }

  /** Requests a new token (reCAPTCHA) or resets the widget (Turnstile). */
  refresh(): void {
    this.delegate.refresh();
  }

  /**
   * Tears down the injected script and any rendered widget. Called by Angular
   * when the injector that provided this service is destroyed, so cleanup no
   * longer depends on a consumer remembering to unsubscribe.
   */
  ngOnDestroy(): void {
    this.delegate.destroy();
  }
}

/**
 * Convenience provider factory.
 *
 * ```ts
 * providers: [provideNgxEasyCaptcha({
 *   provider: CaptchaProvider.CloudFlare,
 *   siteKey: '0x4AAA...',
 *   initializer: 'turnstile-captcha',
 * })]
 * ```
 */
export function provideNgxEasyCaptcha(config: {
  provider: CaptchaProvider;
  siteKey: string;
  initializer: string;
}) {
  return [
    NgxEasyCaptchaService,
    { provide: CAPTCHA_PROVIDER, useValue: config.provider },
    { provide: CAPTCHA_SITE_KEY, useValue: config.siteKey },
    { provide: STRING_INITIALIZER, useValue: config.initializer },
  ];
}
