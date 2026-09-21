#!/usr/bin/env node
/**
 * 作息管家地图的建图／建边／自校验工具（`/wayfinder` 的地图侧）。
 *
 * 为什么要有这份：地图的正文与票面**都在 GitHub 上**，本地不留旧稿——线上正文取回文件、
 * 就地改、以文件方式写回（真换行，不是字面 `\n`）。子议题用 **原生 sub-issue 边**，
 * 阻塞用 **原生 dependencies/blocked_by 边**（不是正文里的 `Blocked by:` 行；
 * 那一行只在后端明确不支持原生边时才作兜底）。建完立刻自校验：`sub_issues` 的条数、
 * 每张票的 `blocked_by` 集合都要与规格相等，对不上就非零退出并点名那张票——**不把失败当成功**。
 *
 * 用法：
 *   node docs/skills/skill-schedule/map-chart.mjs <规格.json> plan       只打印将要做什么（默认）
 *   node docs/skills/skill-schedule/map-chart.mjs <规格.json> create     真建：地图＋子票＋两类原生边
 *   node docs/skills/skill-schedule/map-chart.mjs <规格.json> verify     只自校验（不写任何东西）
 *   node docs/skills/skill-schedule/map-chart.mjs <规格.json> sync-map   按线上子票／边重建地图的任务清单并写回
 *
 * 规格 JSON 的形状（键名固定，见同目录 `map-spec-example.json`）：
 * {
 *   "repo": "FeatherHunter/ilife",
 *   "map":  { "title": "[wayfinder] …", "bodyFile": "docs/skills/skill-schedule/map-XXX-body.md" },
 *   "tickets": [
 *     { "key": "r1", "title": "…", "type": "research", "bodyFile": "…",
 *       "blockedBy": ["r1", "t2"] },                       // 用 key 指代本规格里的别的票
 *     { "key": "t9", "title": "…", "type": "task", "bodyFile": "…", "number": 812 }  // 已存在的票直接给号
 *   ]
 * }
 *
 * 幂等：按**标题逐字相等**认领已存在的票（地图与子票都这样），故重跑不会造重复票。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const SPEC = process.argv[2];
const CMD = process.argv[3] ?? 'plan';
if (!SPEC) die(2, '用法：map-chart.mjs <规格.json> [plan|create|verify|sync-map]');

const TYPES = new Set(['research', 'prototype', 'grilling', 'task']);
const spec = JSON.parse(readFileSync(SPEC, 'utf8').replace(/^\uFEFF/, ''));
const REPO = spec.repo ?? 'FeatherHunter/ilife';
if (!spec.map?.title) die(2, '规格缺 map.title');
if (!Array.isArray(spec.tickets) || !spec.tickets.length) die(2, '规格缺 tickets[]');

const gh = (...a) => execFileSync('gh', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
const ghJson = (...a) => JSON.parse(gh(...a) || '[]');
const log = (...a) => console.log(...a);

/** 线上找同名票（标题逐字相等）：返回 {number,id} 或 null。 */
function findIssueByTitle(title) {
  const hits = ghJson('issue', 'list', '--repo', REPO, '--state', 'all', '--search', title,
    '--json', 'number,title', '--limit', '50').filter((i) => i.title === title);
  if (hitCount(hits) > 1) {
    // 同名多张：取号最大的一张（后建的），并如实报出来——不许静默挑一张
    log(`  ⚠ 同名票 ${hits.length} 张：${hits.map((h) => '#' + h.number).join(' ')}，取号最大者`);
  }
  return hits.length ? { number: Math.max(...hits.map((h) => h.number)) } : null;
}
const hitCount = (a) => (Array.isArray(a) ? a.length : 0);

/** 数据库 id（不是 #number、不是 node_id）——建原生边只认它。 */
const dbIdOf = (n) => ghJson('api', `repos/${REPO}/issues/${n}`, '--jq', '.id');

