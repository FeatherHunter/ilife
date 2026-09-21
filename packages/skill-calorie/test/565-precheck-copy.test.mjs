/** #565 · 场景 06 目标预检页（`calorie.view.goal-wizard`）：一个复制区、三颗按钮、三条通道一条不少。
 *
 * 负责人 2026-09-15 肉眼验收报的缺陷：预检页上部「复制指令」那一排里已经有一颗「复制日志」
 * （公共层 #336 兜底补的**禁用态**占位），页底复制区又出一颗真日志 ⇒ 11 件产物各「复制日志」2 次、
 * copy-btn 4 个（同墙其余 22 件是 1 次／2 个）。
 * 前席（b5fc9f9）把页底的数据位连同「复制数据」这条通道一起撤了（只留日志）——同名按钮没了，
 * 但一条复制能力也消失了。本席按编排者 2026-09-16 的裁定**回旧例**（仓内旧例：
 * `packages/skill-calorie/src/profile/setup.ts` 的档案预检页，#239／#238 裁定）：一个复制区出
 * 「复制指令／复制数据／复制日志」三颗按钮，每个名字恰一颗、三条通道一条不少。
 *
 * 五组判据（每条都能真红）：
 *   ① 11 条带空位写词逐条真跑 exit 0 ＋ 完整文档四断言（doctype／charset／style／ilife-page）；
 *   ② 三颗按钮：copy-btn 恰 3 个、标签恰是三个名字各 1 颗、三颗的 actionId／菜单标记各恰 1 处、
 *      无禁用态复制钮（「一页两个同名按钮」这条缺陷钉在这里）；
 *   ③ 三份载荷各司其职：指令＝prompt 原文（逐字）、数据＝三格式（纯文本／JSON／CSV）都非空、
 *      日志＝六段技术原件，三份互不相同；
 *   ④ 日志载荷没被删错：六段段名齐 ＋ 命令原文（含 `--params`）在，照抄可重跑；
 *   ⑤ 页内三块、页头文案与 prompt 原文一字不改，整页可见文本里三个名字的读数如实（口径见下）。
 *
 * **名字怎么数（同一页两套口径，判据落第一套）**：
 *   · **按钮口径**（本票「不许两个同名、也不许缺一条」的判据）＝三颗 copy-btn 的可见标签，各 1；
 *   · **整页可见文本口径**＝剥掉复制载荷后的上屏文字。这一档里 `复制指令` 恒为 **2**：一颗按钮，
 *     外加「写入词」卡片那句「填好表再复制指令」——那句属**页内三块**（本票一字不改；仓内旧例
 *     档案预检页同样带这一句，实测同是 2）。`复制数据`／`复制日志` 整页各 1 次（只有复制区在用）。
 *
 * 配方照抄 `test/goal-wizard-251.test.mjs` 的临时库＋真 CLI 那一套（mkdtemp ＋ SKILLS_DB_PATH ＋
 * `docs/research/t81-seed.mjs` 的 `seedFull()` ＋ `CALORIE_TODAY=SEED_TODAY`），不碰真库。
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`（经持锁包装器），
 *       再 `node --test packages/skill-calorie/test/565-precheck-copy.test.mjs`。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

import { stripCopyPayload, visibleText } from './visible-text-probe.mjs';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PKG = join(ROOT, 'packages', 'skill-calorie');
const CLI = join(PKG, 'dist', 'cli', 'cmd_read.js');
const KEY = 'calorie.view.goal-wizard';
/** 复制区三个名字（一个名字恰一颗按钮）。 */
const COPY_NAMES = ['复制指令', '复制数据', '复制日志'];

const { openDb, DB_FILENAME } = await import(pathToFileURL(join(PKG, 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);
const { SCENE_06_GOAL } = await import(pathToFileURL(join(PKG, 'dist', 'triggers', 'scene-06-goal.js')).href);

/** 11 条「带空位」写词（逐字取 `docs/skills/skill-calorie/scene06-验收墙/produce.mjs:36-48` 的那一串）。 */
const PRECHECK_WORDS = [
  '定营养目标',
  '定营养目标(自动算)',
  '定体重目标',
  '定体重目标(自动算截止)',
  '定体重目标(含起始日)',
  '定饮水目标',
  '定饮水目标(自动算)',
  '一键定全套目标',
  '改营养目标',
  '改体重目标',
  '改饮水目标',
];

/** 一条写词一份临时种子库（`t81-seed.mjs` 的 `seedFull()`，不碰真库）。 */
function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 't565-goal-'));
  const db = openDb(join(dir, DB_FILENAME));
  seedFull(db);
  db.close();
  return dir;
}

