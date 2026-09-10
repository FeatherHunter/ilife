/** T3 #134 · HELP 全壳回归锁（与老实物同壳：DOM 槽位＋双端分支＋token 覆盖序）。
 *
 * 锁三面（壳常量 verbatim 自老实物机器切分，本文件只锁不变式，不逐字复述百 KB 壳）：
 *  ① 关键槽位存在：stage/phone/screen/hero 三步/init 横幅+steps/sticky 搜索/details 折叠/
 *     grid 卡片/Sheet 参数表单/复制+Toast/关于页联系作者+版本/底部 Tab 切页；
 *  ② 双端分支：桌面 680 居中列＋stage 标题；≤500px 沉浸（去标题、screen 变滚动容器、
 *     sheet 变 iOS 抽屉）；820px 组件收窄＋toast 栈 5→3；
 *  ③ token 覆盖序：壳 :root 在前、共享 token A 组 :root 在后（以后加载覆盖为准）。
 * 另锁：接线转发一致（renderHelpFileHtml ≡ renderHelpShellHtml）＋缺分组抛 missing-data
 * ＋小于号转义（容器内无原生 </script>，parse 后逐字）。
 * 运行：先 `npx tsc -b packages/skill-calorie`，
 * 再 `node --test packages/skill-calorie/test/help-shell-134.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  HELP_SHELL_DATA_OPEN,
  HELP_SHELL_PREFIX,
  HELP_SHELL_SUFFIX,
  renderHelpShellHtml,
} from '../dist/render/helpShell.js';
import { buildHelpFileData, renderHelpFileHtml } from '../dist/render/helpFile.js';
import { CalorieRenderError } from '../dist/render/errors.js';

/** 本地 2026-09-06 22:07:26（与老实物 subtitle 分钟同源，便于肉眼并排）。 */
const D0 = new Date(2026, 8, 6, 22, 7, 26);

