#!/usr/bin/env node
/** #95 证据·测试失败集 delta（可复跑，TAP 口径，规避 pwsh 编码干扰）。
 *
 * 取根 package.json 的 `test` 脚本 glob，用同一组文件跑 `node --test`，TAP 报告直写文件（node 自己写 UTF-8），
 * 再与 .scratch/t75/baseline-failing.txt（21 条冻结基线）求差，产出 .scratch/t95/test-delta.md。
 * TAP 会把名字里的 `#` 转义成 `\#`，解析后统一反转义，否则与基线名字对不上（假 delta）。
 *
 * 用法：node docs/research/t95-test-delta.mjs [--reuse] [--tag=A]
 *   --reuse  不重跑测试，直接复用已有 TAP 重新解析。
 *   --tag=X  产物改名 test-tap-X.txt / test-delta-X.md（A/B 隔离用）。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const globs = (JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts.test.match(/"([^"]+)"/g) || []).map((s) => s.slice(1, -1));
if (!globs.length) { console.error('根 test 脚本未解析出 glob'); process.exit(2); }
const scratch = join(root, '.scratch', 't95');
mkdirSync(scratch, { recursive: true });
const tagArg = process.argv.find((a) => a.startsWith('--tag='));
const tag = tagArg ? tagArg.slice(6) : '';
const sfx = tag ? '-' + tag : '';
const tapFile = join(scratch, 'test-tap' + sfx + '.txt');
const REUSE = process.argv.includes('--reuse');
let exit = null;
if (!REUSE) {
  exit = spawnSync(process.execPath, ['--test', '--test-reporter=tap', '--test-reporter-destination=' + tapFile, ...globs], { cwd: root, encoding: 'utf8' }).status;
} else if (!existsSync(tapFile)) { console.error('--reuse 需要已有 ' + tapFile); process.exit(2); }

const tap = readFileSync(tapFile, 'utf8');
// TAP 名字反转义：\# → #（node tap reporter 对 # 加反斜杠）
const unesc = (s) => s.replace(/\\#/g, '#').replace(/\\(.)/g, '$1').trim();
const names = [...tap.matchAll(/^[ \t]*not ok \d+ - (.+?)(?: # time=[\d.]+ms)?[ \t]*$/gm)].map((m) => unesc(m[1]));
const uniq = [...new Set(names)].sort();
const baseFile = join(root, '.scratch', 't75', 'baseline-failing.txt');
const base = readFileSync(baseFile, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
const hit = base.filter((n) => uniq.includes(n));
const added = uniq.filter((n) => !base.includes(n));
const gone = base.filter((n) => !uniq.includes(n));

const rep = [
  '# t95 测试失败集 delta（TAP 口径）',
  '',
  '命令：`node --test --test-reporter=tap --test-reporter-destination=.scratch/t95/test-tap' + sfx + '.txt ' + globs.join(' ') + '`',
  '（glob 取自根 `package.json` 的 `test` 脚本，与 `pnpm test` 同一组文件；TAP 文件由 node 直写 UTF-8，规避 pwsh 转码）',
  '',
  '- node --test exit=' + exit + (REUSE ? '（--reuse 复用既有 TAP）' : ''),
  '- TAP `not ok` 条目=' + names.length + '，去重 ' + uniq.length,
  '- 冻结基线 21 条命中 ' + hit.length + '/21',
  '- 新增（不在基线）=' + added.length,
  '- 基线中消失=' + gone.length,
  '',
  '## 新增（不在基线）',
  ...(added.length ? added.map((n) => '- ' + n) : ['（无）']),
  '',
  '## 基线中已消失',
  ...(gone.length ? gone.map((n) => '- ' + n) : ['（无）']),
  '',
  '## 全部失败项（去重）',
  ...uniq.map((n) => '- ' + n),
  '',
].join('\n');
writeFileSync(join(scratch, 'test-delta' + sfx + '.md'), rep, 'utf8');
console.log('TAP_EXIT=' + exit + ' NOTOK=' + names.length + ' UNIQUE=' + uniq.length + ' BASELINE_HIT=' + hit.length + ' ADDED=' + added.length + ' GONE=' + gone.length);
