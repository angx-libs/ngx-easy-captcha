import { Observable, ReplaySubject, Subject } from 'rxjs';
import { DynamicScripts } from './enums/dynamic-scripts-enum';
import { ElementSelectorType } from './enums/element-selector-type';
import type { ICaptchaError } from './interfaces/captcha-error';
import type { IElementSelector } from './interfaces/scripts';
import type { ScriptLoaderService } from './script-loader.service';

declare const grecaptcha: {
  ready(callback: () => void): void;
  execute(siteKey: string, options: { action: string }): Promise<string>;
};

/**
 * Google reCAPTCHA v3 token source.
 *
 * Not decorated with `@Injectable`: it is constructed by
 * `NgxEasyCaptchaService` once the provider has been resolved.
 */
export class GoogleRecaptchaService {
  /**
   * `ReplaySubject(1)` rather than `BehaviorSubject('')`, so subscribers only
   * ever see a real token. The old seed value made every subscriber fire once
   * with an empty string before the captcha had resolved.
   */
  private readonly token = new ReplaySubject<string>(1);

  /**
   * Errors travel on their own channel. Pushing them through `token.error()`
   * terminated the stream permanently, so one failed challenge left the
   * service unable to ever issue another token.
   */
  private readonly errors = new Subject<ICaptchaError>();

  constructor(
    private readonly action: string,
    private readonly scriptLoader: ScriptLoaderService,
    private readonly siteKey: string,
  ) {
    void this.initialize();
  }

  get $(): Observable<string> {
    return this.token.asObservable();
  }

  get errors$(): Observable<ICaptchaError> {
    return this.errors.asObservable();
  }

  /**
   * Requests a fresh token. reCAPTCHA v3 tokens are single-use and expire
   * after two minutes, so call this immediately before submitting.
   */
  refresh(): void {
    this.execute();
  }

  /**
   * Releases this consumer's claim on the script. The tag and the floating
   * badge are only removed once no other consumer still needs them.
   */
  destroy(): void {
    this.scriptLoader.release(DynamicScripts.GoogleRecaptcha, {
      name: 'grecaptcha-badge',
      type: ElementSelectorType.Class,
    } satisfies IElementSelector);
    this.token.complete();
    this.errors.complete();
  }

  private async initialize(): Promise<void> {
    const [result] = await this.scriptLoader.load(this.siteKey, DynamicScripts.GoogleRecaptcha);
    if (!result?.loaded) {
      this.errors.next({
        code: 'script-load-failed',
        message: `ngx-easy-captcha: reCAPTCHA script ${result?.status ?? 'could not be loaded'}.`,
      });
      return;
    }
    this.execute();
  }

  private execute(): void {
    if (typeof grecaptcha === 'undefined') {
      this.errors.next({
        code: 'recaptcha-unavailable',
        message: 'ngx-easy-captcha: the reCAPTCHA script loaded but window.grecaptcha is missing.',
      });
      return;
    }

    // Unlike Turnstile's `ready`, `grecaptcha.ready` is documented for use
    // after the script has loaded and fires immediately in that case.
    grecaptcha.ready(() => {
      grecaptcha
        .execute(this.siteKey, { action: this.action })
        .then((token) => {
          if (token) {
            this.token.next(token);
          }
        })
        .catch((error: unknown) =>
          this.errors.next({
            code: 'execute-failed',
            message: `ngx-easy-captcha: reCAPTCHA execute failed - ${String(error)}`,
          }),
        );
    });
  }
}
