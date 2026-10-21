// 票 #1296 验收取证脚本：把编译产物里的「使用手册」入口（ManualEntryButton＋manualEntryCss）
// 渲染成两张 HTML（浅色底 #EFF9FF / 深色底 #1e2126），供 headless Chrome 截图后做 2–4px 邻域像素读数。
//
// 用法（工作目录必须是仓库根，dist 需先构建）：
//   node node_modules/typescript/bin/tsc -b packages/plugin-manager
//   node docs/plugins/plugin-manager/t1296-证据/render-entry.mjs <输出目录>
//
// 真值取自 packages/plugin-manager/dist/manual-entry.js —— 不手抄 CSS/DOM。
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const DIST_ENTRY = join(ROOT, 'packages', 'plugin-manager', 'dist', 'manual-entry.js');
if (!existsSync(DIST_ENTRY)) {
  console.error('缺少编译产物：' + DIST_ENTRY + '（先跑 node node_modules/typescript/bin/tsc -b packages/plugin-manager）');
  process.exit(2);
}

const mod = await import(pathToFileURL(DIST_ENTRY).href);
const css = mod.manualEntryCss();
const entry = mod.ManualEntryButton({ onOpen: () => {} });

function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** 把 React 元素树序列化成 HTML（只覆盖入口用到的标签与属性，够本票取证用）。 */
function serialize(node) {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return esc(node);
  if (Array.isArray(node)) return node.map(serialize).join('');
  const props = node.props ?? {};
  const attrs = [];
  for (const [key, value] of Object.entries(props)) {
    if (key === 'children' || value === undefined || value === null || typeof value === 'function') continue;
    attrs.push((key === 'className' ? 'class' : key) + '="' + esc(value) + '"');
  }
  return '<' + node.type + (attrs.length > 0 ? ' ' + attrs.join(' ') : '') + '>' + serialize(props.children) + '</' + node.type + '>';
}

const body = serialize(entry);
const OUT = process.argv[2] ?? join(ROOT, '.scratch', 't1296', 'render');
mkdirSync(OUT, { recursive: true });

// 深色底取宿主深色面板观感值 #1e2126（规格未指定具体值；判据只与同底色对照）。
const BACKGROUNDS = [
  ['light', '#EFF9FF', '#1f2328'],
  ['dark', '#1e2126', '#e6e2d8'],
];

for (const [name, bg, fg] of BACKGROUNDS) {
  const html =
    '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>\n' +
    'html,body{margin:0;padding:0}\n' +
    'body{width:360px;height:260px;background:' + bg + ';display:flex;align-items:center;justify-content:center;color:' + fg + ';font-family:system-ui,"Microsoft YaHei",sans-serif}\n' +
    css + '\n' +
    '</style></head><body>' + body + '</body></html>\n';
  writeFileSync(join(OUT, 'entry-' + name + '.html'), html, 'utf8');
}

console.log('RESULT: rendered ' + OUT + ' (light bg #EFF9FF, dark bg #1e2126)');
