import { Pipe, PipeTransform } from '@angular/core';

import { parseAmount } from '../../core/utils/format';

/** `{{ 1500 | moneyFormat }}` -> "1,500.00"; `moneyFormat:'integer'` -> "1,500". */
@Pipe({ name: 'moneyFormat', standalone: true })
export class MoneyFormatPipe implements PipeTransform {
  transform(value: unknown, mode: 'amount' | 'integer' = 'amount'): string {
    const n = parseAmount(value);
    if (n == null) return '';
    return mode === 'integer'
      ? Math.trunc(n).toLocaleString('en-US', { maximumFractionDigits: 0, useGrouping: true })
      : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
