#!/usr/bin/env node
/** #782 原型（**抛弃式**，不进生产路径）：作息管家三张样本页的「页型配方」候选。
 *
 * 要回答的问题（写在每页顶上，可见）：这三张页——`今天总结`（单日盘）／`查日程`（日程盘）／
 * `周视图`（热力盘）——**各由公共层哪些件、怎样组合而成**，即票面那张「页型配方表」。
 *
 * 形态：每页**一个自包含 HTML**，页内放 3 个结构不同的候选变体（同一批真数据、同一批公共层件），
 * 底部悬浮药丸 `← 变体 →` 切换（`?variant=A` 也可直达、`←/→` 键可切）。
 * 每个变体前有一条虚框「配方条」，写明本变体的骨架、用了哪些件、老侧必现块落在哪一件上
 * ——这一条就是原型的「外显状态」：换变体时，看的是**件与骨架**，不只是长相。
 *
 * 数据：种子库 `.scratch/t844/home/.ilife/data/schedule_data.db`（锚点 2026-09-21，隔离库、只读）。
 * 视觉基座：公共层 `base-paint`（blocks ＋ charts ＋ pageUi ＋ pageShapes），本文件不写页面级样式以外的 CSS。
 *
 * 跑法（仓根）：`node docs/skills/skill-schedule/t782-原型.mjs`
 * 产物：`.scratch/t782/原型/<页名>.html`（双击即看，零外部引用、零持久化）。
 * 抛弃式：本文件与产物都不进 main；裁完之后按票面重写成 `t782-样板.mjs` 与 `src/shared/` 的页组件。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const HERE = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const REPO = resolve(HERE, '..', '..', '..');
const OUT = join(REPO, '.scratch', 't782', '原型');
const PKG = join(REPO, 'packages', 'skill-schedule');
const BASE = join(PKG, 'node_modules', 'base-paint', 'dist');
const DB = join(REPO, '.scratch', 't844', 'home', '.ilife', 'data', 'schedule_data.db');
const LF = String.fromCharCode(10);
const DAY = '2026-09-21';
const WEEK_MON = '2026-09-14';

const imp = (p) => import(pathToFileURL(p).href);
const { renderDocShell } = await imp(join(BASE, 'docShell.js'));
const { charts, pageUiCss, pageShapeCss, CHART_PALETTE, renderFactStrip, renderTimelineRows } = await imp(join(BASE, 'index.js'));
const B = await imp(join(BASE, 'blocks.js'));
const P = await imp(join(PKG, 'dist', 'policy', 'category.js'));

/* ══════════════════════ 一 · 数据：种子库 → 三张页的载荷 ══════════════════════ */

const L1 = ['维持', '健康', '工作', '学习', '创作', '投入', '调整', '日常'];
const COLOR = Object.fromEntries(L1.map((k, i) => [k, CHART_PALETTE[i % CHART_PALETTE.length]]));
const colorOf = (l1) => COLOR[l1] || 'var(--fg3)';

const toMin = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
};
const hhmm = (mins) => String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
const dayLabel = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

/** 24 格色带：每格＝该小时里「覆盖分钟最多」的一级分类（老侧周视图同口径）。 */
function hourCells(records) {
  const acc = Array.from({ length: 24 }, () => ({}));
  for (const r of records) {
    const s = toMin(r.time_start);
    const e = toMin(r.time_end);
    const l1 = P.l1Of(r.category);
    for (let h = Math.floor(s / 60); h <= Math.floor((e - 1) / 60); h += 1) {
      if (h < 0 || h > 23) continue;
      const cov = Math.min((h + 1) * 60, e) - Math.max(h * 60, s);
      if (cov > 0) acc[h][l1] = (acc[h][l1] || 0) + cov;
    }
  }
  return acc.map((m) => {
    const keys = Object.keys(m);
    if (keys.length === 0) return { l1: null, mins: 0 };
    const win = keys.sort((a, b) => m[b] - m[a])[0];
    return { l1: win, mins: m[win] };
  });
}

function byL1Of(records) {
  const out = {};
  for (const r of records) {
    const l1 = P.l1Of(r.category);
    out[l1] = (out[l1] || 0) + (r.duration_minutes || 0);
  }
  return out;
}

function gapsOf(events) {
  const out = [];
  const sorted = [...events].sort((a, b) => toMin(a.time_start) - toMin(b.time_start));
  let cur = 0;
  for (const e of sorted) {
    const s = toMin(e.time_start);
    if (s > cur) out.push({ start: cur, end: s, mins: s - cur });
    cur = Math.max(cur, toMin(e.time_end));
  }
  if (cur < 1440) out.push({ start: cur, end: 1440, mins: 1440 - cur });
  return out;
}

