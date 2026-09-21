/** 派生能力的页面装配（三卡各一页，全走公共层区块，不自写样式）。
 *
 * 配方来源：`docs/skills/skill-chef/t768-页面族配方.md`
 *   · 添加／派生回执走回执型（结论条＋事实条＋变更行＋动作行＋复制区）；
 *   · 家族树走结果型（事实条＋分节折叠；关系表 0 行按空态，不新造页内形状）。
 * 正文段落走 #860 件（renderProseBlock），一段正文不再用页内补丁。
 */

import { renderActionBar, renderEmptyState, renderFactStrip } from 'base-paint';
import {
  renderCaliberLine,
  renderChangeRows,
  renderConclusionBar,
  renderCopyBlock,
  renderDisclosure,
  renderPageShell,
  renderProseBlock,
} from 'base-paint/blocks';
import { renderDocShell } from 'base-paint/docShell';
import { chefSceneCss } from '../render/skin.js';

function shell(title: string, eyebrow: string, blocks: string[]): string {
  return renderDocShell({
    docTitle: title,
    bodyHtml: renderPageShell({ eyebrow, title, content: blocks.join('') }),
    extraCss: chefSceneCss(),
    pageUi: true,
  });
}

const act = (buttons: { label: string; kind: 'primary' | 'ghost'; actionId: string }[]): string =>
  renderActionBar({ buttons });

/** 添加派生关系回执页（回执型）。 */
export function relationAddPage(input: { parent: string; child: string; relationType: string; changeSummary: string }): string {
  const blocks = [
    renderConclusionBar('已记下这组派生关系。'),
    renderFactStrip({
      items: [
        { label: '父菜', value: input.parent },
        { label: '子菜', value: input.child },
        { label: '类型', value: input.relationType },
      ],
    }),
    renderProseBlock({ text: input.changeSummary }),
    renderCaliberLine('这组关系已写进菜谱库。'),
    act([
      { label: '看看子菜的家族', kind: 'primary', actionId: 'relation-tree' },
      { label: '再记一组关系', kind: 'ghost', actionId: 'relation-again' },
    ]),
    renderCopyBlock({
      title: '复制关系说明',
      dataActionId: 'relation-copy',
      dataText: input.parent + '到' + input.child + '（' + input.relationType + '）：' + input.changeSummary,
    }),
  ];
  return shell('记派生关系回执', '私家大厨 ｜ 派生', blocks);
}

/** 家族树页（结果型）。0 行按空态，有数按三节折叠（祖先／当前／后代）。 */
export function relationTreePage(input: {
  root: string;
  ancestors: readonly { name: string; level: number; relation_type: string; change_summary: string }[];
  descendants: readonly { name: string; level: number; relation_type: string; change_summary: string }[];
}): string {
  const empty = input.ancestors.length === 0 && input.descendants.length === 0;
  if (empty) {
    const blocks = [
      renderConclusionBar('这道菜还没有派生关系。'),
      renderFactStrip({
        items: [
          { label: '菜名', value: input.root },
          { label: '祖先', value: '暂无' },
          { label: '后代', value: '暂无' },
        ],
      }),
      renderEmptyState({ text: '关系表暂无数据，有数据再看形状', hint: '先记一组关系，家族树自然长出来' }),
      renderCaliberLine('空态不是缺页，有数据再谈形状。'),
      act([{ label: '记一组派生关系', kind: 'primary', actionId: 'relation-add' }]),
    ];
    return shell('家族树', '私家大厨 ｜ 派生', blocks);
  }
  const ancestorRows = input.ancestors
    .map((a) => '第' + a.level + '代 ' + a.name + '（' + a.relation_type + '）')
    .join('\n');
  const descendantRows = input.descendants
    .map((d) => '第' + d.level + '代 ' + d.name + '（' + d.relation_type + '）')
    .join('\n');
  const blocks = [
    renderConclusionBar('这道菜共有' + (input.ancestors.length + input.descendants.length) + '组上下游关系。'),
    renderFactStrip({
      items: [
        { label: '当前', value: input.root },
        { label: '祖先', value: String(input.ancestors.length) + '代' },
        { label: '后代', value: String(input.descendants.length) + '代' },
      ],
    }),
    renderDisclosure({ title: '向上祖先', contentHtml: renderProseBlock({ text: ancestorRows }) }),
    renderDisclosure({ title: '当前', contentHtml: renderProseBlock({ text: input.root }) }),
    renderDisclosure({ title: '向下后代', contentHtml: renderProseBlock({ text: descendantRows }) }),
    renderCaliberLine('废弃菜谱不入树，代数由近及远。'),
    act([{ label: '记一组新关系', kind: 'primary', actionId: 'relation-add' }]),
  ];
  return shell('家族树', '私家大厨 ｜ 派生', blocks);
}

/** 从已有派生新菜回执页（回执型，含母子差异）。 */
export function relationDerivePage(input: { parent: string; child: string; differences: string }): string {
  const blocks = [
    renderConclusionBar('新菜已落库，父子关系一次写完。'),
    renderFactStrip({
      items: [
        { label: '母本', value: input.parent },
        { label: '新菜', value: input.child },
      ],
    }),
    renderChangeRows({
      rows: [
        { label: '这道新菜', before: '还没有', after: input.child },
        { label: '派生自', before: '无', after: input.parent },
      ],
    }),
    renderProseBlock({ text: input.differences }),
    renderCaliberLine('食材与步骤已按母本带数字用量继承。'),
    act([
      { label: '看看新菜怎么做', kind: 'primary', actionId: 'relation-view' },
      { label: '看看新菜的家族', kind: 'ghost', actionId: 'relation-tree' },
    ]),
    renderCopyBlock({
      title: '复制派生说明',
      dataActionId: 'derive-copy',
      dataText: '由' + input.parent + '派生' + input.child + '：' + input.differences,
    }),
  ];
  return shell('派生新菜回执', '私家大厨 ｜ 派生', blocks);
}
