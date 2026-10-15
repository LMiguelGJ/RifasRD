import { Pipe, PipeTransform } from '@angular/core';

/**
 * Hides personal data in public results: only the last 4 characters stay visible.
 * `{{ phone | maskSensitive }}` -> "******1234"; `{{ email | maskSensitive: 'email' }}` -> "****ndez@mail.com".
 */
@Pipe({ name: 'maskSensitive', standalone: true })
export class MaskSensitivePipe implements PipeTransform {
  private static readonly VISIBLE = 4;

  transform(value: string | number | null | undefined, kind: 'phone' | 'email' = 'phone'): string {
    if (value == null) return '';
    const text = String(value).trim();
    if (text === '') return '';
    return kind === 'email' ? MaskSensitivePipe.maskEmail(text) : MaskSensitivePipe.maskDigits(text);
  }

  private static maskDigits(text: string): string {
    const digits = text.replace(/\D/g, '');
    if (digits.length === 0) return text;
    const visible = Math.min(MaskSensitivePipe.VISIBLE, digits.length);
    return '*'.repeat(digits.length - visible) + digits.slice(-visible);
  }

  private static maskEmail(text: string): string {
    const at = text.indexOf('@');
    if (at <= 0 || at === text.length - 1) return MaskSensitivePipe.maskDigits(text);
    const local = text.slice(0, at);
    const domain = text.slice(at);
    const visible = Math.min(MaskSensitivePipe.VISIBLE, local.length);
    return '*'.repeat(local.length - visible) + local.slice(-visible) + domain;
  }
}