function loadData() {
  const db = new DatabaseSync(DB, { readOnly: true });
  const rec = db.prepare('select id,date,time_start,time_end,duration_minutes,activity,category from schedule_records where date = ? order by time_start, id');
  const pln = db.prepare('select id,date,time_start,time_end,title,notes,category,is_active,completion,feishu_event_id from schedule_plans where date = ? and is_active = 1 order by time_start, id');

  // 单日盘
  const dayRecs = rec.all(DAY);
  const dayByL1 = byL1Of(dayRecs);
  const dayScore = P.computeHealthScore(dayByL1);
  const sleepMin = dayRecs.filter((r) => /睡眠|午睡/.test(r.category)).reduce((a, r) => a + (r.duration_minutes || 0), 0);
  const day = {
    date: DAY, recs: dayRecs, byL1: dayByL1, score: dayScore.score, dims: dayScore.dims,
    coverage: dayRecs.reduce((a, r) => a + (r.duration_minutes || 0), 0),
    cells: hourCells(dayRecs), sleep: sleepMin,
  };

  // 日程盘
  const dayPlans = pln.all(DAY);
  const plan = {
    date: DAY, events: dayPlans, gaps: gapsOf(dayPlans),
    ranked: dayPlans.filter((e) => /已完成/.test(e.completion || '')).length,
    synced: dayPlans.filter((e) => e.feishu_event_id).length,
  };

  // 热力盘：锚点所在周（周一~周日），逐日 24 格 ＋ 汇总
  const mon = new Date(WEEK_MON + 'T00:00:00Z');
  const weekDays = Array.from({ length: 7 }, (_, i) => new Date(mon.getTime() + i * 86400000).toISOString().slice(0, 10));
  const weekRecs = [];
  const weekRows = weekDays.map((d, i) => {
    const rs = rec.all(d);
    weekRecs.push(...rs);
    const cells = hourCells(rs);
    return { date: d, label: dayLabel[i], recs: rs, cells, mins: cells.reduce((a, c) => a + c.mins, 0), n: rs.length };
  });
  const weekByL1 = byL1Of(weekRecs);
  const week = {
    start: weekDays[0], end: weekDays[6], rows: weekRows, byL1: weekByL1,
    total: weekRecs.reduce((a, r) => a + (r.duration_minutes || 0), 0),
    score: P.computeHealthScore(weekByL1).score,
    activeDays: weekRows.filter((r) => r.n > 0).length,
    records: weekRecs.length,
  };
  db.close();
  return { day, plan, week };
}

/* ══════════════════════ 二 · 复用的块装配（三页共用的读法） ══════════════════════ */

const sep = (a) => a.trim();
/** 分类分布行（分类进度／分类总览）：`renderDistributionRows` 是**行即件**（不返容器），
 *  这里补一层容器，好让「块＝页级栅格的直接子件」这条关系成立（变体标才有地方挂）。 */
const distRows = (byL1, total) => '<div class="t782-dist">'
  + B.renderDistributionRows({
    rows: L1.filter((k) => (byL1[k] || 0) > 0)
      .sort((a, b) => (byL1[b] || 0) - (byL1[a] || 0))
      .map((k) => ({ label: k, value: P.fmtDurShort(byL1[k]), pct: P.fmtPct(byL1[k], total), color: colorOf(k) })),
  }) + '</div>';

/** 24h 时间轴色带：公共层 `renderChartBlock({kind:'bar'})`，24 格＝24 小时，色＝该小时主分类。 */
const bandBars = (cells, opts = {}) => B.renderChartBlock({
  kind: 'bar',
  title: opts.title,
  input: {
    items: cells.map((c, h) => ({ label: String(h).padStart(2, '0'), value: c.l1 === null ? 0 : c.mins, color: colorOf(c.l1) })),
    options: { height: opts.height || 110, yMax: 60, singleColor: false, showValues: false, grid: false, labels: 'select', compact: true },
  },
});

/** 热力矩阵（页内自造件）：7 行 × 24 格；格色＝该小时主分类，空白＝无记录。
 *  `withTotal` 为真时行尾多一格「当日合计」（C 变体用它把矩阵当"条带"读）。 */
function heatMatrix(rows, key, withTotal) {
  const head = rows.map((r) => '<div class="t782-heat-row' + (withTotal ? ' t782-heat-row-total' : '') + '">'
    + '<div class="t782-heat-day">' + r.label + ' ' + r.date.slice(5) + '</div>'
    + '<div class="t782-heat-cells">' + r.cells.map((c, h) => '<span class="t782-heat-cell"'
      + ' style="background:' + (c.l1 === null ? 'var(--soft)' : colorOf(c.l1))
      + '" title="' + r.date + ' ' + String(h).padStart(2, '0') + ':00 · ' + (c.l1 || '无记录') + ' · ' + c.mins + ' 分钟"></span>').join('') + '</div>'
    + (withTotal ? '<div class="t782-heat-sum">' + (r.mins ? P.fmtDurShort(r.mins) : '无记录') + '</div>' : '')
    + '</div>').join('');
  // 小时刻度：五枚标签各占 4 格（首枚左对齐、末枚右对齐），左缘落在它标的那一小时上。
  const ticks = [[1, '00:00', 'left'], [7, '06:00', 'left'], [13, '12:00', 'left'], [19, '18:00', 'left'], [21, '24:00', 'right']]
    .map(([col, text, align]) => '<span style="grid-column:' + col + '/span 4;text-align:' + align + '">' + text + '</span>').join('');
  return '<div class="t782-heat" data-variant="' + key + '" id="' + key + '-heat">'
    + head
    + '<div class="t782-heat-row' + (withTotal ? ' t782-heat-row-total' : '') + '"><div></div><div class="t782-heat-ticks">' + ticks + '</div>'
    + (withTotal ? '<div></div>' : '') + '</div>'
    + '</div>';
}

const legend = (key) => '<div class="t782-legend" data-variant="' + key + '">'
  + L1.map((k) => '<span><i style="background:' + colorOf(k) + '"></i>' + k + '</span>').join('') + '</div>';

const copyBlock = (key, title, text, log) => B.renderCopyBlock({
  title, dataText: text, logText: log,
  dataActionId: 't782-' + key + '-copy-data', logActionId: 't782-' + key + '-copy-log',
});

/* ══════════════════════ 三 · 页一：今天总结（单日盘） ══════════════════════ */

