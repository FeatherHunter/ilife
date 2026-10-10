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

/** 弹出弹层 props：开合＋关闭回调（两格都是行为）＋书体（#1240 起由调用方传进来）。 */
export interface ManualPopoverShellProps {
  readonly open: boolean;
  readonly onClose: () => void;
  /** 书体：开着时铺在弹层里（关着整框不渲染）。 */
  readonly children?: React.ReactNode;
}

/** 入口 CSS（书那五条源自 v2 甲）＋弹层两条（框与关闭钮，书体不在这里）。
 *
 * **2026-10-10 用户验收三改（记在票 #1240）**：
 * ① 76×104 → 34×46（真面板里显大，先收 62%，再按「整体缩小」收到现在的 34×46）；
 * ② **删掉底部那张名牌**（用户原话「删掉底部的那个使用手册那个字的控件」）——「使用手册」
 *    只剩腰封上印一次，名牌那条 `.plate` 连同样式一并去掉；
 * ③ 入口不再往行里加高：调用方那格里给了负下边距（见 `client.ts` 的 `manualEntrySlot`），
 *    书可以往下探进「配置体检」那一行的留白，但不把标题行撑高（用户：「允许这个入口横跨
 *    多个区域而不是把同一行给弄得很高」）。
 * 除尺寸与删名牌外，其余取值（红封渐变、书脊色、腰封米色）一字未改；别再照原型那六个像素值改回去。
 */
export function manualEntryCss(): string {
  return (
    '.bkbtn{display:flex;flex-direction:column;align-items:center;background:none;border:none;cursor:pointer;padding:2px 6px 0}' +
    '.stage{position:relative;width:34px;height:46px;filter:drop-shadow(0 4px 5px #00000088)}' +
    '.eabook{display:block;position:relative;width:32px;height:44px;border-radius:2px 4px 4px 2px;background:linear-gradient(135deg,#9c2f2f,#5f1616 65%,#3a0d0d);border:1px solid #d9ab3c;position:relative;box-shadow:2px 3px 6px #0009}' +
    ".eabook:before{content:'';position:absolute;left:0;top:0;bottom:0;width:5px;background:linear-gradient(90deg,#320b0b,#571414);border-radius:2px 0 0 2px}" +
    '.eabook .eaband{position:absolute;left:-2px;right:-2px;top:17px;height:11px;background:#ece0c2;display:flex;align-items:center;justify-content:center;color:#5c1010;font-size:6px;letter-spacing:.06em;box-shadow:0 1px 2px #00000066}' +
    '.manual-popover{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:50;box-sizing:border-box;width:min(900px,calc(100vw - 48px));max-height:min(88vh,900px);overflow:auto;padding:20px;border-radius:16px;border:1px solid rgba(217,171,60,.45);background:#15130f;color:#e8dcc2;box-shadow:0 24px 64px rgba(0,0,0,.55);font-family:system-ui,"Microsoft YaHei",sans-serif;--paper-w:min(780px,calc(100vw - 96px))}' +
    '.manual-popover-close{position:sticky;top:0;display:flex;margin-left:auto;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;border:1px solid #3a352c;background:#1c1913cc;color:#cfc4ad;font-size:16px;line-height:1;cursor:pointer;z-index:3}'
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
 * 2026-10-10 用户验收改形态（记在 #1240）：原先打开书是 `position:fixed;inset:0` 的整屏舞台
 * （把面板整个盖掉），用户要求「popover 的形式不干扰其他 UI ＋ 提供一个关闭按钮」。
 * 现形制＝居中限制尺寸框（`min(900px,calc(100vw - 48px))`、高不超 88vh、内部滚动），
 * 面板其余部分照旧可见可点；右上角关闭钮常驻（内容滚动时钉住）。
 * 框内的书体由调用方经 children 传入；不传 children 时框里只有关闭钮。
 */
export function ManualPopoverShell(props: ManualPopoverShellProps): React.ReactElement | null {
  if (!props.open) return null;
  return React.createElement(
    'div',
    {
      className: 'manual-popover',
      role: 'dialog',
      'aria-label': MANUAL_ENTRY_LABEL,
      'data-ilife-manual': 'book-shell',
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
  );
}
