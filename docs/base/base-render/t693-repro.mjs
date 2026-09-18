/* #693 复现页生成器（证据件，随 `t693-证据.md` 入仓，可复跑）。
 *
 * 做什么：用**真实渲染出口** `base-paint/help-shell` 出一页 HELP，再在页尾追加一段触发脚本——
 *   只在 load 时点一次页面自带的复制按钮（`.copy-btn[data-c]`，走的是页内全局委派 → `doCopy` →
 *   `showToast` 这条真路径），之后每 3.5s 再点一次，好让截图时提示仍在屏上。
 *
 * 跑法（仓库根）：
 *   node node_modules/typescript/bin/tsc -b packages/base-render            # 先构建，产物才是当刻源码
 *   node docs/base/base-render/t693-repro.mjs <输出.html> [top|bottom] [tall]
 *
 * 复现两态：
 *   ① 修前（把模板里 `stack.className = 'hm-toast-stack';` 那行去掉再重跑 `gen:help-shell` ＋ `tsc`）：
 *      短页顶部态——视口内看不到任何提示；长页滚到底态——提示卡落在文档流末尾，被固定底栏盖住，只露一点黑边。
 *   ② 修后：短页与长页都悬浮在视口底部、居中、完整可见，压过固定底栏。
 * 截图（1280×800，headless Chrome）见同目录 `t693-复现-短页-修前.png` 等四张。
 *
 * 说明：本脚本只写调用方给的输出路径（草稿用 `.scratch/t693/`），不碰仓库受跟踪文件。
 */
import { writeFileSync } from 'node:fs';
import { renderHelpShellHtml } from '../../../packages/base-render/dist/helpShell.js';

const OUT = process.argv[2];
if (!OUT) {
  console.error('用法：node docs/base/base-render/t693-repro.mjs <输出.html> [top|bottom] [tall]');
  process.exit(2);
}
const MODE = process.argv[3] === 'bottom' ? 'bottom' : 'top';
const TALL = process.argv[4] === 'tall';
const GROUPS = TALL ? 4 : 3;
const SUBGROUPS = TALL ? 4 : 2;
const PER = TALL ? 6 : 4;

const scene = (i) => ({
  id: 'demo.scene.' + i,
  title: '场景 ' + i,
  wake_word: '唤醒词 ' + i,
  status: '',
  prompt_template: '把这条指令发给 AI：demo.scene.' + i + '，它会照办。',
  types: ['采集'],
});

const groups = Array.from({ length: GROUPS }, (_, g) => ({
  id: 'g' + g,
  icon: '📁',
  label: '分组 ' + (g + 1),
  subgroups: Array.from({ length: SUBGROUPS }, (_, s) => ({
    id: 'g' + g + 's' + s,
    label: '二级组 ' + (s + 1),
    scenes: Array.from({ length: PER }, (_, k) => scene(g * SUBGROUPS * PER + s * PER + k)),
  })),
}));

const DATA = {
  skill_name: '复现',
  title: 'HELP 提示栈复现',
  subtitle: '点页面里的复制按钮，看底部有没有提示',
  contact: { items: [{ label: '作者', value: 'ilife' }] },
  groups,
};

const trigger = [
  '<script>',
  'window.addEventListener("load", function () {',
  '  function hit() { var b = document.querySelector("[data-c]"); if (b) b.click(); }',
  '  hit();',
  '  setInterval(hit, 3500);',
  MODE === 'bottom'
    ? '  function bottom() { window.scrollTo(0, document.documentElement.scrollHeight); } bottom(); setInterval(bottom, 300);'
    : '',
  '});',
  '</script>',
].filter((line) => line !== '').join('\n');

writeFileSync(OUT, renderHelpShellHtml(DATA).replace('</body>', trigger + '\n</body>'));
console.log('wrote ' + OUT + ' mode=' + MODE + ' tall=' + TALL);
