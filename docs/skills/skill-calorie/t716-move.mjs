/**
 * #716 搬迁器：照片族四件 `src/render/` → `src/photo/` ＋ 引用改径 ＋ 台账手改。
 *
 * 纪律（照 `docs/skills/skill-calorie/t715-move.mjs` 的先例）：
 *   ① 每一条替换**逐条锚定**（字符串必须命中预期次数，不符即整脚本 exit 1、不落盘）；
 *   ② 落盘后跑**自检**：`src/**` 里每一条相对 specifier 都必须解析到盘上真件（第四步，失败即 exit 1）；
 *   ③ 只碰本票申报的路径。零 git 动作、不碰真库。
 *
 * 顺序纪律（#716 的 Q5′）：**台账手改在本脚本里做、排在 `--sync` 之前**。
 * 若让 `--sync` 顺手改名，`planSync` 会把旧址那行 DROP、再按 `REQUIRED` 自动补一行「挂号值 457 ＋
 * 待补模板结论」——「#354 挂号原文」那句结论当场烧掉。
 *
 * 用法：node .scratch/t716/move.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PKG = join(ROOT, 'packages', 'skill-calorie');
const log = [];

/** 逐条锚定替换：命中数不符即抛（整脚本不落盘）。 */
function edit(relPath, pairs) {
  const abs = join(PKG, relPath);
  let src = readFileSync(abs, 'utf8');
  for (const [from, to, expect = 1] of pairs) {
    const n = src.split(from).length - 1;
    if (n !== expect) throw new Error(`锚点不符：${relPath}\n  期望命中 ${expect} 次、实测 ${n} 次\n  锚点=${JSON.stringify(from.slice(0, 120))}`);
    src = src.split(from).join(to);
  }
  writeFileSync(abs, src, 'utf8');
  log.push(`EDIT ${relPath}`);
}

/** 搬件：读出 → 改内文 → 落新址 → 删旧址（路径变化由 git 判重命名）。 */
function move(relFrom, relTo, pairs) {
  const from = join(PKG, relFrom);
  const to = join(PKG, relTo);
  let src = readFileSync(from, 'utf8');
  for (const [f, t, expect = 1] of pairs) {
    const n = src.split(f).length - 1;
    if (n !== expect) throw new Error(`锚点不符：${relFrom}\n  期望命中 ${expect} 次、实测 ${n} 次\n  锚点=${JSON.stringify(f.slice(0, 120))}`);
    src = src.split(f).join(t);
  }
  writeFileSync(to, src, 'utf8');
  // 旧址**删掉**（git 按内容判重命名）；删之前先在本票独占的 backup/ 里留一份原样副本，
  // 便于还原对照——**不**落在 `tmp-out/`（那里被重出器 rmSync）。
  mkdirSync(join(HERE, 'backup'), { recursive: true });
  writeFileSync(join(HERE, 'backup', relFrom.split('/').pop()), readFileSync(from, 'utf8'), 'utf8');
  rmSync(from);
  log.push(`MOVE ${relFrom} -> ${relTo}`);
}

/* ── 一 · 四件搬迁（只改「跟着走的件离了目录就断」的那些行 ＋ 两处活注释） ─────────── */
move('src/render/wizardPort.ts', 'src/photo/wizardPort.ts', [
  ["import { listPhotos } from '../photo/photos.js';", "import { listPhotos } from './photos.js';"],
  ["import { toCard } from '../photo/photo.js';", "import { toCard } from './photo.js';"],
  ["import { CalorieRenderError } from './errors.js';", "import { CalorieRenderError } from '../render/errors.js';"],
  // 两行死转出（零生产调用方，唯一消费者是测试且已从定义地取）删掉；
  // 注释保留历史半句（#353 迁出身体两页），去掉描述被删行的那半句。
  [
    '/* ── 身体两页已迁出（#353）：记围度／记体脂的视图与 prompt 原样迁入 src/body/wizardPlate.ts，本件只留身材照／GIF。下行为测试兼容转出（实现不在此）。 */\n'
      + "export { WIZARD_CALIPER_LABELS, WIZARD_MEASURE_CAMEL, WIZARD_MEASURE_LABELS } from '../body/wizardPlate.js';\n"
      + "export type { CompositionWizardView, MeasureWizardView } from '../body/wizardPlate.js';\n",
    '/* ── 身体两页已迁出（#353）：记围度／记体脂的视图与 prompt 原样迁入 src/body/wizardPlate.ts，本件只留身材照／GIF。 */\n',
  ],
]);