/** 真 CLI 跑一条预检页（与验收墙 `produce.mjs:156` 同一条命令串、同一套环境变量）。 */
function runWake(wake) {
  const dir = freshDb();
  const out = join(dir, 'out.html');
  const r = spawnSync(process.execPath,
    [CLI, KEY, '--params', JSON.stringify({ wake }), '--html', out],
    {
      encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, ...homeEnvOf(calorieConfigDir(dir)), ...freezeClock(SEED_TODAY) },
    });
  const html = existsSync(out) ? readFileSync(out, 'utf8') : null;
  return { wake, exit: r.status, stderr: String(r.stderr || '').trim().slice(-300), html };
}

/** 11 件实跑产物（模块级跑一次，五组判据共用这一批）。 */
const RUNS = PRECHECK_WORDS.map(runWake);

/** copy-btn 元素个数：口径与负责人那条探针（`.scratch/t153-视觉缺陷/probe.mjs:20`）逐字相同。 */
function copyBtnCount(html) {
  return (html.match(/class="[^"]*copy-btn[^"]*"/g) || []).length;
}

/** 三颗复制按钮的**可见标签**（文档顺序）——名字计数的判据口径（见件头「名字怎么数」）。 */
function copyBtnLabels(html) {
  return [...String(html).matchAll(/<button type="button" class="[^"]*copy-btn[^"]*"[^>]*>([^<]*)<\/button>/g)]
    .map((m) => m[1]);
}

/** 某个名字在**整页可见文本**里的次数（剥掉复制载荷后数；仅供如实读数，判据用按钮口径）。 */
function visibleNameCount(html, name) {
  return (visibleText(stripCopyPayload(html)).match(new RegExp(name, 'g')) || []).length;
}

/** 某一颗按钮的 `data-t` 载荷（按 `data-action-id` 取；取不到返回 `null`）。 */
function payloadOf(html, actionId) {
  const m = new RegExp('data-action-id="' + actionId + '"[^>]*data-t="([^"]*)"').exec(html);
  return m === null ? null : m[1];
}

/** 数据位三格式里某一项的 `data-t` 载荷（按菜单项的 `data-fmt` 取；取不到返回 `null`）。 */
function fmtPayloadOf(html, fmt) {
  const m = new RegExp('data-fmt="' + fmt + '"[^>]*data-t="([^"]*)"').exec(html);
  return m === null ? null : m[1];
}

