#!/usr/bin/env node
/**
 * 票 #1241 · 手册内容冻结比对（唯一真值＝甲入口四场景冻结原型）。
 *
 * 规格：docs/plugins/plugin-manager/t1241-手册内容冻结规格.md
 * 用法：node docs/plugins/plugin-manager/t1241-冻结比对.mjs --root <仓库或工作树根> [--json]
 *
 * 只读脚本：不写任何文件。六项判据各出一条机器读数行，最后打一行结论：
 *   RESULT: PASS 6/6   /   RESULT: FAIL n/6
 * 判据：
 *   F1 冻结原型在场，且内容哈希与冻结身份一致
 *   F2 成品内容数据（SCENES）与原型逐字一致
 *   F3 条目结构（1 目录＋3 正文＋1 待补充组；步骤 6/3/6；片段全空；备注仅数据目录；静态面板仅数据目录；待补充 5 条）
 *   F4 正文样式（.pg 规则集）与原型一致（整形后逐条；原型渲染路径不产出的规则另列）
 *   F5 废弃项不在场（切换条／缩略图／大图灯箱／出错总览／第 5 个正文场景）
 *   F6 排版基数（页／跨页／纸／签，由原型自带 planManual 实算）
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** 冻结身份（2026-10-09 冻结基线：#af750fa5／#368ee94a 起未变）。 */
const FROZEN_SHA256 = '2f297c2356a3b3b4c39d22051f30f20a4e9cd4d6aed010aac3fcf31805f34280';
const FROZEN_BLOB = '61faa5e8d845ad0bc6ffd330e813db69856d8c6c';
const PROTO_REL = 'docs/plugins/plugin-manager/proto-manual-4scenes.html';
const CONTENT_REL = 'packages/plugin-manager/src/manual-content.ts';

