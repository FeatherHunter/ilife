/** #464 · 体成分记录表「备注」列口径（真出口验收，不碰 t362）。
 *
 * 票面目标（`gh issue view 464` 五段为准）：
 *   ① 可见文本：该列缺值写 `—`（基准 `t395-融合基准.md` §四裁定 2；老正本
 *      `body_composition_view.html:211` 的 `esc(s){return String(s==null?'—':s)}`
 *      对 `null` 写 `—`；「空」只来自空串值，写库统一 `input.note ?? ''`
 *      见 `fetch/body.ts:289` 实测，票面 252 已漂移）。
 *   ② 注释归因改 `:211` 的 `esc` 口径，并写明「空」来自空串值而非模板选择。
 * 运行路径不可达（写侧不产 NULL），但迁移／直导老库会出现，故仍要改。
 *
 * 验收（每条＝跑哪条命令 → 看哪个读数 → 等于什么）：
 *   1. tmp 库直插 `note=NULL` → 跑 `calorie-cmd-read calorie.view.body-composition`
 *      → 剥标签后该格内容等于 `—`（按格定位，不做全文 includes）。
 *   2. 同一页复制数据里该字段仍为 `null`、不含 `—`（与第 1 条分开断言）。
 *   3. 注释含 `:211` 的 `esc` 口径＋「空」来自空串值的说明（读源码断言）。
 *   4. 负向对照持锁另做：该格判据改回空串 → 第 1 条必红；还原 → 必绿
 *      （两行机器读数见 `docs/skills/skill-calorie/t464-备注列口径证据.md`）。
 * 不许动：其它列／页口径、唤醒词与命令名、`body_fat_pct`、真库零写入（本文件一切
 * 数据走 mkdtemp tmp 库，`SKILLS_DB_PATH` 指过去；页面落盘在 tmp 目录内）。
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`，再
 *   `node --test packages/skill-calorie/test/t464-备注列口径.test.mjs`。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { calorieConfigDir, configTestBase } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const DOCS_SRC = join(HERE, '..', 'src', 'body', 'bodyDocs.ts');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const KEY = 'calorie.view.body-composition';
const DB_FILE = 'calorie_data.db';
const CALIPER_FIELDS = [
  'caliper_chest_mm', 'caliper_abdominal_mm', 'caliper_thigh_mm',
  'caliper_tricep_mm', 'caliper_subscapular_mm', 'caliper_suprailiac_mm',
  'caliper_midaxillary_mm',
];

/** 与 `fetch/body.ts` 的 `daysAgo` 逐字同式的日基准：避开本地／UTC ±1 天漂移。 */
const dayBefore = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

/** 三行种子：NULL（迁移样例）／空串（写侧正常值）／普通文本（透传对照）。 */
const D_NULL = 10;
const D_EMPTY = 5;
const D_TEXT = 0;
const TEXT_NOTE = '晚餐后测';

function mkTmpDb() {
  const dir = mkdtempSync(join(tmpdir(), 't464-'));
  const db = openDb(join(dir, DB_FILE));
  const cols = ['date', 'source', 'body_fat_pct', ...CALIPER_FIELDS, 'note'];
  const stmt = db.prepare('INSERT INTO body_composition (' + cols.join(', ') + ') VALUES ('
    + cols.map(() => '?').join(', ') + ')');
  const calipers = CALIPER_FIELDS.map(() => null);
  stmt.run(dayBefore(D_NULL), 'gym', 21.5, ...calipers, null);
  stmt.run(dayBefore(D_EMPTY), 'gym', 21.0, ...calipers, '');
  stmt.run(dayBefore(D_TEXT), 'gym', 20.5, ...calipers, TEXT_NOTE);
  db.close();
  return dir;
}

/** 剥标签（先摘 script／style，再把标签换空格，再解实体、压空白；照抄 t362 同式）。 */
function visible(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;|&#8212;|&#x2014;/gi, '—')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim();
}

/** 真出口：跑 `cmd_read`，页面从 `delivery.path` 读回（可见文本以落盘页面为准）。 */
function runRead(dir, params) {
  const args = params === undefined ? [BIN, KEY] : [BIN, KEY, '--params', JSON.stringify(params)];
  const r = spawnSync(NODE_BIN, args, { encoding: 'utf8', env: { ...process.env, ...homeEnvOf(calorieConfigDir(dir))} });
  let env = null;
  try { env = JSON.parse(r.stdout); } catch { /* 非 0 退出时 stdout 可能不是 JSON */ }
  const path = env?.delivery?.path;
  const html = path ? readFileSync(path, 'utf8') : '';
  return { status: r.status, env, html, text: visible(html), stderr: String(r.stderr || '') };
}

