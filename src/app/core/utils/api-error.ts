import { HttpErrorResponse } from '@angular/common/http';

const NETWORK_MESSAGE =
  'No se pudo conectar con el servidor. Comprueba tu internet (prueba cambiar entre Wi‑Fi y datos móviles). Si sigue igual, inténtalo de nuevo en unos minutos.';

const NETWORK_HINTS = [
  'failed to fetch',
  'load failed',
  'network error',
  'networkrequestfailed',
  'err_network',
  'network request failed',
  'fetch failed',
  'aborted',
  'timeout',
  'signal is aborted',
];

const looksLikeNetworkFailure = (text: string): boolean => {
  const t = text.toLowerCase();
  return NETWORK_HINTS.some(hint => t.includes(hint));
};

function isNetworkError(e: HttpErrorResponse): boolean {
  if (e.status === 0 || looksLikeNetworkFailure(e.message || '')) return true;
  const body = e.error;
  if (typeof body === 'string' && looksLikeNetworkFailure(body)) return true;
  if (body != null && typeof body === 'object' && 'message' in body) {
    const m = (body as { message: unknown }).message;
    if (typeof m === 'string' && looksLikeNetworkFailure(m)) return true;
  }
  return false;
}

/** Builds an HTTP-shaped error; used by the mock API so the UI sees what a real server would send. */
export function httpError(status: number, message: string, errors?: Record<string, string[]>): HttpErrorResponse {
  return new HttpErrorResponse({ status, statusText: message, error: { message, ...(errors ? { errors } : {}) } });
}

/** Turns any thrown value into a message that is safe and useful to show to the customer. */
export function apiErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (isNetworkError(err)) return NETWORK_MESSAGE;
    const body = err.error;
    if (body == null) return err.status === 0 ? NETWORK_MESSAGE : `Error ${err.status}. Intenta de nuevo más tarde.`;
    if (typeof body === 'string') {
      return body.length === 0 ? 'No se pudo completar la solicitud.' : looksLikeNetworkFailure(body) ? NETWORK_MESSAGE : body;
    }
    if (typeof body === 'object') {
      const { message, errors } = body as { message?: unknown; errors?: Record<string, unknown> };
      if (typeof message === 'string' && message.length > 0) {
        return looksLikeNetworkFailure(message) ? NETWORK_MESSAGE : message;
      }
      if (errors && typeof errors === 'object') {
        const first = errors[Object.keys(errors)[0]];
        if (Array.isArray(first) && typeof first[0] === 'string') return first[0];
        if (typeof first === 'string') return first;
      }
    }
    return 'No se pudo completar la solicitud.';
  }
  if (err instanceof Error) return looksLikeNetworkFailure(err.message) ? NETWORK_MESSAGE : err.message;
  return 'Ocurrió un error inesperado.';
}

/** True when the server rejected the request because the captcha answer was missing or wrong. */
export function isCaptchaError(err: unknown): boolean {
  if (!(err instanceof HttpErrorResponse)) return false;
  const body = err.error;
  if (typeof body === 'string' && /captcha/i.test(body)) return true;
  if (body == null || typeof body !== 'object') return false;
  const { message, errors } = body as { message?: unknown; errors?: Record<string, unknown> };
  if (typeof message === 'string' && /captcha/i.test(message)) return true;
  return !!errors && Object.keys(errors).some(k => /captcha/i.test(k));
}

/** True when the server asks for the legacy image captcha instead of Turnstile. */
export function requiresLegacyCaptcha(err: unknown): boolean {
  if (!(err instanceof HttpErrorResponse)) return false;
  const errors = (err.error as { errors?: Record<string, unknown> } | null)?.errors;
  return !!errors && typeof errors === 'object' && ('captcha_id' in errors || 'captcha_answer' in errors);
}
