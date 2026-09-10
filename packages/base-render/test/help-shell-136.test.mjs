/** #136 · help模板 base 侧等价锁（机器生成，哈希常量禁手填）。
 * 锁两面：① PREFIX/SUFFIX 值与搬家基线逐字节一致（改模板即红）；
 * ② 固定夹具渲染输出逐字节一致（渲染逻辑漂移即红）。运行：先 `npx tsc -b packages/base-render`，
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
  assert.equal(sha(HELP_SHELL_PREFIX), '5e7bb05a0018fe21fdad457db10cdf8d1bca3f7fe379a9643f2e09542fbf8913');
  assert.equal(sha(HELP_SHELL_SUFFIX), 'bfaf1791382f3f295a83a7a63f942cd0b3c287df981e7a51b53659c00e45d8f9');
  assert.equal(HELP_SHELL_DATA_OPEN, '<script id="help-data" type="application/json">');
  assert.ok(HELP_SHELL_PREFIX.endsWith(HELP_SHELL_DATA_OPEN), 'PREFIX 须止于 help-data 开标签尾');
  assert.ok(HELP_SHELL_SUFFIX.startsWith('</script>'), 'SUFFIX 须起于 help-data 配对闭标签');
});

test('#136 ② 固定夹具渲染逐字节一致＋空分组抛 missing-data', () => {
  assert.equal(sha(renderHelpShellHtml(FIXTURE)), '6e77d360515479a44a9d5594273881950e7859c8026fbd25e601b21286e9fcb1');
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