/** 属性值还原成原始文本（`&quot;` ／ `&amp;` ／ `&lt;` ／ `&gt;` ／ `&#39;` 五种，同冻结转义表）。 */
function decodeAttr(value) {
  return String(value)
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/** 该条词在触发词表里的逐字 prompt（唯一出处 `src/triggers/scene-06-goal.ts`）。 */
function frozenPrompt(wake) {
  const hit = SCENE_06_GOAL.find((t) => t.wake_word === wake);
  assert.ok(hit !== undefined, '触发词表里应有「' + wake + '」');
  return hit.prompt_template;
}

/** 完整文档四断言（口径同 `test/goal-wizard-251.test.mjs:56-64` 的前四条）。 */
function assertDocPage(html, what) {
  assert.ok(html !== null, what + ' 未落盘');
  assert.ok(html.startsWith('<!doctype html>'), what + ' 缺 doctype');
  assert.ok(html.includes('charset="utf-8"'), what + ' 缺 charset');
  assert.ok(html.includes('<style'), what + ' 缺 <style');
  assert.ok(html.includes('ilife-page'), what + ' 缺 ilife-page');
}

/* ── ① 11 条写词逐条真跑：exit 0 ＋ 完整文档 ── */

test('#565 ① 11 条带空位写词逐条真跑：exit 0 ＋ 产物仍是完整文档', () => {
  assert.equal(RUNS.length, 11, '带空位写词应 11 条（判据不许空跑）：实测 ' + RUNS.length);
  for (const r of RUNS) {
    assert.equal(r.exit, 0, '「' + r.wake + '」`' + KEY + '` 应 exit 0，实测 exit=' + r.exit + ' ' + r.stderr);
    assertDocPage(r.html, '「' + r.wake + '」预检页');
  }
});

/* ── ② 三颗按钮、三个名字各一颗：copy-btn 恰 3、无同名、无缺条、无禁用态占位 ── */

test('#565 ② 11 件产物各：三颗复制钮、三个名字各 1 次、无禁用态占位', () => {
  for (const r of RUNS) {
    const what = '「' + r.wake + '」预检页';
    const labels = copyBtnLabels(r.html);
    assert.equal(copyBtnCount(r.html), 3,
      what + ' copy-btn 应恰 3 个（指令／数据／日志各一颗），实测 ' + copyBtnCount(r.html) + ' 个');
    assert.equal(labels.length, 3, what + ' 已闭合的复制钮应恰 3 颗，实测 ' + JSON.stringify(labels));
    for (const name of COPY_NAMES) {
      assert.equal(labels.filter((l) => l === name).length, 1,
        what + ' 「' + name + '」按钮应恰 1 颗（既不许两个同名、也不许缺这条通道），实测 '
        + labels.filter((l) => l === name).length + ' 颗；三颗标签：' + JSON.stringify(labels));
    }
    assert.equal((r.html.match(/data-action-id="ilife-help-copy-prompt"/g) || []).length, 1,
      what + ' 「复制指令」的 actionId 应恰 1 处（多出来的那颗就是 #336 兜底占位）');
    assert.equal((r.html.match(/data-action-id="ilife-copy-log"/g) || []).length, 1,
      what + ' `data-action-id="ilife-copy-log"` 应恰 1 处（多出来的那颗就是 #336 兜底占位）');
    assert.equal((r.html.match(/data-fmt-open="1"/g) || []).length, 1,
      what + ' 「复制数据」的菜单开合器应恰 1 处');
    assert.equal(/class="[^"]*copy-btn[^"]*"[^>]*disabled/.test(r.html), false,
      what + ' 还有禁用态的复制钮（公共层 #336 兜底那颗占位没撤掉）');
  }
});

/* ── ③ 三份载荷各司其职：指令＝prompt 原文、数据＝三格式、日志＝六段，三份都非空且互不相同 ── */

test('#565 ③ 三份复制载荷都非空，且各是各的（指令／数据／日志）', () => {
  for (const r of RUNS) {
    const what = '「' + r.wake + '」预检页';
    const prompt = decodeAttr(payloadOf(r.html, 'ilife-help-copy-prompt') ?? '');
    const log = decodeAttr(payloadOf(r.html, 'ilife-copy-log') ?? '');
    const dataText = decodeAttr(fmtPayloadOf(r.html, 'text') ?? '');
    const dataJson = decodeAttr(fmtPayloadOf(r.html, 'json') ?? '');
    const dataCsv = decodeAttr(fmtPayloadOf(r.html, 'csv') ?? '');

    // 三份载荷都非空
    assert.ok(prompt.trim() !== '', what + ' 复制指令载荷空了');
    assert.ok(log.trim() !== '', what + ' 复制日志载荷空了（别把载荷删了）');
    assert.ok(dataText.trim() !== '', what + ' 复制数据的纯文本载荷空了');
    assert.ok(dataJson.trim() !== '', what + ' 复制数据的 JSON 载荷空了');
    assert.ok(dataCsv.trim() !== '', what + ' 复制数据的 CSV 载荷空了');

    // 指令＝这一条词的 prompt 原文（逐字）
    assert.equal(prompt, frozenPrompt(r.wake),
      what + ' 复制指令载荷与触发词表里的 prompt 原文不逐字相同');
    assert.ok(prompt.includes('执行唤醒词「' + r.wake + '」'),
      what + ' 复制指令载荷不是这一条词的 prompt 原文：' + prompt.slice(0, 120));

    // 数据＝本页那几张表的机器可读投影（三格式各自成形）
    assert.ok(dataText.includes('【calorie · 目标预检】'), what + ' 纯文本载荷缺页名：' + dataText.slice(0, 120));
    const parsed = JSON.parse(dataJson);
    assert.equal(parsed.key, KEY, what + ' JSON 载荷缺本页命令键：' + dataJson.slice(0, 120));
    assert.equal(parsed.skill, 'calorie', what + ' JSON 载荷的 skill 不对：' + dataJson.slice(0, 120));
    assert.ok(dataCsv.startsWith('section,row'), what + ' CSV 载荷缺表头：' + dataCsv.slice(0, 120));

    // 日志＝六段技术原件
    assert.ok(log.includes('场景标识') && log.includes('调用链'),
      what + ' 复制日志载荷不是六段日志：' + log.slice(0, 120));

    // 三份互不相同（别拿一份顶三颗按钮）
    assert.notEqual(prompt, log, what + ' 指令与日志两份载荷不该是同一份');
    assert.notEqual(dataText, log, what + ' 数据与日志两份载荷不该是同一份');
    assert.notEqual(dataText, prompt, what + ' 数据与指令两份载荷不该是同一份');
    assert.equal(new Set([dataText, dataJson, dataCsv]).size, 3, what + ' 三格式载荷应互不相同');
  }
});

/* ── ④ 日志载荷没被删错：六段齐 ＋ 命令原文在，照抄可重跑 ── */

test('#565 ④ 复制日志六段齐、命令原文（含本次参数）在，照抄可重跑', () => {
  for (const r of RUNS) {
    const what = '「' + r.wake + '」预检页';
    const log = decodeAttr(payloadOf(r.html, 'ilife-copy-log') ?? '');
    for (const seg of ['场景标识', 'AI 思考链', '数据结构', '调用链', '时间戳版本', '异常']) {
      assert.ok(log.includes(seg), what + ' 日志第几段缺段名 `' + seg + '`：' + log.slice(0, 200));
    }
    assert.ok(log.includes(KEY), what + ' 日志缺本页命令键（不许改命令键名）');
    assert.ok(log.includes('--params'), what + ' 日志第 4 段缺本次参数（照抄重跑会跑成另一条词）');
    assert.match(log, /calorie_data\.db/, what + ' 日志第 3 段缺库文件名');
    assert.match(log, /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} · 版本 0\.1\.0/, what + ' 日志第 5 段缺时间戳或版本');
  }
});

