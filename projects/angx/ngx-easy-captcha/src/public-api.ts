/*
 * Public API Surface of @angx/ngx-easy-captcha
 */

export * from './lib/ngx-easy-captcha.service';
export * from './lib/script-loader.service';
export * from './lib/enums/captcha-provider';
export * from './lib/enums/dynamic-scripts-enum';
export * from './lib/enums/element-selector-type';
export type { ICaptchaError } from './lib/interfaces/captcha-error';
export type { IScriptLoaderResponse } from './lib/interfaces/script-loader-response';
export type { IElementSelector, IScript } from './lib/interfaces/scripts';
