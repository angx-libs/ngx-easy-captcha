import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DynamicScripts } from './enums/dynamic-scripts-enum';
import { ElementSelectorType } from './enums/element-selector-type';
import { ScriptLoaderService } from './script-loader.service';
import { SITE_KEY_PLACEHOLDER, createScriptStore } from './script-store';

/** Turns the next injected <script> into a success or failure, synchronously. */
function settleNextScript(outcome: 'load' | 'error'): HTMLScriptElement {
  const element = document.head.querySelector('script:last-of-type') as HTMLScriptElement;
  element[outcome === 'load' ? 'onload' : 'onerror']?.(new Event(outcome));
  return element;
}

describe('createScriptStore', () => {
  it('hands out an independent copy each time', () => {
    const first = createScriptStore();
    const second = createScriptStore();

    first[0].src = 'mutated';
    first[0].loaded = true;

    // The old module-level constant was mutated in place while substituting
    // the site key, so a second consumer silently reused the first key.
    expect(second[0].src).toContain(SITE_KEY_PLACEHOLDER);
    expect(second[0].loaded).toBeUndefined();
  });
});

describe('ScriptLoaderService', () => {
  let service: ScriptLoaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScriptLoaderService);
  });

  afterEach(() => {
    document.head.querySelectorAll('script').forEach((element) => element.remove());
  });

  it('substitutes the site key into the script URL', async () => {
    const pending = service.loadScript(DynamicScripts.GoogleRecaptcha, 'my-site-key');
    const element = settleNextScript('load');

    await expect(pending).resolves.toMatchObject({ loaded: true });
    expect(element.src).toContain('render=my-site-key');
    expect(element.src).not.toContain(SITE_KEY_PLACEHOLDER);
  });

  it('injects only one tag for concurrent callers', async () => {
    const before = document.head.querySelectorAll('script').length;
    const first = service.loadScript(DynamicScripts.CloudFlareTurnstile, 'key');
    const second = service.loadScript(DynamicScripts.CloudFlareTurnstile, 'key');
    settleNextScript('load');

    await Promise.all([first, second]);
    expect(document.head.querySelectorAll('script').length).toBe(before + 1);
  });

  it('keeps the script while another consumer still needs it', async () => {
    await Promise.all([
      service.loadScript(DynamicScripts.CloudFlareTurnstile, 'key'),
      service.loadScript(DynamicScripts.CloudFlareTurnstile, 'key'),
      Promise.resolve(settleNextScript('load')),
    ]);

    service.release(DynamicScripts.CloudFlareTurnstile);
    expect(service.isInUse(DynamicScripts.CloudFlareTurnstile)).toBe(true);
    expect(document.getElementById('cloudflare-turnstile')).not.toBeNull();

    service.release(DynamicScripts.CloudFlareTurnstile);
    expect(service.isInUse(DynamicScripts.CloudFlareTurnstile)).toBe(false);
    expect(document.getElementById('cloudflare-turnstile')).toBeNull();
  });

  it('removes every element matching a class selector', async () => {
    for (let i = 0; i < 3; i++) {
      const badge = document.createElement('div');
      badge.className = 'grecaptcha-badge';
      document.body.appendChild(badge);
    }

    const pending = service.loadScript(DynamicScripts.GoogleRecaptcha, 'key');
    settleNextScript('load');
    await pending;

    service.release(DynamicScripts.GoogleRecaptcha, {
      name: 'grecaptcha-badge',
      type: ElementSelectorType.Class,
    });

    // Iterating the live HTMLCollection forward while removing used to leave
    // roughly half the badges behind.
    expect(document.getElementsByClassName('grecaptcha-badge').length).toBe(0);
  });

  it('resolves instead of rejecting when a script fails, and allows a retry', async () => {
    const failed = service.loadScript(DynamicScripts.GoogleRecaptcha, 'key');
    settleNextScript('error');
    await expect(failed).resolves.toMatchObject({ loaded: false, status: 'Failed to load' });

    const retry = service.loadScript(DynamicScripts.GoogleRecaptcha, 'key');
    settleNextScript('load');
    await expect(retry).resolves.toMatchObject({ loaded: true });
  });

  it('reports an unknown script rather than hanging', async () => {
    await expect(service.loadScript('nope', 'key')).resolves.toMatchObject({
      loaded: false,
      status: 'Unknown script',
    });
  });
});
