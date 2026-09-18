/** #630 · 终审D2「看今日营养」题名与唤醒词对齐的靶向探针（真出口 ＋ 路由真值参数）。
 *
 * **本探针守什么**（每条对应票面一条判据）：
 *  ① **同源入口分支**：「看今日营养」与「看饮食复盘」同命令同参数（`{"window":"今日"}`），前者那条
 *     路由记录带 `entry:"today-nutrition"`（`src/diet/routes.ts` order 44，沿 #511 的标记做法）⇒
 *     带标记那一支出「今日营养」页头（H1／眉标／副题），不带标记的 7 条词仍是「饮食复盘」页头，一字不差。
 *  ② **体不动**：两支除页头三件外正文区块相同（读数卡／趋势／TOP5／按餐汇总／营养配比都在位）。
 *  ③ **`entry` 标记的三条硬要求**（照 #509 裁定 4 的三条）：未知参数不报错；标记名绝不上屏；
 *     复制日志里的**命令原文**必须带全它（照抄可重跑）；未知取值回落默认那一支。
 *  ④ **路由链**：生成物 `src/triggers/routes.generated.ts` 里 order 44 记录与声明件逐字一致
 *     （`pnpm gen:check` 守同步）——从那里取命令原文照抄跑一遍，页头必须落在「今日营养」那一支。
 *  ⑤ **变异自证**：把新标题改回旧写法，同一段断言必红；原样必绿。
 *
 * 跑法：`node --test packages/skill-calorie/test/t630-今日营养题名.test.mjs`（先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`）。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

import { stripCopyPayload, visibleText } from './visible-text-probe.mjs';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

const D = SEED_TODAY;
const KEY = 'calorie.view.diet-review';
const TOKEN = 'entry';
const VALUE = 'today-nutrition';
const BASE = { window: '今日' };

function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 't630-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  seedFull(db);
  db.close();
  return dir;
}

function render(dir, key, params) {
  const out = join(dir, key.replace(/\./g, '_') + '-' + Math.random().toString(36).slice(2, 7) + '.html');
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params), '--html', out], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ILIFE_CONFIG_DIR: calorieConfigDir(dir), ...freezeClock(D) },
  });
  return { status: r.status, stderr: String(r.stderr), html: r.status === 0 ? readFileSync(out, 'utf8') : '' };
}

function renderOk(dir, key, params, what) {
  const r = render(dir, key, params);
  assert.equal(r.status, 0, what + ' 真出口 exit=' + r.status + ' stderr=' + r.stderr.slice(-300));
  return r.html;
}

/** 页头 H1：从 `<h1 class="ilife-block-page-shell-title">` 取 innerText（沿 #511 的取法）。 */
const h1Of = (html) => {
  const m = /<h1[^>]*class="[^"]*ilife-block-page-shell-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/.exec(html);
  if (m === null) return '';
  return m[1].replace(/<[^>]*>/g, '').trim();
};

/** 眉标行左（meta-bar）：B线新路的第 1 行左格。 */
const metaLeftOf = (html) => {
  const m = /<div class="meta-bar"><div class="left">([\s\S]*?)<\/div>/.exec(html);
  if (m === null) return '';
  return m[1].replace(/<[^>]*>/g, '').trim();
};

/** 副题（结论句行）：B线新路的 `.sub` 段。 */
const subOf = (html) => {
  const m = /<p class="sub">([\s\S]*?)<\/p>/.exec(html);
  if (m === null) return '';
  return m[1].replace(/<[^>]*>/g, '').trim();
};

/** 日志里「调用链」（第 4 段）的下一行＝本次命令原文（沿 t273 的取法）。 */
function callChainOf(html) {
  const i = html.indexOf('data-action-id="ilife-copy-log"');
  assert.ok(i > 0, '页面上找不到「复制日志」按钮');
  const start = html.lastIndexOf('<button', i);
  const btn = html.slice(start, html.indexOf('>', i) + 1);
  const m = /data-t="([\s\S]*?)"/.exec(btn);
  assert.ok(m, '复制日志按钮上读不到日志文本（按钮没接日志＝死按钮）');
  const log = m[1].replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const segs = log.split('\n');
  return segs[segs.findIndex((s) => s.trim() === '调用链') + 1];
}

