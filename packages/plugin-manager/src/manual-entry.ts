/** 使用手册入口与书式弹层（票 #1237 起；#1240 接线书体、2026-10-10 按用户验收改尺寸与形态）。
 *
 * 真值：
 * - 冻结原型 docs/plugins/plugin-manager/proto-manual-4scenes.html（最高真值，每字每像素）；
 * - 定版 docs/plugins/plugin-manager/手册正文-定版-20261009.html 的入口六条（v2 甲）。
 * **两处 2026-10-10 的用户改动（记在票 #1240）**：① 入口图标按 ≈62% 收小（原型 76×104 → 48×66）；
 * ② 打开书从「整屏舞台」改成「居中限制尺寸的弹层＋常驻关闭钮」。除这两处，其余取值照原型。
 *
 * 形态：纯函数，吃 props 回元素树，不留状态、不取数、不碰 DOM（document／window／process）。
 * 手写 React.createElement（本包 client 束禁 JSX）。样式只此一处生成，挂法照 config-panel-view
 * 的 interactionCss 先例：调用方在卡片首位挂一枚 <style>，类名即原型那六个（bkbtn／stage／
 * eabook／eaband／plate），外加弹层两条（manual-popover／manual-popover-close）。
 *
 * 卷轴旧实现只读不改：本件不引用旧卷轴两件。
 */

import * as React from 'react';
import { MANUAL_ENTRY } from './nav.js';

/** 入口上的两处字样（腰封＋名牌各印一次，定义只此一处）。单一来源＝导航表那行。 */
export const MANUAL_ENTRY_LABEL = MANUAL_ENTRY.title;

/** 入口按钮 props：点开回调（唯一真干活的那一格）。 */
export interface ManualEntryButtonProps {
  readonly onOpen: () => void;
}

/** 弹出弹层 props：开合＋关闭回调（两格都是行为）＋书体＋dialog 元素那枚 ref。 */
export interface ManualPopoverShellProps {
  readonly open: boolean;
  readonly onClose: () => void;
  /** 书体：开着时铺在弹层里（关着整框不渲染）。 */
  readonly children?: React.ReactNode;
  /** 弹层那枚 `<dialog>` 的 ref：由调用方在 effect 里 `showModal()` 把它送进 top layer。 */
  readonly dialogRef?: React.Ref<HTMLDialogElement>;
}

/** 入口 CSS（书那五条源自 v2 甲）＋弹层两组（透明点外关闭层 ＋ 书那一格，关闭钮）。
 *
 * **2026-10-10 用户验收（记在票 #1240）**：
 * ① 76×104 → 34×46（先按「太大」收 62%，再按「整体缩小」收到现在的 34×46）；
 * ② **删掉底部那张名牌**（用户：「删掉底部的那个使用手册那个字的控件」）——「使用手册」
 *    只剩腰封上印一次，名牌那条 `.plate` 连同样式一并去掉；
 * ③ 开书不再动行高，也不再有深色框：`manual-layer`（透明、满屏、最高层）只干两件事——
 *    吃掉书以外的点击（点书外即关）与把书摆在正中；`manual-popover` 就是书那一格，
 *    **没有底色、没有边框、没有圆角框、没有投影**（用户：「不要有黑色背景的框」）。
 *    z-index 取到 int 上限附近：用户实测面板里「保存／重置为默认／重新读取」那条底栏会盖在
 *    书上（用户：「多个按钮的层级超过了这个书籍的层级」），开书时必须压住它。
 */
export function manualEntryCss(): string {
  return (
    '.bkbtn{display:flex;flex-direction:column;align-items:center;background:none;border:none;cursor:pointer;padding:2px 6px 0}' +
    '.stage{position:relative;width:34px;height:46px;filter:drop-shadow(0 4px 5px #00000088)}' +
    '.eabook{display:block;position:relative;width:32px;height:44px;border-radius:2px 4px 4px 2px;background:linear-gradient(135deg,#9c2f2f,#5f1616 65%,#3a0d0d);border:1px solid #d9ab3c;position:relative;box-shadow:2px 3px 6px #0009}' +
    ".eabook:before{content:'';position:absolute;left:0;top:0;bottom:0;width:5px;background:linear-gradient(90deg,#320b0b,#571414);border-radius:2px 0 0 2px}" +
    '.eabook .eaband{position:absolute;left:-2px;right:-2px;top:17px;height:11px;background:#ece0c2;display:flex;align-items:center;justify-content:center;color:#5c1010;font-size:6px;letter-spacing:.06em;box-shadow:0 1px 2px #00000066}' +
    '.manual-layer{position:fixed;inset:0;box-sizing:border-box;width:auto;height:auto;max-width:none;max-height:none;margin:0;padding:0;border:0;background:transparent;color:inherit;z-index:2147483000;display:flex;align-items:center;justify-content:center}' +
    // 弹层是 <dialog>：能 showModal 的宿主会把它送进浏览器 top layer（那里 z-index 说了不算，
    // 谁也压不住）；::backdrop 是 UA 默认那层半黑，必须清掉（用户：「不要有黑色背景的框」）。
    '.manual-layer::backdrop{background:transparent}' +
    '.manual-popover{position:relative;box-sizing:border-box;width:min(900px,calc(100vw - 48px));max-height:min(88vh,900px);overflow:auto;color:#e8dcc2;font-family:system-ui,"Microsoft YaHei",sans-serif;--paper-w:min(780px,calc(100vw - 96px))}' +
    // 选择器带 `.manual-popover` 前缀是必须的：本体触发器的交互样式里有一条
    // `[data-ilife-press]{position:relative;overflow:hidden}`（config-panel-view.ts），
    // 与单类选择器同权重、排在后头 —— 只写 `.manual-popover-close` 的话会被它压成 relative，
    // 关闭钮就落到书那一格的左上角去了（2026-10-10 实测：computed position=relative）。
    '.manual-popover .manual-popover-close{position:absolute;top:0;right:0;z-index:3;display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;border:1px solid #3a352c;background:#1c1913cc;color:#cfc4ad;font-size:16px;line-height:1;cursor:pointer}'
  );
}

