/** #214 · 私家大厨 HELP **渲染接线**的自检锁：内容资产（#213）→ 全量 HELP JSON → 全页 HTML（零 IO）
 * ＋ 交付意图 `{html, target}` ＋ 落盘两态（explicit 覆盖写／target 独占递补）。
 *
 * 与 `test/scene-data.test.mjs` 的分工：那件管**资产**的语义（计数／枚举／三层结构），本件管**接线**：
 *  - 载荷键集与取值（`skill_name`／`title`／`version` 取资产，`subtitle`／`contact` 由装配层补）；
 *  - HTML 是共享 help 模板的**前后缀逐字 ＋ 载荷段**（不是自造的第二套页面）；
 *  - `buildChefHelpDelivery` 的落点意图与**只读**性（不许把库建出来）；
 *  - `deliverChefHelp` 走共用件 `base-paint/save-html`（覆盖写／递补）。
 *
 * 跑法（**只构建本包**，禁仓级 `tsc -b`）：
 *   node node_modules/typescript/bin/tsc --build packages/skill-chef/tsconfig.json
 *   node --test packages/skill-chef/test/help-file-214.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  HELP_SHELL_DATA_OPEN, HELP_SHELL_PREFIX, HELP_SHELL_SUFFIX, HELP_SHELL_TITLE_SLOT,
} from 'base-paint/help-shell';
import {
  buildChefHelpDelivery, buildChefHelpFileData, deliverChefHelp, formatHelpMinute, renderChefHelpHtml,
} from '../dist/help/index.js';
import { CHEF_SCENES } from '../dist/help/sceneData.js';
import * as pkg from '../dist/index.js';

/** 固定时刻（本地时区）⇒ 产物可复现。 */
const NOW = new Date(2026, 8, 12, 14, 30, 0);
const DATA = buildChefHelpFileData(NOW);
const HTML = renderChefHelpHtml(DATA);
const HTML_LF = (HTML.match(/\n/g) || []).length;

/** 载荷段＝`help-data` 开标签之后、其配对闭标签之前（模板把 JSON 整份塞在那里）。 */
function payloadText(html) {
  const start = html.indexOf(HELP_SHELL_DATA_OPEN);
  assert.ok(start >= 0, 'HTML 里找不到 help-data 容器');
  const from = start + HELP_SHELL_DATA_OPEN.length;
  const end = html.indexOf('</script>', from);
  assert.ok(end > from, 'HTML 里 help-data 容器没闭合');
  return html.slice(from, end);
}

test('#214 载荷：5 必需键 ＋ version／init_banner 常在；页面级取值来自资产（单一事实源）', () => {
  assert.deepEqual(Object.keys(DATA).sort(),
    ['contact', 'groups', 'init_banner', 'skill_name', 'subtitle', 'title', 'version']);
  const asset = pkg.buildChefSceneData();
  assert.equal(DATA.skill_name, asset.skill_name);
  assert.equal(DATA.title, '私家大厨 HELP · 能力速查', 'title 取老家产物原文');
  assert.equal(DATA.version, asset.version, 'version 取资产公开导出，装配层不写第二份');
  assert.equal(DATA.groups, CHEF_SCENES, 'groups 直接引资产本体（=== 同一引用，不 clone）');
  assert.equal(DATA.subtitle, '10 功能域 · 48 场景 · 版本 0.1.0 · 更新于 2026-09-12 14:30');
  assert.equal(DATA.contact.items.length, 3, 'contact 照记账三项');
  assert.equal(DATA.contact.items[0].label, '邮箱');
  assert.equal('meta_blocks' in DATA, false, 'meta_blocks 不传（老家无此块 ＋ HELP 自身触发词不上页面）');
  assert.equal('recommendations' in DATA, false, 'recommendations 不传（老 chef 页面无此键）');
  assert.equal(formatHelpMinute(NOW), '2026-09-12 14:30');
});

test('#214 初始化横幅：键常在、显隐只走 hidden（载荷形状不随状态变）＋ prompt 取自 first_use 单源', () => {
  const uninit = buildChefHelpFileData(NOW);
  const init = buildChefHelpFileData(NOW, { initialized: true });
  assert.deepEqual(Object.keys(uninit.init_banner).sort(),
    ['button_text', 'closable', 'hidden', 'prompt', 'subtitle', 'title']);
  assert.deepEqual(Object.keys(init.init_banner).sort(), Object.keys(uninit.init_banner).sort(), '键集不随状态变');
  assert.equal(uninit.init_banner.hidden, false, '缺省＝照显（误显的代价小于误藏）');
  assert.equal(init.init_banner.hidden, true);
  assert.equal(uninit.init_banner.prompt,
    '请加载「私家大厨」技能,帮我完成首次使用初始化(唤醒词:首次使用):', 'prompt 取自 first_use 场景的 prompt_template');
  assert.equal(uninit.init_banner.closable, true);
});

