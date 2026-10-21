import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';

import { environment } from '../../environments/environment';

interface TurnstileApi {
  render(
    el: HTMLElement,
    options: {
      sitekey: string;
      theme?: string;
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
    },
  ): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    onTurnstileLoad?: () => void;
  }
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';
let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    window.onTurnstileLoad = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile')));
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error('turnstile-script'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

type MockState = 'idle' | 'verifying' | 'success';

/**
 * Cloudflare Turnstile wrapper.
 *
 * With `environment.useMock` (static demo) it shows a look-alike widget that
 * "verifies" on click and emits a fake token. With a real backend it renders
 * the official widget for `siteKey`.
 */
@Component({
  selector: 'app-turnstile-widget',
  standalone: true,
  styleUrl: './turnstile-widget.component.css',
  styles: [
    `
      .ts-mock {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        width: 300px;
        max-width: 100%;
        height: 65px;
        padding: 0 0.9rem;
        border: 1px solid #4a4a4a;
        border-radius: 4px;
        background: #232323;
        color: #f3f3f3;
        font: 500 0.82rem/1.2 var(--font-sans);
        box-sizing: border-box;
      }
      .ts-mock__check {
        display: inline-flex;
        align-items: center;
        gap: 0.7rem;
        cursor: pointer;
        background: none;
        border: 0;
        padding: 0;
        color: inherit;
        font: inherit;
      }
      .ts-mock__box {
        width: 24px;
        height: 24px;
        border: 2px solid #8a8a8a;
        border-radius: 3px;
        background: #1a1a1a;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: none;
      }
      .ts-mock__box--verifying {
        border-color: #f6821f;
        border-top-color: transparent;
        border-radius: 50%;
        animation: ts-spin 0.8s linear infinite;
      }
      .ts-mock__box--success {
        border-color: #2e9e5b;
        background: #2e9e5b;
      }
      .ts-mock__brand {
        font-size: 0.62rem;
        line-height: 1.25;
        color: #b5b5b5;
        text-align: right;
      }
      .ts-mock__brand strong {
        display: block;
        color: #f6821f;
        letter-spacing: 0.04em;
        font-size: 0.7rem;
      }
      @keyframes ts-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
  template: `
    <div class="turnstile-widget" aria-live="polite">
      @if (mock) {
        <div class="ts-mock">
          <button type="button" class="ts-mock__check" [disabled]="state !== 'idle'" (click)="verify()">
            <span class="ts-mock__box" [class.ts-mock__box--verifying]="state === 'verifying'" [class.ts-mock__box--success]="state === 'success'">
              @if (state === 'success') {
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
              }
            </span>
            <span>{{ state === 'success' ? '¡Verificado!' : state === 'verifying' ? 'Verificando…' : 'Verifica que eres humano' }}</span>
          </button>
          <span class="ts-mock__brand"><strong>CLOUDFLARE</strong>Privacidad · Términos</span>
        </div>
      } @else {
        <div #host></div>
      }
    </div>
  `,
})
export class TurnstileWidgetComponent implements AfterViewInit, OnDestroy {
  @Input() siteKey = environment.turnstileSiteKey;
  @Output() resolved = new EventEmitter<string>();
  @Output() expired = new EventEmitter<void>();
  @Output() errored = new EventEmitter<void>();
  @ViewChild('host') private host?: ElementRef<HTMLElement>;

  state: MockState = 'idle';
  private widgetId: string | null = null;
  private timer?: ReturnType<typeof setTimeout>;

  get mock(): boolean {
    return environment.useMock || !this.siteKey;
  }

  ngAfterViewInit(): void {
    if (this.mock || !this.host) return;
    loadTurnstile()
      .then(api => {
        if (!this.host) return;
        this.widgetId = api.render(this.host.nativeElement, {
          sitekey: this.siteKey,
          theme: 'dark',
          callback: token => this.resolved.emit(token),
          'expired-callback': () => this.expired.emit(),
          'error-callback': () => this.errored.emit(),
        });
      })
      .catch(() => this.errored.emit());
  }

  ngOnDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
    if (this.widgetId && window.turnstile) window.turnstile.remove(this.widgetId);
  }

  /** Demo only: simulates the challenge being solved. */
  verify(): void {
    if (this.state !== 'idle') return;
    this.state = 'verifying';
    this.timer = setTimeout(() => {
      this.state = 'success';
      this.resolved.emit('demo-turnstile-token');
    }, 1100);
  }

  reset(): void {
    if (this.timer) clearTimeout(this.timer);
    this.state = 'idle';
    if (this.widgetId && window.turnstile) window.turnstile.reset(this.widgetId);
  }
}
