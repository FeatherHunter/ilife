/** #655 · 两张过程型页（09-06 记身材照预检确认页／09-07 生成身材照GIF 规划器）的**形状钉**：
 *  「值先是只读一行，点开哪一行才出哪一行的输入」这件改法，在盘上真的成立。
 *
 * 为什么要另立一件：这两页原来的门（`wizard-86.test.mjs`）钉的是「哪些字在不在」，钉不住**形状**——
 * 把值塞回输入框、把提示句加粗回标题、把常用标签搬回首屏，那些断言一条都不会红。本件补的就是这类
 * 判据（负向也判：旧形状 0 命中），使 #655 的改法不会被后续改动静默回退。
 *
 * 判据（逐条对票面的缺陷清单）：
 *  ① 值先只读一行、输入在展开体里：每项一个 `<details class="phu-edit">`，`<summary>` 里是
 *     「行名 ＋ 当刻值」，`name="…"` 出现在**该行 summary 之后**（缺陷 2／8）。
 *  ② 提示句不再当标题使：那句恰 1 次、住 `<p class="phu-alert">` 里、页上不再有 `<strong>`（缺陷 3）。
 *  ③ 三档层级各有各的类：块标题 `phu-sec`（15/600）、行名 `phu-edit-k`（12/600）、
 *     值 `phu-edit-v`（14/400）——三条字号/字重由页内样式表钉住（缺陷 4）。
 *  ④ 常用标签下移到值清单之后、复制区之前，8 个词仍逐字可见（缺陷 7；判据不松：位置 + 可见都要）。
 *  ⑤ 不削功能：预检页三个填写位 ＋ 给 AI 的指令块仍在；规划器九项参数位 ＋ 两个下拉的当刻值
 *     仍落 `selected`、KPI 四格仍在。
 *  ⑥ 变异自证：把输入框挪回 summary 之前（退回「空表单」形态）必红，改回必绿。
 *
 * 隔离：每用例新鲜临时库＋新鲜照片目录（`SKILLS_DB_PATH`／`CALORIE_PHOTOS_DIR` 指向 tmp），
 * 真实库零触碰；`CALORIE_TODAY` 钉 2026-09-06（相对时间文案不参与判据，钉死只为可复跑）。
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/photo-wizard-shape-655.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { addPhotos } from '../dist/photo/photos.js';

const BIN = join(import.meta.dirname, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const TODAY = '2026-09-06';
/** #527 起定死的那句「改了不会自动生效」告知句（票面点名要留的原话，本件只判它的**形状与位置**）。 */
const NOTICE = '这些是 AI 已经用的值。改了不会自动生效——要改就直接跟 AI 说一句。';

const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const TINY_PNG_2_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function seedIso() {
  const root = mkdtempSync(join(tmpdir(), 't655-'));
  const dbDir = join(root, 'db');
  const photosDir = join(root, 'photos');
  const srcDir = join(root, 'src');
  mkdirSync(dbDir, { recursive: true });
  mkdirSync(photosDir, { recursive: true });
  mkdirSync(srcDir, { recursive: true });
  const a = join(srcDir, 'a.png');
  const b = join(srcDir, 'b.png');
  writeFileSync(a, Buffer.from(TINY_PNG_B64, 'base64'));
  writeFileSync(b, Buffer.from(TINY_PNG_2_B64, 'base64'));
  const db = openDb(join(dbDir, 'calorie_data.db'));
  try {
    addPhotos(db, photosDir, { srcPaths: [a], tag: '正面', today: '2026-09-04', nowTime: '08:00:00' });
    addPhotos(db, photosDir, { srcPaths: [b], tag: '正面', today: '2026-09-05', nowTime: '08:00:00' });
  } finally {
    db.close();
  }
  return { root, dbDir, photosDir };
}

function runPage(iso, key, params) {
  const r = spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params)], {
    encoding: 'utf8',
    env: { ...process.env, SKILLS_DB_PATH: iso.dbDir, CALORIE_PHOTOS_DIR: iso.photosDir, CALORIE_TODAY: TODAY },
  });
  assert.equal(r.status, 0, key + ' exit 非 0：' + String(r.stderr ?? '').slice(0, 500));
  const env = JSON.parse(String(r.stdout).trim());
  const out = env?.data?.output;
  assert.equal(typeof out, 'string', key + ' 缺 data.output');
  assert.ok(isAbsolute(out) && existsSync(out), key + ' 的 data.output 不在盘上：' + out);
  return readFileSync(out, 'utf8');
}