function parseHelpData(html) {
  const m = html.match(/<script id="help-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(m, '产物缺 help-data 容器');
  return JSON.parse(m[1]);
}

test('#134 ① 壳锚点：前后缀切分＋关键槽位存在', () => {
  assert.ok(HELP_SHELL_PREFIX.endsWith(HELP_SHELL_DATA_OPEN), 'PREFIX 须止于 help-data 开标签尾');
  assert.ok(HELP_SHELL_SUFFIX.startsWith('</script>'), 'SUFFIX 须起于 help-data 配对闭标签');
  assert.equal(HELP_SHELL_DATA_OPEN, '<script id="help-data" type="application/json">');
  const html = renderHelpShellHtml(buildHelpFileData(D0));
  for (const slot of [
    'id="help-data"',
    'class="stage"',
    'class="phone"',
    'id="screen"',
    'id="sheetMask"',
    'id="sheet"',
    'id="shHead"',
    'id="shBody"',
    'id="shCopy"',
    'id="toast"',
    'class="tab-bar"',
    'data-nav="about"',
    'hero-steps',
    'init-banner',
    'init-steps',
    'search-wrap',
    'subgroup',
    'sg-body',
    'pfield',
    'about-sec',
    "JSON.parse(document.getElementById('help-data')",
  ]) {
    assert.ok(html.includes(slot), '全壳缺槽位：' + slot);
  }
});

test('#134 ② 桌面端：680 居中列＋Tab 栏对齐主体＋标题由 5 键派生', () => {
  const html = renderHelpShellHtml(buildHelpFileData(D0));
  assert.ok(html.includes('.phone{width:680px'), '桌面 phone 须 680px');
  assert.ok(html.includes('@media(min-width:501px){'), '须有 501px 壳级断点');
  assert.ok(html.includes('.tab-bar{width:680px'), '宽屏 Tab 栏须对齐 680 主体');
  assert.ok(html.includes('transform:translateX(-50%)'), '宽屏 Tab 栏须居中');
  // #141：原型水印（stage 头）已移除；文档标题改由 5 键派生。
  assert.equal(html.includes('stage-title'), false, '原型水印 stage-title 须已移除');
  assert.equal(html.includes('B1-B4'), false, '拍板水印须已移除');
  assert.ok(html.includes('<title>卡路里 · 唤醒词速查台</title>'), '文档标题须＝skill_name · title');
});

test('#134 ③ 手机端≤500px 沉浸：stage 归零＋screen 滚动容器＋sheet iOS 抽屉', () => {
  const html = renderHelpShellHtml(buildHelpFileData(D0));
  assert.ok(html.includes('@media(max-width:500px){'), '须有 500px 壳级断点');
  assert.ok(html.includes('.stage{padding:0;background:var(--bg)}'), '沉浸须把 stage 内边距归零');
  assert.ok(html.includes('.screen{height:100%;overflow-y:auto'), 'screen 须变滚动容器');
  assert.ok(
    html.includes('.sheet{left:0;right:0;bottom:0;border-radius:22px 22px 0 0}'),
    'sheet 须变 iOS 抽屉',
  );
});

test('#134 ④ 820px 组件级：收窄＋toast 栈 5→3', () => {
  const html = renderHelpShellHtml(buildHelpFileData(D0));
  assert.ok(html.includes('@media (max-width: 820px) {'), '共享 CSS 须有 820px 组件收窄');
  assert.ok(html.includes('@media(max-width:820px){'), 'toast 运行时 CSS 须有 820px 分支');
  assert.ok(html.includes('var DEFAULT_MAX = 5;'), 'toast 栈默认容量须为 5');
  assert.ok(html.includes('var MOBILE_MAX = 3;'), 'toast 移动端收窄须为 3');
  assert.ok(html.includes("matchMedia('(max-width: 820px)')"), 'toast 须按 820px 视口切换容量');
});

test('#134 ⑤ token 覆盖序：壳 :root 在前，共享 token A 组在后', () => {
  const html = renderHelpShellHtml(buildHelpFileData(D0));
  const shellBg = html.indexOf('--bg:#f2f2f7');
  const sharedBg = html.indexOf('--bg: #f5f5f7');
  assert.ok(shellBg >= 0, '壳 token 须在（--bg:#f2f2f7）');
  assert.ok(sharedBg >= 0, '共享 token A 组须在（--bg: #f5f5f7）');
  assert.ok(shellBg < sharedBg, '覆盖序：壳在前、共享在后（以后加载覆盖为准）');
  assert.ok(html.includes('--fg:#1d1d1f'), '壳主文字 token 须在');
});

test('#134 ⑥ 数据契约：5 键＋10组/54子组/436场景＋subtitle 分钟', () => {
  const data = buildHelpFileData(D0);
  const back = parseHelpData(renderHelpShellHtml(data));
  assert.deepEqual(Object.keys(back).sort(), ['contact', 'groups', 'skill_name', 'subtitle', 'title']);
  assert.equal(back.subtitle, '10 分类 · 436 场景 · 更新于 2026-09-06 22:07');
  assert.equal(back.groups.length, 10);
  assert.equal(back.groups.reduce((n, g) => n + g.subgroups.length, 0), 54);
  assert.equal(
    back.groups.reduce((n, g) => n + g.subgroups.reduce((a, s) => a + s.scenes.length, 0), 0),
    436,
  );
});

test('#134 ⑦ 接线转发一致：renderHelpFileHtml ≡ renderHelpShellHtml', () => {
  const data = buildHelpFileData(D0);
  assert.equal(renderHelpFileHtml(data), renderHelpShellHtml(data));
  for (const bad of [null, undefined, { skill_name: '卡路里' }, { groups: [] }]) {
    assert.throws(() => renderHelpShellHtml(bad),
      (e) => e instanceof CalorieRenderError && e.code === 'missing-data');
  }
});

test('#134 ⑧ 小于号转义：容器内无原生 </script>，parse 后逐字', () => {
  const data = buildHelpFileData(D0);
  const evil = {
    ...data,
    groups: [{
      id: 'g',
      icon: 'x',
      label: 'L',
      subgroups: [{
        id: 's',
        label: 'S',
        scenes: [{
          id: 'a',
          title: 'T</script><script>alert(1)</script>',
          wake_word: 'w',
          status: '',
          prompt_template: 'p<script>',
          types: ['结果'],
        }],
      }],
    }],
  };
  const html = renderHelpShellHtml(evil);
  const body = html.match(/<script id="help-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(body, '转义后容器须可定位');
  assert.ok(!body[1].includes('</script>'), '容器内不得有原生 </script>');
  assert.equal(JSON.parse(body[1]).groups[0].subgroups[0].scenes[0].title,
    'T</script><script>alert(1)</script>');
});