/** 按表头标题取一张数据表（结构化读行，不做全文 includes；照抄 t362 同式）。 */
function tableByCaption(html, kw) {
  for (const seg of html.split('<div class="ilife-block ilife-block-data-table">').slice(1)) {
    const cap = visible((seg.match(/ilife-block-data-table-caption">([\s\S]*?)<\/caption>/) || [])[1] ?? '');
    if (!cap.includes(kw)) continue;
    const body = (seg.match(/<tbody>([\s\S]*?)<\/tbody>/) || [])[1] ?? '';
    const rows = body.split(/<tr[^>]*>/).slice(1)
      .map((tr) => tr.split(/<td[^>]*>/).slice(1).map((c) => visible(c.split('</td>')[0])));
    return { caption: cap, rows };
  }
  return null;
}

/** 记录表按日期列取「备注」格：列序＝日期／体脂／来源／备注（bodyDocs.ts:163-170）。 */
function noteByDate(html) {
  const table = tableByCaption(html, '体成分记录');
  assert.ok(table, '必须出「体成分记录」表');
  const byDate = {};
  for (const row of table.rows) byDate[row[0]] = row[3];
  return byDate;
}

/** 复制区（复制数据）的 JSON 载荷：页面里以 HTML 转义的 `data-t` 属性承载。 */
function copyPayload(html) {
  const at = html.indexOf('复制数据');
  assert.ok(at > 0, '页面必须带「复制数据」区');
  const seg = html.slice(at);
  const json = (seg.match(/data-fmt="json"[^>]*data-t="([\s\S]*?)"/) || [])[1];
  assert.ok(json !== undefined, '复制数据必须带 JSON 格式那一路');
  return JSON.parse(json.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
}

test('#464 可见：note=NULL 该格等于 `—`，空串仍为空，文本原样透传（按格定位）', () => {
  const r = runRead(mkTmpDb(), undefined);
  assert.equal(r.status, 0, 'stderr=' + r.stderr.slice(-300));
  const byDate = noteByDate(r.html);
  assert.equal(byDate[dayBefore(D_NULL)], '—', 'note=NULL ⇒ 可见文本该格等于 `—`');
  assert.equal(byDate[dayBefore(D_EMPTY)], '', 'note=空串 ⇒ 可见文本该格仍为空（「空」只来自空串值）');
  assert.equal(byDate[dayBefore(D_TEXT)], TEXT_NOTE, '普通备注原样透传');
  console.log('T464-VISIBLE null格=' + JSON.stringify(byDate[dayBefore(D_NULL)])
    + ' 空串格=' + JSON.stringify(byDate[dayBefore(D_EMPTY)])
    + ' 文本格=' + JSON.stringify(byDate[dayBefore(D_TEXT)]));
});

test('#464 载荷：同一页复制数据里该字段仍为 null、不含 `—`（与可见条分开断言）', () => {
  const r = runRead(mkTmpDb(), undefined);
  assert.equal(r.status, 0, 'stderr=' + r.stderr.slice(-300));
  const env = copyPayload(r.html);
  assert.equal(env.key, KEY, '载荷必须是该命令的 envelope');
  const items = env.data.items;
  assert.equal(items.length, 3, '载荷行数 == 3');
  const byDate = Object.fromEntries(items.map((row) => [row.date, row]));
  assert.equal(byDate[dayBefore(D_NULL)].note, null, 'note=NULL 在载荷里仍为 null');
  assert.notEqual(byDate[dayBefore(D_NULL)].note, '—', '载荷该字段不得写可见文本的 `—` 代字');
  assert.equal(byDate[dayBefore(D_EMPTY)].note, '', '空串在载荷里仍为空串');
  assert.equal(byDate[dayBefore(D_TEXT)].note, TEXT_NOTE, '文本在载荷里原样透传');
  const dashed = items.filter((row) => Object.values(row).includes('—'));
  assert.deepEqual(dashed, [], '载荷行里不许出现可见文本的 `—` 代字');
  console.log('T464-PAYLOAD null=' + JSON.stringify(byDate[dayBefore(D_NULL)].note)
    + ' 空串=' + JSON.stringify(byDate[dayBefore(D_EMPTY)].note) + ' 含破折号行=' + dashed.length);
});

test('#464 注释：改成老正本 `:211` 的 `esc` 口径，并写明「空」来自空串值', () => {
  const src = readFileSync(DOCS_SRC, 'utf8');
  assert.ok(src.includes('body_composition_view.html:211'), '注释必须点名老正本 `:211`');
  assert.ok(src.includes('esc('), '注释必须写明 `esc` 口径');
  assert.ok(src.includes('空串值'), '注释必须写明「空」来自空串值而非模板选择');
  assert.ok(src.includes("input.note ?? ''"), '注释必须点名写侧统一口径 `input.note ?? \'\'`');
  assert.ok(src.includes("typeof x.note === 'string' ? x.note : '—'"), '该列判据必须是非串走 `—`');
  console.log('T464-COMMENT 211/esc/空串值/input.note逐字命中');
});
