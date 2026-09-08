#!/usr/bin/env node
/** #75 发布面实证（票面验收①「共享 CSS 资产随 base-paint 发布（`files` 实证）」）。
 *
 * 跑法：`node docs/research/t75-publish-evidence.mjs`（需先 `pnpm build`）
 * 判据（裁定 R1：`pnpm publish:tarball` **不能**证明 base-paint 的 files ——
 * `tooling/check-publish.mjs` 的 `--tarball` 分支只断言 6 skill ＋ 6 单品，base-paint 不在其列）：
 *  1. `npm pack --dry-run` 清单含 `dist/index.js`／`dist/style.js`／`dist/spec/style.js`，且**不含** `style/`；
 *  2. **真打 tarball**（`npm pack --pack-destination <tmp>`）→ 解包 → 从**解包后的发布产物**
 *     `package/dist/index.js` 动态 import，调 `buildStyleSheet()` 并断言 4 字段与关键 CSS 事实。
 *  任一条不成立 → exit 1（不得用「推理」代替取证）。
 */
import { mkdtempSync, mkdirSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PKG = join(ROOT, 'packages', 'base-render');
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const rows = [];
let bad = 0;
const add = (name, pass, detail) => { rows.push({ name, pass: pass === true, detail: String(detail) }); if (pass !== true) bad += 1; };

if (!existsSync(join(PKG, 'dist', 'index.js'))) {
  console.error('证据缺失：dist 不存在，请先 `pnpm build`。**显式失败，不静默跳过**');
  process.exit(1);
}

/* 1. 静态清单（--dry-run，不落盘；npm 把 notice 写 stderr，必须 2>&1 合并） */
const dry = spawnSync(NPM, ['pack', '--dry-run'], { cwd: PKG, encoding: 'utf8', shell: process.platform === 'win32' });
const dryOut = (dry.stdout || '') + (dry.stderr || '');
add('dry-run 退出码 0', dry.status === 0, 'status=' + dry.status);
for (const f of ['dist/index.js', 'dist/style.js', 'dist/spec/style.js', 'dist/charts.js']) {
  add('清单含 ' + f, dryOut.includes(f), f);
}
add('清单不含 style/tokens.css（非契约资产、不在 files）', !/notice\s+\S+\s+style\//.test(dryOut), 'style/ 命中=' + (/notice\s+\S+\s+style\//.test(dryOut) ? 1 : 0));
const totalFiles = Number((dryOut.match(/total files:\s*(\d+)/) ?? [])[1] ?? 0);
add('total files ≥ 69（基线 69，只增不减）', totalFiles >= 69, 'total=' + totalFiles);

/* 2. 真打 tarball → 解包 → 从发布产物 import。
 *    工作目录用仓内 `.scratch/t75/`（gitignored）：Windows 的 `tar`(bsdtar) 在
 *    含非 ASCII 的 `%TEMP%` 路径下解包会失败（实测 status=1），故不用 `os.tmpdir()`。 */
const scratch = join(ROOT, '.scratch', 't75');
mkdirSync(scratch, { recursive: true });
const tmp = mkdtempSync(join(scratch, 'pack-'));
let published;
try {
  const pack = spawnSync(NPM, ['pack', '--pack-destination', tmp], { cwd: PKG, encoding: 'utf8', shell: process.platform === 'win32' });
  const packOut = (pack.stdout || '') + (pack.stderr || '');
  const tgz = readdirSync(tmp).find((f) => f.endsWith('.tgz'));
  add('真打 tarball 成功', pack.status === 0 && typeof tgz === 'string', 'tgz=' + (tgz ?? 'NONE') + ' status=' + pack.status);
  if (typeof tgz === 'string') {
    const untar = spawnSync('tar', ['-xzf', join(tmp, tgz), '-C', tmp], { encoding: 'utf8' });
    add('解包成功', untar.status === 0, 'status=' + untar.status);
    const entry = join(tmp, 'package', 'dist', 'index.js');
    add('解包含 package/dist/index.js', existsSync(entry), entry);
    if (existsSync(entry)) {
      const mod = await import(pathToFileURL(entry).href);
      add('发布产物导出 buildStyleSheet（function）', typeof mod.buildStyleSheet === 'function', 'typeof=' + typeof mod.buildStyleSheet);
      const o = mod.buildStyleSheet();
      add('四字段齐全且冻结', Object.isFrozen(o) && typeof o.css === 'string' && Array.isArray(o.tokens) && typeof o.prefix === 'string' && typeof o.version === 'string', 'frozen=' + Object.isFrozen(o));
      add('css 非空', o.css.length > 0, 'cssBytes=' + Buffer.byteLength(o.css));
      add('tokens 恰 11 个', o.tokens.length === 11, 'tokens=' + o.tokens.length);
      add('prefix 缺省 ilife-', o.prefix === 'ilife-', 'prefix=' + o.prefix);
      add('version === STYLE_VERSION', o.version === mod.STYLE_VERSION, o.version + ' vs ' + mod.STYLE_VERSION);
      add('css 含 --blue 逐字', o.css.includes('--blue: #007aff'), 'hasBlue=' + o.css.includes('--blue: #007aff'));
      add('css 无 Q14 禁入项', !o.css.includes('--r-xl') && !o.css.includes('--pink'), 'forbidden=0');
      add('css 无包裹标签（可直接喂 fillTemplate）', !o.css.includes('<style') && !o.css.includes('</style'), 'bare=true');
      published = o;
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const pass = rows.filter((r) => r.pass).length;
console.log('# #75 发布面实证（票面验收①「files 实证」）');
console.log('');
console.log('- 包：`base-paint`（`packages/base-render`）；命令：`npm pack --dry-run` ＋ `npm pack --pack-destination <tmp>` → 解包 → import');
console.log('- 口径：裁定 R1 —— 现成 `pnpm publish:tarball` **不覆盖** base-paint，故必须真打 tarball 取证；任一条不成立 → exit 1');
console.log('');
console.log('| 判据 | 结果 | 证据 |');
console.log('|---|---|---|');
for (const r of rows) console.log('| ' + r.name + ' | ' + (r.pass ? 'PASS' : '**FAIL**') + ' | ' + r.detail + ' |');
console.log('');
console.log('RESULT: ' + pass + '/' + rows.length + (published === undefined ? '' : '（发布产物 css=' + Buffer.byteLength(published.css) + ' B）'));
if (bad > 0) process.exit(1);
