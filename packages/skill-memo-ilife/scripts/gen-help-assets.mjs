#!/usr/bin/env node
/** #227 · 备忘录 HELP 内容资产生成器：老骨架 → `src/help/scenes/<域>.ts`（8 个域文件）＋ `src/help/sceneData.ts`。
 *
 * 为什么留一个生成器：30 场景的 `prompt_template` 要求「逐字」，手抄必漂移；生成器只做
 * 「读事实源 → 声明式清洗 → 逐字序列化 → 落盘」，跑两次字节一致。
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
 * 五处「非纯搬运」都在本文件里写死、可复核（生成文件头注释同步声明），逐条对账见
 * `docs/skills/skill-memo-ilife/t227-assets-report.md`：
 *   1. `subgroups[].id` 老 0 起 → 新 1 起（票 6 V8=A；票 5 `t225-structure-design.md` §2.2）；
 *   2. `prompt_template` 去命令化（用户 U6：页面只出现唤醒词）＋ 按老 yaml `:9`「不暴露 DB」清实现细节；
 *   3. `editable_fields` 清洗（裁决 6）：剔 12 条 `html` 开关、补 1 条布尔脏数据 ＋ 9 条 ASCII 落回的中文名；
 *   4. 新增 `aliases`（老 yaml `:30` 禁此字段，管不到本仓资产；别名住技能侧资产、渲染时剥离，裁决 5）；
 *   5. `status` 全空串、**不许**标 `【待开发】`（用户 U1／U2／U3：HELP 是完整体，不是现状快照）。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  SOURCE_SHA256, LEGACY_DIGEST, ASSET_DIGEST, PROMPT_EDITS, TEXT_EDITS, PROMPT_FORBIDDEN, SCENE_FORBIDDEN,
  VISIBLE_FORBIDDEN, DROP_FIELDS, LABEL_FIX, BOOL_FIELD, ALIASES,
} from './help-assets.data.mjs';
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


/** 骨架函数（读事实源／交叉复核／清洗／形状断言）——规则表住 `help-assets.data.mjs`，渲染住 `help-assets.render.mjs`。 */
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

/** 一次替换：断言老片段在文本里**恰好出现 1 次**（对不上即 fail-closed）。 */
function replaceOnce(where, text, from, to) {
  const n = text.split(from).length - 1;
  if (n !== 1) throw new Error('清洗表对不上：' + where + ' 的片段出现 ' + n + ' 次：' + from);
  return text.replace(from, to);
}

/** 反向断言：清洗后不许再出现实现记号。 */
function scanForbidden(where, text, tokens) {
  const low = String(text).toLowerCase();
  for (const tok of tokens) if (low.includes(tok.toLowerCase())) {
    throw new Error(where + ' 仍含实现记号 ' + JSON.stringify(tok));
  }
}

