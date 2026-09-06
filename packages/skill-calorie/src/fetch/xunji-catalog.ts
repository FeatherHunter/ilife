/** T6 #25 · 训记官方动作库只读（老家 xunji_bridge/catalog.py 同契约）。
 * 库缺失/解析失败返回空集不抛错；空集时 verify 报告“无法验证”而非“非法”。
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

export const DEFAULT_CATALOG_PATH = join(homedir(), '.minimax', '训记官方动作.json');

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
