/** 使用手册入口与弹出空壳（票 #1237，只做入口与弹出，不做书体）。
 *
 * 真值（冲突以冻结原型为准）：
 * - 冻结原型 docs/plugins/plugin-manager/proto-manual-4scenes.html（最高真值，每字每像素）；
 * - 定版 docs/plugins/plugin-manager/手册正文-定版-20261009.html 的入口六条（逐字 v2 甲）。
 * 本件的 manualEntryCss() 即那六条逐字，不重新设计；书体一律不做（书体是 #1238 的活）。
 *
 * 形态：纯函数，吃 props 回元素树，不留状态、不取数、不碰 DOM（document／window／process）。
 * 手写 React.createElement（本包 client 束禁 JSX）。样式只此一处生成，挂法照 config-panel-view
 * 的 interactionCss 先例：调用方在卡片首位挂一枚 <style>，类名即原型那六个（bkbtn／stage／
 * eabook／eaband／plate），外加本票的新壳 manual-popover（空壳定位与关闭，与书体无关）。
 *
 * 卷轴旧实现只读不改：本件不引用旧卷轴两件。
 */

import * as React from 'react';

/** 入口上的两处字样（腰封＋名牌各印一次，定义只此一处）。 */
export const MANUAL_ENTRY_LABEL = '使用手册' as const;

/** 入口按钮 props：点开回调（唯一真干活的那一格）。 */
export interface ManualEntryButtonProps {
  readonly onOpen: () => void;
}

/** 弹出空壳 props：开合＋关闭回调（两格都是行为，无展示配置）。 */
export interface ManualPopoverShellProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

/** 入口六条 ENTRY_CSS（逐字 v2 甲）＋本票空壳两条（壳定位与标题行，书体不在这里）。
 *
 * 前六条与冻结原型 :93-98 逐字同值：红封渐变／书脊 12px／米色腰封／名牌字距，一字不改；
 * 后两条是 1237 新壳（popover 定位＋空壳占位），与书体无关，1238 做书体时不动它们。
 */
export function manualEntryCss(): string {
  return (
    '.bkbtn{display:flex;flex-direction:column;align-items:center;gap:10px;background:none;border:none;cursor:pointer;padding:6px 10px 10px}' +
    '.stage{position:relative;width:76px;height:104px;filter:drop-shadow(0 10px 10px #00000088)}' +
    '.eabook{display:block;position:relative;width:72px;height:100px;border-radius:5px 8px 8px 5px;background:linear-gradient(135deg,#9c2f2f,#5f1616 65%,#3a0d0d);border:1px solid #d9ab3c;position:relative;box-shadow:5px 7px 12px #0009}' +
    ".eabook:before{content:'';position:absolute;left:0;top:0;bottom:0;width:12px;background:linear-gradient(90deg,#320b0b,#571414);border-radius:5px 0 0 5px}" +
    '.eabook .eaband{position:absolute;left:-4px;right:-4px;top:34px;height:26px;background:#ece0c2;display:flex;align-items:center;justify-content:center;color:#5c1010;font-size:12px;letter-spacing:.2em;box-shadow:0 2px 4px #00000066}' +
    '.plate{margin-top:14px;background:linear-gradient(#4a1f1a,#2a0f0c);border:1px solid #8a6a15;border-radius:4px;color:#e8c96a;font-size:13px;letter-spacing:.3em;text-indent:.3em;padding:4px 18px;text-shadow:0 -1px 1px #000;}' +
    '.manual-popover{position:absolute;top:34px;right:0;z-index:40;min-width:220px;max-width:320px;padding:12px 14px;border-radius:10px;border:1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.35));background:var(--dsw-alias-bg-layer-1, #232324);color:var(--dsw-alias-label-primary, inherit);box-shadow:0 14px 30px rgba(0,0,0,.4)}' +
    '.manual-popover-title{font-size:13px;font-weight:700;margin-bottom:6px}'
  );
}

/** 入口图标（红封＋书脊＋米色腰封＋名牌）：原型 ENTRY_HTML 逐字结构，onclick 接出点开。
 *
 * 无障碍：button 语义＋aria-label＋title，键盘可达；按压反馈走 data-ilife-press（与标题行两入口同语言）。
 */
export function ManualEntryButton(props: ManualEntryButtonProps): React.ReactElement {
  return React.createElement(
    'button',
    {
      type: 'button',
      className: 'bkbtn',
      title: MANUAL_ENTRY_LABEL,
      'aria-label': '打开' + MANUAL_ENTRY_LABEL,
      'data-ilife-press': 'manual-entry',
      onClick: props.onOpen,
    },
    React.createElement(
      'span',
      { className: 'stage' },
      React.createElement(
        'span',
        { className: 'eabook' },
        React.createElement('span', { className: 'eaband' }, MANUAL_ENTRY_LABEL),
      ),
    ),
    React.createElement('span', { className: 'plate' }, MANUAL_ENTRY_LABEL),
  );
}

/** 弹出 popover 书空壳：关着回 null，开着回空壳（标题＋占位＋关闭钮，无书体）。
 *
 * 空壳即验收口径：书体是 #1238 的活，这里只给框，不给场景文案（基本使用／数据目录／
 * 增强体验任一出现即越界）。关闭经 onClose 接出，调用方置 open 即可。
 */
export function ManualPopoverShell(props: ManualPopoverShellProps): React.ReactElement | null {
  if (!props.open) return null;
  return React.createElement(
    'div',
    { className: 'manual-popover', role: 'dialog', 'aria-label': MANUAL_ENTRY_LABEL },
    React.createElement('div', { className: 'manual-popover-title' }, MANUAL_ENTRY_LABEL),
    React.createElement('div', null, '书体待后续补（空壳）'),
    React.createElement('button', { type: 'button', onClick: props.onClose }, '关闭'),
  );
}