/** 清洗一条场景：prompt 去命令／去 DB／去实现细节，title／label／hint 同规则换说法，字段剔 html ＋ 补中文名。 */
function cleanScene(scene, hits) {
  let prompt = scene.prompt_template;
  for (const [id, from, to, kind] of PROMPT_EDITS) {
    if (id !== scene.id) continue;
    prompt = replaceOnce(id + '.prompt', prompt, from, to);
    hits.push([id, kind]);
  }
  let title = scene.title;
  const labelFix = new Map();
  const hintFix = new Map();
  for (const [kind, id, from, to] of TEXT_EDITS) {
    if (id !== scene.id) continue;
    if (kind === 'title') { title = replaceOnce(id + '.title', title, from, to); hits.push([id, 'title']); }
    else if (kind.startsWith('label:')) labelFix.set(kind.slice('label:'.length), [from, to]);
    else hintFix.set(kind.slice('hint:'.length), [from, to]);
  }
  const fields = [];
  for (const f of scene.editable_fields || []) {
    const name = typeof f.name === 'string' ? f.name : String(f.name); // 布尔脏数据 → 字符串键
    if (DROP_FIELDS.has(name)) { hits.push([scene.id, 'drop:' + name]); continue; }
    let label = typeof f.label === 'string' ? f.label : String(f.label);
    if (typeof f.name !== 'string' || typeof f.label !== 'string') {
      if (name !== BOOL_FIELD.name) throw new Error('未声明的脏字段：' + scene.id + '/' + name);
      label = BOOL_FIELD.label;
    } else if (LABEL_FIX[name]) label = LABEL_FIX[name];
    if (labelFix.has(name)) {
      label = replaceOnce(scene.id + '/' + name + '.label', label, labelFix.get(name)[0], labelFix.get(name)[1]);
      hits.push([scene.id, 'label']);
    }
    let hint = f.hint;
    if (hintFix.has(name)) {
      hint = replaceOnce(scene.id + '/' + name + '.hint', hint, hintFix.get(name)[0], hintFix.get(name)[1]);
      hits.push([scene.id, 'hint']);
    }
    fields.push({ name, label, value: f.value, hint, required: f.required });
  }
  const out = { id: scene.id, title, wake_word: scene.wake_word, status: scene.status,
    prompt_template: prompt, types: scene.types };
  if (fields.length) out.editable_fields = fields;
  if (ALIASES[scene.id]) out.aliases = ALIASES[scene.id];
  scanForbidden(scene.id + '.prompt', prompt, PROMPT_FORBIDDEN.concat(SCENE_FORBIDDEN[scene.id] || []));
  scanForbidden(scene.id + '.title', title, VISIBLE_FORBIDDEN);
  for (const f of fields) {
    scanForbidden(scene.id + '/' + f.name + '.label', f.label, VISIBLE_FORBIDDEN);
    scanForbidden(scene.id + '/' + f.name + '.hint', f.hint, VISIBLE_FORBIDDEN);
  }
  return out;
}

