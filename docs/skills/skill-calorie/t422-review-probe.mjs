/** #422 独立对抗审查探针（**只读**，可复跑）——打实施席判据 `test/fusion-shared-422.test.mjs` 的盲区。
 *
 * 用法：`node docs/skills/skill-calorie/t422-review-probe.mjs`
 * 退出码：0 ＝ 读数与硬不变量一致；2 ＝ 有硬不变量偏离（读数照印，供对账）。
 *
 * 三组读数：
 *   ① 单源可判（自写口径，不复用被审判据的函数）：四类色字面量、四态标签表中文，各只在一处；
 *      **并做引号口径对照**——被审判据只认单引号形状，本探针同时给「任意引号」口径的读数。
 *   ② 第二份定义：`src/weight|photo|diet|body|analysis|render|profile` 里各自有没有
 *      「结论条／徽章／空态」实现，以及同名 `fieldLabel`／`sourceLine` 的竞争定义地。
 *   ③ 鉴别力：被审判据的正则对**同义异形**写法是否失明（合成串对照），以及扫描面覆盖率。
 *
 * 纪律：本件只读文件，不写任何东西；不 import 被审判据，避免同源污染。
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PACKAGES = join(ROOT, 'packages');

/** 本票声明的六件（相对仓根）。 */
const SIX = [
  'packages/skill-calorie/src/shared/operationHead.ts',
  'packages/skill-calorie/src/shared/fieldLabel.ts',
  'packages/skill-calorie/src/shared/sourceLine.ts',
  'packages/skill-calorie/src/shared/conclusionLine.ts',
  'packages/skill-calorie/src/shared/emptyGuide.ts',
  'packages/skill-calorie/src/exercise/categoryColors.ts',
];

/** 被审判据里逐字用到的两条正则（用于对照，不 import 判据本体）。 */
const JUDGE_COLOR_BINDING = /\b(?:strength|cardio|flex|daily)\s*:\s*'#[0-9a-fA-F]{6}'/g;
const JUDGE_LABEL_BINDING = /(?:create|add|update|delete)\s*:\s*'(?:新增|修改|删除)'/;
const JUDGE_EMPTY_CLASS = /class="[^"]*\bempty\b/;

const TEXT_EXT = /\.(ts|mts|cts|mjs|cjs|js|html|json|md)$/;