function pageDay(d) {
  const byL1 = d.byL1;
  const top = Object.keys(byL1).sort((a, b) => byL1[b] - byL1[a])[0];
  const cards = [
    { label: '记录块数', value: String(d.recs.length), unit: '块' },
    { label: '覆盖时长', value: P.fmtDurShort(d.coverage), detail: '一天 1440 分钟里的已记录部分' },
    { label: '健康分', value: String(d.score), detail: '七个维度取均（创作不参评）' },
    { label: '睡眠＋午睡', value: P.fmtDurShort(d.sleep), detail: '周目标 49 小时' },
  ];
  const sleepFacts = [
    { label: '夜间睡眠', value: P.fmtDurShort(d.recs.filter((r) => /睡眠/.test(r.category)).reduce((a, r) => a + r.duration_minutes, 0)) },
    { label: '午睡', value: P.fmtDurShort(d.recs.filter((r) => /午睡/.test(r.category)).reduce((a, r) => a + r.duration_minutes, 0)) },
    { label: '合计', value: P.fmtDurShort(d.sleep), tone: d.sleep >= 420 ? 'ok' : 'warn' },
    { label: '最长一块', value: d.recs.slice().sort((a, b) => b.duration_minutes - a.duration_minutes)[0].activity },
  ];
  const detailRows = d.recs.map((r) => ({ left: r.time_start + '~' + r.time_end, main: P.getEmojiPrefix(r.category) + r.activity, right: P.fmtDurShort(r.duration_minutes) }));
  const conclusion = '今天 ' + d.recs.length + ' 块记录、覆盖 ' + P.fmtDurShort(d.coverage) + '，健康分 ' + d.score
    + '；投入最多的是「' + top + '」' + P.fmtDurShort(byL1[top]) + '，睡眠合计 ' + P.fmtDurShort(d.sleep) + '。';
  const text = '【作息管家 · 今天总结】' + d.date + ' · ' + d.recs.length + ' 块 · ' + P.fmtDur(d.coverage) + L1
    .map((k) => k + ' ' + P.fmtDurShort(byL1[k] || 0));

  const variants = [];
  // A · 单列顺读：先读数、再分布、再时间轴、末明细（老侧 f01 的原始层级）
  variants.push({
    key: 'A', name: '单列顺读',
    skeleton: '单列纵向：读数卡 → 结论条 → 24h 色带 → 分类进度 → 睡眠统计 → 逐条明细。',
    uses: ['页内导航 renderTocBlock', '读数卡 renderKpiGrid', '结论条 renderConclusionBar', '图表 renderChartBlock(bar)', '分布行 renderDistributionRows', '事实条 renderFactStrip', '列表行 renderListRows', '复制区 renderCopyBlock'],
    musts: ['4 卡摘要 → renderKpiGrid', '分类进度 → renderDistributionRows', '24h 时间轴 → renderChartBlock(bar)', '睡眠统计 → renderFactStrip'],
    pieces: [
      B.renderTocBlock({ items: [{ id: 'A-sum', text: '摘要' }, { id: 'A-band', text: '24 小时' }, { id: 'A-dist', text: '分类' }, { id: 'A-detail', text: '明细' }] }),
      B.renderKpiGrid(cards),
      B.renderConclusionBar(conclusion),
      B.renderCaliberLine('数据口径｜一天 24 小时计 1440 分钟｜分类取一级八类'),
      '<div data-variant="A" id="A-band">' + bandBars(d.cells, { title: '24 小时时间轴（每格＝该小时主分类，高度＝该小时已记录分钟）' }) + '</div>',
      '<div data-variant="A" id="A-dist">' + distRows(byL1, d.coverage) + '</div>',
      renderFactStrip({ items: sleepFacts }),
      '<div data-variant="A" id="A-detail">' + B.renderListRows({ items: detailRows, emptyText: '这一天没有记录' }) + '</div>',
      copyBlock('A', '复制与留档', text, 'schedule.record.today ' + d.date),
    ],
  });
  // B · 时间轴主轴：一条线读一天，读数压成一行，分布收进折叠
  variants.push({
    key: 'B', name: '时间轴主轴',
    skeleton: '时间轴置顶放大，逐条纵排；读数压成一行事实条；分类进度收进折叠区。',
    uses: ['结论条 renderConclusionBar', '图表 renderChartBlock(bar)', '事实条 renderFactStrip', '时间轴条 renderTimelineRows', '折叠区 renderDisclosure', '复制区 renderCopyBlock'],
    musts: ['4 卡摘要 → renderFactStrip（压成一行）', '分类进度 → renderDisclosure + renderDistributionRows', '24h 时间轴 → renderChartBlock(bar) ＋ renderTimelineRows', '睡眠统计 → renderFactStrip'],
    pieces: [
      B.renderConclusionBar(conclusion),
      bandBars(d.cells, { title: '24 小时时间轴', height: 140 }),
      renderFactStrip({ items: cards.map((c) => ({ label: c.label, value: c.value + (c.unit || '') })) }),
      renderTimelineRows({ rows: d.recs.map((r) => ({ time: r.time_start + '~' + r.time_end, main: r.activity, note: r.category + ' · ' + P.fmtDurShort(r.duration_minutes) })) }),
      renderFactStrip({ items: sleepFacts }),
      B.renderDisclosure({ title: '分类进度（8 类分布）', contentHtml: distRows(byL1, d.coverage) }),
      copyBlock('B', '复制与留档', text, 'schedule.record.today ' + d.date),
    ],
  });
  // C · 两栏读数盘：左栏常驻读数，右栏时间轴与明细
  variants.push({
    key: 'C', name: '两栏读数盘',
    skeleton: '≥821px 两栏（左 320px 常驻读数／右宽栏时间轴与明细）；≤820px 塌成一列，读数在前。',
    uses: ['读数卡 renderKpiGrid', '图表 renderChartBlock(bar)', '分布行 renderDistributionRows', '事实条 renderFactStrip', '列表行 renderListRows', '复制区 renderCopyBlock', '页内自造件 两栏骨架'],
    musts: ['4 卡摘要 → renderKpiGrid（左栏竖排）', '分类进度 → renderDistributionRows（左栏）', '24h 时间轴 → renderChartBlock(bar)（右栏）', '睡眠统计 → renderFactStrip（左栏）'],
    pieces: [
      B.renderConclusionBar(conclusion),
      '<div class="t782-split">'
        + '<div>' + B.renderKpiGrid(cards) + distRows(byL1, d.coverage) + renderFactStrip({ items: sleepFacts }) + '</div>'
        + '<div>' + B.renderChartBlock({ kind: 'bar', title: '24 小时时间轴', input: { items: d.cells.map((c, h) => ({ label: String(h).padStart(2, '0'), value: c.l1 === null ? 0 : c.mins, color: colorOf(c.l1) })), options: { height: 120, yMax: 60, singleColor: false, showValues: false, grid: false, labels: 'select' } } })
          + B.renderListRows({ items: detailRows }) + '</div>'
      + '</div>',
      copyBlock('C', '复制与留档', text, 'schedule.record.today ' + d.date),
    ],
  });

  return {
    file: '今天总结（单日盘）.html',
    docTitle: '作息管家 · 今天总结（原型）',
    title: '今天总结 · 单日盘',
    subtitle: d.date + ' · ' + d.recs.length + ' 块记录 · 覆盖 ' + P.fmtDurShort(d.coverage) + ' · 健康分 ' + d.score,
    question: '单日盘该怎么装：读数卡打头，还是时间轴打头？分类进度与睡眠统计放主位还是收进折叠？',
    must: '老侧 f01「作息记录·单日」必现块：4 卡摘要／分类进度／24h 时间轴／睡眠统计。',
    variants,
  };
}

