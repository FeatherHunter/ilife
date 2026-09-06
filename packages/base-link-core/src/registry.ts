// registry：电话本。key 语法 skill.combo 命名空间修复：裸 key 拒绝并给修复提示；对不上注册表即 fail。
import { RegistryError } from './errors.js';

export type RegistryKey = string;

const KEY_RE = /^[a-z][a-z0-9-]*\.[a-z0-9][a-z0-9-.]*$/;

export interface ParsedKey { skill: string; combo: string; key: string; }

// 命名空间修复：trim + 小写化仅做提示，正文保持原样校验；裸 key（如 today）拒绝，提示补命名空间为 <skill>.today。
export function parseRegistryKey(raw: unknown): ParsedKey {
  if (typeof raw !== 'string' || raw.length === 0) throw new RegistryError('registry key 须为非空字符串');
  const key = raw.trim();
  if (!KEY_RE.test(key)) {
    const hint = key.includes('.')
      ? '命名空间非法，形如 skill.combo'
      : '缺命名空间，应为 <skill>.' + key;
    throw new RegistryError('非法 registry key：' + JSON.stringify(raw) + '（' + hint + '）');
  }
  const dot = key.indexOf('.');
  return { skill: key.slice(0, dot), combo: key.slice(dot + 1), key };
}

export interface Registry {
  keys(): string[];
  has(key: string): boolean;
  resolve(key: string): ParsedKey;
}

export function createRegistry(knownKeys: readonly string[]): Registry {
  const set = new Set<string>();
  for (const k of knownKeys) set.add(parseRegistryKey(k).key);
  return {
    keys: () => [...set],
    has: (key: string) => {
      try { return set.has(parseRegistryKey(key).key); } catch { return false; }
    },
    resolve: (key: string) => {
      const parsed = parseRegistryKey(key);
      if (!set.has(parsed.key)) throw new RegistryError('未知 registry key：' + parsed.key + '（对不上即 fail，不返空）');
      return parsed;
    },
  };
}
