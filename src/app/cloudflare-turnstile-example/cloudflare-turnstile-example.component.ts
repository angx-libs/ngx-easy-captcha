import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CaptchaProvider, provideNgxEasyCaptcha } from '@angx/ngx-easy-captcha';
import { CaptchaExampleBase } from '../captcha-example.base';

@Component({
  selector: 'app-cloudflare-turnstile-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  providers: [
    provideNgxEasyCaptcha({
      provider: CaptchaProvider.CloudFlare,
      // Cloudflare's public "always passes" test key. It is documented dummy
      // data that works on any domain, including localhost. Swap in your own.
      siteKey: '1x00000000000000000000AA',
      // For Turnstile the initializer is the id prefix of the host elements,
      // so both #cloudflare-captcha-signin and #cloudflare-captcha-signup get
      // their own widget.
      initializer: 'cloudflare-captcha',
    }),
  ],
  templateUrl: './cloudflare-turnstile-example.component.html',
  styleUrl: './cloudflare-turnstile-example.component.css',
})
export class CloudflareTurnstileExampleComponent extends CaptchaExampleBase {}