/* ══════════════════════ 四 · 页二：查日程（日程盘） ══════════════════════ */

function pagePlan(p) {
  const evRows = p.events.map((e) => ({
    left: e.time_start + '~' + e.time_end, main: e.title,
    right: (e.completion === '已完成' ? '已完成 · ' : '') + (e.feishu_event_id ? '飞书已同步' : '未同步'),
  }));
  const gapRows = p.gaps.map((g) => ({ left: hhmm(g.start) + '~' + (g.end === 1440 ? '24:00' : hhmm(g.end)), main: '空档', right: P.fmtDurShort(g.mins) }));
  const freeMin = p.gaps.reduce((a, g) => a + g.mins, 0);
  const busy = p.events.reduce((a, e) => a + (toMin(e.time_end) - toMin(e.time_start)), 0);
  const cells = hourCells(p.events.map((e) => ({ time_start: e.time_start, time_end: e.time_end, category: e.category || '日常' })));
  const cards = [
    { label: '事件', value: String(p.events.length), unit: '件' },
    { label: '已排时段', value: P.fmtDurShort(busy) },
    { label: '空档', value: String(p.gaps.length), unit: '段', detail: '合计 ' + P.fmtDurShort(freeMin) },
    { label: '已完成', value: String(p.ranked), unit: '件', detail: '飞书已同步 ' + p.synced + ' 件' },
  ];
  const form = (key) => B.renderParamForm({
    description: '筛选位（日期／分类／状态）——本原型的表单是静态件，点了不会真的筛。',
    fields: [
      { name: key + '-date', label: '日期', value: p.date },
      { name: key + '-cat', label: '分类', value: '全部', options: ['全部'].concat(L1) },
      { name: key + '-state', label: '状态', value: '全部', options: ['全部', '已完成', '未完成', '已同步飞书'] },
    ],
  });
  const conclusion = p.date + ' 排了 ' + p.events.length + ' 件、占 ' + P.fmtDurShort(busy) + '，空档 ' + p.gaps.length + ' 段共 ' + P.fmtDurShort(freeMin) + '，已完成 ' + p.ranked + ' 件。';
  const text = '【作息管家 · 查日程】' + p.date + L1.join('/') + ' 事件 ' + p.events.length + ' 件';

  const table = B.renderDataTable({
    columns: [{ key: 'time', label: '时间' }, { key: 'title', label: '事件' }, { key: 'cat', label: '分类' }, { key: 'state', label: '状态' }],
    rows: p.events.map((e) => ({ time: e.time_start + '~' + e.time_end, title: e.title, cat: e.category || '—', state: (e.completion || '未完成') + (e.feishu_event_id ? ' · 飞书已同步' : '') })),
    caption: '当日全部事件（含软删以外）',
  });

  const variants = [];
  // A · 覆盖条 + 事件卡列表（老侧 f10 的原始层级：24h 时间轴／事件卡／筛选位）
  variants.push({
    key: 'A', name: '覆盖条＋事件卡',
    skeleton: '读数卡 → 24h 覆盖条 → 事件卡列表 → 空档折叠 → 筛选位。',
    uses: ['读数卡 renderKpiGrid', '图表 renderChartBlock(bar)', '列表行 renderListRows', '折叠区 renderDisclosure', '参数表单 renderParamForm', '复制区 renderCopyBlock'],
    musts: ['24h 时间轴 → renderChartBlock(bar)', '事件卡 → renderListRows（时间／标题／同步状态）', '筛选位 → renderParamForm'],
    pieces: [
      B.renderKpiGrid(cards),
      B.renderConclusionBar(conclusion),
      bandBars(cells, { title: '24 小时覆盖（有事件的格子＝该小时主分类）' }),
      '<div data-variant="A">' + B.renderListRows({ items: evRows, emptyText: '这一天没有事件' }) + '</div>',
      B.renderDisclosure({ title: '空档（' + p.gaps.length + ' 段 · 共 ' + P.fmtDurShort(freeMin) + '）', contentHtml: B.renderListRows({ items: gapRows }) }),
      form('A'),
      copyBlock('A', '复制与留档', text, 'schedule.plan.today ' + p.date),
    ],
  });
  // B · 表优先：同一批数据当表读
  variants.push({
    key: 'B', name: '表格优先',
    skeleton: '结论条 → 事件明细表（时间／事件／分类／状态）→ 空档 → 24h 条 → 筛选位。',
    uses: ['结论条 renderConclusionBar', '数据表 renderDataTable', '列表行 renderListRows', '图表 renderChartBlock(bar)', '参数表单 renderParamForm', '复制区 renderCopyBlock'],
    musts: ['24h 时间轴 → renderChartBlock(bar)（降为附图）', '事件卡 → renderDataTable（一行一件）', '筛选位 → renderParamForm'],
    pieces: [
      B.renderConclusionBar(conclusion),
      table,
      B.renderDisclosure({ title: '空档（' + p.gaps.length + ' 段）', contentHtml: B.renderListRows({ items: gapRows }) }),
      bandBars(cells, { title: '24 小时覆盖' }),
      B.renderCaliberLine('数据口径｜空档＝未排事件的连续时段｜状态取完成与飞书同步两位'),
      form('B'),
      copyBlock('B', '复制与留档', text, 'schedule.plan.today ' + p.date),
    ],
  });
  // C · 先空档后事件：把「还能往哪塞」当主体
  variants.push({
    key: 'C', name: '空档优先',
    skeleton: '24h 条置顶 → 空档表当主体（可按长度安排）→ 事件压成一排标签 → 筛选位。',
    uses: ['事实条 renderFactStrip', '图表 renderChartBlock(bar)', '数据表 renderDataTable', '徽章 renderChips', '反馈块 renderFeedbackBlock', '参数表单 renderParamForm', '复制区 renderCopyBlock'],
    musts: ['24h 时间轴 → renderChartBlock(bar)（置顶）', '事件卡 → renderChips（压成标签行）', '筛选位 → renderParamForm'],
    pieces: [
      bandBars(cells, { title: '24 小时覆盖' }),
      renderFactStrip({ items: [{ label: '可安排', value: P.fmtDurShort(freeMin) }, { label: '空档段数', value: String(p.gaps.length) + ' 段' }, { label: '事件', value: String(p.events.length) + ' 件' }, { label: '已完成', value: String(p.ranked) + ' 件' }] }),
      B.renderDataTable({
        columns: [{ key: 'gap', label: '空档' }, { key: 'len', label: '可用时长' }, { key: 'hint', label: '够放什么' }],
        rows: p.gaps.map((g) => ({ gap: hhmm(g.start) + '~' + (g.end === 1440 ? '24:00' : hhmm(g.end)), len: P.fmtDurShort(g.mins), hint: g.mins >= 120 ? '整块深度工作' : (g.mins >= 60 ? '一个番茄钟以上' : '碎片时间') })),
      }),
      B.renderChipRow({ items: p.events.map((e) => ({ text: e.time_start + ' ' + e.title })) }),
      B.renderFeedbackBlock({ staticNotice: true, toast: { msg: '飞书反向对账待确认', detail: '本页只作展示：' + p.synced + ' 件已同步、' + (p.events.length - p.synced) + ' 件未同步。', icon: 'warn' } }),
      form('C'),
      copyBlock('C', '复制与留档', text, 'schedule.plan.today ' + p.date),
    ],
  });

  return {
    file: '查日程（日程盘）.html',
    docTitle: '作息管家 · 查日程（原型）',
    title: '查日程 · 日程盘',
    subtitle: p.date + ' · ' + p.events.length + ' 件事件 · 空档 ' + p.gaps.length + ' 段共 ' + P.fmtDurShort(freeMin),
    question: '日程盘该怎么装：事件是主体（表／卡）还是空档是主体？24h 覆盖条置顶还是降为附图？',
    must: '老侧 f10「查日程（单日）」必现块：24h 时间轴／事件卡／筛选位。',
    variants,
  };
}