const DIR = freshDb();
const DEFAULT_HTML = renderOk(DIR, KEY, BASE, '默认入口（看饮食复盘那一支）');
const TODAY_HTML = renderOk(DIR, KEY, { ...BASE, [TOKEN]: VALUE }, '带标记入口（看今日营养那一支）');
const DEFAULT_TEXT = visibleText(stripCopyPayload(DEFAULT_HTML));
const TODAY_TEXT = visibleText(stripCopyPayload(TODAY_HTML));

test('#630 ① 默认入口仍是「饮食复盘」页头（一字不差）', () => {
  console.log('READING #630 默认入口 H1「' + h1Of(DEFAULT_HTML) + '」／眉标「' + metaLeftOf(DEFAULT_HTML) + '」');
  assert.equal(h1Of(DEFAULT_HTML), '📝 饮食复盘', '默认入口 H1 变了：' + h1Of(DEFAULT_HTML));
  assert.equal(metaLeftOf(DEFAULT_HTML), '饮食复盘饮食', '默认入口眉标变了：' + metaLeftOf(DEFAULT_HTML));
  assert.equal(subOf(DEFAULT_HTML).includes('今日营养'), false, '默认入口副题混入了「今日营养」：' + subOf(DEFAULT_HTML));
});

test('#630 ① 带标记入口出「今日营养」页头（H1／眉标／副题）', () => {
  console.log('READING #630 带标记入口 H1「' + h1Of(TODAY_HTML) + '」／眉标「' + metaLeftOf(TODAY_HTML) + '」');
  assert.equal(h1Of(TODAY_HTML), '📝 今日营养', '带标记入口 H1 不是今日营养：' + h1Of(TODAY_HTML));
  assert.equal(metaLeftOf(TODAY_HTML), '看今日营养（饮食）', '带标记入口眉标不是看今日营养：' + metaLeftOf(TODAY_HTML));
  assert.ok(subOf(TODAY_HTML).includes('今日营养'), '带标记入口副题看不出「今日营养」：' + subOf(TODAY_HTML));
  assert.ok(subOf(TODAY_HTML).includes('卡'), '带标记入口副题丢了本页读数（裁定 2）：' + subOf(TODAY_HTML));
  assert.notEqual(h1Of(TODAY_HTML), h1Of(DEFAULT_HTML), '两个入口出了同一个 H1');
});

test('#630 ② 两支除页头三件外正文区块相同（体不动）', () => {
  for (const needle of ['总热量', '每日热量趋势', '高频食物 TOP5', '按餐汇总', '营养配比', '复制数据']) {
    assert.ok(TODAY_TEXT.includes(needle), '今日营养那一支缺正文区块「' + needle + '」');
    assert.ok(DEFAULT_TEXT.includes(needle), '默认那一支缺正文区块「' + needle + '」');
  }
  /* 徽章／来源脚注两支一致（只换页头三件，别处不动）。 */
  assert.ok(TODAY_TEXT.includes('复盘餐别'), '今日营养那一支徽章变了');
  assert.ok(TODAY_TEXT.includes('📊 数据来源'), '今日营养那一支来源脚注丢了');
});

