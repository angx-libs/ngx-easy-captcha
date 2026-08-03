/**
 * String-valued so an unconfigured provider cannot be mistaken for a valid
 * one: the previous `Google = 0` was falsy, and it made diagnostics read
 * "unknown provider 0" instead of naming the value.
 */
export enum CaptchaProvider {
  Google = 'google',
  CloudFlare = 'cloudflare',
}
