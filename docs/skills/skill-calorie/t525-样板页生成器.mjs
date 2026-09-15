#!/usr/bin/env node
/** #525 · 样板页生成器：「查身材照」单张页的目标形态（#526～#529 的照抄对象）。
 *
 *  为什么用真数据：样板页不是画稿——照片、标签、编号、相对天数、图片内嵌与否全走产品自己的取数
 *  （`buildViewerData`）与内嵌（`embedPhoto`），否则照抄方抄到的是假口径。
 *
 *  为什么样板页本身不住仓：本票**不许动** `src/photo/**`（那是 #526～#529 的写集），样板页只能落
 *  工作草稿区 `.scratch/t525/out/`；产物由本生成器重出，不入仓。
 *
 *  **同源副本**：这一份与 `.scratch/t525/make-sample.mjs` 逐字同源；入仓这份是**唯一权威**，
 *  草稿那份改了以本件为准（`docs/agents/视觉验收墙.md` §5：生成器脚本入仓）。
 *
 *  用法（在仓根跑）：node docs/skills/skill-calorie/t525-样板页生成器.mjs
 *  产出：`.scratch/t525/out/查身材照-样板页.html`；版面档副本＝在该产物 `</head>` 前注入
 *  `<style>img,video{opacity:.10;filter:grayscale(1)}</style>`（见交付件 §五）。
 *  依赖：现成实物照片 `.scratch/t93/photos/`（只读用）；dist 需先
 *  `npx tsc -b packages/base-render packages/skill-calorie`。
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { cpSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const OUT = join(ROOT, '.scratch', 't525', 'out');
const ENV = join(ROOT, '.scratch', 't525', 'sample-env');
const PHOTO_SRC = join(ROOT, '.scratch', 't93', 'photos');   // 现成实物照片（只读用）
const TODAY = '2026-07-10';                                   // 钉住「今天」，相对天数不随机器日期漂
process.env['CALORIE_TODAY'] = TODAY;

const { openDb, DB_FILENAME } = await import('../../../packages/skill-calorie/dist/index.js');
const { addPhotos } = await import('../../../packages/skill-calorie/dist/photo/photos.js');
const { buildViewerData } = await import('../../../packages/skill-calorie/dist/photo/photo.js');
const { embedPhoto } = await import('../../../packages/skill-calorie/dist/photo/photoThumb.js');
const { assembleDocPage } = await import('../../../packages/skill-calorie/dist/shared/docPage.js');
const { copyArea } = await import('../../../packages/skill-calorie/dist/shared/copyArea.js');
const { renderFactStrip, renderMediaFigure, renderTimelineRows, renderActionBar } =
  await import('../../../packages/base-render/dist/index.js');
const { renderCaliberLine, renderConclusionBar, renderFeedbackBlock, renderListRows, renderTocBlock } =
  await import('../../../packages/base-render/dist/blocks.js');

/* ── ① 隔离环境：四张实物照片（一张超预算、一张不在目录里） ── */
rmSync(ENV, { recursive: true, force: true });
const dbDir = join(ENV, 'db');
const photosDir = join(ENV, 'photos');
mkdirSync(dbDir, { recursive: true });
mkdirSync(photosDir, { recursive: true });

const db = openDb(join(dbDir, DB_FILENAME));
const plan = [
  { src: '2026-05-30_011.jpg', tag: '侧面', day: '2026-05-30', note: '' },              // 3.0 MB ⇒ 超预算
  { src: '2026-06-01_001.jpg', tag: '正面', day: '2026-06-01', note: '晨起空腹' },
  { src: '2026-06-09_001.jpg', tag: '正面', day: '2026-06-09', note: '' },
  { src: '2026-07-17_001.png', tag: '正面', day: '2026-07-17', note: '' },
];
const seeded = [];
for (const p of plan) {
  const rows = addPhotos(db, photosDir, {
    srcPaths: [join(PHOTO_SRC, p.src)], tag: p.tag, note: p.note, today: p.day, nowTime: '07:12:00',
  });
  for (const r of rows) seeded.push({ ...r, tag: p.tag, day: p.day });
}
db.close();

/** 主角：2026-06-01 那张（按日期第二张）。 */
const HERO = seeded.find((r) => r.day === '2026-06-01');
if (HERO === undefined) throw new Error('种子照片没落库');

const db2 = openDb(join(dbDir, DB_FILENAME));
const v = buildViewerData(db2, HERO.id, photosDir);
const sameTag = [];   // 同期几张（同标签按日期排）
const all = db2.prepare("SELECT id, date, time, photo_path, tag FROM body_photos WHERE tag LIKE '%正面%' ORDER BY date, id").all();
db2.close();
for (const r of all) sameTag.push({ id: r.id, date: r.date, file: r.photo_path });

const e = embedPhoto(photosDir, v.photo.photoPath);
const p = v.photo;

/* ── ② 人话口径（本页自己的三个小算式，与产品同口径） ── */
const sizeText = (bytes) => (bytes === null || !Number.isFinite(bytes) ? '' : (bytes < 1024 * 1024
  ? Math.round(bytes / 1024) + ' KB' : (bytes / (1024 * 1024)).toFixed(1) + ' MB'));
const relTime = (date, today) => {
  const days = Math.round((Date.parse(today + 'T12:00:00Z') - Date.parse(date + 'T12:00:00Z')) / 86400000);
  if (days <= 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 30) return days + ' 天前';
  if (days < 365) return Math.round(days / 30) + ' 个月前';
  return Math.round(days / 365) + ' 年前';
};
const whenText = (c) => c.date + ((c.time ?? '') === '' ? '' : ' ' + String(c.time).slice(0, 5));
const dropped = e.dataUri === null;
const size = sizeText(e.bytes);

