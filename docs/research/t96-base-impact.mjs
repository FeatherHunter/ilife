#!/usr/bin/env node
/**
 * #96 · 「base-* 变更 → 5 技能页面差异 0」的**结构性**证明（非侵入，不改任何包）。
 *
 * 思路：快照门冻结的是 5 技能的 HTML 产物；但「为什么 base-paint 一改它们也不会变」需要一个
 * **可达性**论证。本探针算每个技能 `dist/index.js` 的 **ES 模块 import 闭包**：
 *   · 闭包里的外部包 = 该技能运行时可能加载的全部 workspace 包；
 *   · 若 `base-paint`／`base-render` 不在闭包内 → base-* 的任何变更都**没有路径**影响这 5 个技能
 *     （⇒ 快照差异必然为 0，与快照门的实测结果互为印证）。
 *
 * **正对照（防自我满足）**：`skill-calorie` 的闭包**必须**含 `base-paint`。若探针连 calorie 都测不出
 * base-paint，那它对 5 技能的「不含」结论也不可信 → 本探针自证有鉴别力。
 *
 * 用法：`node docs/research/t96-base-impact.mjs`（只读；不需持锁）
 * 输出：每个技能的外部依赖闭包 ＋ `RESULT:` 机读摘要行。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FIVE = ['skill-bill', 'skill-chef', 'skill-home', 'skill-schedule', 'skill-memo-ilife'];
const BASE_STAR = new Set(['base-paint', 'base-render']);
const BUILTINS = new Set(['fs', 'path', 'url', 'crypto', 'child_process', 'os', 'util', 'assert',
  'events', 'stream', 'buffer', 'module', 'process', 'node:test']);

const IMPORT_RE = /(?:^|[^\w$])(?:import|export)\s+(?:[^'"]*?\sfrom\s*)?['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g;

function specsOf(file) {
  const out = [];
  for (const m of readFileSync(file, 'utf8').matchAll(IMPORT_RE)) out.push(m[1] || m[2]);
  return out;
}

/** 从入口深度优先遍历，返回 { files, external }。 */
function closure(entry) {
  const files = new Set();
  const external = new Set();
  const stack = [entry];
  while (stack.length) {
    const f = stack.pop();
    if (files.has(f) || !existsSync(f)) continue;
    files.add(f);
    for (const spec of specsOf(f)) {
      if (spec.startsWith('node:') || BUILTINS.has(spec)) continue;
      if (spec.startsWith('.')) {
        const abs = resolve(dirname(f), spec);
        stack.push(abs);
        if (!abs.endsWith('.js')) stack.push(abs + '.js');
      } else {
        external.add(spec.split('/').slice(0, spec.startsWith('@') ? 2 : 1).join('/'));
      }
    }
  }
  return { files: [...files], external: [...external].sort() };
}

function readdirDeep(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) out.push(...readdirDeep(abs));
    else out.push(abs);
  }
  return out;
}

/** base-* 源码指纹（与快照门同口径的简化版）：证明探针期间没动过 base-*。 */
function baseFingerprint() {
  const roots = [join(ROOT, 'packages/base-render/src'), join(ROOT, 'packages/base-link-core/src')];
  const h = createHash('sha256');
  let n = 0;
  for (const r of roots) {
    if (!existsSync(r)) continue;
    for (const f of readdirDeep(r).sort()) {
      h.update(relative(ROOT, f).replace(/\\/g, '/')).update('\0')
        .update(readFileSync(f, 'utf8').replace(/\r\n/g, '\n')).update('\0');
      n++;
    }
  }
  return { sha256: h.digest('hex').slice(0, 32), files: n };
}

const fpBefore = baseFingerprint();
let bad = 0;
const rows = [];

for (const pkg of [...FIVE, 'skill-calorie']) {
  const entry = join(ROOT, 'packages', pkg, 'dist', 'index.js');
  if (!existsSync(entry)) {
    console.error(`FAIL: 缺构建产物 ${relative(ROOT, entry)}（请先 pnpm build）`);
    bad++;
    continue;
  }
  const { files, external } = closure(entry);
  const baseStar = external.filter((d) => BASE_STAR.has(d));
  const isFive = FIVE.includes(pkg);
  const ok = isFive ? baseStar.length === 0 : baseStar.length > 0;
  if (!ok) bad++;
  rows.push({ pkg, files: files.length, external, baseStar, isFive, ok });
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${pkg}: dist 文件 ${files.length} 件；外部依赖闭包 = [${external.join(', ') || '（无）'}]；base-* 命中 = [${baseStar.join(', ') || '（无）'}]`);
}

const cal = rows.find((r) => r.pkg === 'skill-calorie');
const fiveClean = rows.filter((r) => r.isFive);
if (!cal || cal.baseStar.length === 0) {
  console.error('FAIL: 正对照失败 —— skill-calorie 闭包未含 base-paint，探针无鉴别力（对 5 技能的「不含」结论不可信）');
  bad++;
} else {
  console.log(`POSITIVE-CONTROL: skill-calorie 闭包含 [${cal.baseStar.join(', ')}] → 探针能测出 base-* 消费`);
}
for (const r of fiveClean) {
  if (!r.external.includes('base-link-core')) { console.error(`FAIL: ${r.pkg} 闭包未含 base-link-core（探针可能空转）`); bad++; }
}

const fpAfter = baseFingerprint();
if (fpBefore.sha256 !== fpAfter.sha256) {
  console.error(`FAIL: 探针期间 base-* 源码被改动（${fpBefore.sha256} → ${fpAfter.sha256}）`);
  bad++;
}
console.log(`BASE-* FINGERPRINT: ${fpBefore.sha256}（${fpBefore.files} 文件；探针前后同值=${fpBefore.sha256 === fpAfter.sha256}）`);
console.log(`RESULT: skills=${fiveClean.length} five_clean=${fiveClean.filter((r) => r.baseStar.length === 0).length} positive_control_base_star=${cal ? cal.baseStar.length : 0} bad=${bad}`);
process.exit(bad ? 1 : 0);
