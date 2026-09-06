#!/usr/bin/env node
// HELP 构建期注入（T11，照 M6 范式）：CALORIE_COMBOS 24 键 + 代表唤醒词→速查表→SKILL.md 互联区；只重写标记块，其余不动。无标记即大声失败。
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CALORIE_COMBOS } from '../dist/cli/keys.js';

export const START = '<!-- HELP-AUTO-START -->';
export const END = '<!-- HELP-AUTO-END -->';

// 每组合键一行代表唤醒词（优先真实 TRIGGERS 短语，照片 HELP 10 键原样，通用 HELP 走 lookup）。
const REPR = {
  'calorie.today': '看今日饮食概览',
  'calorie.view.home': '看今日主页',
  'calorie.view.diet': '看今日饮食概览',
  'calorie.view.exercise': '看今日运动概览',
  'calorie.view.goal': '看今日目标进度',
  'calorie.view.goal-config': '定营养目标',
  'calorie.view.goal-recommend': '定营养目标(自动算)',
  'calorie.view.goal-weight': '定体重目标',
  'calorie.view.goal-progress': '看今日目标进度',
  'calorie.view.goal-status': '看目标状态',
  'calorie.view.combined': '看体重 vs 摄入(最近 7 天)',
  'calorie.view.deficit': '看热量缺口',
  'calorie.view.diet-review': '今日复盘',
  'calorie.view.health': '看健康盘',
  'calorie.view.ranking': '查高热量排行',
  'calorie.view.library': '查食品库',
  'calorie.view.search': '查食品',
  'calorie.photo.list': '看身材照',
  'calorie.photo.detail': '查身材照',
  'calorie.photo.compare': '对比两张照片',
  'calorie.photo.gif': '做身材照GIF',
  'calorie.help.center': '记身材照',
  'calorie.help.lookup': '看今日主页',
  'calorie.history': '查热量历史',
};

function exampleFor(key) {
  switch (key) {
    case 'calorie.today': return 'calorie-cmd-read calorie.today --params \'{"date":"2026-09-07"}\'';
    case 'calorie.view.home': return 'calorie-cmd-read calorie.view.home --params \'{"date":"2026-09-07"}\'';
    case 'calorie.view.diet': return 'calorie-cmd-read calorie.view.diet --params \'{"start":"2026-09-05","end":"2026-09-07"}\'';
    case 'calorie.view.exercise': return 'calorie-cmd-read calorie.view.exercise --params \'{"start":"2026-09-06","end":"2026-09-07"}\'';
    case 'calorie.view.goal': return 'calorie-cmd-read calorie.view.goal --params \'{"start":"2026-09-05","end":"2026-09-07"}\'';
    case 'calorie.view.goal-config': return 'calorie-cmd-read calorie.view.goal-config';
    case 'calorie.view.goal-recommend': return 'calorie-cmd-read calorie.view.goal-recommend --params \'{"profile":"cut"}\'';
    case 'calorie.view.goal-weight': return 'calorie-cmd-read calorie.view.goal-weight --params \'{"start":"2026-09-01","end":"2026-09-07"}\'';
    case 'calorie.view.goal-progress': return 'calorie-cmd-read calorie.view.goal-progress --params \'{"start":"2026-09-05","end":"2026-09-07"}\'';
    case 'calorie.view.goal-status': return 'calorie-cmd-read calorie.view.goal-status';
    case 'calorie.view.combined': return 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_calorie","window":"7d"}\'';
    case 'calorie.view.deficit': return 'calorie-cmd-read calorie.view.deficit --params \'{"start":"2026-09-05","end":"2026-09-07"}\'';
    case 'calorie.view.diet-review': return 'calorie-cmd-read calorie.view.diet-review --params \'{"start":"2026-09-05","end":"2026-09-07"}\'';
    case 'calorie.view.health': return 'calorie-cmd-read calorie.view.health --params \'{"start":"2026-09-05","end":"2026-09-07"}\'';
    case 'calorie.view.ranking': return 'calorie-cmd-read calorie.view.ranking --params \'{"start":"2026-09-05","end":"2026-09-07"}\'';
    case 'calorie.view.library': return 'calorie-cmd-read calorie.view.library';
    case 'calorie.view.search': return 'calorie-cmd-read calorie.view.search --params \'{"keyword":"鸡胸"}\'';
    case 'calorie.photo.list': return 'calorie-cmd-read calorie.photo.list --params \'{"tag":"正面"}\'';
    case 'calorie.photo.detail': return 'calorie-cmd-read calorie.photo.detail --params \'{"id":1}\'';
    case 'calorie.photo.compare': return 'calorie-cmd-read calorie.photo.compare --params \'{"id1":1,"id2":2}\'';
    case 'calorie.photo.gif': return 'calorie-cmd-read calorie.photo.gif --params \'{"tag":"正面"}\'';
    case 'calorie.help.center': return 'calorie-cmd-read calorie.help.center --params \'{"q":"记身材照"}\'';
    case 'calorie.help.lookup': return 'calorie-cmd-read calorie.help.lookup --params \'{"q":"看今日主页"}\'';
    case 'calorie.history': return 'calorie-cmd-read calorie.history --params \'{"days":7}\'';
    default: return 'calorie-cmd-read ' + key;
  }
}

export function buildHelpBlock() {
  const keys = Object.keys(CALORIE_COMBOS).sort();
  const lines = ['| 唤醒词 | key | shape | 例 |', '|---|---|---|---|'];
  for (const k of keys) {
    const shape = CALORIE_COMBOS[k].shape;
    const wake = REPR[k] || k;
    lines.push('| ' + wake + ' | ' + k + ' | ' + shape + ' | \u0060' + exampleFor(k) + '\u0060 |');
  }
  lines.push('');
  lines.push('相关场景：' + keys.join('、') + '（24 组合，key 字符串 skilllink 登记时冻结；内部 VIEW 下划线键仅渲染复用）。');
  lines.push('身材照片 HELP 模块：@feather_wch/skill-calorie/dist/render/photo.js（gallery/compare/viewer/gif + buildPhotoHelp/lookupPhotoHelp，现找直达可执行 exec）。');
  return lines.join('\n');
}

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const skillPath = join(pkgDir, 'SKILL.md');
const text = readFileSync(skillPath, 'utf8');
const si = text.indexOf(START), ei = text.indexOf(END);
if (si < 0 || ei < 0 || ei < si) { console.error('ERR: SKILL.md 缺 HELP 标记块'); process.exit(1); }
const next = text.slice(0, si + START.length) + '\n' + buildHelpBlock() + '\n' + text.slice(ei);
writeFileSync(skillPath, next);
console.log('HELP 已注入：' + skillPath);
