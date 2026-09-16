/** T6 #25 · 训记官方动作库只读（老家 xunji_bridge/catalog.py 同契约）。
 * 库缺失/解析失败返回空集不抛错；空集时 verify 报告“无法验证”而非“非法”。
 *
 * 预置库（`loadPresetCatalogNames`）：包内 `data/训记官方动作.json` 是训记官方库
 * （https://github.com/Foveluy/Xunji-movements）的一份**快照**，随包走、不再依赖各机
 * `~/.minimax` 有没有放那份文件。**未来更新动作库只换这一个 JSON**（格式 `{actions: [...]}` 不变），
 * 本件一字不用改——读文件是每次调用现读的，不缓存，换文件即生效。
 */
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

export const DEFAULT_CATALOG_PATH = join(homedir(), '.minimax', '训记官方动作.json');

/** 预置库路径：包根定位与模板 loader 同法（本文件在 `src/fetch` 或 `dist/fetch`，往上两级都是包根）。 */
export const PRESET_CATALOG_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', '训记官方动作.json');

export interface VerifyResult {
  name: string;
  /** true=合法，false=不在库，null=库缺失无法验证 */
  valid: boolean | null;
  catalog_loaded: boolean;
  suggestion: string | null;
}

/** 加载动作名集合；文件缺失/解析失败/结构不对 → 空集。 */
export function loadCatalog(path: string = DEFAULT_CATALOG_PATH): Set<string> {
  try {
    const data = JSON.parse(readFileSync(path, 'utf8'));
    if (!Array.isArray(data?.actions)) return new Set();
    return new Set(data.actions.map((a: unknown) => String(a)));
  } catch {
    return new Set();
  }
}

/** 简易相似度：含相同 2 字及以上子串（空格分词 + 连词整体），排序截断 5 个。 */
export function suggestSimilar(name: string, catalog: Set<string>, maxN = 5): string[] {
  const keys = new Set<string>();
  for (const tok of name.replace(/-/g, ' ').split(/\s+/)) {
    if (tok.length >= 2) keys.add(tok);
  }
  if (name.trim().length >= 2) keys.add(name.trim());
  const out: string[] = [];
  for (const c of catalog) {
    for (const k of keys) {
      if (c.includes(k)) {
        out.push(c);
        break;
      }
    }
  }
  return out.sort().slice(0, maxN);
}

/** 校验单个动作名。 */
export function verifyMovementName(name: string, catalog?: Set<string>): VerifyResult {
  const cat = catalog ?? loadCatalog();
  const clean = (name ?? '').trim();
  if (!clean) return { name: clean, valid: false, catalog_loaded: cat.size > 0, suggestion: '动作名为空' };
  if (cat.size === 0) return { name: clean, valid: null, catalog_loaded: false, suggestion: '动作库缺失，无法验证' };
  if (cat.has(clean)) return { name: clean, valid: true, catalog_loaded: true, suggestion: null };
  return { name: clean, valid: false, catalog_loaded: true, suggestion: suggestSimilar(clean, cat, 1)[0] ?? null };
}

/** 批量校验。 */
export function verifyMany(names: string[], catalog?: Set<string>): VerifyResult[] {
  const cat = catalog ?? loadCatalog();
  return names.map((n) => verifyMovementName(n, cat));
}

/** 预置动作库名数组（只给名，不给部位/类型——官方库文件里就只有名）。
 *  缺失/解析失败/空表 → 空数组，调用方退回别的库源（不断链）。 */
export function loadPresetCatalogNames(path: string = PRESET_CATALOG_PATH): readonly string[] {
  try {
    const data = JSON.parse(readFileSync(path, 'utf8'));
    const actions = Array.isArray(data?.actions) ? data.actions : [];
    const names = actions.filter((a: unknown): a is string => typeof a === 'string' && a.trim() !== '');
    return names;
  } catch {
    return [];
  }
}