/* ── ⑤ 内容一字不改：页内三块、库内现值表、prompt 原文都在；整页名字读数如实 ── */

test('#565 ⑤ 页内三块与 prompt 原文一字不改，名字读数如实', () => {
  for (const r of RUNS) {
    const what = '「' + r.wake + '」预检页';
    for (const needle of [
      '库内现值（改前基准）', '改前基准：本页只摆现值，不替 AI 算最终对比',
      '营养 5 项（要填的项）', '体重目标（目标／起始日／截止日／速率校验）',
      '这一页只做预检、不写目标；确认下面的值无误后，把指令复制给 AI 执行',
    ]) {
      assert.ok(r.html.includes(needle), what + ' 页内内容丢了：`' + needle + '`');
    }
    // prompt 原文：页上那段预览（`<pre>`）与「复制指令」那颗的载荷，都逐字等于触发词表里的原文。
    const tpl = frozenPrompt(r.wake);
    const pre = /<pre[^>]*>([\s\S]*?)<\/pre>/.exec(r.html);
    assert.ok(pre !== null, what + ' prompt 预览块没了');
    assert.equal(decodeAttr(pre[1]), tpl, what + ' prompt 预览块与原文不逐字相同（原文一字不改）');
    assert.equal(decodeAttr(payloadOf(r.html, 'ilife-help-copy-prompt')), tpl,
      what + ' 「复制指令」载荷与原文不逐字相同（原文一字不改）');

    // 整页读数（口径见件头）：数据／日志两个名字只有复制区在用；`复制指令` 那一份多出来的是
    // 「写入词」卡片那句页内文案（一字不改，旧例同样带这句）。
    assert.equal(visibleNameCount(r.html, '复制数据'), 1,
      what + ' 整页「复制数据」应恰 1 次（只有复制区在用这个名字），实测 ' + visibleNameCount(r.html, '复制数据'));
    assert.equal(visibleNameCount(r.html, '复制日志'), 1,
      what + ' 整页「复制日志」应恰 1 次（两条同名通道没并成一条），实测 ' + visibleNameCount(r.html, '复制日志'));
    assert.equal(visibleNameCount(r.html, '填好表再复制指令'), 1,
      what + ' 「写入词」卡片那句页内文案丢了或变了（本票一字不改）');
    assert.equal(visibleNameCount(r.html, '复制指令'), 2,
      what + ' 整页「复制指令」应 1 颗按钮 ＋ 卡片那句 = 2 次，实测 ' + visibleNameCount(r.html, '复制指令'));
  }
});