/** 形状断言（fail-closed）：裁决 6／7／8／14 的每一个数都在这里钉住。 */
function assertShape(groups, preClean) {
  const bad = (msg) => { throw new Error('形状断言不过：' + msg); };
  const subs = groups.flatMap((g) => g.subgroups);
  const scenes = subs.flatMap((s) => s.scenes);
  const fields = scenes.flatMap((s) => s.editable_fields || []);
  const atoms = scenes.flatMap((s) => s.types).reduce((m, t) => (m[t] = (m[t] || 0) + 1, m), {});
  const eq = (what, a, b) => { if (a !== b) bad(what + ' ＝ ' + a + '，应为 ' + b); };
  eq('域数', groups.length, 8);
  eq('二级组数', subs.length, 13);
  eq('兜底组数(基础)', subs.filter((s) => s.label === '基础').length, 4);
  eq('场景数', scenes.length, 30);
  eq('场景 id 唯一数', new Set(scenes.map((s) => s.id)).size, 30);
  eq('清洗后字段数', fields.length, 64);
  eq('老侧涉及场景数', preClean.filter((s) => s.editable_fields).length, 29);
  eq('清洗后仍带字段的场景数', scenes.filter((s) => s.editable_fields).length, 27);
  eq('老侧字段数', preClean.flatMap((s) => s.editable_fields || []).length, 76);
  eq('老侧 html 字段数', preClean.flatMap((s) => s.editable_fields || []).filter((f) => f.name === 'html').length, 12);
  eq('老侧布尔脏字段数', preClean.flatMap((s) => s.editable_fields || []).filter((f) => typeof f.name !== 'string').length, 1);
  eq('types 行数', scenes.filter((s) => s.types.length).length, 30);
  eq('原子合计', Object.values(atoms).reduce((a, b) => a + b, 0), 64);
  for (const [k, v] of Object.entries({ 回执: 30, 采集: 20, 查看: 10, 向导: 4 })) eq('原子 ' + k, atoms[k], v);
  if (atoms['选择']) bad('types 里不该出现「选择」');
  const aliasWords = scenes.flatMap((s) => s.aliases || []);
  eq('别名条数', aliasWords.length, 12);
  eq('别名唯一词数', new Set(aliasWords).size, 12);
  const mains = new Set(scenes.map((s) => s.wake_word));
  for (const a of aliasWords) if (mains.has(a)) bad('别名与主词撞词：' + a);
  for (const s of scenes) {
    if (s.status !== '') bad(s.id + ' 的 status 非空串（不许标缺失）');
    if (!s.prompt_template.includes('唤醒词:')) bad(s.id + ' 的 prompt 丢了唤醒词锚点');
    for (const f of s.editable_fields || []) {
      if (typeof f.name !== 'string' || typeof f.label !== 'string' || typeof f.value !== 'string') bad(s.id + '/' + String(f.name) + ' 字段非 string');
      if (f.required !== false) bad(s.id + '/' + f.name + ' required 非 false');
    }
  }
  groups.forEach((g, i) => g.subgroups.forEach((s, j) => {
    if (s.id !== g.id + '_' + (j + 1)) bad('二级组 id 不是 1 起连号：' + s.id);
  }));
  if (new Set(groups.map((g) => g.id)).size !== 8) bad('域 id 有重复');
  return { scenes, subs, fields, atoms };
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
const hits = [];
const groups = payload.groups.map((g) => ({
  id: g.id, icon: g.icon, label: g.label,
  subgroups: g.subgroups.map((sub, j) => ({
    id: g.id + '_' + (j + 1), // 声明 1：老 0 起 → 新 1 起
    label: sub.label,
    scenes: sub.scenes.map((sc) => cleanScene(sc, hits)),
  })),
}));
const stat = assertShape(groups, legacy);
/** 渲染上下文：渲染件要什么给什么（事实源文件名、版本、两枚摘要、两个落点）。 */
const ctx = { srcBase: basename(SRC), version: VERSION, legacyDigest: LEGACY_DIGEST, assetDigest: ASSET_DIGEST,
  scenesDir: SCENES_DIR, sceneDataPath: SCENE_DATA };
const out = [...groups.map((g) => renderDomain(ctx, g)), renderSceneData(ctx, groups)];

const srcSha = sha256(readFileSync(SRC, 'utf8'));
const legacyDigest = sha256(canonical(legacy));
const assetDigest = sha256(canonical(stat.scenes));
for (const [name, got, want] of [['事实源文件 sha256', srcSha, SOURCE_SHA256],
  ['老 30 条 sha256', legacyDigest, LEGACY_DIGEST], ['清洗后 30 条 sha256', assetDigest, ASSET_DIGEST]]) {
  if (want.startsWith('FILL_')) throw new Error('摘要锁未回填（fail-closed）：' + name + ' = ' + got);
  if (got !== want) throw new Error('摘要锁对不上：' + name + ' 实测 ' + got + ' ≠ 锁定 ' + want);
}

console.log('事实源：' + SRC + '（' + bytes + ' 字节，sha256=' + srcSha.slice(0, 16) + '…）');
console.log('老 yaml 顶层：' + JSON.stringify(yaml.top) + '；两地交叉复核 30/30 条逐字对上');
console.log('形状：域 ' + groups.length + '／二级组 ' + stat.subs.length + '（兜底 '
  + stat.subs.filter((s) => s.label === '基础').length + '）／场景 ' + stat.scenes.length
  + '／字段 ' + stat.fields.length + '（含字段场景 ' + stat.scenes.filter((s) => s.editable_fields).length + '）'
  + '／别名 ' + stat.scenes.flatMap((s) => s.aliases || []).length);
console.log('原子：' + JSON.stringify(stat.atoms));
const byKind = (k) => hits.filter((h) => h[1] === k).length;
const washed = ['CLI', 'DB', 'IMPL', 'title', 'label', 'hint'];
console.log('清洗：prompt 改动 ' + (byKind('CLI') + byKind('DB') + byKind('IMPL')) + ' 处（CLI ' + byKind('CLI')
  + ' ／ DB ' + byKind('DB') + ' ／ IMPL ' + byKind('IMPL') + '）／title ' + byKind('title') + ' ／label ' + byKind('label')
  + ' ／hint ' + byKind('hint') + '／剔除字段 ' + byKind('drop:html') + ' 条／牵动场景 '
  + new Set(hits.filter((h) => washed.includes(h[1])).map((h) => h[0])).size + ' 个');
console.log('摘要锁：老 30 条 ' + legacyDigest + '；清洗后 30 条 ' + assetDigest);
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
