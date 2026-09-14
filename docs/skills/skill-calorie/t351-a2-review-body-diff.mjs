// 独立审查兵探针 A：正文对比（v3 vs v4）＋ 四列表头 ＋ 节奏位置 ＋ 裸词口径
// 不 import 被审脚本任何件；口径自己写。
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const V3 = '.scratch/t351-fix/final-v3';
const V4 = '.scratch/t351-fix/final-v4';

/** 剥 <style> 与全部 <script> 块，再抹时间戳 */
function bodyOf(html) {
  let t = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '\u0000STYLE\u0000');
  t = t.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '\u0000SCRIPT\u0000');
  // 抹时间戳：ISO、渲染于 …、mtime 形状
  t = t.replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?/g, '\u0000TS\u0000');
  t = t.replace(/\d{4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}(:\d{2})?/g, '\u0000TS\u0000');
  return t;
}

/** 抽掉表头的 <th> 序列（按文档序） */
function thLabels(html) {
  const out = [];
  const re = /<th\b[^>]*>([\s\S]*?)<\/th>/gi;
  let m;
  while ((m = re.exec(html)) !== null) out.push(m[1].replace(/<[^>]*>/g, '').trim());
  return out;
}

/** 每个 data-table 的表头序列 */
function tablesOf(html) {
  const out = [];
  const re = /<div class="ilife-block ilife-block-data-table">([\s\S]*?)<\/table>/g;
  let m;
  while ((m = re.exec(html)) !== null) out.push(thLabels(m[1]));
  return out;
}

const FOUR = ['动作', '部位', '组数×次数', '重量'];
const SIX = ['动作', '部位', '组数×次数', '重量', '节奏', '备注'];

const files = readdirSync(V4).filter((f) => f.endsWith('.html')).sort();
const v3files = new Set(readdirSync(V3).filter((f) => f.endsWith('.html')));

const report = {
  fourHeaderPages: [], stillSix: [], headerMismatch: [],
  common: [], commonSame: [], commonDiff: [], diffDetail: {},
  rhythm: { weekLevelWithTempo: [], dayLevelOK: 0, dayLevelTotal: 0, restWithTempo: [], perPage: {} },
  bareWords: { main: [], iso: [] },
};

for (const f of files) {
  const html = readFileSync(join(V4, f), 'utf8');
  const tabs = tablesOf(html);
  const four = tabs.filter((t) => JSON.stringify(t) === JSON.stringify(FOUR)).length;
  const six = tabs.filter((t) => JSON.stringify(t) === JSON.stringify(SIX)).length;
  if (four > 0) report.fourHeaderPages.push([f, four, six]);
  if (six > 0) report.stillSix.push([f, six]);
  // 表头若有「组数×次数」却不是四列或六列，记不符
  for (const t of tabs) {
    if (t.includes('组数×次数') && JSON.stringify(t) !== JSON.stringify(FOUR) && JSON.stringify(t) !== JSON.stringify(SIX)) {
      report.headerMismatch.push([f, t]);
    }
  }
  // 节奏：周级标题不许有，日级标题必须有（有动作表的场次）
  for (const m of html.matchAll(/<summary class="ilife-block-disclosure-summary">([\s\S]*?)<\/summary>/g)) {
    const raw = m[1];
    const text = raw.replace(/<[^>]*>/g, '').trim();
    const isWeek = /^第 \d+ 周/.test(text);
    const isRest = /休息日/.test(text);
    const isDay = /^周[一二三四五六日]/.test(text);
    if (isWeek && /节奏/.test(text)) report.rhythm.weekLevelWithTempo.push([f, text]);
    if (isRest && /节奏/.test(text)) report.rhythm.restWithTempo.push([f, text]);
    if (isDay) {
      report.rhythm.dayLevelTotal += 1;
      if (/节奏/.test(text)) report.rhythm.dayLevelOK += 1;
      if (!report.rhythm.perPage[f]) report.rhythm.perPage[f] = [];
      report.rhythm.perPage[f].push(text);
    }
  }
  // 正文裸词（去标签后的可见文案）
  const visible = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ');
  const hitMain = (visible.match(/(?<![A-Za-z])main(?![A-Za-z])/g) || []).length;
  const hitIso = (visible.match(/(?<![A-Za-z])iso(?![A-Za-z])/g) || []).length;
  if (hitMain) report.bareWords.main.push([f, hitMain]);
  if (hitIso) report.bareWords.iso.push([f, hitIso]);

  if (v3files.has(f)) {
    report.common.push(f);
    const a = bodyOf(readFileSync(join(V3, f), 'utf8'));
    const b = bodyOf(html);
    if (a === b) report.commonSame.push(f);
    else {
      report.commonDiff.push(f);
      // 逐行差异摘要（只在第一个不同处分块）
      const la = a.split('\n'), lb = b.split('\n');
      const diffs = [];
      const n = Math.max(la.length, lb.length);
      for (let i = 0; i < n && diffs.length < 6; i += 1) {
        if (la[i] !== lb[i]) {
          diffs.push({ line: i + 1, v3: (la[i] ?? '').slice(0, 400), v4: (lb[i] ?? '').slice(0, 400) });
        }
      }
      report.diffDetail[f] = { v3len: a.length, v4len: b.length, diffs };
    }
  } else {
    report.diffDetail['MISSING_IN_V3:' + f] = true;
  }
}

console.log(JSON.stringify(report, null, 1));