/** 原型有、成品可无（原型自己的渲染路径不产出这些类；逐条给理由，不静默放过）。 */
const NOT_RENDERED = [
  [/^\.pg \.ctl\{/, '控件行 .ctl：冻结渲染路径不产出（签走 .ctag／.capp／.dbadge）'],
  [/^\.pg \.shot\{|^\.pg \.thumb|^\.pg \.shot span\{/, '缩略图点开大图已废弃（冻结 SCENES 的 shot 全 false）'],
  [/^\.pg \.todo\{|^\.pg \.todo \./, '旧待补充块已废弃（冻结原型合页走 .bar.todo 行）'],
  [/^\.pg \.small\{/, '合页小字脚注已废弃（#1242 纠偏 5）'],
  [/^\.pg \.frag\{|^\.pg \.frag:(hover|active)\{/, '片段全空不渲染复制按钮（#1242 纠偏 1）'],
];
/** 原型有、成品可无：只影响瞬态动效、静态像素无差（归外壳规格 #1240／视觉墙 #1196）。 */
const MOTION_ONLY = [
  [/^\.pg\.enter\{/, '进场动画 pagein .34s：瞬态动效，静态像素无差'],
];

const argv = process.argv.slice(2);
const root = resolve(argValue('--root') ?? process.cwd());
const asJson = argv.includes('--json');
function argValue(name) {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : undefined;
}

const lines = [];
const fails = [];
function check(id, ok, readout) {
  if (!ok) fails.push(id + ' ' + readout);
  lines.push((ok ? 'OK   ' : 'FAIL ') + id + ' ' + readout);
  return ok;
}
const note = (text) => lines.push('     ' + text);
/** CSS 整形：折空白 + 去掉标点旁空白（原型规则里的换行与 `; ` 都不改变渲染结果）。 */
const norm = (s) => s.replace(/\s+/g, ' ').replace(/\s*([;{},:])\s*/g, '$1').trim();

const protoPath = join(root, PROTO_REL);
const contentPath = join(root, CONTENT_REL);

/* ---- F1 冻结原型在场 + 身份 ---- */
let proto = null;
if (!existsSync(protoPath)) {
  check('F1', false, '冻结原型不在场：' + PROTO_REL);
} else {
  proto = readFileSync(protoPath, 'utf8');
  const sha256 = createHash('sha256').update(Buffer.from(proto, 'utf8')).digest('hex');
  const blob = createHash('sha1').update(Buffer.concat([
    Buffer.from('blob ' + Buffer.byteLength(proto, 'utf8') + '\0', 'utf8'),
    Buffer.from(proto, 'utf8'),
  ])).digest('hex');
  check('F1', sha256 === FROZEN_SHA256 && blob === FROZEN_BLOB,
    'sha256=' + sha256.slice(0, 16) + '… blob=' + blob.slice(0, 12) + '…（冻结身份 sha256=' + FROZEN_SHA256.slice(0, 16) + '… blob=' + FROZEN_BLOB.slice(0, 12) + '…）');
}

/* ---- 提取器 ---- */
function frozenScenes(html) {
  const m = html.match(/var SCENES = (\[[\s\S]*?\]);\s*\n/);
  if (!m) throw new Error('原型里找不到 var SCENES = [...]');
  return JSON.parse(m[1]);
}

/** 从原型自带 planManual 模块脚本里取排版函数（只取编译段：sourceMappingURL 之前；剥 export，不改逻辑）。 */
function protoPlanFn(html) {
  const m = html.match(/<script type="module">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('原型里找不到 type="module" 排版脚本');
  const cut = m[1].indexOf('//# sourceMappingURL');
  const code = (cut < 0 ? m[1] : m[1].slice(0, cut)).replace(/^export /gm, '');
  return new Function(code + '\nreturn planManual;')();
}

/** 从 TS 源码里切出 `export const SCENES … = <数组字面量>`，按括号深度匹配（含字符串与转义）。 */
function sourceScenes(src) {
  const at = src.indexOf('export const SCENES');
  if (at < 0) throw new Error('成品源码里找不到 export const SCENES');
  const open = src.indexOf('[', src.indexOf('= [', at));
  if (open < 0) throw new Error('SCENES 声明后找不到数组字面量');
  let depth = 0;
  let quote = '';
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (quote !== '') {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = '';
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') {
      depth--;
      if (depth === 0) return new Function('return ' + src.slice(open, i + 1))();
    }
  }
  throw new Error('SCENES 数组字面量没有闭合');
}

/** 原型 <style> 里的 .pg 规则（整形后逐条）。 */
function protoPgRules(html) {
  const css = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
  return css.split('}')
    .map((chunk) => norm(chunk))
    .filter((chunk) => chunk.startsWith('.pg'))
    .map((chunk) => chunk + '}');
}

/** 成品 manualContentCss() 返回的规则串（整形后逐条）。 */
function implPgRules(src) {
  const at = src.indexOf('export function manualContentCss');
  if (at < 0) throw new Error('成品源码里找不到 manualContentCss');
  const body = src.slice(at, src.indexOf('].join(', at));
  const out = [];
  for (const m of body.matchAll(/'((?:[^'\\]|\\.)*)'/g)) out.push(m[1].replace(/\\(['"\\])/g, '$1'));
  return out.filter((rule) => rule.startsWith('.pg')).map((rule) => norm(rule));
}
const selectorOf = (rule) => rule.slice(0, rule.indexOf('{'));

/* ---- F2 逐字一致 ---- */
let scenes = null;
let implScenes = null;
if (proto !== null && existsSync(contentPath)) {
  const src = readFileSync(contentPath, 'utf8');
  try {
    scenes = frozenScenes(proto);
    implScenes = sourceScenes(src);
    if (JSON.stringify(scenes) === JSON.stringify(implScenes)) {
      check('F2', true, 'SCENES 与原型逐字一致（' + scenes.length + ' 条，' + JSON.stringify(scenes).length + ' 字节）');
    } else {
      let where = '长度 ' + scenes.length + ' vs ' + implScenes.length;
      for (let i = 0; i < Math.max(scenes.length, implScenes.length); i++) {
        if (JSON.stringify(scenes[i]) !== JSON.stringify(implScenes[i])) {
          where = '第 ' + (i + 1) + ' 条起不同：原型=' + JSON.stringify(scenes[i]).slice(0, 120) + ' 成品=' + JSON.stringify(implScenes[i]).slice(0, 120);
          break;
        }
      }
      check('F2', false, where);
    }
  } catch (err) {
    check('F2', false, '提取失败：' + err.message + '（成品路径 ' + CONTENT_REL + '）');
  }
} else {
  check('F2', false, existsSync(contentPath) ? '原型缺席，无法比对' : '成品内容数据不在场：' + CONTENT_REL);
}

/* ---- F3 条目结构 ---- */
if (implScenes !== null) {
  const keys = implScenes.map((s) => s.key).join(',');
  const written = implScenes.filter((s) => s.state === 'written' && s.kind !== 'contents').length;
  const stepCounts = implScenes.filter((s) => Array.isArray(s.steps)).map((s) => s.steps.length).join('/');
  const fragEmpty = implScenes.every((s) => s.frag === undefined || s.frag === '');
  const notes = implScenes.filter((s) => s.note !== undefined).map((s) => s.key).join(',');
  const panels = implScenes.filter((s) => s.panelStatic === true).map((s) => s.key).join(',');
  const pending = implScenes.find((s) => s.state === 'pending');
  const items = pending !== undefined && Array.isArray(pending.items) ? pending.items.length : 0;
  const ok = keys === 'contents,basic,datadir,im,upcoming' && written === 3 && stepCounts === '6/3/6'
    && fragEmpty && notes === 'datadir' && panels === 'datadir' && items === 5;
  check('F3', ok, '键=' + keys + ' 正文=' + written + ' 步骤=' + stepCounts + ' 片段全空=' + fragEmpty
    + ' 备注=' + (notes === '' ? '无' : notes) + ' 静态面板=' + (panels === '' ? '无' : panels) + ' 待补充=' + items + ' 条');
} else {
  check('F3', false, '无成品内容数据可判结构');
}

/* ---- F4 正文样式 ---- */
if (proto !== null && existsSync(contentPath)) {
  const src = readFileSync(contentPath, 'utf8');
  try {
    const want = protoPgRules(proto);
    const got = implPgRules(src);
    const gotBy = new Map(got.map((r) => [selectorOf(r), r]));
    const wantBy = new Map(want.map((r) => [selectorOf(r), r]));
    const different = [];
    const differentDead = [];
    const differentMotion = [];
    for (const [sel, wantRule] of wantBy) {
      const gotRule = gotBy.get(sel);
      if (gotRule === undefined || gotRule === wantRule) continue;
      const dead = NOT_RENDERED.find(([re]) => re.test(wantRule));
      const motion = MOTION_ONLY.find(([re]) => re.test(wantRule));
      if (dead !== undefined) differentDead.push([wantRule, gotRule, dead[1]]);
      else if (motion !== undefined) differentMotion.push([wantRule, gotRule, motion[1]]);
      else different.push([sel, wantRule, gotRule]);
    }
    const extra = got.filter((r) => !wantBy.has(selectorOf(r)));
    const missingHard = [];
    const missingDead = [];
    const missingMotion = [];
    for (const [sel, rule] of wantBy) {
      if (gotBy.has(sel)) continue;
      const dead = NOT_RENDERED.find(([re]) => re.test(rule));
      const motion = MOTION_ONLY.find(([re]) => re.test(rule));
      if (dead !== undefined) missingDead.push([rule, dead[1]]);
      else if (motion !== undefined) missingMotion.push([rule, motion[1]]);
      else missingHard.push(rule);
    }
    const ok = different.length === 0 && extra.length === 0 && missingHard.length === 0;
    check('F4', ok, '原型 ' + want.length + ' 条／成品 ' + got.length + ' 条；同选择器内容不同 ' + different.length
      + '；成品缺（原型渲染路径产出、影响静态像素）' + missingHard.length
      + '；成品缺（瞬态动效）' + missingMotion.length
      + '；成品缺（原型不产出，允许）' + missingDead.length + '；成品多出 ' + extra.length);
    for (const [sel, wantRule, gotRule] of different) {
      note('同选择器不同：' + sel);
      note('  原型: ' + wantRule.slice(sel.length + 1));
      note('  成品: ' + gotRule.slice(sel.length + 1));
    }
    for (const rule of missingHard) note('原型渲染路径产出、成品无：' + rule.slice(0, 150));
    for (const [rule, why] of missingMotion) note('瞬态动效缺席：' + rule.slice(0, 90) + ' ← ' + why);
    for (const [rule, why] of differentMotion) note('瞬态动效不一致：' + rule.slice(0, 90) + ' ← ' + why);
    for (const [rule, why] of missingDead) note('允许缺席：' + rule.slice(0, 90) + ' ← ' + why);
    for (const [rule, _got, why] of differentDead) note('允许不一致：' + rule.slice(0, 90) + ' ← ' + why);
    for (const rule of extra) note('成品多出：' + rule.slice(0, 150));
  } catch (err) {
    check('F4', false, '提取失败：' + err.message);
  }
} else {
  check('F4', false, '原型或成品内容数据缺席，无法比对样式');
}

/* ---- F5 废弃项不在场 ---- */
if (existsSync(contentPath)) {
  const src = readFileSync(contentPath, 'utf8');
  const banned = [
    ['纸顶场景切换条', /\bswitch\b|\.switch\{/],
    ['缩略图点开大图', /data-shot|\.thumb|lightbox/i],
    ['出错总览独立场景', /出错总览/],
    ['HELP 死链写法', /href\s*=/],
  ];
  const hit = banned.filter(([, re]) => re.test(src)).map(([name]) => name);
  const written = implScenes === null ? -1 : implScenes.filter((s) => s.state === 'written' && s.kind !== 'contents').length;
  const fiveScene = written === 4;
  check('F5', hit.length === 0 && !fiveScene,
    hit.length === 0 && !fiveScene
      ? '四类废弃标记 0 命中；正文场景 ' + written + ' 个（第 5 个正文场景不在场）'
      : '命中：' + hit.join('、') + (fiveScene ? '；出现第 4 个正文场景（旧四场景口径）' : ''));
} else {
  check('F5', false, '成品内容数据不在场，无法判废弃项');
}

/* ---- F6 排版基数（原型自带 planManual 实算） ---- */
if (proto !== null && scenes !== null) {
  try {
    const plan = protoPlanFn(proto)(scenes, 0);
    const tabs = plan.sheets.map((sh) => sh.facing + (sh.side === 'left' ? 'L' : 'R')).join(' ');
    const ok = plan.pageCount === 5 && plan.spreadCount === 3 && plan.sheets.length === 3 && tabs === '1L 2R 4R';
    check('F6', ok, plan.pageCount + ' 页／' + plan.spreadCount + ' 跨页／' + plan.sheets.length + ' 纸；签 ' + tabs
      + '（基线：目录＋3 场景＋合页＝5 页，签 1L 2R 4R）');
  } catch (err) {
    check('F6', false, '原型 planManual 实算失败：' + err.message);
  }
} else {
  check('F6', false, '原型或内容数据缺席，无法实算排版基数');
}

/* ---- 结论 ---- */
const total = 6;
const pass = total - fails.length;
lines.push('RESULT: ' + (fails.length === 0 ? 'PASS' : 'FAIL') + ' ' + pass + '/' + total + ' root=' + root);
if (asJson) console.log(JSON.stringify({ root, pass, total, ok: fails.length === 0, fails, lines }, null, 2));
else for (const line of lines) console.log(line);
process.exit(fails.length === 0 ? 0 : 1);
