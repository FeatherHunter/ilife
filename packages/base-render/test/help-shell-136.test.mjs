/** #136 · help模板 base 侧等价锁（机器生成，哈希常量禁手填）。
 * 锁三面：① PREFIX/SUFFIX 值与源切分逐字节一致（改模板即红）；
 * ② 固定夹具渲染输出逐字节一致（渲染逻辑漂移即红）；③ 源可复现（源切分即得常量）；
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/base-render`，
 * 再 `node --test packages/base-render/test/help-shell-136.test.mjs`。
 */
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  HELP_SHELL_DATA_OPEN,
  HELP_SHELL_PREFIX,
  HELP_SHELL_SUFFIX,
  HelpShellError,
  composeDocTitle,
  renderHelpShell,
  renderHelpShellHtml,
} from '../dist/helpShell.js';

const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const FIXTURE = {"skill_name":"卡路里","title":"唤醒词速查台","subtitle":"1 分类 · 1 场景 · 更新于 2026-09-06 22:07","contact":{"items":[{"label":"作者","value":"ilife"}]},"groups":[{"id":"g","icon":"x","label":"L","subgroups":[{"id":"s","label":"S","scenes":[{"id":"a","title":"T","wake_word":"w","status":"","prompt_template":"p","types":["结果"]}]}]}]};

test('#136 ① 模板值 verbatim：前后缀哈希与搬家基线一致', () => {
  assert.equal(sha(HELP_SHELL_PREFIX), '8cba51784f0f6f2b7880426f3362be686d9734156cf476af3c2257931704ad8e');
  assert.equal(sha(HELP_SHELL_SUFFIX), '63034c1efc25105df1a168838442d3e89292b22b8e6c83796d178fefc61ca5c3');
  assert.equal(HELP_SHELL_DATA_OPEN, '<script id="help-data" type="application/json">');
  assert.ok(HELP_SHELL_PREFIX.endsWith(HELP_SHELL_DATA_OPEN), 'PREFIX 须止于 help-data 开标签尾');
  assert.ok(HELP_SHELL_SUFFIX.startsWith('</script>'), 'SUFFIX 须起于 help-data 配对闭标签');
});

test('#136 ② 固定夹具渲染逐字节一致＋空分组抛 missing-data', () => {
  assert.equal(sha(renderHelpShellHtml(FIXTURE)), '53145a53405b7290d4b889770f9609f3dab3121a18bc34e0e1eacdaf57e018e1');
  assert.equal(renderHelpShell, renderHelpShellHtml, '标准出口须为同一实现');
  assert.throws(() => renderHelpShellHtml({ ...FIXTURE, groups: [] }),
    (e) => e instanceof HelpShellError && e.code === 'missing-data');
});

test('#145 文档标题：title 不含技能名时前缀；已含则原样（老世代大标题含技能名，禁重复）', () => {
  const docTitleOf = (html) => html.slice(html.indexOf('<title>') + 7, html.indexOf('</title>'));
  assert.equal(composeDocTitle({ skill_name: '卡路里', title: '唤醒词速查台' }), '卡路里 · 唤醒词速查台');
  assert.equal(composeDocTitle({ skill_name: '饼干记账', title: '饼干记账 · 使用手册(HELP)' }), '饼干记账 · 使用手册(HELP)');
  assert.equal(docTitleOf(renderHelpShellHtml(FIXTURE)), '卡路里 · 唤醒词速查台', '既有形状逐字节不变');
  const bill = renderHelpShellHtml({ ...FIXTURE, skill_name: '饼干记账', title: '饼干记账 · 使用手册(HELP)' });
  assert.equal(docTitleOf(bill), '饼干记账 · 使用手册(HELP)', '自带技能名不重复前缀');
});

test('#136 ③ 子路径登记：exports 含 ./help-shell（主入口不动）', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.exports['./help-shell'], './dist/helpShell.js', '子路径导出');
  assert.equal(pkg.exports['.'], './dist/index.js', '主入口不动');
  assert.ok(pkg.files.includes('dist'), 'files 须含 dist');
});

test('#136 ④ 源可复现：assets 源切分即得前后缀（删生成物重跑 gen 逐字节一致）', () => {
  const src = readFileSync(new URL('../assets/help-template.html', import.meta.url), 'utf8');
  const open = '<script id="help-data" type="application/json">';
  const oOpen = src.indexOf(open);
  assert.ok(oOpen > 0, '源缺 help-data 开标签');
  assert.equal(sha(src.slice(0, oOpen + open.length)), sha(HELP_SHELL_PREFIX), '源切分 PREFIX 须等于常量');
  assert.equal(sha(src.slice(src.indexOf('</script>', oOpen))), sha(HELP_SHELL_SUFFIX), '源切分 SUFFIX 须等于常量');
  for (const slot of ['SLOT:1/INJECT-DATA', 'SLOT:2/SHARED-HELPERS', 'SLOT:3/SHARED-CSS', '__HELP_TITLE__']) {
    assert.ok(src.includes(slot), '源缺槽契约：' + slot);
  }
});

test('#1274 关于页版本接线（条目 15）：主行＝数据世代＋技能包版本，模板代际不上页，只印本页生成时刻', () => {
  assert.ok(HELP_SHELL_SUFFIX.includes('HELP.skill_version'), '壳须从 HELP 取 skill_version');
  assert.ok(HELP_SHELL_SUFFIX.includes('HELP.generated_at'), '壳须从 HELP 取 generated_at');
  assert.ok(HELP_SHELL_SUFFIX.includes('本页数据生成于'), '壳须印本页生成时刻');
  assert.ok(!HELP_SHELL_SUFFIX.includes('about_meta'), 'about_meta 命名空间已撤回（键住技能侧自己的载荷）');
  assert.ok(!HELP_SHELL_SUFFIX.includes('HELP 模板 v4'), '模板代际不上页（用户原话：这段字意义不明）');
  assert.ok(!HELP_SHELL_SUFFIX.includes('快照于'), '不再印快照行（复用窗口是调用方的策略参数）');
});
