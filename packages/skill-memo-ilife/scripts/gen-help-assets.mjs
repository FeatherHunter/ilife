#!/usr/bin/env node
/** #227 · 备忘录 HELP 内容资产生成器：老骨架 → `src/help/scenes/<域>.ts`（8 个域文件）＋ `src/help/sceneData.ts`。
 *
 * 为什么留一个生成器：30 场景的内容要有单一来源、跑两次字节一致，手抄必漂移。它做四件事：
 * 「读事实源 → 重写（内容住 `help-assets.rewrite.mjs`）→ 断言（判据住 `help-assets.assert.mjs`）→ 落盘」。
 *
 * 用法（**不进 build／test 管线**，事实源在仓外，故 `--check` 只在事实源在盘的机器上可跑）：
 *   node packages/skill-memo-ilife/scripts/gen-help-assets.mjs            # 落盘
 *   node packages/skill-memo-ilife/scripts/gen-help-assets.mjs --check    # 只比对，不一致 exit 1
 *   node packages/skill-memo-ilife/scripts/gen-help-assets.mjs --src <老实物.html> --yaml <scenarios.yaml>
 *
 * 两处事实源（都只读）：
 *   ① 老实物契约载荷 `<SKILLS_DB_PATH>/memo_html/备忘录_HELP_*.html` 的 `window.__DATA__`——
 *      它**就是**老转换层 `script/memo_render.py:527-599` `_scenarios_to_contract_data()` 的产出，
 *      逐字零改写（比在 JS 里重写一遍 YAML 解析器更忠实：老 yaml 的 `prompt` 是多行双引号标量）。
 *   ② 老 `references/scenarios.yaml` 顶层 `skill`／`version`（裁决 9：`version` 从老 yaml 顶层读，
 *      不许写死成第四份副本）＋ 30 条的 `scenario_id`／`wake_word`／`scenario_title`／`type`／
 *      `status`／`category`／`subfunction`／`dimensions` 键序（**交叉复核**：两地逐条对不上即 fail-closed）。
 *
 * **#974 起资产内容＝逐句重写**（规范：卡路里标杆 `.scratch/help-prompt-rewrite/PROMPT-REWRITE.md`，
 * 口径取其关闭后终态）：老侧仍是「身份与路由」的事实源（`id`／`wake_word`／`types`／`status`／
 * 域序／组序／别名挂载），`title`／`prompt_template`／`editable_fields` 三件由重写表给出。
 * 四道断言（`help-assets.assert.mjs`）：形状数、重写口径、**信息不丢失台账**（老正文的每个原子与每个老字段
 * 都要有去处，见 `help-assets.atoms.mjs`）、字段面覆盖——任一条对不上即抛，不产出半成品。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SOURCE_SHA256, LEGACY_DIGEST, ASSET_DIGEST, ALIASES } from './help-assets.data.mjs';
import { REWRITE, applyRewrite } from './help-assets.rewrite.mjs';
import { assertShape, assertRewrite, assertAtoms, assertFieldCoverage, assertFieldAtoms } from './help-assets.assert.mjs';
import { renderDomain, renderSceneData } from './help-assets.render.mjs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = join(HERE, '..');
const SCENES_DIR = join(PKG_DIR, 'src', 'help', 'scenes');
const SCENE_DATA = join(PKG_DIR, 'src', 'help', 'sceneData.ts');
const DEFAULT_SRC = 'D:\\2Study\\StudyNotes\\.db\\memo_html\\备忘录_HELP_20260820_162453.html';
const DEFAULT_YAML = 'D:\\2Study\\StudyNotes\\SKILLS\\备忘录\\references\\scenarios.yaml';
const ANCHOR = 'window.__DATA__ = ';


/** 骨架函数（读事实源／交叉复核／重写）——重写内容住 `help-assets.rewrite.mjs`，判据住 `help-assets.assert.mjs`。 */
const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
/** 老骨架 canonical：老 30 条（id／title／wake_word／status／prompt_template／types／editable_fields 原样）。 */
const canonical = (scenes) => JSON.stringify(scenes.map((s) =>
  [s.id, s.title, s.wake_word, s.status, s.prompt_template, s.types, s.editable_fields ?? null]));

function readPayload(src) {
  if (!existsSync(src)) throw new Error('事实源不在盘上：' + src);
  const raw = readFileSync(src, 'utf8');
  const at = raw.indexOf(ANCHOR);
  if (at < 0) throw new Error('未找到 window.__DATA__ 锚点：' + src);
  const start = at + ANCHOR.length;
  const end = raw.indexOf('</script>', start);
  if (end < 0) throw new Error('window.__DATA__ 未闭合：' + src);
  return { payload: JSON.parse(raw.slice(start, end).trim().replace(/;$/, '')), bytes: Buffer.byteLength(raw, 'utf8') };
}