/** 确认清单的三行／九行：每项一个 `<details class="phu-edit">`。 */
function editRowCount(html) {
  return (html.match(/<details class="phu-edit">/g) ?? []).length;
}

/** 取一行：`<details class="phu-edit">…</details>`，按 `<summary>` 里的行名认。 */
function rowOf(html, name) {
  const rows = html.match(/<details class="phu-edit">[\s\S]*?<\/details>/g) ?? [];
  return rows.filter((r) => r.includes('>' + name + '</span>'));
}

/** 页内样式串（三条层级档由它钉住，不看渲染后的计算值）。 */
function styleText(html) {
  return (String(html).match(/<style[^>]*>[\s\S]*?<\/style>/gi) ?? []).join('\n');
}
function ruleBody(css, selectorPattern) {
  const m = new RegExp(selectorPattern + '\\s*\\{([^}]*)\\}').exec(css);
  return m === null ? null : m[1];
}

test('#655 ① 值先只读一行、输入在展开体里（两页都判）', async () => {
  const iso = seedIso();
  const wiz = runPage(iso, 'calorie.view.photo-log-wizard', {
    srcPaths: ['D:\\照片\\正面1.jpg', 'D:\\照片\\正面2.jpg'], tag: '正面', note: '早上空腹',
  });
  assert.equal(editRowCount(wiz), 3, '预检确认页须三个确认项（三个填写位不缺）');
  const tagRow = rowOf(wiz, '标签');
  assert.equal(tagRow.length, 1, '须有一行「标签」');
  // 值住在 summary 里（只读一行）；输入框住在 summary **之后**（点开才出现）。
  const summaryEnd = tagRow[0].indexOf('</summary>');
  assert.ok(summaryEnd > 0, '「标签」行缺 summary（行本体须是 details 的 summary）');
  assert.match(tagRow[0].slice(0, summaryEnd), /<span class="phu-edit-v">[\s\S]*正面[\s\S]*<\/span>/,
    '当刻值没住在只读那一行里（缺陷 2：值先要以只读一行出现）');
  assert.ok(tagRow[0].indexOf('name="tag"') > summaryEnd,
    '输入框跑到了只读行之前（退回「一屏全是空框」的旧形状）');

  const planner = runPage(iso, 'calorie.view.gif-planner',
    { tag: '正面', start: '2026-09-01', end: '2026-09-06', photosDir: iso.photosDir });
  assert.equal(editRowCount(planner), 9, '规划器须九项参数位（八个默认值不许画回输入框，也不能少）');
  const durationRow = rowOf(planner, '每帧多久');
  assert.equal(durationRow.length, 1, '须有一行「每帧多久」');
  const dEnd = durationRow[0].indexOf('</summary>');
  assert.match(durationRow[0].slice(0, dEnd), /500 毫秒/,
    '当刻值（500 毫秒）须住在只读行里，不是空框里');
  assert.ok(durationRow[0].indexOf('name="duration"') > dEnd, 'duration 输入框须在只读行之后');
});

test('#655 ② 提示句不再当标题使：恰 1 处、住浅底提示条、页上零 `<strong>`', async () => {
  const iso = seedIso();
  const pages = {
    '预检确认页': runPage(iso, 'calorie.view.photo-log-wizard', {}),
    'GIF规划器': runPage(iso, 'calorie.view.gif-planner', { tag: '正面', photosDir: iso.photosDir }),
  };
  for (const [label, html] of Object.entries(pages)) {
    assert.equal((html.match(new RegExp(NOTICE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length, 1,
      label + '：那句告知句须恰 1 处');
    assert.match(html, /<p class="phu-alert">这些是 AI 已经用的值。/, label + '：告知句须住提示条（phu-alert）');
    assert.doesNotMatch(html, /<strong>/, label + '：页上不许再有加粗长句（缺陷 3）');
  }
});

test('#655 ③ 三档层级各自有类有档（块标题／行名／值）', async () => {
  const iso = seedIso();
  const html = runPage(iso, 'calorie.view.photo-log-wizard', { tag: '正面' });
  const css = styleText(html);
  assert.match(css, /\.phu-sec\{[^}]*font-size:15px[^}]*font-weight:600/, '块标题档（15/600）缺失');
  assert.match(css, /\.phu-edit-k\{[^}]*font-size:12px[^}]*font-weight:600/, '行名档（12/600）缺失');
  assert.match(css, /\.phu-edit-v\{[^}]*font-size:14px[^}]*font-weight:400/, '值档（14/400）缺失');
  assert.match(html, /<h2 class="phu-sec">要登记的三个值<\/h2>/, '块标题形状不符');
});