move('src/render/wizardPortDocs.ts', 'src/photo/wizardPortDocs.ts', [
  ["import { nowStamp } from './receipt.js';", "import { nowStamp } from '../render/receipt.js';"],
  ["import { chipRow, photoPickRows, photoUiCss } from '../photo/photoUi.js';", "import { chipRow, photoPickRows, photoUiCss } from './photoUi.js';"],
  ["import { editRows, noticeBar, wizardUiCss } from '../photo/wizardUi.js';", "import { editRows, noticeBar, wizardUiCss } from './wizardUi.js';"],
  ['数据由 render/wizardPort.ts 备齐', '数据由 photo/wizardPort.ts 备齐'],
]);

move('src/render/helpShell.ts', 'src/photo/helpShell.ts', [
  ["import { CalorieRenderError } from './errors.js';", "import { CalorieRenderError } from '../render/errors.js';"],
  ["import type { HelpFileData } from '../photo/helpFile.js';", "import type { HelpFileData } from './helpFile.js';"],
]);

move('src/render/templates.ts', 'src/photo/templates.ts', [
  ["import { CalorieRenderError } from './errors.js';", "import { CalorieRenderError } from '../render/errors.js';"],
  ['装载器从 dist/render/*.js 上溯两级', '装载器从 dist/photo/*.js 上溯两级'],
]);

/* ── 二 · 调用方（生产）：import 行 ＋ 六处「件住哪」活引用（#715 §1.1 口径） ─────── */
edit('src/photo/wizard.ts', [
  ["import { buildGifPlannerView, buildPhotoLogWizardView } from '../render/wizardPort.js';", "import { buildGifPlannerView, buildPhotoLogWizardView } from './wizardPort.js';"],
  ["import { buildGifPlannerDoc, buildPhotoLogWizardDoc } from '../render/wizardPortDocs.js';", "import { buildGifPlannerDoc, buildPhotoLogWizardDoc } from './wizardPortDocs.js';"],
  ['视图数据与整页文档走共用件 `render/wizardPort.ts`／`render/wizardPortDocs.ts`', '视图数据与整页文档走本能力内部件 `src/photo/wizardPort.ts`／`src/photo/wizardPortDocs.ts`'],
]);
edit('src/photo/helpFile.ts', [
  ["import { renderHelpShellHtml } from '../render/helpShell.js';", "import { renderHelpShellHtml } from './helpShell.js';"],
]);
edit('src/photo/helpCenter.ts', [
  ["import { CALORIE_TEMPLATES, loadTemplate } from '../render/templates.js';", "import { CALORIE_TEMPLATES, loadTemplate } from './templates.js';"],
]);
edit('src/render/index.ts', [
  ["export { CALORIE_TEMPLATES, loadTemplate } from './templates.js';\nexport type { CalorieTemplate } from './templates.js';\n", ''],
]);
edit('src/shared/docPage.ts', [
  ['（`src/render/wizardPortDocs.ts` 那四页）', '（身体那两页住 `src/body/wizardDocs.ts`、身材照那两页住 `src/photo/wizardPortDocs.ts`）'],
]);
edit('src/profile/setup.ts', [
  ['（与 `render/wizardPort.ts` 同字面', '（与 `src/photo/wizardPort.ts` 同字面'],
]);
edit('src/body/wizardPlate.ts', [
  ['身材照／GIF 两页仍住 `render/wizardPort.ts`，本件不碰。', '身材照／GIF 两页住 `src/photo/wizardPort.ts`（#716 起），本件不碰。'],
]);
edit('src/body/wizardDocs.ts', [
  ['身材照／GIF 两页仍住 `render/wizardPortDocs.ts`，本件不碰。', '身材照／GIF 两页住 `src/photo/wizardPortDocs.ts`（#716 起），本件不碰。'],
]);

