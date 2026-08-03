import { DynamicScripts } from './enums/dynamic-scripts-enum';
import type { IScript } from './interfaces/scripts';

/** Placeholder replaced with the configured site key when a script is loaded. */
export const SITE_KEY_PLACEHOLDER = 'CAPTCHA_SITE_KEY';

/**
 * Script definitions, exposed as a factory so every loader gets its own copy.
 * The previous shared constant was mutated in place while substituting the
 * site key, so a second consumer with a different key silently reused the
 * first one - the placeholder had already been replaced.
 */
export function createScriptStore(): IScript[] {
  return [
    {
      name: DynamicScripts.GoogleRecaptcha,
      src: `https://www.google.com/recaptcha/api.js?render=${SITE_KEY_PLACEHOLDER}`,
      id: 'google-recaptcha',
      async: true,
      defer: true,
    },
    {
      name: DynamicScripts.CloudFlareTurnstile,
      src: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
      id: 'cloudflare-turnstile',
      async: true,
      defer: true,
    },
  ];
}