test('#655 ④ 常用标签下移到值清单之后、复制区之前，8 个词仍逐字可见', async () => {
  const iso = seedIso();
  const html = runPage(iso, 'calorie.view.photo-log-wizard', { tag: '正面' });
  const tags = html.indexOf('常用标签（点一个填上去）');
  assert.ok(tags > 0, '常用标签块须仍在页上（标题一字不改）');
  assert.ok(tags > html.indexOf('name="srcPaths"'), '缺陷 7：常用标签须下移到值清单**之后**（不再吃首屏）');
  assert.ok(tags < html.indexOf('给 AI 的指令（复制这一段）'), '常用标签须在复制区**之前**（位置下移，不是挪到页尾）');
  for (const w of ['正面', '背面', '侧面', '正面自然光', '正面灯光', '手臂', '腹部', '腿部']) {
    assert.ok(html.includes(w), '常用标签缺词：' + w);
  }
});

test('#655 ⑤ 不削功能：三个填写位／九项参数位／两个下拉显示当刻值', async () => {
  const iso = seedIso();
  const wiz = runPage(iso, 'calorie.view.photo-log-wizard', { srcPaths: ['D:\\照片\\正面1.jpg'], tag: '正面' });
  for (const name of ['srcPaths', 'tag', 'note']) {
    assert.ok(wiz.includes('name="' + name + '"'), '预检确认页缺填写位：' + name);
  }
  assert.ok(wiz.includes('calorie-cmd-read calorie.photo.add'), '预检确认页缺「给 AI 的指令」块');
  const planner = runPage(iso, 'calorie.view.gif-planner',
    { tag: '正面', start: '2026-09-01', end: '2026-09-06', photosDir: iso.photosDir, loop: 3, transition: 'fade' });
  for (const name of ['tag', 'photoIds', 'duration', 'loop', 'width', 'height', 'watermark', 'transition', 'output']) {
    assert.ok(planner.includes('name="' + name + '"'), '规划器缺参数位：' + name);
  }
  // 下拉显示当刻值（#527 第 5 条）：本用例把 loop 拨到 3、transition 拨到 fade。
  assert.match(planner, /<option value="3" selected>3 次<\/option>/, '循环下拉没显示当刻值');
  assert.match(planner, /<option value="fade" selected>淡入淡出<\/option>/, '切换效果下拉没显示当刻值');
  assert.equal((planner.match(/<option value="" disabled( selected)?>选一个<\/option>/g) ?? []).length, 0,
    '下拉不许再有「选一个」占位');
  // 读数卡四格与候选行仍在（张数／输出规格不因改版丢读数）。
  assert.ok(planner.includes('>要用</div>') && planner.includes('>GIF 输出</div>'), '读数卡缺格');
  assert.equal((planner.match(/<li class="phu-pl">/g) ?? []).length, 2, '候选行缺行');
});

test('#655 ⑥ 变异自证：输入框挪回只读行之前必红，改回必绿', async () => {
  const iso = seedIso();
  const good = runPage(iso, 'calorie.view.photo-log-wizard', { tag: '正面' });
  /** 本票判据的最小内核：这一行里，`name="tag"` 必须出现在 `</summary>` **之后**。
   *  行不在即返 null（形状整个没了也是红）。 */
  const rowCheck = (html) => {
    const row = rowOf(html, '标签')[0];
    if (!row) return null;
    const end = row.indexOf('</summary>');
    return end > 0 && row.indexOf('name="tag"') > end;
  };
  assert.equal(rowCheck(good), true, '改回必绿：原页须判过');
  // 变异：把 `<details>` 的两个孩子调个位置（输入体排到 summary 之前）＝退回「先空框、后值」的旧形状。
  const tagRow = rowOf(good, '标签')[0];
  assert.ok(tagRow, '变异前置：找不到「标签」行');
  const swapped = tagRow.replace(
    /^(<details class="phu-edit">)(<summary[\s\S]*?<\/summary>)([\s\S]*?)(<\/details>)$/,
    (_all, open, summary, rest, close) => open + rest + summary + close,
  );
  assert.notEqual(swapped, tagRow, '变异未生效（「标签」行没被改写）');
  const mutated = good.replace(tagRow, swapped);
  assert.equal(rowCheck(mutated), false, '变异（输入框排到只读行之前）未红');
  assert.equal(rowCheck(good), true, '改回必绿：原页再判一次仍过');
  console.log('MUTATION-RED #655 值行形状改坏必红（输入框排到只读行之前 → false）'
    + ' ｜ MUTATION-GREEN 改回必绿（原页 → true）');
});