/* ══════════════════════ 五 · 页三：周视图（热力盘） ══════════════════════ */

function pageWeek(w) {
  const cards = [
    { label: '总时长', value: P.fmtDurShort(w.total), detail: w.records + ' 块记录' },
    { label: '日均', value: P.fmtDurShort(Math.round(w.total / Math.max(w.activeDays, 1))), detail: '有记录 ' + w.activeDays + '/7 天' },
    { label: '健康分', value: String(w.score), detail: '七个维度取均' },
    { label: '投入最多', value: Object.keys(w.byL1).sort((a, b) => w.byL1[b] - w.byL1[a])[0], detail: P.fmtDurShort(Math.max(...Object.values(w.byL1))) },
  ];
  const dayRows = w.rows.map((r) => ({ left: r.label + ' ' + r.date.slice(5), main: r.n + ' 块', right: r.mins ? P.fmtDurShort(r.mins) : '无记录' }));
  const conclusion = w.start + ' ~ ' + w.end + '：' + w.records + ' 块记录、总时长 ' + P.fmtDurShort(w.total) + '，有记录 ' + w.activeDays + '/7 天，健康分 ' + w.score + '。';
  const text = '【作息管家 · 周视图】' + w.start + '~' + w.end + ' 共 ' + w.records + ' 块';
  const stacked = B.renderChartBlock({
    kind: 'bar', title: '每日分类堆叠（7 天 × 一级分类）',
    input: {
      items: w.rows.map((r) => ({
        label: r.label,
        value: r.mins,
        values: L1.map((k) => r.recs.filter((x) => P.l1Of(x.category) === k).reduce((a, x) => a + (x.duration_minutes || 0), 0)),
      })),
      options: { stacked: true, segNames: L1, colors: L1.map(colorOf), height: 180, showValues: false, grid: false, labels: 'all' },
    },
  });

  const variants = [];
  // A · 矩阵为主（7×24 大网格，老侧 f08 的原始层级）
  variants.push({
    key: 'A', name: '矩阵为主',
    skeleton: '读数卡 → 7×24 热力矩阵（页主体）→ 分类总览 → 每日汇总 → 复制位。',
    uses: ['读数卡 renderKpiGrid', '页内自造件 7×24 热力矩阵', '分布行 renderDistributionRows', '列表行 renderListRows', '复制区 renderCopyBlock'],
    musts: ['7×24 全分类热力图 → 页内自造件（7 行 × 24 格）', '分类总览 → renderDistributionRows', '每日汇总 → renderListRows', '健康分 → renderKpiGrid（读数卡之一）', '复制 prompt 位 → renderCopyBlock'],
    pieces: [B.renderKpiGrid(cards), heatMatrix(w.rows, 'A'), legend('A'), distRows(w.byL1, w.total), B.renderListRows({ items: dayRows }), copyBlock('A', '复制给 AI', text, 'schedule.record.week ' + w.start)],
  });
  // B · 按天深读：矩阵在上，七天各一个折叠区
  variants.push({
    key: 'B', name: '按天深读',
    skeleton: '结论条 → 矩阵 → 七天各一折（当日分布与记录）→ 健康分读数卡 → 分类总览。',
    uses: ['结论条 renderConclusionBar', '页内自造件 7×24 热力矩阵', '折叠区 renderDisclosure', '分布行 renderDistributionRows', '读数卡 renderKpiGrid（带进度条）', '复制区 renderCopyBlock'],
    musts: ['7×24 全分类热力图 → 页内自造件（置顶）', '分类总览 → renderDistributionRows（收尾）', '每日汇总 → renderDisclosure × 7', '健康分 → renderKpiGrid（带进度条）', '复制 prompt 位 → renderCopyBlock'],
    pieces: [
      B.renderConclusionBar(conclusion),
      heatMatrix(w.rows, 'B'),
      legend('B'),
      w.rows.map((r) => B.renderDisclosure({
        title: r.label + ' ' + r.date.slice(5) + ' · ' + (r.mins ? P.fmtDurShort(r.mins) + ' · ' + r.n + ' 块' : '无记录'),
        contentHtml: r.n === 0 ? '<p class="t782-note">这一天没有记录。</p>' : distRows(byL1Of(r.recs), r.mins),
      })),
      B.renderKpiGrid([{ label: '本周健康分', value: String(w.score), detail: '七个维度取均（创作不参评）', bar: { pct: w.score } }]),
      distRows(w.byL1, w.total),
      copyBlock('B', '复制给 AI', text, 'schedule.record.week ' + w.start),
    ],
  });
  // C · 每日一行 mini 色带 ＋ 堆叠柱（矩阵不占主位）
  variants.push({
    key: 'C', name: '每日色带＋堆叠柱',
    skeleton: '读数卡与健康分 → 七天各一行 24 格色带（行尾带当日合计）→ 每日堆叠柱 → 分类总览。',
    uses: ['读数卡 renderKpiGrid', '页内自造件 7×24 热力矩阵（一行一天，行尾合计）', '图表 renderChartBlock(bar, stacked)', '分布行 renderDistributionRows', '复制区 renderCopyBlock'],
    musts: ['7×24 全分类热力图 → 页内自造件（摊成 7 行，行尾带合计）', '分类总览 → renderDistributionRows', '每日汇总 → 色带行右端合计', '健康分 → renderKpiGrid（带进度条）', '复制 prompt 位 → renderCopyBlock'],
    pieces: [
      B.renderKpiGrid(cards),
      heatMatrix(w.rows, 'C', true),
      legend('C'),
      stacked,
      distRows(w.byL1, w.total),
      copyBlock('C', '复制给 AI', text, 'schedule.record.week ' + w.start),
    ],
  });

  return {
    file: '周视图（热力盘）.html',
    docTitle: '作息管家 · 周视图（原型）',
    title: '周视图 · 热力盘',
    subtitle: w.start + ' ~ ' + w.end + ' · ' + w.records + ' 块记录 · 总时长 ' + P.fmtDurShort(w.total) + ' · 健康分 ' + w.score,
    question: '热力盘该怎么装：7×24 矩阵占主位，还是摊成「一行一天」？分类总览与健康分放前面还是收尾？',
    must: '老侧 f08「周视图」必现块：7×24 全分类热力图／分类总览／每日汇总／健康分／复制 prompt 位。',
    variants,
  };
}

