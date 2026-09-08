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
import { basename, join, dirname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PKG = join(ROOT, 'packages', 'base-render');
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const SCRATCH = join(ROOT, '.scratch', 't75');

/** 协议 §2.1 第 3 条（全仓事故后新增）：递归删除前必须做路径守卫——
 *  目标必须以**本票独占临时根** `.scratch/t75/pack-` 开头，且不得落在
 *  `node_modules`／`packages`／`docs`／`test`／`tooling`／`.git` 之下。 */
const FORBIDDEN_DIRS = ['node_modules', 'packages', 'docs', 'test', 'tooling', '.git']
  .map((d) => join(ROOT, d).toLowerCase() + sep);
function safeRm(dir, ownPrefix) {
  const abs = resolve(dir);
  const lower = abs.toLowerCase();
  if (!lower.startsWith(resolve(SCRATCH).toLowerCase() + sep) || !basename(abs).startsWith(ownPrefix)) {
    throw new Error('路径守卫失败（不在独占临时根下）：拒绝递归删除 ' + abs);
  }
  for (const p of FORBIDDEN_DIRS) {
    if (lower === p.slice(0, -1) || lower.startsWith(p)) throw new Error('路径守卫失败（敏感目录之下）：' + abs);
  }
  rmSync(abs, { recursive: true, force: true });
}
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
      /* 返修项⑨（D3 修订）：**发布产物**上的 extraCss 三禁强制 —— 合法覆盖块通过、违规抛错。
       * 口径同 #74／#76：错误**不导出**，按 `name`／`code` 判定。 */
      const legalExtra = '.ilife-calorie { --blue: #0055ff; }';
      let legalOk = false;
      try { legalOk = mod.buildStyleSheet({ extraCss: legalExtra }).css.endsWith(legalExtra); } catch (err) { legalOk = false; }
      add('发布产物：合法技能作用域覆盖块通过（末尾追加）', legalOk, 'legal=' + legalOk);
      const guardCode = (extra) => {
        try { mod.buildStyleSheet({ extraCss: extra }); return 'NO-THROW'; }
        catch (err) { return String(err && err.name) + '/' + String(err && err.code); }
      };
      const rootCode = guardCode(':root{--blue:#ff0000}');
      add('发布产物：extraCss `:root` 改写抛错（name/code）', rootCode === 'StyleSheetError/extra-css-root', rootCode);
      const tokenCode = guardCode('.ilife-calorie { --r-xl: 28px; }');
      add('发布产物：extraCss 禁入 token 抛错（name/code）',
        tokenCode === 'StyleSheetError/extra-css-forbidden-token', tokenCode);
      /* 第二轮返修（W2／W3／W4）：发布产物上的三条新事实——避免「仓内 dist 有、发布产物没有」的假绿。 */
      add('发布产物：含 toast 入场 `@keyframes ilife-toast-in`（W4）',
        o.css.includes('@keyframes ilife-toast-in') && o.css.includes('animation: ilife-toast-in'),
        'keyframes=' + o.css.includes('@keyframes ilife-toast-in'));
      add('发布产物：含 `.ilife-copy-btn.copied` 变绿态（W3，`border-color/background: var(--ok)`）',
        o.css.includes('.ilife-copy-btn.copied {') && o.css.includes('border-color: var(--ok);')
          && o.css.includes('background: var(--ok);'),
        'copiedRule=' + o.css.includes('.ilife-copy-btn.copied {'));
      add('发布产物：statusBadge 四态取旧 `.hm-status` 逐值实色（W2）',
        o.css.includes('background: #e6f7ec;') && o.css.includes('color: #1f8c3d;')
          && o.css.includes('background: #fff0ee;') && o.css.includes('color: #a83228;')
          && o.css.includes('background: #f0f0f3;'),
        'legacyBadge=' + o.css.includes('color: #1f8c3d;'));
      published = o;
    }
  }
} finally {
  safeRm(tmp, 'pack-');
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
