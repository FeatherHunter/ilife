#!/usr/bin/env node
/** #855 · **产物字节基线**（6 批搬迁共用的硬判据：「产物字节不变」的机器读数）。
 *
 * 为什么单列一件：搬迁的每一批都要证明「只换了住处，没换行为」。判据取三样：
 *   ① 出口退出码；② 落盘产物的**落点主体**（去掉同秒后缀）；③ 产物正文的**归一化 sha256**。
 * 归一化的只有两类易变值：页面时间戳（`YYYY-MM-DD HH:MM:SS`／`YYYYMMDD_HHMMSS`）与当次临时根路径；
 * 其余一个字节都不许变——归一把「时间戳漂移」与「内容漂移」分开，免得每次跑都假红。
 *
 * 口径：**唯一出口真跑**（`dist/cli/cmd_read.js`，参数＋JSON 回执＋退出码），一条命令一个**全新临时库**
 * （种子逐条定死 `created_at`），家目录指临时目录、PATH 钉死飞书缺席（`noLarkPathEnv`）。
 * 绝不碰活库与真家目录。
 *
 * 用法：
 *   node docs/skills/skill-memo-ilife/t855-产物基线.mjs --write   # 取基线（迁移前跑一次）
 *   node docs/skills/skill-memo-ilife/t855-产物基线.mjs --check   # 比对（每一批搬迁后跑）
 * 读数：逐条一行，末尾 `RESULT: n/m`；不一致即 exit 1 并逐条点名（退出码／落点／正文哈希三面）。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { mkMemoDb, seedNote, seedReminder } from '../../../packages/skill-memo-ilife/test/helpers/memo-sqlite.mjs';
import { mkMemoConfig, noLarkPathEnv } from '../../../packages/skill-memo-ilife/test/helpers/config-base.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const BIN = join(REPO, 'packages', 'skill-memo-ilife', 'dist', 'cli', 'cmd_read.js');
const OUT = join(HERE, 't855-产物基线.json');
const WRITE = process.argv.includes('--write');

/** 逐条用例：`db` 是种子配方，`args` 是唯一出口的 argv。 */
const CASES = [
  { name: '记一条（备忘）', db: 'two', args: ['memo.create', '--params', '{"title":"买牛奶","body":"买牛奶","category":"备忘"}'] },
  { name: '搜备忘', db: 'two', args: ['memo.search', '--params', '{"q":"牛奶"}'] },
  { name: '看备忘（单条）', db: 'two', args: ['memo.detail', '--params', '{"id":1}'] },
  { name: '改备忘', db: 'two', args: ['memo.update', '--params', '{"id":1,"body":"买牛奶两盒"}'] },
  { name: '批量改分类（收集向导）', db: 'two', args: ['memo.batch', '--params', '{"fromCategory":"备忘"}'] },
  { name: '统计', db: 'two', args: ['memo.stats'] },
  { name: '看提醒', db: 'reminder', args: ['memo.remind'] },
  { name: '设提醒（挂旧笔记）', db: 'two', args: ['memo.reminder', '--params', '{"note_id":1,"content":"取牛奶","remind_at":"2026-10-01 09:00","repeat_type":"一次性"}'] },
  { name: '查心愿', db: 'wish', args: ['memo.wish'] },
  { name: '删备忘（真删）', db: 'two', args: ['memo.remove', '--params', '{"id":2,"confirm":true}'] },
  { name: '按时间搜备忘', db: 'two', args: ['memo.search', '--params', '{"start":"2026-01-01","end":"2026-12-31"}'] },
  { name: '首次使用（初始化渲染）', db: 'none', args: ['memo.init', '--params', '{"data":{"items":[{"name":"数据目录","status":"ok","desc":"在"}],"todos":[{"title":"先建库","steps":["跑老技能初始化"]}],"verify":["打开设置页看体检"]}}'] },
  { name: '备忘录 HELP（全量文件）', db: 'none', args: ['memo.help.lookup'] },
  { name: 'HELP 速查表', db: 'none', args: ['memo.help.lookup', '--params', '{"mode":"lookup"}'] },
];