/* ══════════════════════ 六 · 装配：单文件（变体 ＋ 悬浮切换） ══════════════════════ */

/** 给区块自己的根元素挂上变体标（保持「块的直接子件」关系，页级栅格才按原样生效）。
 *  **一块一件**：每个 piece 必须只有一个顶层元素——多根串（`renderDistributionRows`／`renderChips`
 *  这类「行即件」的产出）在这里当场报错，不许静默只给第一个挂标（挂漏了就会永远亮着）。 */
function topLevelCount(html) {
  const VOID_TAGS = /^(br|hr|img|input|meta|link|source|area|base|col|embed|param|track|wbr)$/i;
  const re = /<(\/?)([a-z0-9]+)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/gi;
  let depth = 0;
  let roots = 0;
  let m;
  while ((m = re.exec(html)) !== null) {
    const closing = m[1] === '/';
    const selfClosing = m[4] === '/';
    const isVoid = VOID_TAGS.test(m[2]);
    if (closing) depth -= 1;
    else if (!selfClosing && !isVoid) depth += 1;
    if (depth === 0) roots += 1;
    if (depth < 0) break;
  }
  return roots;
}

function tag(html, key) {
  const roots = topLevelCount(html);
  if (roots !== 1) throw new Error('本 piece 有 ' + roots + ' 个顶层元素（必须恰好 1 个）：' + html.slice(0, 80).replace(/\s+/g, ' '));
  const out = html.replace(/^<([a-z0-9]+)(\s)/, '<$1 data-variant="' + key + '"$2');
  if (out === html) throw new Error('区块根元素没认出（无法挂变体标）：' + html.slice(0, 60));
  return out;
}

