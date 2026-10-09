import { isLanguageArg } from 'base-link-core';
import { fail } from './fail.js';

const DEFAULT_TIMEOUT_MS = 30000;

export type CliArgs = { key: string | undefined; params: string | undefined; html: string | undefined; timeout: number; language: string | undefined; formatLanguage: string | undefined };

/** 出口参数解析（#1198 起语言两枚也走这里：只摘不判，对错由 language.ts 一处判）。 */
export function parseArgs(a: string[]): CliArgs {
  const o: CliArgs = { key: a[0], params: undefined, html: undefined, timeout: DEFAULT_TIMEOUT_MS, language: undefined, formatLanguage: undefined };
  for (let i = 1; i < a.length; i++) {
    if (a[i] === '--params' && i + 1 < a.length) o.params = a[++i];
    else if (a[i] === '--html' && i + 1 < a.length) o.html = a[++i];
    else if (isLanguageArg(a[i] as string) && i + 1 < a.length) {
      if (a[i] === '--language') o.language = a[++i];
      else o.formatLanguage = a[++i];
    }
    else if (a[i] === '--timeout' && i + 1 < a.length) {
      o.timeout = Number(a[++i]);
      if (!Number.isFinite(o.timeout) || o.timeout <= 0) fail(2, '--timeout 须为正数毫秒');
    }
    else fail(2, '未知参数：' + a[i]);
  }
  return o;
}
