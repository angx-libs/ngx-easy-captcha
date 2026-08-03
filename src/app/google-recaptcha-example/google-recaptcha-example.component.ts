import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CaptchaProvider, provideNgxEasyCaptcha } from '@angx/ngx-easy-captcha';
import { CaptchaExampleBase } from '../captcha-example.base';

@Component({
  selector: 'app-google-recaptcha-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  providers: [
    provideNgxEasyCaptcha({
      provider: CaptchaProvider.Google,
      // Enter your Google reCAPTCHA v3 site key here.
      siteKey: 'YOUR_RECAPTCHA_SITE_KEY',
      // For reCAPTCHA the initializer is the action name.
      initializer: 'login',
    }),
  ],
  templateUrl: './google-recaptcha-example.component.html',
  styleUrl: './google-recaptcha-example.component.css',
})
export class GoogleRecaptchaExampleComponent extends CaptchaExampleBase {}
