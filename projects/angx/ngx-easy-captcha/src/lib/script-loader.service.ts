import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { DynamicScripts } from './enums/dynamic-scripts-enum';
import { ElementSelectorType } from './enums/element-selector-type';
import type { IScriptLoaderResponse } from './interfaces/script-loader-response';
import type { IElementSelector, IScript } from './interfaces/scripts';
import { SITE_KEY_PLACEHOLDER, createScriptStore } from './script-store';

/** Per-script bookkeeping. */
interface ScriptState {
  definition: IScript;
  /** How many live consumers depend on this script. */
  refCount: number;
  /** Shared across concurrent callers so only one tag is ever injected. */
  request?: Promise<IScriptLoaderResponse>;
  element?: HTMLScriptElement;
}

@Injectable({
  providedIn: 'root',
})
export class ScriptLoaderService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * Own copy of the definitions, so substituting a site key can never leak
   * into another consumer.
   */
  private readonly states = new Map<string, ScriptState>(
    createScriptStore().map((definition) => [definition.name, { definition, refCount: 0 }]),
  );

  /**
   * Injects each named script, substituting `siteKey` into its URL, and
   * registers the caller as a dependent.
   *
   * Always resolves - check `loaded` on each response instead of catching.
   * Every successful `load` must be paired with a `release`, or the script
   * tag will outlive its consumers.
   */
  load(siteKey: string, ...names: string[]): Promise<IScriptLoaderResponse[]> {
    return Promise.all(names.map((name) => this.loadScript(name, siteKey)));
  }

  loadScript(name: string, siteKey: string): Promise<IScriptLoaderResponse> {
    const state = this.states.get(name);
    if (!state) {
      return Promise.resolve({ script: name, loaded: false, status: 'Unknown script' });
    }

    // Resolving rather than hanging matters most during server-side
    // rendering, where there is no document to append a tag to.
    if (!this.isBrowser) {
      return Promise.resolve({ script: name, loaded: false, status: 'Not a browser' });
    }

    state.refCount++;

    if (state.request) {
      return state.request;
    }

    state.request = new Promise<IScriptLoaderResponse>((resolve) => {
      const element = document.createElement('script');
      element.id = state.definition.id ?? '';
      element.type = 'text/javascript';
      element.src = state.definition.src.replace(
        SITE_KEY_PLACEHOLDER,
        encodeURIComponent(siteKey),
      );
      // A dynamically injected script is async by default and ignores `defer`
      // entirely, so `defer` is only honoured when async is switched off.
      element.async = state.definition.async ?? true;
      if (!element.async) {
        element.defer = state.definition.defer ?? false;
      }
      element.onload = () => {
        state.definition.loaded = true;
        resolve({ script: name, loaded: true, status: 'Loaded' });
      };
      element.onerror = () => {
        // Clear the cached request so a later consumer can retry.
        state.request = undefined;
        resolve({ script: name, loaded: false, status: 'Failed to load' });
      };

      state.element = element;
      document.head.appendChild(element);
    });

    return state.request;
  }

  /**
   * Drops one consumer's claim on a script. The tag and any extra elements are
   * only removed once the last consumer has released it - otherwise a page
   * with two captcha-protected forms would tear down the shared script as soon
   * as the first form was destroyed.
   */
  release(name: DynamicScripts, ...elementSelectors: IElementSelector[]): void {
    const state = this.states.get(name);
    if (!this.isBrowser || !state) {
      return;
    }

    state.refCount = Math.max(0, state.refCount - 1);
    if (state.refCount > 0) {
      return;
    }

    state.element?.remove();
    state.element = undefined;
    state.request = undefined;
    state.definition.loaded = false;

    for (const selector of elementSelectors) {
      if (selector.type === ElementSelectorType.Id) {
        document.getElementById(selector.name)?.remove();
      } else {
        // `getElementsByClassName` is live: removing while iterating forward
        // skips elements, so take a static snapshot first.
        for (const element of Array.from(document.getElementsByClassName(selector.name))) {
          element.remove();
        }
      }
    }
  }

  /** True while at least one consumer still depends on `name`. */
  isInUse(name: DynamicScripts): boolean {
    return (this.states.get(name)?.refCount ?? 0) > 0;
  }

  removeWindowTraces(name: string): void {
    if (this.isBrowser) {
      delete (window as unknown as Record<string, unknown>)[name];
    }
  }
}
