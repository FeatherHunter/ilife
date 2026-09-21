#!/usr/bin/env node
/** #841 · 端到端真跑：`SKILL.md` 快照里那 50 行「例」条条**打得到真命令**，且经唤醒词层走一遍也对得上。
 *
 * 为什么要跑这一步：快照是「AI 在 DSH 里看到的唯一调用面」。一条「例」写错（key 不是命令名、
 * 槽位名与 run 读的对不上、过滤维度键不被认），快照照样是绿的——只比字面的对账件看不出来。
 * 所以本件拿快照里**真的那一串**去打真命令：不另写示例，写的就是 AI 会照抄的那一行。
 *
 * 两段，各自独立的判据：
 *   第 1 段 · 快照的「例」能跑：50 行逐条 spawn（对着副本库）。按退出码三档语义判（`src/cli/cmd_read.ts` 头注释）：
 *     exit 0 真出 envelope／exit 4「无此菜谱／搜无结果」（真数据下正常，示例值恰好在库里对不上）。
 *     **exit 2（口径／参数错）除下面点名的 6 条外一律判红**——那 6 条的示例payload 本来就写不全
 *     （`记录做菜`一句只点菜名，反馈要用户现给），属示例的固有留白，不是路由错。
 *     ⚠️ 这一档在开发期真抓到过一条：`筛选时间`的示例只给 `time_max`，而 `chef.recipe.search` 原先
 *     不认这个键 ⇒ exit 2。**「只给一个 key 就分不出认不认」就是 exit 2 这一档的价值**。
 *   第 2 段 · 唤醒词层能落地：`routeWakeword(词, ctx)` 的产物拿去起真命令，逐条必须 exit 0／4。
 *     它验的是「AI 照快照选 key、按表里 needs 填参」这条路的终点；槽位名与 run 读的走散即在这里红。
 *
 * 跑法（先造副本与隔离家目录）：
 *   node docs/skills/skill-chef/t840-沙箱.mjs --ticket 841
 *   node tooling/run-locked.mjs --ticket 841 -- node docs/skills/skill-chef/t841-端到端真跑.mjs
 *
 * 真库主文件与 mtime 全程不得变（本件在开跑前后各记一次）。
 */
import { readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..');
const PKG = join(ROOT, 'packages', 'skill-chef');
const HOME_DIR = join(ROOT, '.scratch', 't841', 'home');
const REAL_DB = 'D:\\2Study\\StudyNotes\\.db\\chef_data.db';

/** 快照的「例」本来就写不全 payload 的 7 条（唤醒词只报菜名，其余要用户现给）⇒ 允许 exit 2。 */
const EXAMPLE_PARTIAL = new Set(['记录做菜', '补录做菜', '改评分', '修改步骤', '修改食材', '批量改', '修改食谱']);
/** 唤醒词层真跑时，这几条**写**下去要额外 payload（表里 `needs` 之外的部分，照各域 driver 的用法）。 */
const ROUTE_PAYLOAD = {
  记录做菜: { rating: 5, feedback: '好吃' },
  补录做菜: { rating: 5, feedback: '好吃', date: '2026-09-06' },
  改评分: { rating: 4, feedback: '好吃' },
  批量改: { ingredients: [{ name: '螺丝椒', quantity: 260 }] },
  修改步骤: { action: '中火翻炒' },
  修改食材: { quantity: 260 },
  导入食谱: { name: '小炒肉' },
  修改食谱: { difficulty: '简单' },
};
/** 槽位的示例值：照快照「例」那一列的口径（真库实测有的那一道菜与它的食材／步数）。 */
const SLOT_VALUE = {
  name: '辣椒炒肉', names: ['辣椒炒肉'], step: 2, ingredient: '螺丝椒', input: '菜谱.json',
  parent: '辣椒炒肉', child: '小炒肉', source: '辣椒炒肉', target: '小炒肉',
  relation_type: '派生', change_summary: '换个辣椒', differences: '换个辣椒',
};

/** 快照里的 50 行「例」（与 `SKILL.md` 的 HELP 标记块同一处，不另写示例）。 */
function snapshotExamples() {
  const text = readFileSync(join(PKG, 'SKILL.md'), 'utf8');
  const si = text.indexOf('<!-- HELP-AUTO-START -->');
  const ei = text.indexOf('<!-- HELP-AUTO-END -->');
  return text.slice(si, ei).split('\n')
    .filter((l) => l.startsWith('| '))
    .filter((l) => !l.startsWith('| 唤醒词 ') && !l.startsWith('|---'))
    .map((l) => {
      const cells = l.slice(2, l.endsWith(' |') ? -2 : undefined).split(' | ');
      return { phrase: cells[0], cli: String(cells[3] || '').replace(/^`|`$/g, '') };
    });
}

/** `chef-cmd-read <key> [--params '<json>']` → argv（词表里就是我们自己拼的那一种写法）。 */
function toArgv(cli) {
  const m = cli.match(/^chef-cmd-read\s+(\S+)(?:\s+--params\s+'(.*)')?$/);
  if (!m) return null;
  return m[2] === undefined ? [m[1]] : [m[1], '--params', m[2]];
}

const run = (argv) => {
  const r = spawnSync(process.execPath, [join(PKG, 'dist', 'cli', 'cmd_read.js'), ...argv], {
    cwd: ROOT, encoding: 'utf8',
    env: { ...process.env, USERPROFILE: HOME_DIR, HOME: HOME_DIR },
  });
  return { status: r.status, err: String(r.stderr || '').trim().split('\n')[0] };
};

const stat0 = statSync(REAL_DB);
const EXAMPLES = snapshotExamples();
if (EXAMPLES.length !== 50) {
  console.error('快照行数应为 50，实测 ' + EXAMPLES.length);
  process.exit(1);
}

// ── 第 1 段：快照的「例」能跑 ────────────────────────────────────────────────
const seg1 = [];
for (const e of EXAMPLES) {
  const argv = toArgv(e.cli);
  if (!argv) { seg1.push({ phrase: e.phrase, ok: false, status: -1, err: 'cli 解不出 argv：' + e.cli }); continue; }
  const r = run(argv);
  const ok = r.status === 0 || r.status === 4 || (r.status === 2 && EXAMPLE_PARTIAL.has(e.phrase));
  seg1.push({ phrase: e.phrase, ok, status: r.status, err: r.err });
}

// ── 第 2 段：唤醒词层出来的参数拿去起真命令 ──────────────────────────────────
const { WAKE_TABLE, routeWakeword } = await import('file:///' + join(PKG, 'dist', 'policy', 'index.js').replace(/\\/g, '/'));
const seg2 = [];
for (const entry of WAKE_TABLE) {
  if (entry.key === 'chef.help.lookup') continue;
  const ctx = {};
  for (const n of (entry.needs || [])) ctx[n] = n in SLOT_VALUE ? SLOT_VALUE[n] : 'x';
  let params;
  try { params = { ...routeWakeword(entry.phrase, ctx).params, ...(ROUTE_PAYLOAD[entry.phrase] || {}) }; }
  catch (err) { seg2.push({ phrase: entry.phrase, ok: false, status: -1, err: '路由抛：' + err.message }); continue; }
  const r = run([entry.key, '--params', JSON.stringify(params)]);
  const ok = r.status === 0 || r.status === 4;
  seg2.push({ phrase: entry.phrase, ok, status: r.status, err: r.err });
}

const stat1 = statSync(REAL_DB);
const bad1 = seg1.filter((r) => !r.ok);
const bad2 = seg2.filter((r) => !r.ok);
for (const r of [...bad1, ...bad2]) console.log('FAIL ' + r.phrase + ' → exit ' + r.status + (r.err ? ' ｜ ' + r.err : ''));
const cnt = (rows, n) => rows.filter((r) => r.status === n).length;
const untouched = stat0.size === stat1.size && stat0.mtimeMs === stat1.mtimeMs;
console.log('第 1 段 · 快照 50 条例：exit 0 的 ' + cnt(seg1, 0) + ' 条／exit 4 的 ' + cnt(seg1, 4) + ' 条／exit 2（点名的 '
  + cnt(seg1, 2) + ' 条留白）／不符 ' + bad1.length + ' 条');
console.log('第 2 段 · 唤醒词层 46 条真跑：exit 0 的 ' + cnt(seg2, 0) + ' 条／exit 4 的 ' + cnt(seg2, 4) + ' 条／不符 ' + bad2.length + ' 条');
console.log('真库未动＝' + untouched);
process.exit(bad1.length === 0 && bad2.length === 0 && untouched ? 0 : 1);
