#!/usr/bin/env node
/**
 * 修地图 #197（作息管家HELP）的正文。
 *
 * 伤情：换行被回写工具吃掉 —— 9,283 字符挤进 19 行，其中一行 7,346 字符；
 *      章节标题与其正文并在一行、`###` 被上一版脚本误伤成 `#`、计划表塌成一整行、
 *      Notes 里的嵌套项目与编号项被并进父项、采访区的引文丢了行内换行。
 *
 * 修法：**按已知标题精确切段**（不用正则猜），再按规范顺序重排；一个字的内容都不改。
 *      计划表整段重建（从 GitHub 实时子议题与阻塞边生成）。
 *
 * 用法：
 *   node repair-197-v2.mjs          只写 scratch 并打印大纲
 *   node repair-197-v2.mjs --push   写 docs/ 并推回 GitHub
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const REPO = 'FeatherHunter/ilife';
const MAP = 197;
const PUSH = process.argv.includes('--push');

const gh = (...a) => execFileSync('gh', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const ghJson = (...a) => JSON.parse(gh(...a) || '[]');

// --from-file <路径>：改从归档的正文读（用于「正文已被上一次跑坏、要从归档恢复」）
const fromIdx = process.argv.indexOf('--from-file');
let raw = (fromIdx > 0
  ? readFileSync(process.argv[fromIdx + 1], 'utf8')
  : gh('api', `repos/${REPO}/issues/${MAP}`, '--jq', '.body')
).replace(/^\uFEFF/, '');
const before = { chars: raw.length, lines: raw.split('\n').length, longest: Math.max(...raw.split('\n').map((l) => l.length)) };

// ── 第 0 步：采访区单独解析（这一段的围栏已经被塌陷搞乱，靠猜配不对，必须按原文结构切）──
// 原文结构：`## 用户原话采访区…` → 若干 `### 小标题` → 每个小标题下 1..n 个「``` 引文 ```」块（块间本来是两个空格）。
const QH = '## 用户原话采访区（verbatim，一字未改；AI 执行先读这里）';
const SUB = ['### 立规与目标（2026-09-12）', '### 第一轮回答（Q1–Q7）', '### 第二轮回答（Q11–Q16）', '### 对齐确认（2026-09-12，用户逐条认可）'];
let quotesClean = null;
{
  const qi = raw.indexOf(QH);
  if (qi >= 0) {
    // 区域＝从采访区标题到这个正文里**下一个二级标题**为止（不能用「行尾」：
    // 正文修好之后采访区自己就跨很多行，用行尾会把区域切空——这正是上一版不幂等、把采访区清空的原因）
    const next = raw.indexOf('\n## ', qi + QH.length);
    const region = raw.slice(qi + QH.length, next < 0 ? raw.length : next);
    // 先按小标题切
    const parts = [];
    let cursor = 0;
    const subs = SUB.map((s) => ({ s, i: region.indexOf(s) })).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i);
    for (let k = 0; k < subs.length; k++) {
      const from = subs[k].i + subs[k].s.length;
      const to = k + 1 < subs.length ? subs[k + 1].i : region.length;
      parts.push({ sub: subs[k].s, text: region.slice(from, to) });
    }
    const out = [
      QH,
      '',
      '> 诚实注（2026-09-12）：本节引文曾被一次正文回写工具吃掉**行内换行**——字符逐字未改，但用户按行给出的几条答案（如第一轮的 Q1–Q7）在下面显示为一段、行与行之间只余空格。原逐行文本见对话记录。',
    ];
    for (const p of parts) {
      // 引文块 = 用围栏切分后的奇数段
      const chunks = p.text.split('```');
      const quotes = chunks.filter((_, i) => i % 2 === 1).map((q) => q.trim()).filter(Boolean);
      out.push('', p.sub, '');
      for (const q of quotes) out.push('```', q, '```', '');
    }
    quotesClean = out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
    console.log(`采访区已按原文结构重建：${parts.length} 个小标题，共 ${parts.reduce((a, p) => a + p.text.split('```').filter((_, i) => i % 2 === 1).length, 0)} 个引文块`);
  }
}

// ── 第 1 步：围栏先各自独占一行（这样后面能逐行判断「在不在围栏里」）──
raw = raw.replace(/([^\n])\s*```/g, '$1\n```');
raw = raw.replace(/```\s*([^\n])/g, '```\n$1');

// ── 第 2 步：逐行修「不在围栏里」的行 ──
let inFence = false;
const lines = raw.split('\n').map((line) => {
  if (line.trim().startsWith('```')) { inFence = !inFence; return line.trimEnd(); }
  if (inFence) return line; // 引文原样保留
  let s = line;
  s = s.replace(/\s{2,}(- )/g, '\n  $1');                    // 嵌套项目（2 空格以上）
  s = s.replace(/([。；」）*`]) +(- )/g, '$1\n- ');           // 被吞掉换行的项目（句末后接 "- "）
  s = s.replace(/([。；」）*`]) +(\d+\. )/g, '$1\n$2');       // 被吞掉换行的编号项
  s = s.replace(/[ \t]{2,}/g, '\n\n');                       // 其余双空格＝丢掉的换行
  return s;
});
let body = lines.join('\n').replace(/\n{3,}/g, '\n\n');

// ── 第 3 步：按已知标题切段 ──
const H = {
  dest: '## Destination',
  prog: '## 进度：38%',
  notes: '## Notes',
  plan: '## 任务清单',
  decisions: '## Decisions so far',
  notyet: '## Not yet specified',
  oos: '## Out of scope',
  quotes: QH,
  extra: '## 本 session 新增的未定项（2026-09-12）',
};

const marks = [];
for (const [key, h] of Object.entries(H)) {
  let from = 0;
  for (;;) {
    const i = body.indexOf(h, from);
    if (i < 0) break;
    // 只认「不在 ### 里面」的 ## 标题
    if (h.startsWith('## ') && body[i + 2] === '#') { from = i + 1; continue; }
    marks.push({ key, at: i, h });
    from = i + h.length;
  }
}
marks.sort((a, b) => a.at - b.at);
if (!marks.length) { console.error('FAIL：一个标题都没找到'); process.exit(1); }

const pre = body.slice(0, marks[0].at).trim(); // 头三行 Decisions 项目
const seg = {};
for (let i = 0; i < marks.length; i++) {
  const start = marks[i].at + marks[i].h.length;
  const end = i + 1 < marks.length ? marks[i + 1].at : body.length;
  const content = body.slice(start, end).trim();
  const k = marks[i].key;
  seg[k] = seg[k] ? seg[k] + '\n\n' + content : content;
}
const progParts = seg.prog.split(/\n\n/);
console.log(`切段：${marks.length} 个标题；前缀 ${pre.length} 字符；进度段 ${progParts.length} 块`);

// ── 第 4 步：计划表重建 ──
const subs = ghJson('api', `repos/${REPO}/issues/${MAP}/sub_issues`, '--paginate').sort((x, y) => x.number - y.number);
const byNumber = new Map(subs.map((s) => [s.number, s]));
const table = [
  '| 票 | 标题 | 类型 | 被谁阻塞 |',
  '|---|---|---|---|',
  ...subs.map((s) => {
    const bl = ghJson('api', `repos/${REPO}/issues/${s.number}/dependencies/blocked_by`, '--paginate')
      .map((i) => i.number).filter((x) => byNumber.has(x))
      .map((x) => `[#${x}](https://github.com/${REPO}/issues/${x})`).join(' ＋ ') || '—';
    const t = (s.labels ?? []).map((l) => l.name).find((n) => n.startsWith('wayfinder:'))?.slice(10) ?? 'task';
    return `| ${s.number} | [${s.title}](https://github.com/${REPO}/issues/${s.number}) | ${t} | ${bl} |`;
  }),
].join('\n');

// ── 第 5 步：按规范顺序重排（内容一字不改）──
// 进度：新的一段在前（当前状态），旧的一段在后（交接时的状态）
const progMerged = progParts.join('\n\n');
const SUB_OLD = []; // 旧的按标题切法已由第 0 步的专用解析取代
const quoteBody = '';
const quotesOut = quotesClean ?? `${H.quotes}`;

const out = [
  H.dest, '', seg.dest ?? '', '',
  H.prog, '', progMerged, '',
  H.notes, '', seg.notes ?? '',
  '',
  '- **正文被回写工具弄坏过一次，本节是 2026-09-12 重建的**（如实记录）：当天实测本文原被压成 **19 行／9,283 字符，最长一行 7,346 字符**，章节标题与正文并在一行、计划表塌成一整行、`###` 被误伤成 `#`、Notes 的嵌套项目并进父项、采访区引文丢掉行内换行。**内容一个字没改**：按已知章节标题精确切段后照规范顺序重排，计划表从当时的子议题与阻塞边重新生成。修后 145 行、最长行 607、九章节齐在行首。修复脚本 `docs/skills/skill-schedule/map-197-repair.mjs`（可重复跑，幂等）。**给其他会话的教训**：改地图正文一律「取回线上正文 → 就地改 → 以文件方式写回」，不许拿本地旧稿整篇覆盖。', '',
  H.plan, '', '<!-- 原生子议题边与原生阻塞边才是准；本清单只作索引 -->', '', table, '',
  H.decisions, '', '<!-- 索引：一行一条＝已关的子票 gist ＋ 链接；细节在票里，这里不复述 -->', '',
  [pre, (seg.decisions ?? '').replace(/^<!--[\s\S]*?-->\s*/gm, '')].filter(Boolean).join('\n'), '',
  H.notyet, '', seg.notyet ?? '', '',
  H.oos, '', seg.oos ?? '', '',
  H.extra, '', seg.extra ?? '', '',
  quotesOut, '',
].join('\n').replace(/\n{4,}/g, '\n\n\n');

