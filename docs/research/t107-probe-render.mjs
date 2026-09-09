/** #107 只读探针：证明 6 件模板**真被渲染**进 HELP 速查台三态（非搬文件），且 #88／#91 不变量不回归。
 *  跑法（仓根）：node docs/research/t107-probe-render.mjs   （需先 `pnpm build`）
 *  机器可读摘要：末行 `RESULT: n/m PASS|FAIL`；失败即 exit 1。
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const {
  buildHelpViewEntries, renderHelpCenterHtml, HELP_VIEW_ENTRIES_META_ID, HELP_VIEW_ENTRIES_META_TITLE,
} = await import(new URL('../../packages/skill-calorie/dist/render/helpCenter.js', import.meta.url).href);

const count = (h, n) => h.split(n).length - 1;
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);

const entries = buildHelpViewEntries();
console.log('ENTRIES=' + entries.length);
for (const e of entries) {
  const raw = readFileSync(join(ROOT, 'packages/skill-calorie/templates', e.name + '.html'), 'utf8');
  console.log('  ' + e.name.padEnd(14) + ' title=' + e.title + ' | lead=' + e.lead + ' | cli=' + e.cli
    + ' | 来自磁盘=' + (raw.includes('<h1>' + e.title + '</h1>')
      && raw.includes('<pre class="view-cli">' + e.cli + '</pre>')));
}

const file = renderHelpCenterHtml({ mode: 'file' });
const inline = renderHelpCenterHtml({ mode: 'inline' });
const text = renderHelpCenterHtml({ mode: 'text' });

const checks = [];
const ok = (name, cond, detail) => { checks.push([name, cond, detail]); };

for (const [label, html] of [['file', file.html], ['inline', inline.html]]) {
  const dec = decode(html);
  ok(label + ' meta 块存在', count(html, 'data-meta-id="' + HELP_VIEW_ENTRIES_META_ID + '"') === 1,
    'data-meta-id=' + count(html, 'data-meta-id="' + HELP_VIEW_ENTRIES_META_ID + '"'));
  ok(label + ' 入口条目 6', count(html, 'data-view-entry="') === 6, 'data-view-entry=' + count(html, 'data-view-entry="'));
  ok(label + ' 6 标题逐条落地', entries.every((e) => dec.includes('<b>' + e.title + '</b>')));
  ok(label + ' 6 命令逐条落地', entries.every((e) => dec.includes(e.cli)));
  ok(label + ' 场景卡不回归 436', count(html, 'data-scene-id="') === 436, 'data-scene-id=' + count(html, 'data-scene-id="'));
  ok(label + ' 子功能不回归 54', count(html, 'data-subgroup-id="') === 54);
  ok(label + ' 复制按钮不回归 1308', count(html, 'data-action-id="') === 1308);
  ok(label + ' 元素 id 全唯一', (() => {
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    return new Set(ids).size === ids.length;
  })(), 'ids=' + [...html.matchAll(/ id="([^"]+)"/g)].length);
  ok(label + ' 标记残留 0', [...html.matchAll(/<!--[A-Z0-9-]+-->/g)].length === 0);
  console.log('SHA ' + label + '=' + sha(html) + ' bytes=' + Buffer.byteLength(html, 'utf8'));
}
ok('inline 以 <style> 起', inline.html.startsWith('<style>'));
ok('inline 以 </script> 止', inline.html.trimEnd().endsWith('</script>'));

ok('text 含入口段', text.html.includes('[' + HELP_VIEW_ENTRIES_META_TITLE + ']'));
ok('text 6 入口行', entries.every((e) => text.html.includes('  ' + e.title + ' · ' + e.cli)));
ok('text 场景行恒 436', text.html.split('\n').filter((l) => l.startsWith('    ')).length === 436);
ok('text 零标签', !/<(section|style|script|div|button)\b/.test(text.html));
console.log('SHA text=' + sha(text.html) + ' bytes=' + Buffer.byteLength(text.html, 'utf8'));

const tplFiles = readdirSync(join(ROOT, 'packages/skill-calorie/templates')).filter((f) => f.endsWith('.html')).sort();
ok('磁盘模板 6 件', tplFiles.length === 6, tplFiles.join(','));

let bad = 0;
for (const [name, cond, detail] of checks) {
  if (!cond) bad++;
  console.log((cond ? 'OK  ' : 'BAD ') + name + (detail ? ' (' + detail + ')' : ''));
}
console.log('RESULT: ' + (checks.length - bad) + '/' + checks.length + (bad ? ' FAIL' : ' PASS'));
if (bad) process.exit(1);