/* ── 三 · 测试面 ─────────────────────────────────────────────────────────────── */
edit('test/photo-help-flow-345.test.mjs', [
  ["from '../dist/render/wizardPort.js'", "from '../dist/photo/wizardPort.js'"],
]);
edit('test/help-shell-134.test.mjs', [
  ["from '../dist/render/helpShell.js'", "from '../dist/photo/helpShell.js'"],
]);
// `WIZARD_MEASURE_CAMEL` 是身体域口径，改从**定义地**取（与 `t440-部位名单一来源.test.mjs` 同一条
// dist 路径）——两行死转出删掉后就不必再靠「薄转出声明豁免」过 `check-one-path`。
edit('test/wizard-86.test.mjs', [
  ["import { WIZARD_MEASURE_CAMEL } from '../dist/render/wizardPort.js';", "import { WIZARD_MEASURE_CAMEL } from '../dist/body/wizardPlate.js';"],
]);
edit('test/t445-告警线门.test.mjs', [
  ['冻结挂号值 `src/render/wizardPort.ts｜457`', '冻结挂号值 `src/photo/wizardPort.ts｜457`'],
  ["  ['src/render/wizardPort.ts', 457],", "  ['src/photo/wizardPort.ts', 457],"],
  ["  mkdirSync(path.join(dir, 'src', 'render'), { recursive: true });\n", "  mkdirSync(path.join(dir, 'src', 'render'), { recursive: true });\n  mkdirSync(path.join(dir, 'src', 'photo'), { recursive: true });\n"],
]);
edit('test/skill-t11.test.mjs', [
  ["import { CALORIE_TEMPLATES, loadTemplate, CalorieRenderError } from '../dist/render/index.js';",
    "import { CALORIE_TEMPLATES, loadTemplate } from '../dist/photo/templates.js';\nimport { CalorieRenderError } from '../dist/render/index.js';"],
  // 装载器夹具：`templates.ts` 搬进 `photo/` 后引 `../render/errors.js`，平铺复制不再成立 ⇒ 照安装布局重排。
  [`      const rel = join('node_modules', 'skill-calorie');
      const dst = join(tmp, rel, 'dist', 'render');
      mkdirSync(dst, { recursive: true });
      for (const f of ['templates.js', 'errors.js']) copyFileSync(join(pkgDir, 'dist', 'render', f), join(dst, f));
      const mod = await import(pathToFileURL(join(dst, 'templates.js')).href);`,
  `      const rel = join('node_modules', 'skill-calorie');
      const distRoot = join(tmp, rel, 'dist');
      mkdirSync(join(distRoot, 'photo'), { recursive: true });
      mkdirSync(join(distRoot, 'render'), { recursive: true });
      copyFileSync(join(pkgDir, 'dist', 'photo', 'templates.js'), join(distRoot, 'photo', 'templates.js'));
      copyFileSync(join(pkgDir, 'dist', 'render', 'errors.js'), join(distRoot, 'render', 'errors.js'));
      const mod = await import(pathToFileURL(join(distRoot, 'photo', 'templates.js')).href);`],
]);