/** 正文从文件读，逐字写进去；本工具**不改正文内容**（换行由文件保真）。 */
function bodyOf(p, what) {
  if (!existsSync(p)) die(2, `${what} 的正文文件不存在：${p}`);
  const text = readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
  if (text.includes('\\n')) die(2, `${what} 的正文里出现了字面 \\n：${p}（要写真实换行）`);
  if (!/[^#\s]/.test(text)) die(2, `${what} 的正文是空的：${p}`);
  return text;
}

function plan() {
  log(`地图 ${REPO}：《${spec.map.title}》`);
  log(`正文 ${spec.map.bodyFile}`);
  log(`子票 ${spec.tickets.length} 张：`);
  for (const t of spec.tickets) {
    if (!TYPES.has(t.type)) die(2, `票 ${t.key} 的类型不合法：${t.type}`);
    const by = (t.blockedBy ?? []).join(' ') || '—';
    log(`  ${t.key}\twayfinder:${t.type}\t${t.number ? '#' + t.number : '待建'}\t被 ${by} 阻塞\t${t.title}`);
  }
}

function create() {
  // ── 一、地图 ──────────────────────────────────────────────────────────────
  let mapNumber = spec.map.number ?? null;
  if (!mapNumber) {
    const found = findIssueByTitle(spec.map.title);
    if (found) { mapNumber = found.number; log(`地图已在线上：#${mapNumber}（不重建）`); }
    else {
      const url = gh('issue', 'create', '--repo', REPO, '--title', spec.map.title,
        '--label', 'wayfinder:map', '--body-file', spec.map.bodyFile);
      mapNumber = Number(/\/issues\/(\d+)\s*$/.exec(url)?.[1]);
      if (!mapNumber) die(1, `建地图后拿不到号：${url}`);
      log(`建了地图：#${mapNumber}`);
    }
  } else log(`地图按规格给定：#${mapNumber}`);

  // ── 二、子票（先建票，后建边：票要有 id 才能互相指） ─────────────────────
  const number = new Map();
  for (const t of spec.tickets) {
    if (t.number) { number.set(t.key, t.number); continue; }
    const found = findIssueByTitle(t.title);
    if (found) { number.set(t.key, found.number); log(`票 ${t.key} 已在线上：#${found.number}`); continue; }
    const url = gh('issue', 'create', '--repo', REPO, '--title', t.title,
      '--label', `wayfinder:${t.type}`, '--body-file', t.bodyFile);
    const n = Number(/\/issues\/(\d+)\s*$/.exec(url)?.[1]);
    if (!n) die(1, `建票后拿不到号（${t.key}）：${url}`);
    number.set(t.key, n);
    log(`建了票 ${t.key}：#${n}  ${t.title}`);
  }
  for (const t of spec.tickets) if (!number.get(t.key)) die(1, `票 ${t.key} 没有号`);

  // ── 三、原生 sub-issue 边（子票数据库 id → 地图） ────────────────────────
  const numberToKey = new Map([...number].map(([k, n]) => [n, k]));
  const alreadyChild = new Set(
    ghJson('api', `repos/${REPO}/issues/${mapNumber}/sub_issues`, '--paginate').map((i) => i.number),
  );
  for (const t of spec.tickets) {
    const n = number.get(t.key);
    if (alreadyChild.has(n)) { log(`子议题边已在：#${n}`); continue; }
    gh('api', `repos/${REPO}/issues/${mapNumber}/sub_issues`, '-X', 'POST', '-F', `sub_issue_id=${dbIdOf(n)}`);
    log(`建子议题边：#${mapNumber} ← #${n}`);
  }

  // ── 四、原生阻塞边（blocker 的数据库 id → 被阻塞的票） ──────────────────
  for (const t of spec.tickets) {
    const child = number.get(t.key);
    const have = new Set(
      ghJson('api', `repos/${REPO}/issues/${child}/dependencies/blocked_by`, '--paginate').map((i) => i.number),
    );
    for (const key of t.blockedBy ?? []) {
      const blocker = number.get(key) ?? die(2, `票 ${t.key} 的 blockedBy 指了不存在的键：${key}`);
      if (have.has(blocker)) { log(`阻塞边已在：#${child} ← #${blocker}`); continue; }
      gh('api', `repos/${REPO}/issues/${child}/dependencies/blocked_by`, '-X', 'POST', '-F', `issue_id=${dbIdOf(blocker)}`);
      log(`建阻塞边：#${child}（${t.key}）被 #${blocker}（${key}）阻塞`);
    }
  }
  log(`\n地图：https://github.com/${REPO}/issues/${mapNumber}`);
  verify(mapNumber);
}

/** 自校验：子票条数、每张票的被阻塞集合、以及「原生边真的在」。对不上即非零退出。 */
function verify(mapNumberIn) {
  let mapNumber = mapNumberIn ?? spec.map.number ?? null;
  if (!mapNumber) mapNumber = findIssueByTitle(spec.map.title)?.number ?? null;
  if (!mapNumber) die(1, '线上找不到这张地图（先 create）');
  const children = ghJson('api', `repos/${REPO}/issues/${mapNumber}/sub_issues`, '--paginate');
  const expected = spec.tickets.length;
  const bad = [];
  log(`\n=== 自校验：#${mapNumber} ===`);
  log(`sub_issues 条数：expected=${expected} actual=${children.length}`);
  if (children.length !== expected) bad.push(`子议题条数 expected=${expected} actual=${children.length}`);

  const byNumber = new Map(children.map((c) => [c.number, c]));
  const number = new Map();
  for (const t of spec.tickets) {
    const n = t.number ?? findIssueByTitle(t.title)?.number ?? null;
    if (!n) { bad.push(`票 ${t.key} 在线上找不到`); continue; }
    number.set(t.key, n);
    if (!byNumber.has(n)) bad.push(`票 ${t.key}（#${n}）不在子议题列表里`);
  }
  for (const t of spec.tickets) {
    const n = number.get(t.key);
    if (!n) continue;
    const want = (t.blockedBy ?? []).map((k) => number.get(k)).sort((a, b) => a - b);
    const got = ghJson('api', `repos/${REPO}/issues/${n}/dependencies/blocked_by`, '--paginate')
      .map((i) => i.number).sort((a, b) => a - b);
    const wantStr = JSON.stringify(want); const gotStr = JSON.stringify(got);
    const tag = wantStr === gotStr ? 'OK  ' : 'FAIL';
    log(`  ${tag} ${t.key} #${n} 被阻塞 expected=${wantStr} actual=${gotStr}`);
    if (wantStr !== gotStr) bad.push(`票 ${t.key}（#${n}）被阻塞 expected=${wantStr} actual=${gotStr}`);
  }
  if (bad.length) {
    console.error(`\n校验 FAIL（${bad.length} 条）：`);
    for (const b of bad) console.error('  - ' + b);
    process.exit(1);
  }
  log('校验 PASS：子议题条数与每张票的阻塞集合都与规格一致。');
  return mapNumber;
}

/** 按线上事实重建地图的「## 任务清单」一节并写回（正文其余章节一字不动）。 */
function syncMap() {
  const mapNumber = spec.map.number ?? findIssueByTitle(spec.map.title)?.number ?? die(1, '线上找不到地图');
  const bodyPath = spec.map.bodyFile;
  const body = readFileSync(bodyPath, 'utf8').replace(/^\uFEFF/, '');
  if (body.startsWith('\uFEFF')) die(2, '正文文件带 BOM');

  const children = ghJson('api', `repos/${REPO}/issues/${mapNumber}/sub_issues`, '--paginate')
    .sort((a, b) => a.number - b.number);
  const childNums = new Set(children.map((c) => c.number));
  const rows = children.map((c) => {
    const blockers = ghJson('api', `repos/${REPO}/issues/${c.number}/dependencies/blocked_by`, '--paginate')
      .map((i) => i.number).filter((x) => childNums.has(x))
      .map((x) => `[#${x}](https://github.com/${REPO}/issues/${x})`).join(' ＋ ') || '—';
    const label = (c.labels ?? []).map((l) => (typeof l === 'string' ? l : l.name))
      .find((n) => n.startsWith('wayfinder:'))?.slice('wayfinder:'.length) ?? 'task';
    const state = c.state === 'closed' ? '已关' : (c.assignees?.length ? '在做' : '可做');
    return `| [#${c.number}](https://github.com/${REPO}/issues/${c.number}) | ${c.title} | ${label} | ${state} | ${blockers} |`;
  });
  const table = [
    '| 票 | 标题 | 类型 | 状态 | 被谁阻塞 |',
    '|---|---|---|---|---|',
    ...rows,
  ].join('\n');

  const HEAD = '## 任务清单';
  const at = body.indexOf(HEAD);
  if (at < 0) die(2, `正文里没有「${HEAD}」一节：${bodyPath}`);
  const after = body.indexOf('\n## ', at + HEAD.length);
  const next = body.slice(at + HEAD.length, after < 0 ? body.length : after);
  const rebuilt = `${HEAD}\n\n<!-- 原生子议题边与原生阻塞边才是准；本清单只作索引，由 map-chart.mjs sync-map 重建 -->\n\n${table}\n`;
  const out = body.slice(0, at) + rebuilt + (after < 0 ? '' : body.slice(after + 1));
  if (out.includes('\\n')) die(2, '重建后的正文出现字面 \\n，拒绝写回');
  writeFileSync(bodyPath, out, 'utf8');
  gh('issue', 'edit', String(mapNumber), '--repo', REPO, '--body-file', bodyPath);
  log(`地图 #${mapNumber} 的任务清单已重建并写回：${children.length} 行`);
}

/**
 * 图体检（只读）：这道门回答「这张图会不会死锁、两张票会不会互相踩」。
 *   ① 查环——有环＝互相等＝死锁，非零退出并点名环上的票；
 *   ② 查外部阻塞——挡着本图的票不在图里（那它得有人管，否则永远开不了工）；
 *   ③ 查前沿宽度——前沿＝未关 ＋ 无未关阻塞 ＋ 无人认领；0 张＝死锁，1 张＝纯串行（提示）；
 *   ④ 查写面撞车——两票声明了同一条路径，而它们之间**没有先后关系**（谁都不是谁的祖先）＝
 *     同一时刻两个写者（协议 §1 路径所有权的硬约束）。
 * 用法：map-chart.mjs <规格.json> lint  ／  规格里每票可选带 `"paths": ["…"]`（写面，文件或目录级）。
 */
function lint() {
  const draft = process.argv.includes('--draft');
  const tickets = spec.tickets;
  // 草稿态：不碰 GitHub，票的内部键就是 key；线上态：按原生边与子议题列表算。
  const nodes = draft
    ? tickets.map((t) => ({ id: t.key, title: t.title, state: 'open', assignees: [] }))
    : ghJson('api', `repos/${REPO}/issues/${spec.map.number ?? findIssueByTitle(spec.map.title)?.number}/sub_issues`, '--paginate')
      .map((c) => ({ id: c.number, title: c.title, state: c.state, assignees: c.assignees ?? [] }));
  const mapNumber = draft ? '(草稿态)' : (spec.map.number ?? findIssueByTitle(spec.map.title)?.number ?? die(1, '线上找不到地图'));
  const idOfKey = new Map(draft ? tickets.map((t) => [t.key, t.key])
    : tickets.map((t) => [t.key, t.number ?? nodes.find((n) => n.title === t.title)?.id]));
  const keyOfId = new Map([...idOfKey].map(([k, id]) => [id, k]));

  const blockers = new Map();
  const blocks = new Map();
  for (const n of nodes) {
    const b = new Set(draft
      ? (tickets.find((t) => t.key === n.id).blockedBy ?? []).map((k) => idOfKey.get(k))
      : ghJson('api', `repos/${REPO}/issues/${n.id}/dependencies/blocked_by`, '--paginate')
        .map((i) => i.number).filter((x) => keyOfId.has(x)));
    blockers.set(n.id, b);
    for (const x of b) { if (!blocks.has(x)) blocks.set(x, new Set()); blocks.get(x).add(n.id); }
  }
  console.log(`图体检${draft ? '（草稿态）' : ''}：${mapNumber}，票 ${nodes.length} 张，边 ${[...blockers.values()].reduce((a, s) => a + s.size, 0)} 条`);

  // ① 查环
  const indeg = new Map([...blockers].map(([n, b]) => [n, b.size]));
  const q = [...indeg].filter(([, d]) => d === 0).map(([n]) => n);
  const order = [];
  while (q.length) {
    const n = q.shift(); order.push(n);
    for (const m of blocks.get(n) ?? []) { indeg.set(m, indeg.get(m) - 1); if (indeg.get(m) === 0) q.push(m); }
  }
  if (order.length !== nodes.length) {
    const stuck = [...blockers.keys()].filter((n) => !order.includes(n));
    console.error(`✗ 查环 FAIL：拓扑序只排出 ${order.length}/${nodes.length} 张，环上的票：${stuck.map((n) => keyOfId.get(n)).join(' ')}`);
  } else console.log('✓ 查环 PASS：无环（拓扑序排满全部票）');

  // ② 外部阻塞（只有线上态判得了）
  if (!draft) {
    const out = [];
    for (const n of nodes) {
      for (const b of ghJson('api', `repos/${REPO}/issues/${n.id}/dependencies/blocked_by`, '--paginate')) {
        if (!keyOfId.has(b.number) && b.state === 'open') out.push(`#${n.id} ← 图外 #${b.number}（${b.title}）`);
      }
    }
    console.log(out.length ? `⚠ 外部阻塞 ${out.length} 条：\n  ${out.join('\n  ')}` : '✓ 无外部阻塞（没有票被图外的活挡着）');
  }

  // ③ 前沿（草稿态＝无阻塞即前沿；线上态＝未关 ＋ 无未关阻塞 ＋ 无人认领）
  const ready = nodes.filter((n) => {
    const openBlockers = [...(blockers.get(n.id) ?? [])].filter((b) => nodes.find((x) => x.id === b)?.state === 'open');
    return n.state === 'open' && openBlockers.length === 0 && (draft || n.assignees.length === 0);
  });
  console.log(`前沿宽度：${ready.length} 张可开工`
    + (ready.length === 0 ? '  ✗ 前沿为空＝死锁' : ready.length === 1 ? '  ⚠ 纯串行（主干排队中）' : '  ✓'));
  for (const r of ready) console.log(`  可开工 ${draft ? r.id : '#' + r.id}  ${r.title}`);

  // ④ 写面撞车（协议 §1：同一时刻两个写者不允许）
  const withPaths = tickets.filter((t) => Array.isArray(t.paths) && t.paths.length);
  if (!withPaths.length) console.log('⚠ 写面检查跳过：规格里没有票声明 `paths`（协议 §1 要求每票声明写面）');
  else {
    const ancestors = (n, seen = new Set()) => {
      for (const b of blockers.get(n) ?? []) { if (!seen.has(b)) { seen.add(b); ancestors(b, seen); } }
      return seen;
    };
    const anc = new Map(tickets.map((t) => [t.key, ancestors(idOfKey.get(t.key))]));
    const hit = (a, b) => a.paths.some((p) => b.paths.some((x) => p === x || p.startsWith(x) || x.startsWith(p)));
    const ordered = (a, b) => anc.get(a.key).has(idOfKey.get(b.key)) || anc.get(b.key).has(idOfKey.get(a.key));
    const clashes = [];
    for (let i = 0; i < withPaths.length; i++) {
      for (let j = i + 1; j < withPaths.length; j++) {
        const a = withPaths[i]; const b = withPaths[j];
        if (hit(a, b) && !ordered(a, b)) {
          clashes.push(`  ${a.key} × ${b.key} 共享 ${a.paths.filter((p) => b.paths.some((x) => p === x || p.startsWith(x) || x.startsWith(p))).join(' ')}，且两者之间没有先后关系`);
        }
      }
    }
    console.log(clashes.length
      ? `✗ 写面撞车 ${clashes.length} 对（同一时刻两个写者，协议 §1 不允许）：\n${clashes.join('\n')}`
      : `✓ 写面检查 PASS：${withPaths.length} 张票的写面，凡有重叠的都已用先后边错开`);
    if (clashes.length) process.exit(1);
  }
  if (order.length !== nodes.length || ready.length === 0) process.exit(1);
  console.log('图体检：PASS');
}

function die(code, msg) { console.error(msg); process.exit(code); }

if (CMD === 'plan') plan();
else if (CMD === 'create') create();
else if (CMD === 'verify') verify();
else if (CMD === 'lint') lint();
else if (CMD === 'sync-map') syncMap();
else die(2, `未知子命令：${CMD}（只认 plan／create／verify／lint／sync-map）`);