/** 老 yaml：只认单行 plain 标量（顶层 `skill`／`version`、`categories` 键序、场景 7 字段、`dimensions` 键序）。 */
function readYamlMeta(path) {
  if (!existsSync(path)) throw new Error('事实源不在盘上：' + path);
  const rows = [];
  const cats = [];
  const top = {};
  let cur = null;
  let inDims = false;
  let inCats = false;
  const text = readFileSync(path, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  for (const line of text.split('\n')) {
    let m;
    if ((m = /^(skill|version): (.+)$/.exec(line))) { top[m[1]] = m[2].trim(); continue; }
    if (/^categories:/.test(line)) { inCats = true; continue; }
    if (/^scenarios:/.test(line)) { inCats = false; continue; }
    if (inCats && (m = /^- key: (.+)$/.exec(line))) { cats.push(m[1].trim()); continue; }
    if ((m = /^- wake_word: (.+)$/.exec(line))) { cur = { wake_word: m[1].trim(), dims: [] }; rows.push(cur); inDims = false; continue; }
    if (!cur) continue;
    if ((m = /^  ([a-z_]+):(.*)$/.exec(line))) {
      const key = m[1];
      const val = m[2].trim();
      inDims = key === 'dimensions' && val === '';
      if (key !== 'dimensions') cur[key] = val.replace(/^'(.*)'$/, '$1');
      continue;
    }
    if (inDims && (m = /^    (\S+):/.exec(line))) cur.dims.push(m[1] === 'true' ? 'true' : m[1]);
  }
  return { top, rows, cats };
}

/** 两地交叉复核：老实物载荷 30 条 ↔ 老 yaml 30 条（**按 id 配对**，逐字段逐字 ＋ 组序／组内序）。
 *  ⚠️ 载荷的顺序不是 yaml 的书写序：载荷先按 `category` 分域、再按 `subfunction` 收组
 *  （`memo_batch_change_category` 在 yaml `:361` 却落回 `memo` 域的 `分类调整` 组）——所以按 id 对。 */
function crossCheck(groups, yaml) {
  const scenes = groups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));
  const bad = (msg) => { throw new Error('两地事实源对不上：' + msg); };
  if (scenes.length !== yaml.rows.length) bad('场景数 载荷 ' + scenes.length + ' ≠ yaml ' + yaml.rows.length);
  const idxOf = new Map(yaml.rows.map((y, i) => [y.scenario_id, i]));
  const where = new Map();
  for (const g of groups) for (const s of g.subgroups) for (const sc of s.scenes) where.set(sc.id, [g.id, s.label]);
  if (groups.map((g) => g.id).join(',') !== yaml.cats.join(',')) bad('域顺序 ≠ yaml `categories` 顺序');
  for (const sc of scenes) {
    const y = yaml.rows[idxOf.get(sc.id)];
    if (!y) bad('载荷场景 ' + sc.id + ' 在 yaml 里没有');
    const [gid, label] = where.get(sc.id);
    const pairs = [['wake_word', sc.wake_word, y.wake_word], ['title', sc.title, y.scenario_title],
      ['status', sc.status, y.status], ['types', sc.types.join('+'), y.type],
      ['category', gid, y.category], ['subgroup', label, y.subfunction || '基础'],
      ['dimensions', (sc.editable_fields || []).map((f) => String(f.name)).join(','), y.dims.join(',')]];
    for (const [what, a, b] of pairs) if (a !== b) bad(sc.id + ' 的 ' + what + '：载荷 ' + a + ' ≠ yaml ' + b);
  }
  for (const g of groups) for (const s of g.subgroups) { // 组内序＝书写序
    const idx = s.scenes.map((sc) => idxOf.get(sc.id));
    for (let i = 1; i < idx.length; i++) if (!(idx[i] > idx[i - 1])) bad(s.id + ' 组内序不是 yaml 书写序');
  }
  for (const g of groups) { // 二级组顺序＝该组首次出现的书写序
    const first = g.subgroups.map((s) => Math.min(...s.scenes.map((sc) => idxOf.get(sc.id))));
    for (let i = 1; i < first.length; i++) if (!(first[i] > first[i - 1])) bad(g.id + ' 的二级组顺序不是首次出现序');
  }
}

/** 重写一条场景：老侧只出身份与路由（`id`／`wake_word`／`types`／`status`／`aliases`），三件内容由重写表给。 */
function rewriteScene(scene) {
  const entry = REWRITE[scene.id];
  if (!entry) throw new Error('重写表缺场景：' + scene.id);
  const out = applyRewrite({ id: scene.id, wake_word: scene.wake_word, status: scene.status, types: scene.types }, entry);
  if (out.wake_word !== scene.wake_word) throw new Error(scene.id + ' 唤醒词被动过（路由冻结）');
  if (ALIASES[scene.id]) out.aliases = ALIASES[scene.id];
  return out;
}

/** LF 行数（只数 `\\n`，包内口径）。 */
const lf = (text) => (text.match(/\n/g) || []).length;

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const SRC = resolve(argOf('--src', DEFAULT_SRC));
const YAML = resolve(argOf('--yaml', DEFAULT_YAML));
const check = argv.includes('--check');