function seed(dir, recipe) {
  if (recipe === 'none') return;
  if (recipe !== 'two' && recipe !== 'wish' && recipe !== 'reminder') throw new Error('未知种子配方：' + recipe);
  const wish = recipe === 'wish';
  const first = seedNote(dir, { content: wish ? '买牛奶' : '买牛奶', category: wish ? '心愿' : '备忘', due: wish ? '2026-10-05' : null });
  seedNote(dir, { content: wish ? '去海边' : '交电费', category: wish ? '心愿' : '备忘', due: wish ? '2026-11-01' : null });
  // 定死时间戳：种子行的时间默认取 `datetime('now')`，不定死则回执与页面每跑都变（假红）。
  const db = new DatabaseSync(join(dir, 'memo.db'));
  try {
    db.prepare('UPDATE notes SET created_at = ?, updated_at = ?').run('2026-09-01 10:00:00', '2026-09-01 10:00:00');
  } finally {
    db.close();
  }
  if (recipe === 'reminder') seedReminder(dir, { noteId: first, at: '2026-10-01 09:00', type: '一次性', content: '取牛奶' });
}

const norm = (text, root) => String(text)
  .split(root).join('〈临时根〉')
  .replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/g, '〈时间〉')
  .replace(/\d{8}_\d{6}(?:_\d+)?/g, '〈时间戳〉');

function runCase(c) {
  const dir = mkMemoDb('memo855-base-');
  const home = mkMemoConfig({ db: { dir } }, 'memo855-home-');
  seed(dir, c.db);
  const r = spawnSync(process.execPath, [BIN, ...c.args], { cwd: REPO, encoding: 'utf8', env: noLarkPathEnv(home) });
  let env = null;
  try { env = JSON.parse(r.stdout); } catch { env = null; }
  const landing = env?.delivery?.path ? norm(env.delivery.path, dir) : null;
  const rel = env?.delivery?.path && existsSync(env.delivery.path) ? env.delivery.path : null;
  const html = rel ? readFileSync(rel, 'utf8') : '';
  const dir2 = join(dir, 'memo_html');
  const files = existsSync(dir2) ? readdirSync(dir2).sort().map((f) => norm(f, dir)) : [];
  rmSync(dir, { recursive: true, force: true });
  rmSync(home, { recursive: true, force: true });
  return {
    name: c.name,
    exit: typeof r.status === 'number' ? r.status : -1,
    key: env?.key ?? null,
    shape: env?.shape ?? null,
    landing,
    bytes: html.length,
    sha256: html.length ? createHash('sha256').update(norm(html, dir)).digest('hex') : null,
    products: files,
  };
}

if (!existsSync(BIN)) {
  console.error('缺 ' + BIN + '：先 `node node_modules/typescript/bin/tsc -b packages/skill-memo-ilife` 再跑本件');
  process.exit(2);
}
const started = Date.now();
const got = CASES.map(runCase);
if (WRITE) {
  writeFileSync(OUT, JSON.stringify({ ticket: '#855', madeAt: new Date().toISOString(), cases: got }, null, 2) + '\n', 'utf8');
  console.log('BASELINE-WROTE ' + OUT + '（' + got.length + ' 条，' + (Date.now() - started) + ' ms）');
  process.exit(0);
}
if (!existsSync(OUT)) {
  console.error('没有基线：先跑 `--write`');
  process.exit(2);
}
const base = JSON.parse(readFileSync(OUT, 'utf8'));
const byName = new Map(base.cases.map((c) => [c.name, c]));
let bad = 0;
for (const c of got) {
  const want = byName.get(c.name);
  const diff = [];
  if (!want) diff.push('基线里没有这条');
  else {
    if (want.exit !== c.exit) diff.push('退出码 ' + want.exit + '→' + c.exit);
    if (want.landing !== c.landing) diff.push('落点 ' + JSON.stringify(want.landing) + '→' + JSON.stringify(c.landing));
    if (want.sha256 !== c.sha256) diff.push('正文 sha256 ' + String(want.sha256).slice(0, 12) + '→' + String(c.sha256).slice(0, 12));
  }
  if (diff.length) bad += 1;
  console.log((diff.length ? 'DIFF ' : 'ok   ') + c.name + '（exit=' + c.exit + ' key=' + String(c.key) + ' 正文=' + c.bytes + 'B）' + (diff.length ? '：' + diff.join('；') : ''));
}
console.log('RESULT: ' + (got.length - bad) + '/' + got.length + '（' + (Date.now() - started) + ' ms）');
process.exit(bad === 0 ? 0 : 1);