function walk(dir, out = []) {
  let entries = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
      walk(full, out);
    } else if (TEXT_EXT.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** 全仓源码树 `packages/<件>/src/**`——被审判据 `walkSources()` 的同面。 */
function walkSkillSources() {
  const out = [];
  for (const entry of readdirSync(PACKAGES, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    walk(join(PACKAGES, entry.name, 'src'), out);
  }
  return out;
}

const rel = (p) => relative(ROOT, p).split('\\').join('/');
const read = (f) => readFileSync(f, 'utf8');
const shape = (s) => JSON.stringify(s);

/** 命中文件清单（排序稳定）。 */
function hits(files, re) {
  return files.filter((f) => re.test(read(f))).map(rel).sort();
}
function count(files, re) {
  let n = 0;
  for (const f of files) n += (read(f).match(re) ?? []).length;
  return n;
}

const lines = [];
const say = (s) => {
  lines.push(s);
  console.log(s);
};
const hard = [];

/* ── ① 单源可判 ─────────────────────────────────────────────────────── */
const src = walkSkillSources();
say(`PROBE-SURFACE 源码树文件数=${src.length}（packages/<件>/src/**，同被审判据 walkSources()）`);

for (const [hex, cls] of [
  ['#5856d6', 'strength'],
  ['#0071e3', 'cardio'],
  ['#34c759', 'flex'],
  ['#ff9500', 'daily'],
]) {
  const bare = hits(src, new RegExp(hex, 'g'));
  say(`PROBE-COLOR 裸值 ${hex}（${cls}） 命中文件数=${bare.length} files=${bare.join(',')}`);
}

const bindSingle = hits(src, /\b(?:strength|cardio|flex|daily)\s*:\s*'#[0-9a-fA-F]{6}'/);
const bindAny = hits(src, /\b(?:strength|cardio|flex|daily)\s*:\s*["'`]#[0-9a-fA-F]{6}["'`]/);
say(`PROBE-COLOR 单源-键值绑定（单引号／被审判据口径） 命中文件数=${bindSingle.length} files=${bindSingle.join(',')}`);
say(`PROBE-COLOR 单源-键值绑定（任意引号／本探针口径） 命中文件数=${bindAny.length} files=${bindAny.join(',')}`);

const four = src.filter((f) => ['#5856d6', '#0071e3', '#34c759', '#ff9500'].every((h) => read(f).includes(h))).map(rel).sort();
say(`PROBE-COLOR 单源-四值同现 命中文件数=${four.length} files=${four.join(',')}`);

const labelSingle = hits(src, JUDGE_LABEL_BINDING);
const labelAny = hits(src, /(?:create|add|update|delete)\s*:\s*["'`](?:新增|修改|删除)["'`]/);
say(`PROBE-LABEL 单源-四态标签表（单引号／被审判据口径） 命中文件数=${labelSingle.length} files=${labelSingle.join(',')}`);
say(`PROBE-LABEL 单源-四态标签表（任意引号／本探针口径） 命中文件数=${labelAny.length} files=${labelAny.join(',')}`);
say(`PROBE-LABEL 同面键值出现次数（单引号口径） n=${count(src, /\b(?:create|add|update|delete)\s*:\s*'(?:新增|修改|删除)'/g)}`);

// 硬不变量：单源＝1 件且是声明的那一件。
for (const [name, list, want] of [
  ['色表绑定(单引号)', bindSingle, 'packages/skill-calorie/src/exercise/categoryColors.ts'],
  ['色表绑定(任意引号)', bindAny, 'packages/skill-calorie/src/exercise/categoryColors.ts'],
  ['四值同现', four, 'packages/skill-calorie/src/exercise/categoryColors.ts'],
  ['四态标签表(单引号)', labelSingle, 'packages/skill-calorie/src/shared/operationHead.ts'],
  ['四态标签表(任意引号)', labelAny, 'packages/skill-calorie/src/shared/operationHead.ts'],
]) {
  const ok = list.length === 1 && list[0] === want;
  if (!ok) hard.push(`${name} 单源偏离：${list.join('、') || '(无命中)'}`);
  say(`PROBE-CHECK 单源 ${name} 唯一性=${ok ? 'OK' : '偏离'}`);
}

/* ── ② 空态结构自造面（技能层） ──────────────────────────────────────── */
const skill = walk(join(PACKAGES, 'skill-calorie', 'src'));
const selfMadeDouble = hits(skill, JUDGE_EMPTY_CLASS);
const selfMadeAny = hits(skill, /class=["'][^"']*\bempty\b/);
const selfMadeInSix = SIX.filter(
  (p) => /class=["'][^"']*\bempty\b/.test(read(join(ROOT, p))) || /class=["'][^"']*empty/.test(read(join(ROOT, p))),
);
say(`PROBE-EMPTY 技能层自造空态结构（双引号／被审判据口径） 命中文件数=${selfMadeDouble.length} files=${selfMadeDouble.join(',')}`);
say(`PROBE-EMPTY 技能层自造空态结构（任意引号／本探针口径） 命中文件数=${selfMadeAny.length} files=${selfMadeAny.join(',')}`);
say(`PROBE-EMPTY 六件里的自造空态结构（任意引号∧含 empty 字样） 命中文件数=${selfMadeInSix.length} files=${selfMadeInSix.map((p) => p.replace('packages/', '')).join(',')}`);
if (selfMadeInSix.length !== 0) hard.push(`六件里出现自造空态结构：${selfMadeInSix.join('、')}`);
say(`PROBE-CHECK 六件无自造空态结构=${selfMadeInSix.length === 0 ? 'OK' : '偏离'}`);

/* ── ③ 第二份定义：别域的同形件 ──────────────────────────────────────── */
const DOMAINS = ['weight', 'photo', 'diet', 'body', 'analysis', 'render', 'profile'];
const CONCEPT = [
  ['结论', /(?:function|const)\s+\w*[Cc]onclusion\w*\s*[(=]|title:\s*'结论'/],
  ['徽章', /(?:function|const)\s+\w*[Bb]adge\w*\s*[(=]|badge\s*:\s*'[^']*回执'/],
  ['空态', /(?:function|const)\s+\w*[Ee]mpty\w*\s*[(=]|class=["'][^"']*\bempty\b/],
];
for (const domain of DOMAINS) {
  const dir = join(PACKAGES, 'skill-calorie', 'src', domain);
  const files = walk(dir);
  for (const [name, re] of CONCEPT) {
    const list = hits(files, re);
    say(`PROBE-DUP 域=${domain} 概念=${name} 命中文件数=${list.length} files=${list.join(',')}`);
  }
}

const competitor = [
  ['fieldLabel 定义地', /(?:export\s+)?function\s+fieldLabel\s*\(/],
  ['sourceLine 定义地', /(?:export\s+)?function\s+sourceLine\s*\(/],
  ['conclusionLine 定义地', /(?:export\s+)?function\s+conclusionLine\s*\(/],
  ['operationHead 定义地', /(?:export\s+)?function\s+operationHead\s*\(/],
  ['emptyGuide 定义地', /(?:export\s+)?function\s+emptyGuide\s*\(/],
];
for (const [name, re] of competitor) {
  const list = hits(skill, re);
  say(`PROBE-COMPETE ${name} 命中文件数=${list.length} files=${list.join(',')}`);
}

/* ── ④ 消费者：六件在 src 里被谁**进口**（按 import 路径数，不看同名调用） ─ */
const IMPORTS = [
  ['operationHead', /from\s+'[^']*shared\/operationHead\.js'/],
  ['fieldLabel', /from\s+'[^']*shared\/fieldLabel\.js'/],
  ['sourceLine', /from\s+'[^']*shared\/sourceLine\.js'/],
  ['conclusionLine', /from\s+'[^']*shared\/conclusionLine\.js'/],
  ['emptyGuide', /from\s+'[^']*shared\/emptyGuide\.js'/],
  ['categoryColors', /from\s+'[^']*(?:exercise|shared)\/categoryColors\.js'/],
];
for (const [name, re] of IMPORTS) {
  const imported = hits(skill, re).filter((p) => !SIX.includes(p));
  say(`PROBE-CONSUMER ${name} 按 import 引用本件的文件数=${imported.length} files=${imported.join(',')}`);
}
say('PROBE-CONSUMER 注：消费方文件数＝0 表示该共用件当刻只有判据在用（票面「消费方不在本票」）。');

/* ── ⑤ 扫描面覆盖 ────────────────────────────────────────────────────── */
const allRepo = walk(PACKAGES);
const outside = allRepo.filter((f) => !src.includes(f)).map(rel);
say(`PROBE-SURFACE packages 全树文件数=${allRepo.length}；源码树外（判据不覆盖）=${outside.length}`);
say(`PROBE-SURFACE 源码树外样例=${outside.slice(0, 10).join(',')}`);

/* ── ⑤b 六件的文案边界（审查席自设的更严口径） ───────────────────────── */
const stripComments = (t) =>
  t
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
const CH = /[\u4e00-\u9fff]/;
const CHINESE_FALLBACK = /(?:\?\?|\|\|)\s*['"`][^'"`\n]*[\u4e00-\u9fff]/;
const SINGLE_QUOTED_CLASS = /class='/;

for (const p of SIX) {
  const raw = read(join(ROOT, p));
  const code = stripComments(raw);
  const lits = [...code.matchAll(/['"`]([^'"`\n]*)['"`]/g)].map((m) => m[1]).filter((s) => CH.test(s));
  const fb = CHINESE_FALLBACK.test(code);
  const sq = SINGLE_QUOTED_CLASS.test(code);
  say(`PROBE-TEXT ${rel(join(ROOT, p)).replace('packages/', '')} 中文字面量（去注释） n=${lits.length} list=${lits.join('｜')}`);
  if (fb) hard.push(`${p} 出现中文兜底串（?? ／ || 后接中文）`);
  if (sq) hard.push(`${p} 出现单引号 class 属性（判据的 class="…" 扫描抓不到）`);
  say(`PROBE-CHECK ${rel(join(ROOT, p)).replace('packages/', '')} 无中文兜底=${fb ? '偏离' : 'OK'} 无单引号 class=${sq ? '偏离' : 'OK'}`);
}

/* ── ⑥ 鉴别力：同义异形是否失明（合成串对照） ────────────────────────── */
const SYNTH = [
  ['四态标签表·单引号同形', "const t = { update: '修改', delete: '删除' };", JUDGE_LABEL_BINDING],
  ['四态标签表·双引号异形', 'const t = { update: "修改", delete: "删除" };', JUDGE_LABEL_BINDING],
  ['四态标签表·反引号异形', 'const t = { update: `修改`, delete: `删除` };', JUDGE_LABEL_BINDING],
  ['四态标签表·数组形', "const t = [['update', '修改'], ['delete', '删除']];", JUDGE_LABEL_BINDING],
  ['空态结构·双引号同形', '<div class="ilife-empty-block">', JUDGE_EMPTY_CLASS],
  ['空态结构·单引号异形', "<div class='ilife-empty-block'>", JUDGE_EMPTY_CLASS],
  ['空态结构·无 empty 字样类名', '<div class="ilife-no-data">', JUDGE_EMPTY_CLASS],
  ['色表·单引号同形', "const c = { strength: '#5856d6' };", JUDGE_COLOR_BINDING],
  ['色表·双引号异形', 'const c = { strength: "#5856d6" };', JUDGE_COLOR_BINDING],
];
for (const [name, sample, re] of SYNTH) {
  const hit = new RegExp(re.source, re.flags.replace('g', '')).test(sample);
  say(`PROBE-BLIND 合成 ${name} 判据正则命中=${hit ? 'HIT' : 'MISS'} 样本=${shape(sample)}`);
}

/* ── ⑦ 审查席口径补读数：三域同形件逐件明细 ＋ 全树命中面（含 test／docs 外） ── */
for (const [d, name, re] of [
  ['weight', '结论条', /(?:function|const)\s+\w*[Cc]onclusion\w*\s*[(=]|title:\s*'结论'/],
  ['weight', '徽章', /(?:function|const)\s+\w*[Bb]adge\w*\s*[(=]|badge\s*:\s*'[^']*回执'/],
  ['weight', '空态', /(?:function|const)\s+\w*[Ee]mpty\w*\s*[(=]|class=["'][^"']*\bempty\b/],
  ['photo', '结论条', /(?:function|const)\s+\w*[Cc]onclusion\w*\s*[(=]|title:\s*'结论'/],
  ['photo', '徽章', /(?:function|const)\s+\w*[Bb]adge\w*\s*[(=]|badge\s*:\s*'[^']*回执'/],
  ['photo', '空态', /(?:function|const)\s+\w*[Ee]mpty\w*\s*[(=]|class=["'][^"']*\bempty\b/],
  ['diet', '结论条', /(?:function|const)\s+\w*[Cc]onclusion\w*\s*[(=]|title:\s*'结论'|收束/],
  ['diet', '徽章', /(?:function|const)\s+\w*[Bb]adge\w*\s*[(=]|badge\s*:\s*'[^']*回执'/],
  ['diet', '空态', /(?:function|const)\s+\w*[Ee]mpty\w*\s*[(=]|class=["'][^"']*\bempty\b/],
]) {
  const list = hits(walk(join(PACKAGES, 'skill-calorie', 'src', d)), re);
  say(`PROBE-MY 域=${d} 概念=${name} 命中文件数=${list.length} files=${list.join(',')}`);
}

const pkgAll = walk(PACKAGES);
const fourAll = pkgAll
  .filter((f) => ['#5856d6', '#0071e3', '#34c759', '#ff9500'].every((h) => read(f).includes(h)))
  .map(rel)
  .sort();
say(`PROBE-MY 全 packages 树四值同现文件数=${fourAll.length} files=${fourAll.join(',')}`);
const bindAll = hits(pkgAll, /\b(?:strength|cardio|flex|daily)\s*:\s*["'`]#[0-9a-fA-F]{6}["'`]/);
say(`PROBE-MY 全 packages 树色表键值绑定文件数=${bindAll.length} files=${bindAll.join(',')}`);
const labelAll = hits(pkgAll, /(?:create|add|update|delete)\s*:\s*["'`](?:新增|修改|删除)["'`]/);
say(`PROBE-MY 全 packages 树四态标签表绑定文件数=${labelAll.length} files=${labelAll.join(',')}`);

/* 四类色全部值：本仓（源码树）里 category 键→值的地数 ＋ 裸值地数（票面「全仓」口径对照）。 */
for (const [hex, cls] of [['#5856d6', 'strength'], ['#0071e3', 'cardio'], ['#34c759', 'flex'], ['#ff9500', 'daily']]) {
  const declared = hits(src, new RegExp('\\b' + cls + "\\s*:\\s*['\"`]" + hex, 'i'));
  const bareAll = hits(pkgAll, new RegExp(hex, 'gi'));
  say(`PROBE-MY 四类色 ${cls}=${hex} 声明地（源码树，键→值）=${declared.length} files=${declared.join(',')} ｜ 全 packages 树裸值地=${bareAll.length}`);
}
for (const [zh, keys] of [['新增', 'create/add'], ['修改', 'update'], ['删除', 'delete']]) {
  const decl = hits(src, new RegExp("(?:create|add|update|delete)\\s*:\\s*['\"`]" + zh));
  const bareAll = hits(pkgAll, new RegExp(zh, 'g'));
  say(`PROBE-MY 四态标签 ${zh}（${keys}）声明地（源码树，键→值）=${decl.length} files=${decl.join(',')} ｜ 全 packages 树出现地=${bareAll.length}`);
}

const verdict = hard.length === 0 ? 'OK' : '偏离';
say(`PROBE-VERDICT ${verdict} 硬不变量偏离条数=${hard.length}${hard.length ? '；' + hard.join('；') : ''}`);
process.exit(hard.length === 0 ? 0 : 2);

/** 小工具：读文本（自带存在性兜底）。 */
function text_(f) {
  try {
    return readFileSync(f, 'utf8');
  } catch {
    return '';
  }
}
