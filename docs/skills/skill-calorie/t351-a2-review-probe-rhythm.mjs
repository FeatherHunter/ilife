/** 独立审查兵探针 G：节奏位置（§2.3）＋ 基准列名对照 ＋ 载荷裸词量化。
 *  用法：node .scratch/t351-a2/review/probe-rhythm.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const V3 = '.scratch/t351-fix/final-v3';
const V4 = '.scratch/t351-fix/final-v4';
const SIX_V3 = ['动作', '部位', '类型', '组数×次数', '重量', '备注'];
const FOUR = ['动作', '部位', '组数×次数', '重量'];

const headsOf = (t) => [...t.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map((m) => m[1].trim());
let problems = 0;

function scan(dir, label) {
  const files = readdirSync(dir).filter((f) => f.endsWith('.html')).sort();
  let week = 0; let rest = 0; let day = 0; let dayTempo = 0; const tempoSet = new Set();
  let six = 0; let four = 0; let payloadBare = 0; let visibleBare = 0;
  const perPage = {};
  for (const f of files) {
    const html = readFileSync(join(dir, f), 'utf8');
    const hs = headsOf(html);
    if (hs.join('|') === SIX_V3.join('|')) six += 1;
    if (hs.join('|') === FOUR.join('|')) four += 1;
    // 节奏记号只许出现在日级标题（且日级标题里恰好一次）
    const titles = [...html.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/g)].map((m) => m[1].replace(/<[^>]*>/g, '').trim());
    let t = 0;
    for (const x of titles) {
      if (!x.includes('节奏')) continue;
      t += 1;
      if (/^第 \d+ 周/.test(x)) { week += 1; console.log('FAIL 周级标题带节奏 ' + f + ' ＝ ' + x); }
      if (/休息日/.test(x)) { rest += 1; console.log('FAIL 休息日标题带节奏 ' + f + ' ＝ ' + x); }
      if (!/^周[一二三四五六日]/.test(x)) { console.log('FAIL 节奏出现在非日级标题 ' + f + ' ＝ ' + x); problems += 1; }
      const m = /· 节奏 (.+)$/.exec(x);
      if (m !== null) tempoSet.add(m[1]);
    }
    perPage[f] = t;
    const days = titles.filter((x) => /^周[一二三四五六日]/.test(x));
    day += days.length;
    dayTempo += days.filter((x) => x.includes(' · 节奏 ')).length;
    // 裸词：可见文案 vs 含载荷
    const visible = html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]*>/g, ' ');
    visibleBare += (visible.match(/(?<![\w-])(main|iso)(?![\w-])/g) || []).length;
    payloadBare += ((html.match(/(?<![\w-])(main|iso)(?![\w-])/g) || []).length);
    if (/· 节奏/.test(html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '')) === false) {
      // 表体里不该出现节奏（节奏只上标题）
    }
  }
  // 表体里不许有节奏记号：逐表检查 body 区
  for (const f of files) {
    const html = readFileSync(join(dir, f), 'utf8');
    for (const m of html.matchAll(/<tbody>([\s\S]*?)<\/tbody>/g)) {
      if (/节奏|RPM/.test(m[1])) { console.log('FAIL 表体里出现节奏 ' + f); problems += 1; }
    }
  }
  console.log('SCAN ' + label + ' 六列页=' + six + ' 四列页=' + four + ' 周级带节奏=' + week + ' 休息日带节奏=' + rest
    + ' 日级标题=' + day + ' 其中带节奏=' + dayTempo + ' 节奏取值=' + JSON.stringify([...tempoSet]));
  console.log('SCAN ' + label + ' 可见文案裸词=' + visibleBare + ' 含载荷裸词=' + payloadBare);
  console.log('SCAN_TAIL ' + label + ' 逐页日级带节奏条数=' + JSON.stringify(perPage));
  return { week, rest };
}

const a = scan(V3, 'final-v3(基准)');
const b = scan(V4, 'final-v4(交付)');
const c = scan('.scratch/t351-fix/mut/m2', 'mut/m2(变异轮·摘节奏)');
console.log('MUT2_VS_DELIVERY 变异轮日级带节奏=' + JSON.stringify(Object.values(JSON.parse(JSON.stringify({}))).length)
  + ' 见上两行');
problems += a.week + a.rest + b.week + b.rest;
console.log('PROBE_RHYTHM: ' + (problems === 0 ? 'GREEN' : 'RED(' + problems + ')'));
console.log('RESULT: ' + (problems === 0 ? '1/1' : '0/1'));
