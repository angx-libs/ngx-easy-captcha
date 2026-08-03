/** A non-fatal problem reported by the underlying captcha provider. */
export interface ICaptchaError {
  /** Provider error code, where one was supplied. */
  code: string;
  message: string;
}