const recipePanel = (v) => '<div class="t782-recipe" data-variant="' + v.key + '">'
  + '<p><b>变体 ' + v.key + ' · ' + v.name + '</b>｜骨架：' + v.skeleton + '</p>'
  + '<p><b>用了哪些件</b>：' + v.uses.join('、') + '</p>'
  + '<p><b>必现块落点</b>：' + v.musts.map(sep).join('；') + '</p>'
  + '</div>';

const BANNER = (page) => '<div class="t782-banner">'
  + '<p><b>这是抛弃式原型，不是成品页。</b>控件与长相都不是最终版；它只回答一个问题——</p>'
  + '<p><b>问题</b>：' + page.question + '</p>'
  + '<p><b>底料</b>：' + page.must + '　视觉基座＝公共层 base-paint（blocks／charts／pageUi），不新写页面样式（只补热力矩阵与两栏骨架两处页内自造件）。</p>'
  + '<p><b>数据</b>：隔离种子库 <code>.scratch/t844/home</code>（锚点 2026-09-21，只读），真跑真读数。</p>'
  + '<p><b>怎么用</b>：底部药丸 <b>← →</b> 或键盘 <b>← →</b> 切换变体（也可 <code>?variant=B</code> 直达）；每个候选前那条紫框就是它<b>用了哪些件</b>的配方条。</p>'
  + '</div>';

const SWITCHER_CSS = [
  '.t782-banner{border:1px dashed #8e8e93;border-radius:14px;padding:14px 16px;margin:0 0 18px;font-size:13px;line-height:1.7;color:var(--fg2);background:#fff}',
  '.t782-banner p{margin:0 0 6px}',
  '.t782-banner p:last-child{margin-bottom:0}',
  '.t782-banner b{color:var(--fg)}',
  '.t782-banner code{font-size:12px;background:var(--soft);padding:1px 5px;border-radius:6px}',
  '.t782-recipe{border:1px dashed #af52de;border-radius:14px;padding:12px 14px;margin:0 0 14px;font-size:12px;line-height:1.7;color:#5b4a6b;background:#faf7fd}',
  '.t782-recipe p{margin:0 0 4px}',
  '.t782-recipe p:last-child{margin-bottom:0}',
  '.t782-note{font-size:13px;color:var(--fg3);margin:0}',
  '.t782-off{display:none!important}',
  /* 页内自造件①：7×24 热力矩阵（一行一天；≤820 档格子变小但不出横向滚动） */
  '.t782-heat{display:flex;flex-direction:column;gap:5px;margin:16px 0 8px}',
  '.t782-heat-row{display:grid;grid-template-columns:64px minmax(0,1fr);gap:10px;align-items:center}',
  '.t782-heat-day{font-size:12px;color:var(--fg2);font-variant-numeric:tabular-nums;white-space:nowrap}',
  '.t782-heat-cells{display:grid;grid-template-columns:repeat(24,minmax(0,1fr));gap:2px}',
  '.t782-heat-cell{display:block;height:18px;border-radius:4px;background:var(--soft)}',
  '.t782-heat-ticks{display:grid;grid-template-columns:repeat(24,minmax(0,1fr));gap:2px;font-size:11px;color:var(--fg3);font-variant-numeric:tabular-nums}',
  '.t782-heat-ticks span{white-space:nowrap;overflow:hidden}',
  '.t782-heat-row-total{grid-template-columns:64px minmax(0,1fr) 60px}',
  '.t782-heat-sum{font-size:12px;color:var(--fg2);text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}',
  '.t782-legend{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px;color:var(--fg2);margin:8px 0 0}',
  '.t782-legend span{display:inline-flex;align-items:center;gap:6px}',
  '.t782-legend i{display:inline-block;width:12px;height:12px;border-radius:3px}',
  /* 页内自造件②：两栏骨架（断点只用仓内既有值 820） */
  '.t782-split{display:grid;grid-template-columns:minmax(0,1fr);gap:20px}',
  '.t782-split > div{min-width:0}',
  '@media (min-width:821px){.t782-split{grid-template-columns:minmax(0,320px) minmax(0,1fr)}}',
  // 窄栏里的读数卡：pageUi 在 ≥1001px 把 `.block-kpi-card-grid` 钉成一行四张（宽屏口径），
  // 放进 320px 的栏里每张只剩 ~70px ⇒ 数字被折成竖排。本件在窄栏范围内改回两列。
  // （这条要不要收进公共层「栏内栅格」的口子，是 #782 要人裁的事，先记在证据件里。）
  '@media (min-width:1001px){.t782-split .ilife-block-kpi-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}',
  '@media (min-width:1001px){.t782-heat,.t782-split{grid-column:1/-1}}',
  /* 原型底栏：明显不属于被评估的设计 */
  '.t782-bar{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:60;display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:999px;background:#1d1d1f;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.28);font-size:13px;max-width:min(92vw,560px)}',
  '.t782-bar button{width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.28);background:transparent;color:#fff;font-size:15px;line-height:1;cursor:pointer}',
  '.t782-bar button:focus-visible{outline:2px solid #5ac8fa;outline-offset:2px}',
  '.t782-bar .t782-name{white-space:nowrap;font-weight:600}',
  '.t782-bar .t782-hint{white-space:nowrap;color:rgba(255,255,255,.62);font-size:12px}',
  '.t782-bar .t782-proto{font-size:11px;letter-spacing:.08em;color:#5ac8fa;font-weight:700}',
  '@media (max-width:640px){.t782-bar .t782-hint{display:none}}',
  '@media print{.t782-bar{display:none}}',
].join(LF);

