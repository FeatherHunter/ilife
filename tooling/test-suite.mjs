#!/usr/bin/env node
/**
 * tooling/test-suite.mjs —— 全量测试的**文件清单单一事实源**（#1313 其一）。
 *
 * 用途：`pnpm test`（真实 home 门）与 `tooling/run-tests.mjs`（确定性驱动）必须跑同一份文件清单。
 * 没有这份模块时，两边各写一遍 glob：改了一边忘了另一边，门与驱动跑的不是同一套测试，读数不可比。
 *
 * 形状：
 *   SUITE_GLOBS —— 仓库相对 glob（只支持 `*` 单段通配，不支持 `**`；现有清单用不到 `**`）。
 *   expandGlobs(globs, { root }) —— 展开成**文件**路径（仓库相对、正斜杠、按字典序），缺目录的 glob 静默跳过。
 *   suiteFiles({ root }) —— SUITE_GLOBS 的展开结果。
 *
 * 用法（作为模块）：
 *   import { SUITE_GLOBS, suiteFiles } from './test-suite.mjs';
 *   // 门禁：不传命令时自己跑清单；驱动：`node tooling/run-tests.mjs --all`。
 *
 * 纪律：清单里只放 **测试文件**（`*.test.mjs`）；工具件（如本件）不进清单。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** 仓库根（本文件在 tooling/ 下）。 */
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * 全量测试文件清单。改这里＝改 `pnpm test` 与 `node tooling/run-tests.mjs --all` 两者，
 * 不允许在别处再写第二份。
 */
export const SUITE_GLOBS = [
  'test/*.test.mjs',
  'tooling/test/*.test.mjs',
  'packages/base-entries/test/*.test.mjs',
  'packages/base-render/test/*.test.mjs',
  'packages/skill-calorie/test/*.test.mjs',
  'packages/skill-memo-ilife/test/*.test.mjs',
  'packages/skill-schedule/test/*.test.mjs',
  'packages/skill-home/test/*.test.mjs',
  'packages/skill-bill/test/*.test.mjs',
  'packages/skill-chef/test/*.test.mjs',
  'packages/plugin-manager/test/*.test.mjs',
  'packages/plugin-calorie/test/*.test.mjs',
  'packages/plugin-memo-ilife/test/*.test.mjs',
  'packages/plugin-schedule-ilife/test/*.test.mjs',
  'packages/plugin-home-ilife/test/*.test.mjs',
  'packages/plugin-chef/test/*.test.mjs',
  'packages/plugin-bill-ilife/test/*.test.mjs',
];

/** 单段通配转正则：`*` 匹配任意非分隔符片段，其余字符逐字。 */
function segmentMatcher(segment) {
  const escaped = segment.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp('^' + escaped.replace(/\*/g, '[^/]*') + '$');
}

function readDirSorted(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  } catch {
    return [];
  }
}

function walk(dir, segments, index, out) {
  if (index >= segments.length) return;
  const segment = segments[index];
  const last = index === segments.length - 1;
  if (!segment.includes('*')) {
    const next = path.join(dir, segment);
    if (last) {
      try {
        if (fs.statSync(next).isFile()) out.add(next);
      } catch { /* 缺文件静默跳过 */ }
      return;
    }
    try {
      if (fs.statSync(next).isDirectory()) walk(next, segments, index + 1, out);
    } catch { /* 缺目录静默跳过 */ }
    return;
  }
  const matcher = segmentMatcher(segment);
  for (const entry of readDirSorted(dir)) {
    if (!matcher.test(entry.name)) continue;
    const next = path.join(dir, entry.name);
    if (last) {
      if (entry.isFile()) out.add(next);
    } else if (entry.isDirectory()) {
      walk(next, segments, index + 1, out);
    }
  }
}

/**
 * 展开 glob 清单为文件路径。
 * 返回仓库相对 POSIX 路径，按字典序；同一文件被多条 glob 命中只算一次。
 * 注入 fsImpl 只供测试构造缺目录/符号链接等情形，正常调用不传。
 */
export function expandGlobs(globs, { root = REPO_ROOT, fsImpl = fs } = {}) {
  const absolute = new Set();
  for (const glob of globs) {
    const segments = glob.split('/').filter((part) => part !== '');
    walk(root, segments, 0, absolute);
  }
  return [...absolute]
    .map((file) => path.relative(root, file).split(path.sep).join('/'))
    .sort();
}

/** 全量测试文件清单（SUITE_GLOBS 的展开结果）。 */
export function suiteFiles({ root = REPO_ROOT } = {}) {
  return expandGlobs(SUITE_GLOBS, { root });
}
