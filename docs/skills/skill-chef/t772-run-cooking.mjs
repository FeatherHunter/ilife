#!/usr/bin/env node
/** t772 做菜域运行脚本（票 #772 验收命令本体）。
 *
 * 正例：`node tooling/run-locked.mjs --ticket 772 -- node docs/skills/skill-chef/t772-run-cooking.mjs`
 *   → 5 卡逐卡走通（命令 exit=0 ＋ 过程型 HTML 落盘），打印 5 行 `卡 → exit=0 → 产物绝对路径` 且 `缺卡 0`，exit 0。
 *   产物落 `.scratch/t772/`（与副本库同目录，前例 `t768` 同形）；册子片段落
 *   `docs/skills/skill-chef/t772-册子片段.json`（5 行，供收口 A 合并，不碰共用册子）。
 * 反例：`... t772-run-cooking.mjs --break 4`
 *   → 把第 4 步的食材关联删坏（临时库，不碰沙箱副本），该卡必须 exit≠0 并点名到步（不许静默少显示一步）。
 * 检查：`... t772-run-cooking.mjs --check`
 *   → 同时打印「片段行数＝本票卡数」与「vision 审查缺陷 0（或逐条已改）」，两者缺一即红（exit 1）。
 *
 * 数据一律走票 17 沙箱器械的副本（`.scratch/t772/chef_data.db`，缺则先跑 `t840-沙箱.mjs --ticket 772`）；
 * 真库只读。隔离通道声明 CHANNEL-PENDING-#756（家目录注入跑命令）。
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';

const LF = String.fromCharCode(10);
const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const SCRATCH = join(ROOT, '.scratch', 't772');
const DBPATH = join(SCRATCH, 'chef_data.db');
const HOME = join(SCRATCH, 'home');
const DIST = join(ROOT, 'packages', 'skill-chef', 'dist');
const FRAGMENT = join(ROOT, 'docs', 'skills', 'skill-chef', 't772-册子片段.json');
const VISION = join(SCRATCH, 'vision-审查.md');

/** 五张卡（同一命令，不同参数＋不同强调块；唤醒词四句里本批统一走「做菜模式」）。 */
const CARDS = [
  { id: 'cooking_start_fresh', title: '全新开始', file: '做菜-全新开始.html', kind: 'fresh', params: { name: '辣椒炒肉' }, currentStep: 1 },
  { id: 'cooking_start_with_history', title: '含上次经验', file: '做菜-含上次经验.html', kind: 'with-history', params: { name: '辣椒炒肉' }, currentStep: 1 },
  { id: 'cooking_start_double_servings', title: '双份份量', file: '做菜-双份份量.html', kind: 'double', params: { name: '辣椒炒肉', servings: 4 }, currentStep: 1 },
  { id: 'cooking_resume_after_pause', title: '断点续做', file: '做菜-断点续做.html', kind: 'resume', params: { name: '辣椒炒肉', progress: 3 }, currentStep: 4 },
  { id: 'cooking_during_waiting_step', title: '等待并行', file: '做菜-等待并行.html', kind: 'waiting', params: { name: '辣椒炒肉' }, currentStep: 1 },
];

function fail(msg) {
  process.stderr.write('t772-run-cooking：' + msg + LF);
  process.exit(1);
}

function ensureSandbox() {
  if (!existsSync(DBPATH)) fail('副本库不在（' + DBPATH + '），先跑 node docs/skills/skill-chef/t840-沙箱.mjs --ticket 772');
}

