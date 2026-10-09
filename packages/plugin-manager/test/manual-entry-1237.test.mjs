// 票 #1237 入口与弹出空壳：总管爱生活卡上的使用手册图标（红封＋书脊＋米色腰封＋名牌），点开弹出 popover 书空壳。
// 真值：docs/plugins/plugin-manager/proto-manual-4scenes.html（冻结原型，最高）＋ 手册正文-定版-20261009.html ENTRY（逐字 v2 甲）。
// 只做入口与弹出，不做书体（书体是 #1238 的活）；卷轴旧实现只读不改（本件不许 import seal-scroll/seal-stamp）。
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
  it('入口图标：按钮上有两个“使用手册”（米色腰封＋名牌），点开回调可接', () => {
    const { ManualEntryButton } = ENTRY;
    assert.equal(typeof ManualEntryButton, 'function');
    let opened = 0;
    const el = ManualEntryButton({ onOpen: () => { opened += 1; } });
    const dump = JSON.stringify(el);
    // 腰封与名牌各印一次“使用手册”（原型 ENTRY_HTML 逐字；另有 title／aria 各带一次，故只断言下限）
    assert.ok(dump.split('使用手册').length - 1 >= 2, '按钮上须至少有两个“使用手册”字样');
    assert.ok(dump.includes('eabook'), '缺红封书体 eabook');
    assert.ok(dump.includes('eaband'), '缺米色腰封 eaband');
    assert.ok(dump.includes('plate'), '缺名牌 plate');
    assert.ok(dump.includes('bkbtn'), '缺入口按钮 bkbtn');
    // 点开：onOpen 可被调用（行为经 props.onClick 接出，不直写 DOM）
    const props = el?.props ?? {};
    assert.equal(typeof props.onClick, 'function', '按钮须经 onClick 接出点开');
    props.onClick();
    assert.equal(opened, 1);
  });

  it('入口样式：ENTRY_CSS 逐字（红封＋书脊＋腰封＋名牌六条）', () => {
    const css = ENTRY.manualEntryCss();
    for (const needle of ['.bkbtn', '.stage', '.eabook', '.eabook:before', '.eabook .eaband', '.plate']) {
      assert.ok(css.includes(needle), 'ENTRY_CSS 缺 ' + needle);
    }
    // 逐字抽查：红封渐变、书脊 12px、腰封米色、名牌字距
    assert.ok(css.includes('linear-gradient(135deg,#9c2f2f,#5f1616 65%,#3a0d0d)'), '红封底色不对');
    assert.ok(css.includes('width:12px'), '书脊宽度不对');
    assert.ok(css.includes('background:#ece0c2'), '腰封米色不对');
    assert.ok(css.includes('letter-spacing:.3em'), '名牌字距不对');
  });

  it('弹出：关着返回空，点开出空壳（有书框无书体，书体是 1238 的活）', () => {
    const { ManualPopoverShell } = ENTRY;
    assert.equal(typeof ManualPopoverShell, 'function');
    assert.equal(ManualPopoverShell({ open: false, onClose: () => {} }), null);
    const el = ManualPopoverShell({ open: true, onClose: () => {} });
    const dump = JSON.stringify(el);
    assert.ok(dump.includes('manual-popover'), '缺 popover 壳');
    assert.ok(dump.includes('使用手册'), '壳上须有标题');
    // 空壳：不得出现书体场景文案（基本使用／数据目录／增强体验任一出现即越界到 1238）
    for (const body of ['基本使用', '数据目录', '增强体验']) {
      assert.ok(!dump.includes(body), '空壳里不许出现书体：' + body);
    }
    const props = el?.props ?? {};
    // 壳须能关（经 onClose 接出）
    assert.ok(JSON.stringify(props).includes('onClose') || dump.includes('关闭') || dump.includes('收起'), '壳须有可关出口');
  });

  it('总管卡已挂入口：产物 client.js 里有图标与 popover 壳', () => {
    assert.ok(CLIENT.includes('使用手册'), '产物里没有“使用手册”');
    assert.ok(CLIENT.includes('eabook'), '产物里没有红封 eabook');
    assert.ok(CLIENT.includes('manual-popover'), '产物里没有 popover 壳 manual-popover');
  });

  it('未碰卷轴旧代码：本件不 import seal-scroll/seal-stamp', () => {
    assert.ok(!ENTRY_SRC.includes('seal-scroll.js'), '不许碰 seal-scroll');
    assert.ok(!ENTRY_SRC.includes('seal-stamp.js'), '不许碰 seal-stamp');
    assert.ok(!ENTRY_SRC.includes("from './seal"), '不许从旧卷轴件 import');
  });
});