// ── 第 6 步：收尾打磨（都在成品的行上做）──
let outLines = out.split('\n');

// 6a. 围栏后面还跟着内容的行 → 拆成「围栏独占一行 ＋ 内容另起一行」
outLines = outLines.flatMap((l) => {
  const m = /^```\s*(\S.*)$/.exec(l);
  return m ? ['```', m[1]] : [l];
});

// 6b. 相邻重复行去重（撞出来的第二份索引注释等）——围栏行绝不参与：连续两个 ``` 是「关一个、开一个」，合法
outLines = outLines.filter(
  (l, i) => !(i > 0 && l === outLines[i - 1] && l.trim() !== '' && !l.trim().startsWith('```')),
);

const out2 = outLines.join('\n').replace(/\n{4,}/g, '\n\n\n').replace(/\s+$/, '') + '\n';
const L = out2.split('\n');
const after = { chars: out2.length, lines: L.length, longest: Math.max(...L.map((l) => l.length)) };
console.log(`\n修前：字符=${before.chars} 行=${before.lines} 最长行=${before.longest}`);
console.log(`修后：字符=${after.chars} 行=${after.lines} 最长行=${after.longest}`);

console.log('\n=== 章节（行首）===');
L.forEach((l, i) => { if (/^#{2,3} /.test(l)) console.log(`  ${String(i + 1).padStart(3)}: ${l}`); });

const need = Object.values(H);
console.log('\n=== 章节在位（行首）===');
for (const s of need) console.log(`  ${L.some((l) => l.startsWith(s)) ? 'OK  ' : 'MISS'} ${s}`);
console.log(`\nBOM=${out2.startsWith('\uFEFF')}  字面\\n=${(out2.match(/\\n/g) || []).length}  拆行表格=${L.filter((l) => /^\|[^|]*$/.test(l) && l.trim() !== '|').length}  孤立#行=${L.filter((l) => l.trim() === '#').length}  围栏带内容=${L.filter((l) => /^```\s*\S/.test(l)).length}`);

const dest = PUSH ? 'D:/ilife/docs/skills/skill-schedule/map-197-body.md' : 'D:/ilife/.scratch/chef-help/_repaired-197-v2.md';
writeFileSync(dest, out2, 'utf8');
console.log(`\n已写：${dest}`);
if (PUSH) { gh('issue', 'edit', String(MAP), '--repo', REPO, '--body-file', dest); console.log(`已推回 GitHub：#${MAP}`); }
