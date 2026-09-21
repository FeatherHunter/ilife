/** 开始使用能力的页面装配（首次使用一页，全走公共层区块，不自写样式）。
 *
 * 老件骨架来源：`templates/开始使用/first_use_wizard.html`（环境检测→环境变量→建库→完成回执四步）。
 * 新页按同一四步组织，行为归宿主（页面只摆形状与状态，静态呈现）。
 */

import { renderActionBar, renderFactStrip } from 'base-paint';
import {
  renderCaliberLine,
  renderConclusionBar,
  renderCopyBlock,
  renderDisclosure,
  renderPageShell,
  renderProseBlock,
} from 'base-paint/blocks';
import { renderDocShell } from 'base-paint/docShell';
import { pageShapeCss, pageUiCss } from 'base-paint';

/** 首次使用向导页（过程型：分节折叠＋动作行）。 */
export function setupInitPage(input: { tables: number; initialized: boolean }): string {
  const done = input.initialized ? '本次已建齐' : '此前已建齐';
  const body = renderPageShell({
    eyebrow: '私家大厨 ｜ 开始使用',
    title: '首次使用',
    content: [
      renderConclusionBar('本地菜谱库已就绪，空库直接录第一道菜即上手。'),
      renderFactStrip({
        items: [
          { label: '业务表', value: String(input.tables) + '张' },
          { label: '状态', value: done },
          { label: '方式', value: '按需建库' },
        ],
      }),
      renderDisclosure({
        title: '环境检测',
        contentHtml: renderProseBlock({ text: '系统与目录读写正常，缺失项会在此列出并给出装前命令。' }),
      }),
      renderDisclosure({
        title: '建库',
        contentHtml: renderProseBlock({ text: '缺表则补齐，表齐则跳过，老库仅提示迁移不自动迁移。' }),
      }),
      renderDisclosure({
        title: '完成回执',
        contentHtml: renderProseBlock({ text: '初始化一次即可重复进出，不会重复建库。' }),
      }),
      renderCaliberLine('只在需要时建库建目录，已齐则只读不写。'),
      renderActionBar({
        buttons: [
          { label: '录第一道菜', kind: 'primary', actionId: 'setup-first' },
          { label: '看看全部菜谱', kind: 'ghost', actionId: 'setup-list' },
        ],
      }),
      renderCopyBlock({
        title: '复制上手说明',
        dataActionId: 'setup-copy',
        dataText: '本地菜谱库已就绪（' + input.tables + '张表' + done + '），空库直接录第一道菜。',
      }),
    ].join(''),
  });
  return renderDocShell({
    docTitle: '首次使用',
    bodyHtml: body,
    extraCss: pageUiCss() + '\n' + pageShapeCss(),
    pageUi: true,
  });
}
