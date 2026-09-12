#!/usr/bin/env node
/**
 * 本图（备忘录HELP真标准）的**建票脚本**：建地图 ＋ 建 13 张子票 ＋ 落映射表 ＋ 文件改名。
 *
 * 为什么用脚本：号码只有建完才知道；建完把 `body-t<n>.md` 改成 `t<issue>-body.md`
 * 后，边缘脚本（`t<N>-wire-edges.mjs`）才拿得到号码对。中途失败可重跑：已存在
 * `map-*-tickets.json` 就拒跑，避免重复建票。
 *
 * 用法：node docs/skills/skill-memo-ilife/chart.mjs
 * 依赖：`gh` 已登录（scopes 含 repo），且四个 wayfinder 标签已存在。
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, renameSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = 'FeatherHunter/ilife';
const MAP_TITLE = '[wayfinder] 备忘录HELP真标准：明确交付help文件＋用现成通用模板';
const MAP_LABEL = 'wayfinder:map';

const TICKETS = [
  { n: 1, type: 'research', title: '备忘录HELP（1/13）调查：饼干记账的 HELP 交付实现 → 备忘录照抄清单' },
  { n: 2, type: 'research', title: '备忘录HELP（2/13）调查：内容资产对账（老 8 域／13 组／30 场景 ↔ 新表 28 唤醒词／10 命令）' },
  { n: 3, type: 'research', title: '备忘录HELP（3/13）调查：通用 help 模板的注入契约 ＋ 备忘录专属取值' },
  { n: 4, type: 'grilling', title: '备忘录HELP（4/13）决策：命名落盘管线的归属 ＋ 缺省出口口径' },
  { n: 5, type: 'grilling', title: '备忘录HELP（5/13）结构设计：新件住哪 ＋ 文件行数告警线（必报五步第一／二步，先报用户点头）' },
  { n: 6, type: 'grilling', title: '备忘录HELP（6/13）内容裁决：老骨架与新表对不齐的条目（先报用户点头）' },
  { n: 7, type: 'task', title: '备忘录HELP（7/13）内容资产入库：老骨架 → 仓内 typed const' },
  { n: 8, type: 'task', title: '备忘录HELP（8/13）渲染接线：5 项 ＋ 三块可选内容 → 通用 help 模板' },
  { n: 9, type: 'task', title: '备忘录HELP（9/13）出口与命名落盘：缺省＝HELP 文件，速查走显式参数' },
  { n: 10, type: 'task', title: '备忘录HELP（10/13）锁：CLI 级用例（真 spawn 出口）' },
  { n: 11, type: 'task', title: '备忘录HELP（11/13）SKILL.md 说明面' },
  { n: 12, type: 'task', title: '备忘录HELP（12/13）插件侧最小装机（技能提供方 ＋ DSH profile；收窄 #61）' },
  { n: 13, type: 'task', title: '备忘录HELP（13/13）真机端到端 ＋ 肉眼终审' },
];

const here = dirname(fileURLToPath(import.meta.url));
const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();

// 防重跑：映射表已在就拒跑（建票不可逆，宁可人工确认）。
const already = readdirSync(here).filter((f) => /^map-\d+-tickets\.json$/.test(f));
if (already.length) {
  console.error(`拒绝重跑：${already.join(', ')} 已存在，说明本图已建过票。`);
  process.exit(1);
}
for (const f of ['map-body.md', ...TICKETS.map((t) => `body-t${t.n}.md`)]) {
  if (!existsSync(join(here, f))) {
    console.error(`缺文件：${f}`);
    process.exit(1);
  }
}

// ── 1. 建地图 ──
const mapUrl = gh('issue', 'create', '--repo', REPO, '--title', MAP_TITLE, '--label', MAP_LABEL,
  '--body-file', join(here, 'map-body.md'));
const MAP = Number(mapUrl.trim().split('/').pop());
console.log(`地图已建：#${MAP}  ${mapUrl}`);

// ── 2. 建 13 张子票 ──
const rows = [];
for (const t of TICKETS) {
  const url = gh('issue', 'create', '--repo', REPO, '--title', t.title,
    '--label', `wayfinder:${t.type}`, '--body-file', join(here, `body-t${t.n}.md`));
  const issue = Number(url.trim().split('/').pop());
  rows.push({ ...t, issue });
  console.log(`  票 ${String(t.n).padStart(2)} → #${issue}  [${t.type}]  ${t.title}`);
}

// ── 3. 落映射表（边缘脚本的唯一输入）──
const jsonPath = join(here, `map-${MAP}-tickets.json`);
writeFileSync(jsonPath, JSON.stringify(rows.map(({ n, issue, type, title }) => ({ n, issue, type, title })), null, 4) + '\n');
console.log(`映射表已落：map-${MAP}-tickets.json`);

// ── 4. 文件改名：body-t<n>.md → t<issue>-body.md；map-body.md → map-<N>-body.md ──
for (const r of rows) renameSync(join(here, `body-t${r.n}.md`), join(here, `t${r.issue}-body.md`));
renameSync(join(here, 'map-body.md'), join(here, `map-${MAP}-body.md`));
console.log(`正文文件已改名（t<issue>-body.md ／ map-${MAP}-body.md）`);

console.log(`\n下一步：写并跑 t${MAP}-wire-edges.mjs 拉原生边。MAP=${MAP}`);
