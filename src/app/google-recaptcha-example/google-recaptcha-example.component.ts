import { Component, OnDestroy } from '@angular/core';
import { CaptchaProvider } from '../../../projects/angx/ngx-easy-captcha/src/lib/enums/captcha-provider';
import { NgxEasyCaptchaService, CAPTCHA_PROVIDER, CAPTCHA_SITE_KEY, STRING_INITIALIZER } from '../../../projects/angx/ngx-easy-captcha/src/public-api';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-google-recaptcha-example',
  standalone: true,
  imports: [NgClass, RouterLink],
  providers: [NgxEasyCaptchaService,
    { provide: CAPTCHA_PROVIDER, useValue: CaptchaProvider.Google },
    { provide: CAPTCHA_SITE_KEY, useValue: '' }, // Enter your Google Enterprise Recaptcha Site Key Here
    { provide: STRING_INITIALIZER, useValue: "login/register" }
  ],
  templateUrl: './google-recaptcha-example.component.html',
  styleUrl: './google-recaptcha-example.component.css'
})
export class GoogleRecaptchaExampleComponent implements OnDestroy {
  containerClass: string = '';
  routeSubscription!: Subscription;
  captchaSubscription!: Subscription;
  captchaToken!: string;
  signInFormClass: string = ''
  signUpFormClass: string = ''

  constructor(private route: ActivatedRoute, private router: Router, private captchaService: NgxEasyCaptchaService) {
    this.routeSubscription = this.route.fragment.subscribe(fragment => {
      if (fragment === 'register') {
        this.signInFormClass = 'hidden-form-mobile';
        this.signUpFormClass = '';

        this.setSignUpFormActive();
      } else {
        this.signInFormClass = '';
        this.signUpFormClass = 'hidden-form-mobile';
        this.setSignInFormActive();
      }
    });
    this.captchaSubscription = this.captchaService.$.subscribe((token: string) => {
      this.captchaToken = token;
      console.log(token);
    });
  }

  onSignupSubmit() {
    if (this.captchaToken) {
      //verify using backend call
    }
  }

  setSignInFormActive() {
    this.containerClass = '';
    this.router.navigate([], { fragment: 'login' })
  }

  setSignUpFormActive() {
    this.containerClass = 'right-panel-active';
    this.router.navigate([], { fragment: 'register' })
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.captchaSubscription?.unsubscribe();
  }
}