test('#214 HTML：共享 help 模板前后缀逐字 ＋ 载荷段；标题槽已填；载荷 parse 后逐字一致', () => {
  assert.ok(HTML.startsWith(HELP_SHELL_PREFIX.split(HELP_SHELL_TITLE_SLOT)[0]), '前缀逐字（标题槽之前）');
  assert.equal(HTML.includes(HELP_SHELL_TITLE_SLOT), false, '标题槽不许留占位');
  assert.equal(HTML.includes('<title>私家大厨 HELP · 能力速查</title>'), true, 'composeDocTitle 走原样支，不重复技能名');
  assert.ok(HTML.endsWith(HELP_SHELL_SUFFIX), '后缀逐字');
  assert.deepEqual(JSON.parse(payloadText(HTML)), JSON.parse(JSON.stringify(DATA)), '载荷 parse 后与入参逐字一致');
  // 共享层的 `<` → `\u003c` 转义在本件是**空转**（实测：48 卡 prompt／参数值与 contact 里一个 `<` 都没有），
  // 故不写「必须出现 \u003c」的假断言；改锁「载荷段里不许出现 `<`」——以后有人往文案里加尖括号，这行会红。
  assert.equal(payloadText(HTML).includes('<'), false, '载荷段不许出现 `<`（防 script 破壳）');
  console.log('#214 读数：HTML ' + Buffer.byteLength(HTML, 'utf8') + ' B／' + HTML_LF + ' LF；'
    + '载荷段 ' + Buffer.byteLength(payloadText(HTML), 'utf8') + ' B');
});

test('#214 可复现：同一 now 两次渲染逐字节一致；坏 now 即抛（CHEF_BAD_PAYLOAD）', () => {
  assert.equal(renderChefHelpHtml(buildChefHelpFileData(NOW)), HTML);
  for (const bad of [new Date('x'), undefined, '2026-09-12']) {
    assert.throws(() => buildChefHelpFileData(bad), (e) => e.name === 'ChefRenderError' && e.code === 'CHEF_BAD_PAYLOAD');
  }
});

test('#214 交付意图：target ＝ <库目录>/cook_html/help ＋ 私家大厨_HELP；全程只读、不建库', () => {
  const dir = mkdtempSync(join(tmpdir(), 't214-intent-'));
  try {
    const dbPath = join(dir, 'chef_data.db');
    const before = readdirSync(dir);
    const out = buildChefHelpDelivery(dbPath, NOW);
    assert.equal(out.html, HTML, 'html 与纯渲染逐字节一致');
    assert.deepEqual(out.target, { dir: join(dir, 'cook_html', 'help'), stem: '私家大厨_HELP' });
    assert.equal(existsSync(dbPath), false, '只读页不许把库建出来');
    assert.equal(existsSync(out.target.dir), false, '只读页不许建落点目录（落点由落盘件建）');
    assert.deepEqual(readdirSync(dir), before, '只读探针不许在库目录里留下任何新条目');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('#214 落盘两态：target 走独占递补（同秒第二份 _2）／explicit 覆盖写；bytes ＝ 实际落盘字节数', () => {
  const dir = mkdtempSync(join(tmpdir(), 't214-deliver-'));
  try {
    const first = deliverChefHelp({ target: { dir, stem: '私家大厨_HELP' }, html: HTML });
    const second = deliverChefHelp({ target: { dir, stem: '私家大厨_HELP' }, html: HTML });
    assert.equal(first.mode, 'file');
    assert.match(first.path, /私家大厨_HELP_\d{8}_\d{6}\.html$/);
    assert.equal(second.path.endsWith('_2.html'), true, '同秒第二份必须递补 _2（绝不覆盖）');
    assert.equal(readFileSync(first.path, 'utf8'), HTML, '落盘内容逐字节等于渲染产物');
    assert.equal(first.bytes, Buffer.byteLength(HTML, 'utf8'));
    assert.equal(readFileSync(first.path).length, first.bytes);

    const explicit = join(dir, '指定名.html');
    const a = deliverChefHelp({ explicit, target: { dir, stem: '私家大厨_HELP' }, html: '<p>一</p>' });
    const b = deliverChefHelp({ explicit, target: { dir, stem: '私家大厨_HELP' }, html: '<p>二</p>' });
    assert.deepEqual([a.path, b.path], [explicit, explicit], 'explicit 优先且逐字落点、不带时间戳');
    assert.equal(readFileSync(explicit, 'utf8'), '<p>二</p>', 'explicit ＝ 覆盖写');
    assert.throws(() => deliverChefHelp({ html: HTML }),
      (e) => e.name === 'ChefRenderError' && e.code === 'CHEF_BAD_PAYLOAD', '缺落点即抛，不静默换形态');
    writeFileSync(join(dir, '无关文件.txt'), 'x');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('#214 出口：四个新名字从包根可及（src/index.ts → help/index.ts 转发）', () => {
  for (const n of ['buildChefHelpFileData', 'buildChefHelpDelivery', 'renderChefHelpHtml', 'formatHelpMinute', 'deliverChefHelp']) {
    assert.equal(typeof pkg[n], 'function', '包根缺 ' + n);
  }
  assert.equal(pkg.renderChefHelpHtml(pkg.buildChefHelpFileData(NOW)), HTML);
});
