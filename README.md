# @angx/ngx-easy-captcha

One Angular service for both [Google reCAPTCHA v3](https://www.google.com/recaptcha/about) and [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile). Switch providers by changing one value.

**[Live demo](https://angx-libs.github.io/ngx-easy-captcha/)** · [npm](https://www.npmjs.com/package/@angx/ngx-easy-captcha)

### Cloudflare Turnstile

Turnstile renders an interactive widget into the container you point it at — here, inside the sign-in form.

![Cloudflare Turnstile widget inside the demo sign-in form, showing Success and a received token](https://raw.githubusercontent.com/angx-libs/ngx-easy-captcha/master/src/assets/cloudflare.PNG)

### Google reCAPTCHA v3

reCAPTCHA v3 has no challenge for the user to solve, so nothing is rendered into the form. Its only visible element is the reCAPTCHA badge pinned to the bottom-right of the page, as in the screenshot below. The token arrives on the same stream either way.

![Google reCAPTCHA v3 in the demo app: no in-form widget, the reCAPTCHA badge bottom-right, and a received token](https://raw.githubusercontent.com/angx-libs/ngx-easy-captcha/master/src/assets/google.PNG)

The badge is Google's, not this library's, and it appears automatically once the script loads. Google's terms let you hide it only if you show the required attribution text in its place:

```css
.grecaptcha-badge { visibility: hidden; }
```

```html
<small>
  This site is protected by reCAPTCHA and the Google
  <a href="https://policies.google.com/privacy">Privacy Policy</a> and
  <a href="https://policies.google.com/terms">Terms of Service</a> apply.
</small>
```

`ngx-easy-captcha` removes the badge for you when the last consumer is destroyed.

## Features

- One API for two providers — swap with a single enum value
- Provider scripts are injected on demand, not bundled
- Reference-counted script loading: several protected forms share one script tag safely
- Cleans up after itself when the injector is destroyed — script tag, widgets, reCAPTCHA badge and globals
- Tokens and errors on separate streams, so a failed challenge never kills the token stream
- Turnstile tokens are refreshed automatically on expiry
- SSR safe: resolves instead of hanging when there is no document

## Requirements

Angular 21 or 22.

## Install

```bash
npm i @angx/ngx-easy-captcha
```

## Usage

Provide the service where you need it — usually on the component that owns the protected form, so it is torn down with that component.

### Cloudflare Turnstile

`initializer` is the **id prefix** of the element(s) the widget renders into. Every element whose id starts with that prefix gets its own widget, which is how one page can protect several forms.

```html
<div id="cloudflare-captcha-signin"></div>
<div id="cloudflare-captcha-signup"></div>
```

```ts
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CaptchaProvider,
  NgxEasyCaptchaService,
  provideNgxEasyCaptcha,
} from '@angx/ngx-easy-captcha';

@Component({
  selector: 'app-signin',
  providers: [
    provideNgxEasyCaptcha({
      provider: CaptchaProvider.CloudFlare,
      siteKey: '0x4AAAAAAA...',
      initializer: 'cloudflare-captcha',
    }),
  ],
  templateUrl: './signin.component.html',
})
export class SignInComponent {
  private readonly captcha = inject(NgxEasyCaptchaService);

  readonly token = signal('');
  readonly error = signal('');

  constructor() {
    this.captcha.$.pipe(takeUntilDestroyed()).subscribe((token) => this.token.set(token));
    this.captcha.errors$.pipe(takeUntilDestroyed()).subscribe((e) => this.error.set(e.message));
  }

  submit() {
    if (this.token()) {
      // Send this.token() to your backend and verify it there.
    }
  }
}
```

### Google reCAPTCHA v3

reCAPTCHA v3 is invisible, so there is no container element. Here `initializer` is the **action** name (`login`, `register`, ...).

```ts
providers: [
  provideNgxEasyCaptcha({
    provider: CaptchaProvider.Google,
    siteKey: '6Lc...',
    initializer: 'login',
  }),
],
```

Everything else is identical — the same `$` and `errors$` streams.

### Manual providers

`provideNgxEasyCaptcha` is a convenience wrapper. The individual tokens still work:

```ts
providers: [
  NgxEasyCaptchaService,
  { provide: CAPTCHA_PROVIDER, useValue: CaptchaProvider.CloudFlare },
  { provide: CAPTCHA_SITE_KEY, useValue: '0x4AAAAAAA...' },
  { provide: STRING_INITIALIZER, useValue: 'cloudflare-captcha' },
],
```

## API

| Member | Type | Description |
|---|---|---|
| `$` | `Observable<string>` | Emits each issued token. Never errors. |
| `errors$` | `Observable<ICaptchaError>` | Non-fatal provider problems: `{ code, message }`. |
| `refresh()` | `void` | reCAPTCHA: request a new token. Turnstile: reset the widgets. |

Cleanup runs automatically via `ngOnDestroy` when the providing injector is destroyed. You still want `takeUntilDestroyed()` (or an `unsubscribe`) on your own subscriptions.

> **Verify tokens on your server.** A captcha token proves nothing until your backend posts it to the provider's `siteverify` endpoint with your **secret** key. Never put the secret key in frontend code.

## Testing locally

Cloudflare publishes dummy site keys that work on any domain, including `localhost`:

| Key | Behaviour |
|---|---|
| `1x00000000000000000000AA` | Always passes, visible |
| `2x00000000000000000000AB` | Always blocks, visible |
| `3x00000000000000000000FF` | Forces an interactive challenge |

reCAPTCHA v3 has no universal test key — register `localhost` under your own site key.

## Migrating from 2.x

- **Angular 21+ is required**, and the workspace targets Angular 22.
- **`CaptchaProvider` is now a string enum** (`'google'` / `'cloudflare'` rather than `0` / `1`). Use the enum members and nothing changes; only code comparing against raw numbers breaks.
- **`$` no longer errors.** Subscribe to `errors$` instead of an `error` callback. This is what stops one failed challenge from disabling the service for the rest of the session.
- `$` no longer emits an initial empty string, so you can drop `if (token)` guards.
- `removeScriptAndTraces()` is replaced by the reference-counted `release()`.
- Misconfiguration now throws with an actionable message instead of logging to the console and silently returning an observable that never emits.
- New: `provideNgxEasyCaptcha()`, `refresh()`, `errors$`.

### Fixed in 3.0.0

- **Turnstile widgets never rendered.** `turnstile.render()` was wrapped in `turnstile.ready()`, which is only for code running *before* `api.js` loads; called afterwards it logs a warning and never invokes the callback.
- **Tearing down one form removed the shared script for every other form** on the page. Script loading is now reference counted.
- **`async` and `defer` were assigned to each other** (`script.async` was set from `defer` and vice versa).
- **The script store was mutated in place** while substituting the site key, so a second consumer with a different key silently reused the first one.
- **The promise never settled during server-side rendering**, leaving callers awaiting forever.
- **The two misconfiguration messages were swapped** — the reCAPTCHA branch printed the Turnstile advice and vice versa.
- A failed script load resolved with `status: 'Loaded'`.
- Removing badges iterated a live `HTMLCollection` forward while deleting from it, leaving roughly half behind.
- Concurrent callers each injected their own copy of the same script tag.
- A hand-written `index.d.ts` re-exported classes and injection tokens with `export type`.
- Cleanup depended on the consumer unsubscribing, via a `finalize()` that never ran if they forgot.

## Development

```bash
npm install
npm run build:lib   # build the package into dist/angx/ngx-easy-captcha
npm start           # build the lib, then serve the demo app
npm test            # run the library unit tests
```

The demo app is deployed to GitHub Pages from `master` by `.github/workflows/deploy-demo.yml`.

The Turnstile page (`/cloudflare-turnstile`) works out of the box using Cloudflare's public test key. The reCAPTCHA page (`/google-recaptcha`) needs your own site key with `localhost` registered — paste it into the component's `providers`.

## Support

If you like my work and feel like buying me a coffee, please feel free to do so:

[Buy Me A Coffee](https://buymeacoffee.com/er.abhishek)

## License

MIT © Abhishek Singh

[GitHub](https://github.com/asingh0601) · [Twitter](https://twitter.com/only_abhishek)
