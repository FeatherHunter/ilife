/** #535 · 读侧族四页（看体脂／看体脂趋势／看围度／看围度趋势）重排后的族级判据。
 *
 * 这一件只钉**本波（#535）新立的形状与纪律**，不复述 `#361`／`#362` 已钉的取数与表体口径
 * （那两条判据测试照旧跑，本件不替代它们）：
 *   ① 四页页头不再印内部叫法：`<title>` 恒为「卡路里 身体细节」，眉标是读者看得懂的分区名；
 *   ② 可见文本里不许出现 `·`（本波正题：符号顶替设计＝债）；
 *   ③ 窗口条一页只说一次（`窗口：…` 恰好一处）；
 *   ④ 「看围度」与「看围度趋势」两页不再逐字节相同：主次跟着 `windowGiven` 换序，页名也跟着换；
 *   ⑤ 装配点都接上页面级移动端配方（两处印记：根类与 `viewport-fit=cover`）与页内定位；
 *   ⑥ 皮褶 7 点表：日期只写一处、列名走全角括号 ＋ 中文单位；
 *   ⑦ 读数卡值槽只放数（部位名／来源名只当明细或徽标）。
 *
 * 直调装配件（`buildBodyCompositionDoc`／`buildBodyMeasureDoc`）而不是跑 CLI：本件量的是**页内形状**，
 * 取数口径与库夹具归 `#361`／`#362` 那两件；这里给的是手搭视图，值与库无关。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const { buildBodyCompositionDoc, buildBodyMeasureDoc } = await import('../dist/body/bodyDocs.js');

/** 剥标签取可见文本（与 `#362` 判据同一手法：先摘 script／style，再把标签换空格、解实体、压空白）。 */
function visible(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim();
}

/** 体成分视图：`kind` 决定窗口（`all`＝看体脂那条词，`days`＝看体脂趋势那条词）。 */
function compositionView(kind) {
  const rows = [
    { date: '2026-09-07', body_fat_pct: 20, source: 'gym', note: '晚间复测' },
    { date: '2026-09-06', body_fat_pct: 20.5, source: 'gym', note: '' },
    { date: '2026-09-01', body_fat_pct: 22, source: 'gym', note: '晨起空腹' },
  ];
  return {
    source: 'gym',
    sourceParam: null,
    items: rows,
    total: rows.length,
    trend: [
      { date: '2026-09-01', avgPct: 22, n: 1 },
      { date: '2026-09-06', avgPct: 20.5, n: 1 },
      { date: '2026-09-07', avgPct: 20, n: 1 },
    ],
    latestPct: 20,
    window: kind === 'days' ? { kind: 'days', days: 90 } : { kind: 'all' },
    windowTotal: rows.length,
    anchor: { date: '2026-09-07', pct: 20, source: 'gym' },
    delta: { prevDate: '2026-09-06', prevSource: 'gym', gapDays: 1, diffPct: -0.5 },
    calipers: {
      date: '2026-09-01',
      sites: [
        { key: 'chest', label: '胸', mm: 12 }, { key: 'abdomen', label: '腹', mm: 18 },
        { key: 'thigh', label: '大腿', mm: 15 }, { key: 'tricep', label: '三头肌', mm: null },
        { key: 'subscapular', label: '肩胛下', mm: null }, { key: 'suprailiac', label: '髂上', mm: null },
        { key: 'midaxillary', label: '腋中线', mm: null },
      ],
    },
    sourceSeries: [],
    sourceCount: 0,
  };
}

/** 围度视图：`windowGiven` 是「看围度趋势」（显式点窗）与「看围度」（缺省窗）的唯一分界。 */
function measureView(windowGiven) {
  const rows = [
    { date: '2026-09-07', chest_cm: 102, waist_cm: 84, note: '晚间复测' },
    { date: '2026-09-05', chest_cm: 100, waist_cm: 85, note: '' },
    { date: '2026-09-01', chest_cm: 104, waist_cm: 89, note: '晨起空腹' },
  ];
  return {
    metric: null,
    items: rows,
    total: rows.length,
    trend: [
      { date: '2026-09-01', avgVal: 104, n: 1 },
      { date: '2026-09-05', avgVal: 100, n: 1 },
      { date: '2026-09-07', avgVal: 102, n: 1 },
    ],
    latestVal: 102,
    autoMetric: 'chest_cm',
    kpi: { count: 3, avg: 102, min: 100, max: 104, delta: -2 },
    windowGiven,
    windowLabel: '近 90 天',
  };
}

const compDoc = (kind) => buildBodyCompositionDoc(compositionView(kind));
const measDoc = (given) => buildBodyMeasureDoc(measureView(given));