/* ── ③ 版面：一件债对一件形状 ── */
const parts = [];

// 页内导航：四段各一个锚点（区块自带 id，导航指过去）。
parts.push(renderTocBlock({ items: [
  { id: 'shot', text: '这一张' },
  { id: 'info', text: '照片信息' },
  { id: 'nearby', text: '同期几张' },
  { id: 'act', text: '删这张' },
] }));

// 结论条：全页**唯一**一处说「图放没放进本页」（原来这句在占位块、提示条、正文里各说一遍）。
parts.push(renderConclusionBar(dropped
  ? '这张原图 ' + size + '，一页装不下，图没放进本页'
  : '这张原图 ' + size + '，已经放在本页，可以直接看'));

// 图片与 GIF 容器：比例写在容器上、object-fit 说清楚、没有图时出整句人话（不出黑底占位条）。
parts.push(renderMediaFigure({
  id: 'shot',
  ...(dropped ? {} : { src: e.dataUri }),
  alt: whenText(p) + ' 拍的' + (p.tagList[0] ?? '') + '身材照',
  ratio: '3-4',
  fit: 'contain',
  caption: whenText(p) + ' 拍的',
  // 没有图时那一格只说**怎么把图看到**（「为什么没放进来」已由结论条说过一次，不重复第二遍）。
  ...(dropped ? { placeholder: '按下面「文件」那一行，自己打开这份原图看' } : {}),
}));

// 照片信息：一排「标签 ＋ 值」的格子（原来是 `编号 19 · 正面 · 4 个月前 · 文件名` 一串 `·`）。
parts.push('<section id="info"><h2 class="ilife-block-kpi-card-title">照片信息</h2>');
parts.push(renderFactStrip({ items: [
  { label: '编号', value: String(p.id) },
  { label: '标签', value: p.tagList.length === 0 ? '无标签' : p.tagList.join(' ') },
  { label: '距今', value: relTime(p.date, TODAY) },
  { label: '原图', value: p.fileExists === false ? '不在照片目录里' : '在照片目录里', tone: p.fileExists === false ? 'danger' : 'ok' },
] }));
// 键值行：长文本（文件名／备注）走行式，不挤进格子。
// **不放「大小」**：结论条已经说过原图多大，同一件事一页只说一次（vision 复核第一轮点出的重复）。
parts.push(renderListRows({ items: [
  { left: '文件', main: e.fileName },
  { left: '备注', main: p.note === null || p.note === '' ? '没写备注' : p.note },
] }));
parts.push('</section>');

// 同期几张：时间轴条（原来是又一条 `日期 · 标签 · 大小` 串）。
const others = sameTag.filter((r) => r.id !== p.id).slice(0, 4);
parts.push('<section id="nearby"><h2 class="ilife-block-kpi-card-title">同期几张</h2>');
parts.push(renderTimelineRows({ rows: others.map((r) => ({
  time: r.date.slice(5).replace('-', ' 月 ') + ' 日',
  main: '编号 ' + r.id,
  note: relTime(r.date, TODAY) + '，文件 ' + r.file,
})) }));
parts.push('</section>');

// 删这张照片：两句人话 ＋ 一条动作行（命令住 data-t，可见面上不出现命令原文）。
parts.push('<section id="act"><h2 class="ilife-block-kpi-card-title">删这张照片</h2>');
parts.push(renderFeedbackBlock({
  staticNotice: true,
  toast: { icon: 'warn', msg: '删了就找不回来', detail: '先确认上面那张是不是它' },
}));
parts.push(renderActionBar({
  copyData: { actionId: 'ilife-copy-command', label: '复制删除指令', text: 'calorie-cmd-read calorie.photo.remove --params \'{"id": ' + p.id + '}\'' },
  copyLog: { actionId: 'ilife-copy-photo-list', label: '复制回画廊指令', text: 'calorie-cmd-read calorie.photo.list --params \'{"tag": "' + (p.tagList[0] ?? '') + '"}\'' },
}));
parts.push('</section>');

// 口径行：一句话说清单位与口径（原来是括号里的技术话）。段间分隔由版式承担（`｜` 不进可见文本）。
parts.push(renderCaliberLine('相对天数按今天算 ｜ 大小按原图文件算'));

// 复制区：给 AI 的机器载荷。读页面**没有写库日志** ⇒ 那颗「复制日志」自动补位并置灰。
parts.push(copyArea({
  data: {
    envelope: {
      version: '0.1.0', skill: 'calorie', shape: 'detail', key: 'calorie.photo.detail',
      data: { item: { id: p.id, date: p.date, tagList: [...p.tagList], note: p.note, bytes: e.bytes } },
    },
  },
}));

const html = assembleDocPage({
  docTitle: '卡路里 身材照片',
  title: whenText(p).slice(0, 10) + ' 的身材照',
  eyebrow: '',
  subtitle: null,
  content: parts.join(''),
  pageUi: true,
});

mkdirSync(OUT, { recursive: true });
const file = join(OUT, '查身材照-样板页.html');
writeFileSync(file, html, 'utf8');
console.log('SAMPLE ' + file + ' bytes=' + Buffer.byteLength(html, 'utf8')
  + ' id=' + p.id + ' embedded=' + (e.dataUri !== null) + ' bytes原图=' + e.bytes);