const SWITCHER_HTML = (page) => '<div class="t782-bar" id="t782Bar">'
  + '<span class="t782-proto">PROTOTYPE</span>'
  + '<button id="t782Prev" type="button" title="上一个候选（← 键）" aria-label="上一个候选">←</button>'
  + '<span class="t782-name" id="t782Name">A</span>'
  + '<button id="t782Next" type="button" title="下一个候选（→ 键）" aria-label="下一个候选">→</button>'
  + '<span class="t782-hint">' + page.title + ' · 共 ' + page.variants.length + ' 个候选</span>'
  + '</div>';

const SWITCHER_JS = (page) => '<script>' + LF
  + '(function(){' + LF
  + '  var KEYS=' + JSON.stringify(page.variants.map((v) => v.key)) + ';' + LF
  + '  var NAMES=' + JSON.stringify(Object.fromEntries(page.variants.map((v) => [v.key, v.name]))) + ';' + LF
  + '  var cur="A";' + LF
  + '  function pick(){' + LF
  + '    var q=new URLSearchParams(location.search).get("variant");' + LF
  + '    var h=(location.hash.match(/v=([A-Za-z])/)||[])[1];' + LF
  + '    var v=String(window.__PROTO_VARIANT__||q||h||"A").toUpperCase();' + LF
  + '    return KEYS.indexOf(v)>=0?v:"A";' + LF
  + '  }' + LF
  + '  function apply(k, push){' + LF
  + '    cur=k;' + LF
  + '    document.querySelectorAll("[data-variant]").forEach(function(el){' + LF
  + '      var on=el.getAttribute("data-variant")===k;' + LF
  + '      el.classList.toggle("t782-off", !on);' + LF
  + '    });' + LF
  + '    var name=document.getElementById("t782Name");' + LF
  + '    if(name) name.textContent=k+" — "+NAMES[k];' + LF
  + '    if(push){ try{ history.replaceState(null,"",location.pathname+location.search+"#v="+k); }catch(e){ location.hash="v="+k; } }' + LF
  + '  }' + LF
  + '  cur=pick(); apply(cur,false);' + LF
  + '  document.getElementById("t782Prev").addEventListener("click",function(){var i=KEYS.indexOf(cur);apply(KEYS[(i-1+KEYS.length)%KEYS.length],true);});' + LF
  + '  document.getElementById("t782Next").addEventListener("click",function(){var i=KEYS.indexOf(cur);apply(KEYS[(i+1)%KEYS.length],true);});' + LF
  + '  document.addEventListener("keydown",function(ev){' + LF
  + '    var t=ev.target;' + LF
  + '    if(t&&(t.tagName==="INPUT"||t.tagName==="TEXTAREA"||t.isContentEditable))return;' + LF
  + '    if(ev.key==="ArrowLeft")document.getElementById("t782Prev").click();' + LF
  + '    if(ev.key==="ArrowRight")document.getElementById("t782Next").click();' + LF
  + '  });' + LF
  + '}());' + LF
  + '</script>';

function build(page) {
  const pieces = [BANNER(page)];
  for (const v of page.variants) {
    pieces.push(recipePanel(v));
    for (const p of v.pieces.flat()) pieces.push(tag(p, v.key));
  }
  pieces.push(SWITCHER_HTML(page));
  pieces.push(SWITCHER_JS(page));
  const body = B.renderPageShell({
    eyebrow: 'PROTOTYPE ｜ 作息管家 · 页型配方候选（#782）',
    title: page.title,
    subtitle: page.subtitle,
    content: pieces.join(LF),
  });
  return renderDocShell({
    docTitle: page.docTitle,
    bodyHtml: body,
    extraCss: pageUiCss() + LF + pageShapeCss() + LF + SWITCHER_CSS,
    charts: true,
    pageUi: true,
  });
}

/* ══════════════════════ 七 · 出活 ══════════════════════ */

const data = loadData();
const pages = [pageDay(data.day), pagePlan(data.plan), pageWeek(data.week)];
mkdirSync(OUT, { recursive: true });
console.log('# t782 原型 · 数据源 ' + DB);
console.log('# 今天总结 ' + data.day.date + '：' + data.day.recs.length + ' 块 · 覆盖 ' + P.fmtDurShort(data.day.coverage) + ' · 健康分 ' + data.day.score + ' · 睡眠 ' + P.fmtDurShort(data.day.sleep));
console.log('# 查日程 ' + data.plan.date + '：' + data.plan.events.length + ' 件 · 空档 ' + data.plan.gaps.length + ' 段');
console.log('# 周视图 ' + data.week.start + '~' + data.week.end + '：' + data.week.records + ' 块 · 总时长 ' + P.fmtDurShort(data.week.total) + ' · 健康分 ' + data.week.score);
for (const page of pages) {
  const html = build(page);
  const file = join(OUT, page.file);
  writeFileSync(file, html, 'utf8');
  const rows = page.variants.map((v) => v.key + '=' + v.pieces.length + '件');
  console.log('WROTE ' + page.file + ' bytes=' + Buffer.byteLength(html, 'utf8')
    + ' 变体=' + page.variants.length + '（' + rows.join(' ') + '）');
}
console.log('RESULT: OK pages=' + pages.length + ' → ' + OUT);