test('#630 ③ entry 标记的三条硬要求：不报错、不上屏、命令原文带全', () => {
  for (const [name, text] of [['默认', DEFAULT_TEXT], ['今日营养', TODAY_TEXT]]) {
    assert.equal(text.includes(TOKEN), false, name + '支可见文本里出现了标记名「' + TOKEN + '」（它只该落在复制载荷里）');
    assert.equal(text.includes(VALUE), false, name + '支可见文本里出现了标记值「' + VALUE + '」');
  }
  const call = callChainOf(TODAY_HTML);
  assert.ok(call.includes('"' + TOKEN + '":"' + VALUE + '"'), '今日营养那一支的命令原文没带全标记（照抄跑不出同一页）：' + call);
  /* 未知参数不报错：另给一个命令不认识的参数，仍须 exit 0。 */
  const dir = freshDb();
  const r = render(dir, KEY, { ...BASE, 未知参数: '随便' });
  assert.equal(r.status, 0, '命令收到未知参数报错了（应能忽略）：exit=' + r.status + ' ' + r.stderr.slice(-200));
  /* 未知取值也不报错：标记只认登记的那一个，别的取值回落默认那一支。 */
  const other = render(dir, KEY, { ...BASE, [TOKEN]: '不认识' });
  assert.equal(other.status, 0, '标记取了不认识的值得报错：exit=' + other.status + ' ' + other.stderr.slice(-200));
  assert.equal(h1Of(other.html), '📝 饮食复盘', '标记取不认识的值得回落默认那一支');
});

test('#630 ④ 路由链：order 44 记录带标记，照抄跑出今日营养页头', () => {
  /* 路由声明在 `src/triggers/routes.generated.ts`（生成物，`pnpm gen:check` 守同步）——从那里取
     命令原文、照抄跑一遍，页头必须正好落在带标记那一支（这一条同时证了「入口 → 页头」这条链真的通）。 */
  const GEN = readFileSync(join(ROOT, 'packages', 'skill-calorie', 'src', 'triggers', 'routes.generated.ts'), 'utf8');
  const line = GEN.split('\n').find((l) => l.includes("wakeWord: '看今日营养'"));
  assert.ok(line, 'routes.generated.ts 里找不到唤醒词「看今日营养」的记录');
  /* 生成物里这条 cli 写成单引号串（里面的 params 用 `\'` 转义）⇒ 取到最后一个单引号、再把转义还原。 */
  const cli = line.slice(line.indexOf("cli: '") + 6, line.lastIndexOf("'")).replace(/\\'/g, "'");
  assert.ok(cli.includes(KEY), '看今日营养的命令原文没指向 ' + KEY + '：' + cli);
  assert.ok(cli.includes('"' + TOKEN + '":"' + VALUE + '"'),
    '看今日营养的命令原文没带全标记（照抄跑不出同一页）：' + cli);
  const m = /^calorie-cmd-read (\S+)(?: --params '(\{.*\})')?$/.exec(cli);
  assert.ok(m, '看今日营养的命令原文不是可照抄的形状：' + cli);
  const dir = freshDb();
  const html = renderOk(dir, m[1], m[2] ? JSON.parse(m[2]) : {}, '看今日营养照抄');
  assert.ok(h1Of(html).includes('今日营养'), '照抄命令原文跑出来的页头不是今日营养：' + h1Of(html));
  /* 声明件同查：手改只许动 `src/diet/routes.ts` 的 order 44 那一行。 */
  const DECL = readFileSync(join(ROOT, 'packages', 'skill-calorie', 'src', 'diet', 'routes.ts'), 'utf8');
  const decl = DECL.split('\n').find((l) => l.includes("wakeWord: '看今日营养'"));
  assert.ok(decl && decl.includes('"' + TOKEN + '":"' + VALUE + '"'), '声明件 order 44 没带标记');
});

test('#630 ⑤ 变异自证：新标题改回旧写法，同一段断言必红', () => {
  assert.equal(h1Of(TODAY_HTML).includes('今日营养'), true, '原样产物该读到今日营养标题');
  const badTitle = h1Of(TODAY_HTML.replace(/📝 今日营养/g, '📝 饮食复盘'));
  assert.equal(badTitle.includes('今日营养'), false, '把标题改回旧写法之后读数没变——① 的断言是永真的');
  const badMeta = metaLeftOf(TODAY_HTML.replace(/看今日营养（饮食）/g, '饮食复盘饮食'));
  assert.equal(badMeta.includes('今日营养'), false, '把眉标改回旧写法之后读数没变——① 的断言是永真的');
});
