// 票 #1237 入口与弹层：总管爱生活卡上的使用手册图标（红封＋书脊＋米色腰封），点开弹出书式弹层。
// 真值：docs/plugins/plugin-manager/proto-manual-4scenes.html（冻结原型，最高）＋ 手册正文-定版-20261009.html ENTRY（v2 甲）。
// 2026-10-10 用户验收三改（记在 #1240）：删底部名牌、整体缩小、开书改限制尺寸弹层——本文件的断言按改后口径。
// 读的是编译产物（tsc -b 之后再跑），与 manual-plan-1193 同一套写法。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ENTRY = await import('../dist/manual-entry.js');
const CLIENT = readFileSync(join(HERE, '..', 'dist', 'client.js'), 'utf8');
const ENTRY_SRC = readFileSync(join(HERE, '..', 'dist', 'manual-entry.js'), 'utf8');

describe('#1237 使用手册入口与弹出空壳', () => {
  it('入口图标：红色封皮＋米色腰封（腰封上印「使用手册」），点开回调可接', () => {
    const { ManualEntryButton } = ENTRY;
    assert.equal(typeof ManualEntryButton, 'function');
    let opened = 0;
    const el = ManualEntryButton({ onOpen: () => { opened += 1; } });
    const dump = JSON.stringify(el);
    assert.ok(dump.includes('eabook'), '缺红封书体 eabook');
    assert.ok(dump.includes('eaband'), '缺米色腰封 eaband');
    assert.ok(dump.includes('bkbtn'), '缺入口按钮 bkbtn');
    // 2026-10-10 用户验收：「删掉底部的那个使用手册那个字的控件」⇒ 名牌（.plate）连同字样一并去掉
    assert.ok(!dump.includes('plate'), '底部名牌已删，不许再出现 plate');
    const stageDump = JSON.stringify(el?.props?.children);
    assert.equal((stageDump.match(/使用手册/g) ?? []).length, 1, '「使用手册」只许剩腰封上那一次');
    // 点开：onOpen 可被调用（行为经 props.onClick 接出，不直写 DOM）
    const props = el?.props ?? {};
    assert.equal(typeof props.onClick, 'function', '按钮须经 onClick 接出点开');
    props.onClick();
    assert.equal(opened, 1);
  });

  it('入口样式：书那五条在场（红封＋书脊＋腰封），尺寸按用户 2026-10-10 收小', () => {
    const css = ENTRY.manualEntryCss();
    for (const needle of ['.bkbtn', '.stage', '.eabook', '.eabook:before', '.eabook .eaband']) {
      assert.ok(css.includes(needle), 'ENTRY_CSS 缺 ' + needle);
    }
    assert.ok(!css.includes('.plate'), '名牌那格样式应已删');
    // 逐字抽查：红封渐变、腰封米色（这两条照冻结原型不改）
    assert.ok(css.includes('linear-gradient(135deg,#9c2f2f,#5f1616 65%,#3a0d0d)'), '红封底色不对');
    assert.ok(css.includes('background:#ece0c2'), '腰封米色不对');
    // 2026-10-10 用户验收「整体缩小」：76×104 → 34×46（书脊 12px → 5px）。这条挡的是「照原型改回去」。
    assert.ok(css.includes('.stage{position:relative;width:34px;height:46px'), '入口舞台尺寸应为 34×46');
    assert.ok(css.includes('.eabook{display:block;position:relative;width:32px;height:44px'), '书体尺寸应为 32×44');
    assert.ok(css.includes('width:5px'), '书脊宽度应为 5px');
  });

  it('弹出：关着返回空；开着是透明点外关闭层＋书那一格＋常驻关闭钮，书体由 children 传入', () => {
    const { ManualPopoverShell } = ENTRY;
    assert.equal(typeof ManualPopoverShell, 'function');
    assert.equal(ManualPopoverShell({ open: false, onClose: () => {} }), null);
    // 不传 children：书那一格里只有关闭钮，不许自带任何书体文案（书体是调用方传的）
    let closed = 0;
    const bare = ManualPopoverShell({ open: true, onClose: () => { closed += 1; } });
    const bareDump = JSON.stringify(bare);
    assert.ok(bareDump.includes('manual-layer'), '缺透明点外关闭层 manual-layer');
    assert.ok(bareDump.includes('manual-popover'), '缺书那一格 manual-popover');
    assert.ok(bareDump.includes('使用手册'), '弹层上须有「使用手册」（aria-label）');
    assert.ok(bareDump.includes('manual-popover-close'), '缺常驻关闭钮 manual-popover-close');
    for (const body of ['基本使用', '数据目录', '增强体验']) {
      assert.ok(!bareDump.includes(body), '不传 children 时不许出现书体：' + body);
    }
    // 点书以外的任何地方＝关：外层那一格的 onClick 就是 onClose
    assert.equal(typeof bare?.props?.onClick, 'function', '点外关闭层须有 onClick');
    bare.props.onClick();
    assert.equal(closed, 1, '点书以外必须能关');
    // 书那一格自己的点击不外传（否则点书也会被外层当成「书外」）
    const wrap = [bare?.props?.children].flat().find((c) => c !== null && c !== undefined && JSON.stringify(c).includes('manual-popover"'));
    assert.ok(wrap !== undefined, '找不到书那一格');
    let stopped = 0;
    wrap.props.onClick({ stopPropagation: () => { stopped += 1; } });
    assert.equal(stopped, 1, '书那一格须拦住冒泡');
    assert.equal(closed, 1, '点书不许触发关闭');
    // 关闭钮经 onClose 接出（点它必须能关）
    const btn = [wrap?.props?.children].flat().find((c) => c !== null && c !== undefined && JSON.stringify(c).includes('manual-popover-close'));
    assert.ok(btn !== undefined, '找不到关闭钮那一格');
    btn.props.onClick();
    assert.equal(closed, 2, '关闭钮须经 onClose 接出');
    // 传 children：书体原样铺进书那一格（#1240 起弹层不再只是空壳）
    const filled = ManualPopoverShell({ open: true, onClose: () => {}, children: '基本使用' });
    assert.ok(JSON.stringify(filled).includes('基本使用'), 'children 里的书体没铺进去');
    // 形制（2026-10-10 第六轮）：`<dialog>` 点外层（top layer，不留黑底）＋ 书那一格**没有黑底框**
    assert.equal(bare?.type, 'dialog', '外层须是 <dialog>（showModal 才能进 top layer）');
    assert.equal(bare?.props?.open, undefined, '不许带 open：带 open 时 showModal 会抛「已按普通方式打开」');
    assert.equal(typeof bare?.props?.onCancel, 'function', 'ESC 关（原生 cancel）也要把开合态收回来');
    assert.equal(typeof bare?.props?.onClose, 'function', '原生 close 同样要收回开合态');
    const css = ENTRY.manualEntryCss();
    assert.ok(css.includes('.manual-layer{position:fixed;inset:0;box-sizing:border-box'), '点外层须满屏且清掉 UA 的框');
    assert.ok(css.includes('z-index:2147483000'), '点外层仍给最高 z-index 兜底');
    assert.ok(css.includes('background:transparent'), '外层必须透明（不许黑底）');
    assert.ok(css.includes('.manual-layer::backdrop{background:transparent}'), 'UA 那层半黑 backdrop 必须清掉');
    assert.ok(!css.includes('background:#15130f'), '书的深色舞台底已去掉');
    assert.ok(!css.includes('border-radius:16px') && !css.includes('box-shadow:0 24px 64px'), '黑框的圆角与投影已去掉');
    assert.ok(css.includes('.manual-popover{position:relative;box-sizing:border-box'), '书那一格不再自带定位与底框');
    // 关闭钮的选择器必须带前缀压过 `[data-ilife-press]{position:relative}` 那条同权重的规则
    assert.ok(css.includes('.manual-popover .manual-popover-close{position:absolute'), '关闭钮须用带前缀的选择器钉在右上角');
  });

  it('屏上只许一枚入口：client.ts 只留 manual-entry.ts 那一条接线', () => {
    // 2026-10-10 用户验收发现「右边多了一个」：#1237 曾被两条线各做一遍，合并后屏上出现两枚
    // （内联那份用 inline 样式，类名断言抓不到）。这条从源码层钉住「只此一处接线」。
    const src = readFileSync(join(HERE, '..', 'src', 'client.ts'), 'utf8');
    const sites = src.split('React.createElement(ManualEntryButton').length - 1;
    assert.equal(sites, 1, 'client.ts 里入口接线应恰一处，实为 ' + sites);
    assert.ok(!/function ManualEntry\(/.test(src), 'client.ts 里不许再有内联的手册入口组件');
    assert.ok(!src.includes("'ilife-manual-book'"), '旧的内联弹层 id 不许留');
    assert.ok(src.includes('ManualBookShell'), '书体须挂在弹层里');
  });

  it('总管卡已挂入口：产物 client.js 里有图标与 popover 框', () => {
    assert.ok(CLIENT.includes('使用手册'), '产物里没有“使用手册”');
    assert.ok(CLIENT.includes('eabook'), '产物里没有红封 eabook');
    assert.ok(CLIENT.includes('manual-popover'), '产物里没有 popover 框 manual-popover');
    assert.ok(CLIENT.includes('manual-popover-close'), '产物里没有关闭钮');
  });

  it('未碰卷轴旧代码：本件不 import seal-scroll/seal-stamp', () => {
    assert.ok(!ENTRY_SRC.includes('seal-scroll.js'), '不许碰 seal-scroll');
    assert.ok(!ENTRY_SRC.includes('seal-stamp.js'), '不许碰 seal-stamp');
    assert.ok(!ENTRY_SRC.includes("from './seal"), '不许从旧卷轴件 import');
  });
});
