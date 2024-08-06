import { Routes } from '@angular/router';
import { CloudflareTurnstileExampleComponent } from './cloudflare-turnstile-example/cloudflare-turnstile-example.component';
import { GoogleRecaptchaExampleComponent } from './google-recaptcha-example/google-recaptcha-example.component';
import { ExampleComponent } from './example/example.component';

export const routes: Routes = [
    { path: '', component: ExampleComponent },
    { path: 'cloudflare-turnstile', component: CloudflareTurnstileExampleComponent },
    { path: 'google-recaptcha', component: GoogleRecaptchaExampleComponent },
];

