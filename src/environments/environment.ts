/**
 * Runtime configuration, compiled into the bundle at build time.
 *
 * The real Laravel backend lives in the same container (see backend/ and the
 * root Dockerfile), so the API is same-origin: keep apiUrl empty so
 * http-rifas-api.ts builds '/api' relative URLs. Set useMock to true to run
 * the static demo without any backend.
 */
export const environment = {
  production: true,
  /** true = serve data from in-memory mocks (static demo). false = call apiUrl. */
  useMock: false,
  /** Same-origin API: empty string yields '/api/...' requests. */
  apiUrl: '',
  supportWhatsAppE164: '18493616245',
  instagramUrl: 'https://www.instagram.com/rifasluxury_rd2/',
  /** Cloudflare Turnstile site key. Ignored while useMock is true. */
  turnstileSiteKey: '',
};