async function buildAll() {
  ensureSandbox();
  const { openChefDb } = await import('file://' + join(DIST, 'fetch', 'db.js').replace(/\\/g, '/'));
  const { getCookingPageData, renderCookingPage } = await import('file://' + join(DIST, 'cook', 'run.js').replace(/\\/g, '/'));
  const handle = openChefDb(DBPATH);
  const rows = [];
  try {
    for (const card of CARDS) {
      // 端到端：先走真命令（家目录注入指副本），exit 非 0 即停。
      const r = spawnSync(process.execPath,
        [join(DIST, 'cli', 'cmd_read.js'), 'chef.cooking.run', '--params', JSON.stringify(card.params)],
        { env: { ...process.env, USERPROFILE: HOME, HOME }, encoding: 'utf8' });
      if (r.status !== 0) fail('卡 ' + card.id + ' 命令 exit=' + r.status + '（stderr：' + String(r.stderr).slice(0, 200) + '）');
      const data = getCookingPageData(handle, card.params);
      const html = renderCookingPage(data, { kind: card.kind, currentStep: card.currentStep });
      const abs = join(SCRATCH, card.file);
      writeFileSync(abs, html, 'utf8');
      const buf = readFileSync(abs);
      rows.push({
        卡id: card.id, 唤醒词: '做菜模式', 命令: 'chef.cooking.run', 参数: card.params,
        产物绝对路径: abs, exit: 0, bytes: buf.length,
        sha256: createHash('sha256').update(buf).digest('hex'),
      });
    }
  } finally {
    try { handle.db.close(); } catch { /* 已关 */ }
  }
  mkdirSync(join(ROOT, 'docs', 'skills', 'skill-chef'), { recursive: true });
  writeFileSync(FRAGMENT, JSON.stringify(rows, null, 2) + LF, 'utf8');
  for (const row of rows) console.log('卡 ' + row.卡id + ' → exit=0 → ' + row.产物绝对路径);
  console.log('缺卡 0');
}

/** 反例：删坏第 N 步的食材关联（临时库），取数必须抛错点名到步。 */
async function breakOne(seq) {
  ensureSandbox();
  if (!Number.isInteger(seq) || seq < 1) fail('--break 须给步骤序号（正整数）');
  const tmp = join(SCRATCH, 'chef_data-break.db');
  copyFileSync(DBPATH, tmp);
  const { openChefDb } = await import('file://' + join(DIST, 'fetch', 'db.js').replace(/\\/g, '/'));
  const { getCookingPageData } = await import('file://' + join(DIST, 'cook', 'run.js').replace(/\\/g, '/'));
  const handle = openChefDb(tmp);
  try {
    handle.db.prepare("DELETE FROM step_ingredients WHERE step_id IN (SELECT id FROM cooking_steps WHERE recipe_id = (SELECT id FROM recipes WHERE name = '辣椒炒肉') AND sequence = ?)").run(seq);
    getCookingPageData(handle, { name: '辣椒炒肉' });
  } catch (e) {
    console.log('反例命中（exit≠0 并点名）：' + String((e && e.message) || e));
    try { handle.db.close(); } catch { /* 已关 */ }
    try { rmSync(tmp); } catch { /* 留档 */ }
    process.exit(1);
  }
  try { handle.db.close(); } catch { /* 已关 */ }
  try { rmSync(tmp); } catch { /* 留档 */ }
  fail('假绿灯：第 ' + seq + ' 步关联已删坏但仍静默出页（必须抛错点名）');
}

/** `--check`：片段行数＝5 且 vision 剩余缺陷 0，两者缺一即红。 */
function check() {
  let fragOk = false;
  let fragN = -1;
  try {
    const rows = JSON.parse(readFileSync(FRAGMENT, 'utf8'));
    fragN = Array.isArray(rows) ? rows.length : -1;
    fragOk = fragN === CARDS.length;
  } catch { fragOk = false; }
  console.log('片段行数＝' + (fragN < 0 ? '缺文件' : fragN) + '（本票卡数 ' + CARDS.length + '）' + (fragOk ? '' : ' —— 红'));
  let visionOk = false;
  let visionLine = '缺文件';
  try {
    const text = readFileSync(VISION, 'utf8');
    const m = /剩余缺陷：(\d+)/.exec(text);
    visionLine = m === null ? '未登记' : '剩余缺陷 ' + m[1];
    visionOk = m !== null && m[1] === '0';
  } catch { visionOk = false; }
  console.log('vision 审查缺陷 ' + visionLine + (visionOk ? '' : ' —— 红'));
  process.exit(fragOk && visionOk ? 0 : 1);
}

const mode = process.argv[2];
if (mode === '--check') check();
else if (mode === '--break') await breakOne(Number(process.argv[3]));
else if (mode === undefined) await buildAll();
else fail('未知参数：' + mode + '（用法：无参跑全量 ／ --check ／ --break <步骤序号>）');