/* ── 四 · 门与台账（台账手改**必须**排在 `--sync` 之前，见头注） ───────────────────── */
edit('scripts/check-warning-line.mjs', [
  ["  { path: 'src/render/wizardPort.ts', lf: 457 },", "  { path: 'src/photo/wizardPort.ts', lf: 457 },"],
]);
edit('AGENTS.md', [
  ['| `src/render/wizardPort.ts` | 457 | 277 |', '| `src/photo/wizardPort.ts` | 457 | 277 |'],
  ['**#445 当场实测已落回 350 以内，挂号行保留（457 是历史事实、不回改），本行不再触发第四步。** |',
    '**#445 当场实测已落回 350 以内，挂号行保留（457 是历史事实、不回改），本行不再触发第四步。** **#716 已在场**（纯搬迁，277→275；「件」列地址由本票手改，挂号值 457 与以上结论原样带过去）：本件按归属律自 `src/render/wizardPort.ts` **原样迁入能力目录 `src/photo/`**（同族 `wizardPortDocs`／`helpShell`／`templates` 一并迁入）；迁入时删掉两行**零生产调用方**的身体域转出（`export … from \'../body/wizardPlate.js\'`，唯一消费者 `test/wizard-86.test.mjs` 已改指 `dist/body/wizardPlate.js` 这个定义地）——那是搬迁做出来的能力↔能力内部件直引，按铁律一在本窗摆正；其余 275 行逐字节相同。搬迁判据＝向导两键全分支 ＋ HELP 三支共 20 页 ＋ 2 条对照页逐字节相同（`docs/skills/skill-calorie/t716-搬家-证据.md`）；拆法一字未改、待收口票认领。 |'],
  ['需求原文里的冻结值是 `src/render/wizardPort.ts｜457`、`scripts/gen-cli.mjs｜729`（来源＝`docs/skills/skill-calorie/t169-设计定稿.md` 票 2 票面）。',
    '需求原文里的冻结值是 `src/render/wizardPort.ts｜457`、`scripts/gen-cli.mjs｜729`（来源＝`docs/skills/skill-calorie/t169-设计定稿.md` 票 2 票面；前一件 **#716 起住 `src/photo/wizardPort.ts`**——需求原文那句是 #354 当期验收的历史记录，按「地址随实况、历史不改」逐字不动）。'],
]);

/* ── 五 · 自检：`src/**` 每条相对 specifier 必须解析到盘上真件（第四步，失败即 exit 1） ── */
function walk(dir, ext, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) walk(abs, ext, out);
    else if (e.isFile() && e.name.endsWith(ext)) out.push(abs);
  }
  return out;
}
let checked = 0;
const unresolved = [];
const staleLiterals = [];
for (const abs of walk(join(PKG, 'src'), '.ts')) {
  const src = readFileSync(abs, 'utf8');
  for (const m of src.matchAll(/\bfrom\s+'([^']+)'/g)) {
    const spec = m[1];
    if (!spec.startsWith('.')) continue;
    checked += 1;
    const target = resolve(dirname(abs), spec);
    if (!existsSync(target) && !existsSync(target.replace(/\.js$/, '.ts'))) {
      unresolved.push(`${relative(ROOT, abs).split(sep).join('/')} -> ${spec}`);
    }
  }
  // 代码行里的旧址字面必须为零；注释行里的旧址另计（历史事实句照旧不动）。
  for (const line of src.split('\n')) {
    if (!/render\/(wizardPort|wizardPortDocs|helpShell|templates)/.test(line)) continue;
    const isComment = /^\s*(\/\*|\*|\/\/)/.test(line);
    staleLiterals.push(`${isComment ? 'COMMENT' : 'CODE!!'} ${relative(ROOT, abs).split(sep).join('/')} :: ${line.trim().slice(0, 90)}`);
  }
}
console.log(log.join('\n'));
console.log(`SELF-CHECK ① 相对 specifier 解析：${checked} 条，未解析 ${unresolved.length} 条`);
for (const u of unresolved) console.log('  UNRESOLVED ' + u);
console.log(`SELF-CHECK ② 旧址字面残留：代码行 ${staleLiterals.filter((l) => l.startsWith('CODE')).length} 处（要求 0）／注释行 ${staleLiterals.filter((l) => l.startsWith('COMMENT')).length} 处（历史事实句，逐条点名）`);
for (const l of staleLiterals) console.log('  ' + l);
if (unresolved.length) { console.log('RESULT: 自检红，见上'); process.exit(1); }
if (staleLiterals.some((l) => l.startsWith('CODE'))) { console.log('RESULT: 自检红（代码行仍写旧址）'); process.exit(1); }
console.log('RESULT: 搬迁与自检全绿');
