import { Observable, ReplaySubject, Subject } from 'rxjs';
import { DynamicScripts } from './enums/dynamic-scripts-enum';
import type { ICaptchaError } from './interfaces/captcha-error';
import type { ScriptLoaderService } from './script-loader.service';

declare const turnstile: {
  render(
    container: string | HTMLElement,
    options: {
      sitekey: string;
      callback?: (token: string) => void;
      'error-callback'?: (code: string) => void;
      'expired-callback'?: () => void;
      'timeout-callback'?: () => void;
    },
  ): string | undefined;
  remove(widgetId: string): void;
  reset(widgetId?: string): void;
};

/**
 * Cloudflare Turnstile token source.
 *
 * Not decorated with `@Injectable`: it is constructed by
 * `NgxEasyCaptchaService` once the provider has been resolved.
 */
export class CloudFlareTurnstileService {
  /**
   * `ReplaySubject(1)` rather than `BehaviorSubject('')`, so subscribers only
   * ever see a real token. The old seed value made every subscriber fire once
   * with an empty string before the captcha had resolved.
   */
  private readonly token = new ReplaySubject<string>(1);

  /**
   * Errors travel on their own channel. Pushing them through `token.error()`
   * terminated the stream permanently, so a single expired or failed challenge
   * left the service unable to ever issue another token.
   */
  private readonly errors = new Subject<ICaptchaError>();

  private readonly widgetIds: string[] = [];

  constructor(
    private readonly elementIdPrefix: string,
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

  /** Resets the rendered widgets so the user can solve a new challenge. */
  refresh(): void {
    if (typeof turnstile === 'undefined') {
      return;
    }
    for (const widgetId of this.widgetIds) {
      turnstile.reset(widgetId);
    }
  }

  /**
   * Removes this consumer's widgets and releases its claim on the script. The
   * tag and the `window.turnstile` global survive while another consumer still
   * needs them.
   */
  destroy(): void {
    if (typeof turnstile !== 'undefined') {
      for (const widgetId of this.widgetIds) {
        turnstile.remove(widgetId);
      }
    }
    this.widgetIds.length = 0;
    this.scriptLoader.release(DynamicScripts.CloudFlareTurnstile);
    if (!this.scriptLoader.isInUse(DynamicScripts.CloudFlareTurnstile)) {
      this.scriptLoader.removeWindowTraces('turnstile');
    }
    this.token.complete();
    this.errors.complete();
  }

  private async initialize(): Promise<void> {
    const [result] = await this.scriptLoader.load(this.siteKey, DynamicScripts.CloudFlareTurnstile);
    if (!result?.loaded) {
      this.errors.next({
        code: 'script-load-failed',
        message: `ngx-easy-captcha: Turnstile script ${result?.status ?? 'could not be loaded'}.`,
      });
      return;
    }
    this.render();
  }

  private render(): void {
    if (typeof turnstile === 'undefined') {
      this.errors.next({
        code: 'turnstile-unavailable',
        message: 'ngx-easy-captcha: the Turnstile script loaded but window.turnstile is missing.',
      });
      return;
    }

    const hosts = document.querySelectorAll<HTMLElement>(
      `[id^="${CSS.escape(this.elementIdPrefix)}"]`,
    );
    if (hosts.length === 0) {
      this.errors.next({
        code: 'no-container',
        message:
          `ngx-easy-captcha: no element found with an id starting with "${this.elementIdPrefix}". ` +
          `Add a container such as <div id="${this.elementIdPrefix}-signin"></div>.`,
      });
      return;
    }

    // Deliberately not wrapped in `turnstile.ready()`. That helper is for code
    // running *before* api.js has loaded; called afterwards it logs a warning
    // and never invokes the callback, so no widget was ever rendered. We only
    // get here from the script's own load event, so Turnstile is ready.
    hosts.forEach((host) => {
      // Pass the element itself rather than rebuilding a selector from its id,
      // which broke for ids needing CSS escaping.
      const widgetId = turnstile.render(host, {
        sitekey: this.siteKey,
        callback: (token: string) => {
          if (token) {
            this.token.next(token);
          }
        },
        'error-callback': (code: string) =>
          this.errors.next({ code, message: `ngx-easy-captcha: Turnstile error ${code}.` }),
        // A Turnstile token is only valid for a few minutes. Resetting on
        // expiry keeps a long-lived form from submitting a stale token.
        'expired-callback': () => {
          this.errors.next({ code: 'expired', message: 'ngx-easy-captcha: Turnstile token expired.' });
          if (widgetId) {
            turnstile.reset(widgetId);
          }
        },
      });
      if (widgetId) {
        this.widgetIds.push(widgetId);
      }
    });
  }
}