const { payload, bytes } = readPayload(SRC);
const yaml = readYamlMeta(YAML);
const VERSION = yaml.top.version;
if (!VERSION || yaml.top.skill !== '备忘录') throw new Error('老 yaml 顶层对不上：' + JSON.stringify(yaml.top));
if (payload.version !== VERSION) throw new Error('version 两地不一：载荷 ' + payload.version + ' ≠ yaml ' + VERSION);
crossCheck(payload.groups, yaml);

const legacy = payload.groups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));
const groups = payload.groups.map((g) => ({
  id: g.id, icon: g.icon, label: g.label,
  subgroups: g.subgroups.map((sub, j) => ({
    id: g.id + '_' + (j + 1), // 声明 1：老 0 起 → 新 1 起
    label: sub.label,
    scenes: sub.scenes.map(rewriteScene),
  })),
}));
const stat = assertShape(groups, legacy);
assertRewrite(stat.scenes);
const atomStat = assertAtoms(stat.scenes);
const fieldStat = assertFieldCoverage(stat.scenes);
const fieldAtomStat = assertFieldAtoms(stat.scenes);
/** 渲染上下文：渲染件要什么给什么（事实源文件名、版本、两枚摘要、两个落点）。 */
const ctx = { srcBase: basename(SRC), version: VERSION, legacyDigest: LEGACY_DIGEST, assetDigest: ASSET_DIGEST,
  scenesDir: SCENES_DIR, sceneDataPath: SCENE_DATA };
const out = [...groups.map((g) => renderDomain(ctx, g)), renderSceneData(ctx, groups)];

const srcSha = sha256(readFileSync(SRC, 'utf8'));
const legacyDigest = sha256(canonical(legacy));
const assetDigest = sha256(canonical(stat.scenes));
for (const [name, got, want] of [['事实源文件 sha256', srcSha, SOURCE_SHA256],
  ['老 30 条 sha256', legacyDigest, LEGACY_DIGEST], ['资产 30 条 sha256', assetDigest, ASSET_DIGEST]]) {
  if (want.startsWith('FILL_')) throw new Error('摘要锁未回填（fail-closed）：' + name + ' = ' + got);
  if (got !== want) throw new Error('摘要锁对不上：' + name + ' 实测 ' + got + ' ≠ 锁定 ' + want);
}

console.log('事实源：' + SRC + '（' + bytes + ' 字节，sha256=' + srcSha.slice(0, 16) + '…）');
console.log('老 yaml 顶层：' + JSON.stringify(yaml.top) + '；两地交叉复核 30/30 条逐字对上');
console.log('形状：域 ' + groups.length + '／二级组 ' + stat.subs.length + '（兜底 '
  + stat.subs.filter((s) => s.label === '基础').length + '）／场景 ' + stat.scenes.length
  + '／字段 ' + stat.fields.length + '（含字段场景 ' + stat.scenes.filter((s) => s.editable_fields).length
  + '，零参 ' + stat.scenes.filter((s) => !s.editable_fields).length + '）'
  + '／别名 ' + stat.scenes.flatMap((s) => s.aliases || []).length);
console.log('原子：' + JSON.stringify(stat.atoms));
console.log('#974 重写：30/30 条；kind 分布 ' + JSON.stringify(stat.kindCount)
  + '；首行形／无骨架残留／无裸预置值／占位↔字段一一对应 全过');
console.log('#974 信息台账：老正文原子 ' + atomStat.atomsSeen + ' 个 → 台账 ' + atomStat.entriesSeen + ' 条（每个原子都有去处）'
  + '；老字段 ' + fieldStat.oldCount + ' 个 → 留下 ' + fieldStat.keptCount + '／有意删 ' + fieldStat.droppedCount
  + '（' + fieldStat.dropNames + ' 个名字，都带理由）');
console.log('#974 字段面台账：老提示 ' + fieldAtomStat.instances + ' 条 → 台账 ' + fieldAtomStat.entries + ' 条'
  + '（每条提示里的信息都有去处：hint／options／正文／控件形态／有意删）');
console.log('摘要锁：老 30 条 ' + legacyDigest + '；资产 30 条 ' + assetDigest);
if (check) {
  let drift = 0;
  for (const f of out) {
    const now = existsSync(f.path) ? readFileSync(f.path, 'utf8') : '';
    if (now !== f.text) { console.error('DRIFT：' + f.path + ' 与生成结果不一致（禁手改；重跑不带 --check 即覆盖）'); drift++; }
  }
  if (drift) process.exit(1);
  console.log('OK：' + out.length + ' 个文件与生成结果字节一致（--check 不落盘）');
} else {
  mkdirSync(SCENES_DIR, { recursive: true });
  for (const f of out) writeFileSync(f.path, f.text, 'utf8');
  console.log('已写入 ' + out.length + ' 个文件：');
  for (const f of out) console.log('  ' + f.path.replace(PKG_DIR + '\\', '') + '　' + lf(f.text) + ' LF');
}
