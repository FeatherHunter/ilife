/** #570 摄入预测族 R-15~R-27 靶向断言（改前必红、改后必绿，变异自证打在本件）。
 *
 *  运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`，再 node --test 本件。
 *  不碰冻结 `analysis-*.test.mjs` 口径：本件只判页面侧形状/文案（CSS存在性、H1/chip/detail/口径行）。
 *  R-21/R-25字面验收与冻结冲突（W6-①判定卡无值位／J8导航双向自洽），本件按冻结断言＋文档冲突见证据§6。
 *  R-23体重符号／R-24缺口页窗口涉兄弟页（只读不改），本件只断本族侧，见证据§6。 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { shiftISODate } from '../dist/analysis/utils.js';
import { calorieForecast, calorieGoalEta, calorieDeficitEta, calorieStability } from '../dist/analysis/simulate2.js';
import {
  buildSimCutDoc,
  buildCalorieForecastDoc, buildCalorieGoalDoc, buildCalorieDeficitDoc, buildCalorieStabilityDoc,
} from '../dist/render/trendPredictDocs.js';
import { weightSimCut } from '../dist/analysis/simulate2.js';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const START = '2026-06-18';
function mkSeries(n = 90) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const ex = i % 2 === 0 ? 300 : null;
    out.push({
      date: shiftISODate(START, i),
      calories: 1800 + (i % 5) * 40, protein: 90, carbs: 200, fat: 60,
      sodiumMg: null, sugarG: null, fiberG: null, waterMl: null,
      exerciseKcal: ex,
      weightKg: i === n - 1 ? 75.1 : Math.round((75.1 + (n - 1 - i) * 0.05) * 10) / 10,
      bodyFatPct: null, waistCm: null,
      tdee: 2635, deficit: 1800 + (ex ?? 0) - 1800, calorieGoal: 1800, waterGoal: 2000,
    });
  }
  return out;
}
const series90 = mkSeries(90);
const FC30 = calorieForecast(series90, 30, '摄入预测');
const FC60 = calorieForecast(series90, 60, '摄入预测');
const H30 = buildCalorieForecastDoc(FC30);
const H60 = buildCalorieForecastDoc(FC60);
const H18 = buildCalorieGoalDoc(calorieGoalEta(series90, '摄入预测'));
const H19 = buildCalorieDeficitDoc(calorieDeficitEta(series90, '摄入预测'));
const H20 = buildCalorieStabilityDoc(calorieStability(series90, '摄入预测'));

function h1Of(html) {
  return (html.match(/ilife-block-page-shell-title">([^<]*)</) ?? [])[1] ?? '';
}
function navOf(html) {
  return [...html.matchAll(/<a href="#([^"]+)">([^<]*)<\/a>/g)].map((m) => [m[1], m[2]]);
}
function visible(html) {
  return html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ');
}
function cardsOf(html) {
  const seg = html.slice(html.indexOf('<div class="ilife-block-kpi-card-grid">'));
  const body = seg.slice(0, seg.indexOf('</section>'));
  return body.split('<div class="ilife-block ilife-block-kpi-card">').slice(1).map((c) => ({
    label: (c.match(/kpi-card-label">([^<]*)</) ?? [])[1] ?? '',
    value: (c.match(/kpi-card-value">([^<]*)</) ?? [])[1] ?? '',
    detail: (c.match(/kpi-card-detail">([^<]*)</) ?? [])[1] ?? '',
    badge: (c.match(/ilife-status-badge[^>]*>([^<]*)</) ?? [])[1] ?? '',
  }));
}
function noStyle(html) {
  return html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
}
function paramDescOf(html) {
  const h = noStyle(html);
  return (h.match(/param-form-description[^>]*>([\s\S]*?)<\/(p|div)>/) ?? [])[1]?.replace(/<[^>]+>/g, '').trim() ?? '';
}
function caliberOf(html) {
  const h = noStyle(html);
  const m = h.match(/ilife-block-caliber[^>]*>([\s\S]*?)<\/p>/);
  return (m?.[1] ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function bandCellsOf(html) {
  return [...html.matchAll(/data-label="预计区间">([^<]*)</g)].map((m) => m[1]);
}

test('#570 R-15 轨迹项改摄入预测轨迹（改回模拟轨迹即红；模拟族仍模拟轨迹）', () => {
  const track = navOf(H30).find((n) => n[0] === 'sec-track');
  assert.ok(track, '14–17导航缺sec-track项');
  assert.equal(track[1], '摄入预测轨迹', '轨迹项仍是模拟族残留词：' + track[1]);
  const cap = (H30.match(/<caption[^>]*>([^<]*)</) ?? [])[1] ?? '';
  assert.ok(cap.startsWith('摄入预测轨迹'), '表注改了？' + cap);
  assert.equal(track[1], cap.slice(0, 6), '导航项≠表注前6字');
  const simTrack = navOf(buildSimCutDoc(weightSimCut(series90, 300, '模拟减重'))).find((n) => n[0] === 'sec-track');
  assert.equal(simTrack?.[1], '模拟轨迹', '模拟族被连带改名：' + simTrack?.[1]);
});

test('#570 R-16 三列表窄档堆叠（去cols3标记或堆叠规则即红）', () => {
  assert.ok(H30.includes('tpd-track-table--cols3'), '三列表缺cols3纯标记');
  assert.ok(H30.includes('.tpd-track-table.tpd-track-table--cols3 .ilife-block-data-table tbody>tr{display:block'),
    '堆叠行规则不在产物里');
  assert.ok(H30.includes('gap:4px 12px'), '标签值间隙规则不在产物里（须≥4px）');
  assert.ok(H30.includes('td:first-child::before{content:attr(data-label)}'), '日期标签重印规则不在产物里');
  const body = H30.replace(/<style[\s\S]*?<\/style>/g, '');
  assert.equal(body.split('预测摄入1').length - 1, 0, '源文本出现无间隙串');
});

test('#570 R-17 列宽按内容（去140下限或auto或地板覆盖即红）', () => {
  assert.ok(H30.includes('td:first-child{min-width:140px}'), '日期列140下限不在产物里');
  assert.ok(H30.includes('.tpd-track-table--cols3 .ilife-block-data-table{display:table;width:auto'),
    '外层收缩不在产物里');
  assert.ok(H30.includes('td.ilife-block-data-table-cell-right{min-width:0;'),
    '数值列地板覆盖不在产物里');
});

test('#570 R-18 零宽区间折叠为单值（改回恒至即红）', () => {
  const bands = bandCellsOf(H30);
  assert.ok(bands.length > 0, '区间列读不到');
  const zero = bands.filter((t) => { const m = /^(\d+)\s*至\s*(\d+)$/.exec(t); return m && m[1] === m[2]; });
  assert.equal(zero.length, 0, '仍有零宽区间：' + JSON.stringify(zero.slice(0, 3)));
});

test('#570 R-19 自定义H1带身份（改回按当前速率即红）', () => {
  const h1 = h1Of(H60);
  assert.ok(h1.includes('自定义'), '自定义页H1无身份：' + h1);
  assert.ok(!h1.includes('按当前速率'), '自定义页H1仍写按当前速率：' + h1);
  assert.notEqual(h1, h1Of(H30), '自定义页H1与按当前速率页相同');
  assert.ok(!h1.includes('(') && !h1.includes(')'), 'H1出现半角括号：' + h1);
});

test('#570 R-20 本族网格两列（去覆盖即红）', () => {
  for (const [what, html] of [['17', H60], ['18', H18], ['19', H19], ['20', H20]]) {
    assert.ok(html.includes('div.ilife-block-kpi-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))}'),
      what + '缺两列覆盖');
  }
});

test('#570 R-21 徽章升格值位档且不增值位（冻结W6-①＋字号统一，见证据§6）', () => {
  const card = cardsOf(H18).find((c) => c.label === '是否在轨');
  assert.ok(card, '是否在轨卡不见了');
  assert.equal(card.value, '', '判定卡增值位会红W6-①：' + card.value);
  assert.ok(H18.includes('.ilife-block-kpi-card-badge .ilife-status-badge{font-size:22px;font-weight:700}'),
    '徽章升格规则不在产物里');
  const card20 = cardsOf(H20).find((c) => c.label === '是否稳定');
  assert.ok(card20 && card20.value === '', '是否稳定卡不合W6-①');
});

test('#570 R-22 18页两列后内容接长（结构前提：4卡＋两列覆盖）', () => {
  assert.equal(cardsOf(H18).length, 4, '18页卡数异动');
  assert.ok(H18.includes('div.ilife-block-kpi-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))}'),
    '18页缺两列覆盖（页底留白靠它接长，像素读数见CDP）');
});

test('#570 R-23 缺口正向表述＋口径行符号说明（去加号或说明即红）', () => {
  const avg = cardsOf(H19).find((c) => c.label === '平均缺口');
  assert.ok(avg && avg.value.startsWith('+'), '平均缺口卡未正向表述：' + avg?.value);
  const cal = caliberOf(H19);
  assert.ok(cal.includes('符号＝'), '口径行无符号说明：' + cal.slice(0, 80));
  assert.ok(cal.includes('缺口取正数'), '符号说明缺缺口侧：' + cal.slice(0, 120));
});

test('#570 R-24 20页均值卡带窗口（去窗口即红；21侧待#571）', () => {
  const avg = cardsOf(H20).find((c) => c.label === '均值');
  assert.ok(avg, '均值卡不见了');
  assert.ok(avg.detail.includes('窗口'), '均值卡无窗口：' + avg.detail);
  assert.ok(avg.detail.includes('至'), '均值卡窗口无区间：' + avg.detail);
});

test('#570 R-25 导航名统一＋项数条件统一（J8冻结：href与id双向自洽）', () => {
  const t4 = navOf(H30).map((n) => n[1]);
  assert.deepEqual(t4, ['参数', '概览', '摄入预测轨迹', '数据与日志'], '有轨迹页导航不是统一四项：' + t4);
  for (const [what, html] of [['18', H18], ['19', H19], ['20', H20]]) {
    assert.deepEqual(navOf(html).map((n) => n[1]), ['参数', '概览', '数据与日志'], what + '无轨迹页导航异动');
  }
  for (const [what, html] of [['14', H30], ['17', H60], ['18', H18], ['19', H19], ['20', H20]]) {
    const hrefs = [...html.matchAll(/<a href="#([^"]+)">/g)].map((m) => m[1]).sort();
    const ids = [...html.matchAll(/<section id="([^"]+)"/g)].map((m) => m[1]).sort();
    assert.deepEqual(hrefs, ids, what + '导航与区块失配（J8）');
  }
});

test('#570 R-26 相对目标／相对消耗限定词与数值一一对应（去限定即红）', () => {
  const d18 = cardsOf(H18).find((c) => c.label === '缺口')?.detail ?? '';
  assert.ok(d18.includes('相对目标'), '18缺口卡无相对目标：' + d18);
  const d19 = cardsOf(H19).find((c) => c.label === '平均缺口')?.detail ?? '';
  assert.ok(d19.includes('相对消耗'), '19平均缺口卡无相对消耗：' + d19);
});

test('#570 R-27 口径行只写参数区未写的信息（互子串或同义残余即红）', () => {
  for (const [what, html] of [['17', H60], ['19', H19], ['20', H20]]) {
    const p = paramDescOf(html);
    const c = caliberOf(html);
    assert.ok(p.length > 0 && c.length > 0, what + '参数说明或口径行缺失');
    assert.ok(!(c.includes(p) || p.includes(c)), what + '两处互为子串');
  }
  assert.ok(!paramDescOf(H19).includes('7700'), '19参数说明仍印7700（归口径行）');
  assert.ok(!paramDescOf(H20).includes('300'), '20参数说明仍印300判据（归口径行）');
  const heroDetail = cardsOf(H60).find((c) => c.label === '摄入预测')?.detail ?? '';
  const concl = (noStyle(H60).match(/ilife-block-conclusion">([^<]*)</) ?? [])[1] ?? '';
  assert.ok(!concl.includes(heroDetail) || heroDetail === '按当前趋势', '17结论卡detail仍是结论子串：' + heroDetail);
  assert.ok(heroDetail.includes('比目标') || heroDetail === '按当前趋势', '17结论卡detail非互补信息：' + heroDetail);
});
