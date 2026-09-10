/** #136 · help模板 base 侧等价锁（机器生成，哈希常量禁手填）。
 * 锁三面：① PREFIX/SUFFIX 值与源切分逐字节一致（改模板即红）；
 * ② 固定夹具渲染输出逐字节一致（渲染逻辑漂移即红）；③ 源可复现（源切分即得常量）；
 * 运行：先 `npx tsc -b packages/base-render`，
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
  renderHelpShell,
  renderHelpShellHtml,
} from '../dist/helpShell.js';

const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const FIXTURE = {"skill_name":"卡路里","title":"唤醒词速查台","subtitle":"1 分类 · 1 场景 · 更新于 2026-09-06 22:07","contact":{"items":[{"label":"作者","value":"ilife"}]},"groups":[{"id":"g","icon":"x","label":"L","subgroups":[{"id":"s","label":"S","scenes":[{"id":"a","title":"T","wake_word":"w","status":"","prompt_template":"p","types":["结果"]}]}]}]};

test('#136 ① 模板值 verbatim：前后缀哈希与搬家基线一致', () => {
  assert.equal(sha(HELP_SHELL_PREFIX), '3b70953e8ff316c13299fc0715ee650fd8262082fe5d542ae635c85131ecb789');
  assert.equal(sha(HELP_SHELL_SUFFIX), 'bfaf1791382f3f295a83a7a63f942cd0b3c287df981e7a51b53659c00e45d8f9');
  assert.equal(HELP_SHELL_DATA_OPEN, '<script id="help-data" type="application/json">');
  assert.ok(HELP_SHELL_PREFIX.endsWith(HELP_SHELL_DATA_OPEN), 'PREFIX 须止于 help-data 开标签尾');
  assert.ok(HELP_SHELL_SUFFIX.startsWith('</script>'), 'SUFFIX 须起于 help-data 配对闭标签');
});

test('#136 ② 固定夹具渲染逐字节一致＋空分组抛 missing-data', () => {
  assert.equal(sha(renderHelpShellHtml(FIXTURE)), '3d00cfb6faed3458144ccd73d70d4fc2d3f82c1643c103100319fed9ffe0fc4a');
  assert.equal(renderHelpShell, renderHelpShellHtml, '标准出口须为同一实现');
  assert.throws(() => renderHelpShellHtml({ ...FIXTURE, groups: [] }),
    (e) => e instanceof HelpShellError && e.code === 'missing-data');
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
