#!/usr/bin/env node
// HELP 构建期注入（T11，照 M6 范式；#40 追加 35 写键）：CALORIE_COMBOS 全量键 + 代表唤醒词→速查表→SKILL.md 互联区；只重写标记块，其余不动。无标记即大声失败。
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
  'calorie.view.exercise-strength': '看力量训练总览',
  'calorie.view.exercise-cardio': '看有氧训练总览',
  'calorie.view.exercise-distribution': '看运动分类占比',
  'calorie.view.exercise-recap': '看运动复盘',
  'calorie.view.exercise-review': '计划复盘（本周）',
  'calorie.view.exercise-trend': '看运动消耗趋势',
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
  'calorie.diet.add': '记一餐',
  'calorie.diet.update': '改饮食记录',
  'calorie.diet.remove': '删饮食记录',
  'calorie.diet.batch': '批量补记饮食',
  'calorie.diet.copy': '复制昨日饮食',
  'calorie.diet.update-by-date': '改某日饮食',
  'calorie.diet.remove-by-date': '删某日饮食',
  'calorie.diet.remove-by-range': '批量删饮食',
  'calorie.diet.remove-by-type': '删一餐',
  'calorie.water.log': '记喝水',
  'calorie.weight.log': '记体重',
  'calorie.weight.update': '改体重记录',
  'calorie.weight.remove': '删体重记录',
  'calorie.weight.batch': '批量补录体重',
  'calorie.exercise.add': '记运动',
  'calorie.exercise.update': '改运动记录',
  'calorie.exercise.remove': '删运动记录',
  'calorie.photo.add': '记身材照',
  'calorie.photo.remove': '删身材照',
  'calorie.photo.tag': '改照片标签',
  'calorie.product.add': '存食品',
  'calorie.product.update': '改食品',
  'calorie.product.deprecate': '下架食品',
  'calorie.profile.set': '设置档案',
  'calorie.profile.activity': '设活动量',
  'calorie.profile.update': '改档案',
  'calorie.goal.set': '定营养目标',
  'calorie.goal.water': '定饮水目标',
  'calorie.goal.weight': '定体重目标',
  'calorie.goal.pause': '暂停所有目标',
  'calorie.goal.resume': '重启所有目标',
  'calorie.body.composition-add': '记体脂',
  'calorie.body.composition-remove': '删体脂',
  'calorie.body.measure-add': '记围度',
  'calorie.body.measure-remove': '删围度',
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
    case 'calorie.view.exercise-strength': return 'calorie-cmd-read calorie.view.exercise-strength --params \'{"start":"2026-09-01","end":"2026-09-07"}\'';
    case 'calorie.view.exercise-cardio': return 'calorie-cmd-read calorie.view.exercise-cardio --params \'{"start":"2026-09-01","end":"2026-09-07"}\'';
    case 'calorie.view.exercise-distribution': return 'calorie-cmd-read calorie.view.exercise-distribution --params \'{"start":"2026-09-01","end":"2026-09-07"}\'';
    case 'calorie.view.exercise-recap': return 'calorie-cmd-read calorie.view.exercise-recap --params \'{"start":"2026-09-01","end":"2026-09-07"}\'';
    case 'calorie.view.exercise-review': return 'calorie-cmd-read calorie.view.exercise-review --params \'{"start":"2026-08-31","end":"2026-09-07"}\'';
    case 'calorie.view.exercise-trend': return 'calorie-cmd-read calorie.view.exercise-trend --params \'{"start":"2026-09-01","end":"2026-09-07"}\'';
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
    case 'calorie.diet.add': return 'calorie-cmd-read calorie.diet.add --params \'{"foodName":"鸡胸","calories":200,"protein":35}\'';
    case 'calorie.diet.update': return 'calorie-cmd-read calorie.diet.update --params \'{"id":1,"grams":150}\'';
    case 'calorie.diet.remove': return 'calorie-cmd-read calorie.diet.remove --params \'{"id":1}\'';
    case 'calorie.diet.batch': return 'calorie-cmd-read calorie.diet.batch --params \'{"items":[{"foodName":"粥","calories":150,"protein":3}]}\'';
    case 'calorie.diet.copy': return 'calorie-cmd-read calorie.diet.copy --params \'{"from":"2026-09-06"}\'';
    case 'calorie.diet.update-by-date': return 'calorie-cmd-read calorie.diet.update-by-date --params \'{"date":"2026-09-06","note":"食堂"}\'';
    case 'calorie.diet.remove-by-date': return 'calorie-cmd-read calorie.diet.remove-by-date --params \'{"date":"2026-09-06"}\'';
    case 'calorie.diet.remove-by-range': return 'calorie-cmd-read calorie.diet.remove-by-range --params \'{"start":"2026-09-01","end":"2026-09-02"}\'';
    case 'calorie.diet.remove-by-type': return 'calorie-cmd-read calorie.diet.remove-by-type --params \'{"date":"2026-09-06","mealType":"早餐"}\'';
    case 'calorie.water.log': return 'calorie-cmd-read calorie.water.log --params \'{"ml":300}\'';
    case 'calorie.weight.log': return 'calorie-cmd-read calorie.weight.log --params \'{"kg":70.5}\'';
    case 'calorie.weight.update': return 'calorie-cmd-read calorie.weight.update --params \'{"id":1,"kg":70.2}\'';
    case 'calorie.weight.remove': return 'calorie-cmd-read calorie.weight.remove --params \'{"id":1}\'';
    case 'calorie.weight.batch': return 'calorie-cmd-read calorie.weight.batch --params \'{"items":[{"date":"2026-09-06","kg":70.5}]}\'';
    case 'calorie.exercise.add': return 'calorie-cmd-read calorie.exercise.add --params \'{"type":"慢跑","calories":320,"minutes":30}\'';
    case 'calorie.exercise.update': return 'calorie-cmd-read calorie.exercise.update --params \'{"id":1,"minutes":40}\'';
    case 'calorie.exercise.remove': return 'calorie-cmd-read calorie.exercise.remove --params \'{"id":1}\'';
    case 'calorie.photo.add': return 'calorie-cmd-read calorie.photo.add --params \'{"srcPaths":["<照片路径>"],"tag":"正面"}\'';
    case 'calorie.photo.remove': return 'calorie-cmd-read calorie.photo.remove --params \'{"id":1}\'';
    case 'calorie.photo.tag': return 'calorie-cmd-read calorie.photo.tag --params \'{"id":1,"op":"add","tag":"晨起"}\'';
    case 'calorie.product.add': return 'calorie-cmd-read calorie.product.add --params \'{"productName":"鸡胸肉","calories":165,"protein":31,"fat":3.6,"carbohydrates":0,"sodium":70}\'';
    case 'calorie.product.update': return 'calorie-cmd-read calorie.product.update --params \'{"id":1,"note":"新版"}\'';
    case 'calorie.product.deprecate': return 'calorie-cmd-read calorie.product.deprecate --params \'{"id":1}\'';
    case 'calorie.profile.set': return 'calorie-cmd-read calorie.profile.set --params \'{"heightCm":175,"activityLevel":"moderate"}\'';
    case 'calorie.profile.activity': return 'calorie-cmd-read calorie.profile.activity --params \'{"activityLevel":"active"}\'';
    case 'calorie.profile.update': return 'calorie-cmd-read calorie.profile.update --params \'{"field":"heightCm","value":176}\'';
    case 'calorie.goal.set': return 'calorie-cmd-read calorie.goal.set --params \'{"calorie":1800,"protein":150,"carbs":200,"fat":50}\'';
    case 'calorie.goal.water': return 'calorie-cmd-read calorie.goal.water --params \'{"water":2000}\'';
    case 'calorie.goal.weight': return 'calorie-cmd-read calorie.goal.weight --params \'{"kg":68}\'';
    case 'calorie.goal.pause': return 'calorie-cmd-read calorie.goal.pause';
    case 'calorie.goal.resume': return 'calorie-cmd-read calorie.goal.resume';
    case 'calorie.body.composition-add': return 'calorie-cmd-read calorie.body.composition-add --params \'{"source":"gym","bodyFatPct":18.5}\'';
    case 'calorie.body.composition-remove': return 'calorie-cmd-read calorie.body.composition-remove --params \'{"id":1}\'';
    case 'calorie.body.measure-add': return 'calorie-cmd-read calorie.body.measure-add --params \'{"waistCm":85}\'';
    case 'calorie.body.measure-remove': return 'calorie-cmd-read calorie.body.measure-remove --params \'{"id":1}\'';

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
  lines.push('相关场景：' + keys.join('、') + '（' + keys.length + ' 组合，key 字符串 skilllink 登记时冻结；内部 VIEW 下划线键仅渲染复用）。');
  lines.push('身材照片 HELP 模块：skill-calorie/dist/render/photo.js（gallery/compare/viewer/gif + buildPhotoHelp/lookupPhotoHelp，现找直达可执行 exec）。');
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
