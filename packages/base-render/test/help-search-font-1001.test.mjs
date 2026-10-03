/** #1001 · HELP 页内搜索框字号下限（iOS Safari 聚焦自动缩放）· 契约锁。
 *
 *  为什么测试要长这样：字号是**一条声明**，而这条声明有两个落点——**源模板**与**机器生成的产物**。
 *  只锁源，漏「改了源忘了重跑生成链」；只锁产物，漏「产物被手改回去」。故两处同锁。
 *  另一半是**范围锁**：本票只许动 `font-size` 一个声明，规则体里其余声明（padding／border／
 *  border-radius／background／outline）逐字冻结——上一张票 #984 就是这么防「顺手改」的。
 *
 *  再有一条**变异自证**：把取数函数指向一份“改回 13.5px”的文本，它必须真的读出 13.5px，
 *  否则说明这条判式根本没咬住东西（绿而无鉴别力）。
 *
 *  运行：`node --test packages/base-render/test/help-search-font-1001.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const TEMPLATE = readFileSync(new URL('../assets/help-template.html', import.meta.url), 'utf8');
const GENERATED = readFileSync(new URL('../src/helpShell.ts', import.meta.url), 'utf8');

/** 搜索框那条规则的选择器与「除字号外逐字冻结」的规则体。 */
const SELECTOR = '.search-box input{';
const REST =
  'width:100%;border:1px solid var(--line);border-radius:10px;padding:9px 34px 9px 34px;' +
  'background:#fff;outline:none';

/** 从任意文本里取该规则的规则体（取不到即抛，不静默）。 */
function ruleBodyOf(text, label) {
  const at = text.indexOf(SELECTOR);
  assert.ok(at >= 0, `${label} 缺选择器 ${SELECTOR}`);
  const end = text.indexOf('}', at);
  assert.ok(end > at, `${label} 的选择器后没有规则体收尾`);
  return text.slice(at + SELECTOR.length, end);
}

/** 取规则体里的 font-size 值。 */
function fontSizeOf(body) {
  const m = /font-size\s*:\s*([^;}]+)/.exec(body);
  assert.ok(m, '规则体缺 font-size：' + body);
  return m[1].trim();
}

/* ── ① 源码侧契约 ─────────────────────────────────────────── */

test('#1001 模板搜索框字号恰为 16px（iOS 聚焦缩放的阈值）', () => {
  assert.equal(fontSizeOf(ruleBodyOf(TEMPLATE, '模板源')), '16px');
});

test('#1001 生成物与源同值：改了源必须重跑生成链', () => {
  assert.equal(
    fontSizeOf(ruleBodyOf(GENERATED, '生成物 src/helpShell.ts')),
    '16px',
    '生成物里仍是旧字号——说明模板改了但没跑 `gen-help-shell.cjs`',
  );
});

test('#1001 除字号外一行不动：padding／border／圆角／背景／outline 逐字冻结', () => {
  const stripped = ruleBodyOf(TEMPLATE, '模板源').replace('font-size:16px;', '');
  assert.equal(stripped, REST, '本票只许动 font-size，其余声明不许被顺手改');
});

test('#1001 搜索框仍是可聚焦的 type=search（不许用“改成不可聚焦”绕过规则）', () => {
  assert.ok(
    /<input id="sB" type="search"/.test(TEMPLATE),
    '模板里的搜索框标记被改了：' + (/<input id="sB"[^>]*>/.exec(TEMPLATE) ?? ['(找不到)'])[0],
  );
});

test('#1001 不引入 maximum-scale（禁缩放已否决，伤无障碍）', () => {
  const meta = /<meta name="viewport" content="([^"]*)"/.exec(TEMPLATE);
  assert.ok(meta, '模板缺 viewport meta');
  assert.ok(!meta[1].includes('maximum-scale'), 'viewport 不得出现 maximum-scale：' + meta[1]);
  assert.ok(!meta[1].includes('user-scalable'), 'viewport 不得出现 user-scalable：' + meta[1]);
});

test('#1001 模板源须全 CRLF（生成器遇孤 LF 直接抛错）', () => {
  const lone = TEMPLATE.match(/(?<!\r)\n/g);
  assert.equal(lone, null, lone ? `发现 ${lone.length} 处孤 LF——编辑器把行尾规范化了` : '全 CRLF');
});

/* ── ② 变异自证：判式本身有鉴别力 ─────────────────────────── */

test('#1001 变异自证：把字号改回 13.5px，判式必须读出 13.5px', () => {
  const mutated = TEMPLATE.replace(
    'padding:9px 34px 9px 34px;font-size:16px;',
    'padding:9px 34px 9px 34px;font-size:13.5px;',
  );
  assert.notEqual(mutated, TEMPLATE, '变异没落上：模板里找不到要改的那一段');
  assert.equal(fontSizeOf(ruleBodyOf(mutated, '变异体')), '13.5px');
});