test('#535 ① 四页页头不印内部叫法：`<title>` 恒为「卡路里 身体细节」＋眉标是分区名', () => {
  for (const html of [compDoc('all'), compDoc('days'), measDoc(false), measDoc(true)]) {
    assert.match(html, /<title>卡路里 身体细节<\/title>/, '页签标题应为读者看得懂的名字');
    assert.equal(visible(html).includes('运动身体'), false, '页面上不许出现「运动身体」这个内部叫法');
    assert.equal(visible(html).includes('calorie.view.'), false, '可见文本里不许出现命令键');
    assert.ok(html.includes('ilife-block-page-shell-eyebrow">身体细节<'), '眉标应是分区名，不是命令键');
  }
});

test('#535 ② 可见文本零 `·`（本波正题：符号不许顶替设计）', () => {
  for (const [name, html] of [['看体脂', compDoc('all')], ['看体脂趋势', compDoc('days')],
    ['看围度', measDoc(false)], ['看围度趋势', measDoc(true)]]) {
    assert.equal(visible(html).includes('·'), false, name + ' 的可见文本里仍有 `·`');
  }
});

test('#535 ③ 窗口条一页只说一次（`窗口：…` 恰好一处）', () => {
  for (const [name, html, needle] of [['看体脂', compDoc('all'), '窗口：全部历史'],
    ['看体脂趋势', compDoc('days'), '窗口：近 90 天'],
    ['看围度', measDoc(false), '窗口：近 90 天'],
    ['看围度趋势', measDoc(true), '窗口：近 90 天']]) {
    const hits = visible(html).split(needle).length - 1;
    assert.equal(hits, 1, name + ' 的窗口口径句应恰好出现一次，实测 ' + hits);
  }
});

test('#535 ④ 看围度／看围度趋势不再逐字节相同：主次换序、页名换名', () => {
  const records = measDoc(false);
  const trend = measDoc(true);
  assert.notEqual(records, trend, '两页产物必须不同（改前逐字节相同）');
  assert.match(records, /ilife-block-page-shell-title">围度记录</);
  assert.match(trend, /ilife-block-page-shell-title">围度趋势</);
  assert.ok(records.indexOf('id="records"') < records.indexOf('id="trend"'), '记录页应以记录为主（记录在前）');
  assert.ok(trend.indexOf('id="trend"') < trend.indexOf('id="records"'), '走势页应以走势为主（走势在前）');
});

test('#535 ⑤ 四页都接上页面级移动端配方与页内定位', () => {
  for (const html of [compDoc('all'), compDoc('days'), measDoc(false), measDoc(true)]) {
    assert.ok(html.includes('viewport-fit=cover'), '缺 viewport-fit=cover（配方印记之一）');
    assert.ok(html.includes('class="wrap ilife-page ilife-page-ui"'), '缺页面级根类（配方印记之二）');
    assert.ok(html.includes('ilife-block-toc'), '缺页内导航');
    assert.ok(html.includes('scroll-margin-top: 20px'), '缺页内定位的锚点留白');
  }
});

test('#535 ⑥ 皮褶七点：日期只写一处、列只剩「部位／皮褶（毫米）」', () => {
  const html = compDoc('all');
  assert.match(html, /皮褶 7 点原始值（2026-09-01）/, '日期与单位要落在表题');
  assert.match(html, /<th[^>]*>皮褶（毫米）<\/th>/, '列名应为全角括号 ＋ 中文单位');
  assert.equal(html.includes('皮褶(mm)'), false, '半角括号 ＋ 英文单位的列名应已收口');
  // 按表题定位皮褶那张表（记录表在最前，按 caption 认段），表体（不含表题）里不许再出现日期：7 行 × 2 列。
  const seg = html.split('<table').find((s) => s.slice(0, 400).includes('皮褶 7 点原始值')) ?? '';
  const body = (seg.split('<tbody>')[1] ?? '').split('</tbody>')[0];
  assert.equal(body.includes('2026-09-01'), false, '日期不得逐行重复（7 行同一天只写一处）');
  assert.equal([...body.matchAll(/<td/g)].length, 14, '皮褶表应是 7 行 × 2 列');
});

test('#535 ⑦ 读数卡值槽只放数：部位名／来源名只当明细', () => {
  const measure = measDoc(false);
  assert.equal(measure.includes('kpi-card-value">全部围度<'), false, '值槽里不许出现「全部围度」这类词');
  assert.ok(measure.includes('kpi-card-value">102</span><span class="ilife-block-kpi-card-unit">cm<'), '值槽应是数＋单位槽');
  assert.ok(measure.includes('kpi-card-value">3</span><span class="ilife-block-kpi-card-unit">个<'), '趋势点应是「3 个」，不是「3 天」');
  assert.match(visible(measure), /均值 102 cm/, '卡外事实条承载均值等四件读数（数值与单位之间留空格）');
  assert.ok(compDoc('all').includes('kpi-card-value">20%<'), '体成分页值槽应是数');
});