/** 入口图标（红封＋书脊＋米色腰封）：原型 ENTRY_HTML 的书那一段，onclick 接出点开。
 *
 * 2026-10-10 按用户要求**删掉底部名牌**（`.plate`）：「使用手册」只剩下腰封上那一处；
 * 无障碍：button 语义＋aria-label＋title（`MANUAL_ENTRY.tip`），键盘可达；按压反馈走
 * data-ilife-press（与标题行两入口同语言）。
 */
export function ManualEntryButton(props: ManualEntryButtonProps): React.ReactElement {
  return React.createElement(
    'button',
    {
      type: 'button',
      className: 'bkbtn',
      title: MANUAL_ENTRY.tip,
      'aria-label': MANUAL_ENTRY.tip,
      // 按压反馈的键取导航表那一行（'manual'）——四个手册用例按它找入口，别再各写一份。
      'data-ilife-press': MANUAL_ENTRY.key,
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
  );
}

/** 弹出弹层：关着回 null，开着回**浮在面板上的限制尺寸框**（关闭钮 ＋ children 里的书体）。
 *
 * 2026-10-10 用户验收两改（记在 #1240）：
 * ① 去掉深色框——**不再有整屏舞台、也不再有黑色底框／边框／投影**；现在外面那层
 *    `manual-layer` 是透明的满屏层，只负责「吃书以外的点击」与「把书摆正中」；
 * ② **点书以外任何地方即关**（点空白处不会漏到下面的面板控件上），关闭钮仍常驻在书的右上角。
 * 开书时这一层压在最上面（`z-index:2147483000`），面板底部那条「保存／重置为默认／重新读取」
 * 也盖不住它。框内的书体由调用方经 children 传入；不传 children 时只有关闭钮。
 */
export function ManualPopoverShell(props: ManualPopoverShellProps): React.ReactElement | null {
  if (!props.open) return null;
  return React.createElement(
    // `<dialog>`：调用方拿到 ref 后 showModal() 即进 top layer —— 面板底栏、插件浮层都压不住它
    // （2026-10-10 用户实测那两层都盖在书上）。**这里不写 `open`**：带 open 的 dialog 是
    // 「已按普通方式打开」，此时 showModal() 会抛 InvalidStateError（实测原文：The dialog is
    // already open as a non-modal dialog…）；由调用方 showModal 成功、或失败时补 `open` 兜底。
    'dialog',
    {
      className: 'manual-layer',
      ref: props.dialogRef,
      // 点书以外的任何地方＝关（与 ::backdrop 同一层，点和背景都落在这一格上）
      onClick: props.onClose,
      // ESC 关（浏览器原生 cancel→close）也要把调用方的开合态收回来，否则书会「自己没了、状态还开着」
      onCancel: props.onClose,
      onClose: props.onClose,
    },
    React.createElement(
      'div',
      {
        className: 'manual-popover',
        role: 'dialog',
        'aria-label': MANUAL_ENTRY_LABEL,
        'data-ilife-manual': 'book-shell',
        // 书自己那一格的点击不外传（否则点书也会被上面那层当成「书外」）
        onClick: (event: React.MouseEvent) => { event.stopPropagation(); },
      },
      React.createElement(
        'button',
        {
          type: 'button',
          className: 'manual-popover-close',
          title: '关闭' + MANUAL_ENTRY_LABEL,
          'aria-label': '关闭' + MANUAL_ENTRY_LABEL,
          'data-ilife-press': 'manual-close',
          onClick: props.onClose,
        },
        '×',
      ),
      props.children ?? null,
    ),
  );
}
