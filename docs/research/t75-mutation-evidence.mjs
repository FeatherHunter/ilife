#!/usr/bin/env node
/** #75 变异自证（mutation evidence）：逐个破坏实现 → 断言**对应测试变红** → 还原。
 *
 * 跑法：`node docs/research/t75-mutation-evidence.mjs`（需先 `pnpm build`）
 * 判定：每条变异必须让**指定测试**变红；任一变异「没红」即 `exit 1`（不得假绿）。
 * 口径：
 *  - 变异打在 **`packages/base-render/dist/`（构建产物，未入 git、可重生成）** 上，跑的是
 *    **仓内真实测试文件** `packages/base-render/test/style.test.mjs`（不是脚本自带副本）；
 *  - 每条变异前把整份 `dist` 备份到 `os.tmpdir()`，`finally` 无条件还原；
 *  - 还原失败 → 立即 `exit 1` 并提示 `pnpm build`。
 */
import { readFileSync, writeFileSync, cpSync, rmSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = join(ROOT, 'packages', 'base-render', 'dist');
const TEST_REL = 'packages/base-render/test/style.test.mjs';

/** 变异表：`file` 相对 dist；`from` 必须在文件里**恰出现 1 次**；`expect` = 必须变红的用例名。 */
const MUTATIONS = [
  {
    id: 'M1',
    label: '改一个 token 值（产出层硬编码错误值）',
    file: 'style.js',
    from: "': ' + CSS_VAR_TOKENS[name] + ';'",
    to: "': ' + (name === '--fg' ? '#000000' : CSS_VAR_TOKENS[name]) + ';'",
    expect: ['T4 :root 块逐 token 逐值', 'T18b :root 块逐字节等于契约'],
  },
  {
    id: 'M2a',
    label: '去掉一个命名空间（emptyState 根类名改坏）',
    file: 'style.js',
    from: "'.' + p + 'empty {'",
    to: "'.' + p + 'emptyX {'",
    expect: ['T8 每个区都有真实规则'],
  },
  {
    id: 'M2b',
    label: '去掉一个命名空间（删 helpShell 区实现 → 闭集守卫 fail-fast）',
    file: 'style.js',
    from: 'helpShell: (p) => [',
    to: 'helpShellDisabled: (p) => [',
    expect: ['CONTROL_STYLE_SECTIONS 闭集缺样式区实现'],
  },
  {
    id: 'M3',
    label: '让 extraCss 能改基座（追加改前置）',
    file: 'style.js',
    from: 'parts.push(extraCss);',
    to: 'parts.unshift(extraCss);',
    expect: ['T15 extraCss 原样追加', 'T14 同源'],
  },
  {
    id: 'M4',
    label: 'charts 区重述（不再复用 chartsCss）',
    file: 'style.js',
    from: 'charts: (p) => chartsCss(p),',
    to: "charts: (p) => '.ilife-charts{color:red}',",
    expect: ['T12 charts 区逐字节复用', 'T13 零装饰渐变'],
  },
  {
    id: 'M5',
    label: '类名撞车处置失效（errorReceipt 退回裸 .ilife-error）',
    file: 'style.js',
    from: "'.' + p + 'error:has(> .' + p + 'error-title) {'",
    to: "'.' + p + 'error {'",
    expect: ['T21 类名撞车处置'],
  },
];

if (!existsSync(DIST)) {
  console.error('证据缺失：dist 不存在，请先 `pnpm build`。**显式失败，不静默跳过**');
  process.exit(1);
}

const BACKUP = join(tmpdir(), 't75-dist-backup-' + process.pid);
cpSync(DIST, BACKUP, { recursive: true });

const restore = () => {
  rmSync(DIST, { recursive: true, force: true });
  cpSync(BACKUP, DIST, { recursive: true });
  rmSync(BACKUP, { recursive: true, force: true });
};

const rows = [];
let bad = 0;

try {
  for (const m of MUTATIONS) {
    const target = join(DIST, m.file);
    const original = readFileSync(target, 'utf8');
    const hits = original.split(m.from).length - 1;
    if (hits !== 1) {
      rows.push({ id: m.id, label: m.label, verdict: 'FAIL', detail: '锚点命中 ' + hits + ' 次（应为 1）' });
      bad += 1;
      continue;
    }
    writeFileSync(target, original.split(m.from).join(m.to), 'utf8');
    let out = '';
    try {
      const r = spawnSync(process.execPath, ['--test', TEST_REL], { cwd: ROOT, encoding: 'utf8' });
      out = (r.stdout || '') + (r.stderr || '');
    } finally {
      writeFileSync(target, original, 'utf8');
    }
    const failLine = (out.match(/^ℹ fail (\d+)$/m) ?? [])[1];
    const red = Number(failLine ?? 0) > 0;
    const matched = m.expect.filter((name) => out.includes(name));
    const ok = red && matched.length > 0;
    if (!ok) bad += 1;
    rows.push({
      id: m.id,
      label: m.label,
      verdict: ok ? 'PASS' : 'FAIL',
      detail: 'fail=' + (failLine ?? '?') + '；命中预期用例=' + (matched.join('／') || '无'),
    });
  }
} finally {
  restore();
}

// 还原后必须重新变绿（自证还原有效）。
const after = spawnSync(process.execPath, ['--test', TEST_REL], { cwd: ROOT, encoding: 'utf8' });
const afterFail = Number(((after.stdout || '').match(/^ℹ fail (\d+)$/m) ?? [])[1] ?? 1);

console.log('# #75 变异自证（mutation evidence）');
console.log('');
console.log('| 变异 | 破坏什么 | 结果 | 证据（对应测试是否变红） |');
console.log('|---|---|---|---|');
for (const r of rows) console.log('| ' + r.id + ' | ' + r.label + ' | ' + r.verdict + ' | ' + r.detail + ' |');
console.log('');
console.log('还原后重跑：fail=' + afterFail + (afterFail === 0 ? '（绿，还原有效）' : '（红，还原失败 → 请 `pnpm build`）'));
console.log('RESULT: ' + (rows.filter((r) => r.verdict === 'PASS').length) + '/' + rows.length + ' 变异使对应测试变红');
if (bad > 0 || afterFail !== 0) process.exit(1);
