/** 数据管理能力的页面装配（三卡各一页，全走公共层区块，不自写样式）。
 *
 * 配方来源：`docs/skills/skill-chef/t768-页面族配方.md`
 *   · 体检走结果型（结论条＋事实条＋逐菜折叠）；
 *   · 批量改走过程型目标形态（事实条＋分组折叠＋变更行＋动作行）；
 *   · 备份走回执型（结论条＋事实条＋动作行＋复制区）。
 * 老件对照：体检逐菜详情见 `data_quality_report.html`，批量三页见 `batch_edit.html`，
 * 备份完成页见 `backup_receipt.html`（信息组织取老件，视觉走公共层）。
 *
 * #871 E 类裁定（2026-09-21）：原体检页／备份页各有一组**读数卡**（`renderKpiGrid`，3 张），
 * 读数与紧邻的事实条**同源重复**；公共层 `pageUi` ⑥ 在 ≤640 档把读数卡栅格写成两列 ⇒ 3 张卡必然
 * 排成「两格 ＋ 一张孤卡、右侧整格空着」（390 端实测，终审 68 分那一格）。本包不许改公共层，
 * 故在页面侧收口：**读数只留事实条一份**（flex 按内容换行，无栅格空位），不再出读数卡网格。
 * 若日后要恢复三格读数卡，须先给公共层补「奇数格在 ≤640 档」一条规则（另立票，见 #871 遗留出口）。
 */

import { renderActionBar, renderFactStrip } from 'base-paint';
import {
  renderCaliberLine,
  renderChangeRows,
  renderConclusionBar,
  renderCopyBlock,
  renderDataTable,
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

export interface QualityItem {
  name: string;
  score: number;
  ingredients_count: number;
  steps_count: number;
  tips_count: number;
  techniques_count: number;
  has_background: boolean;
  missing: string[];
}

/** 体检页（结果型）。 */
export function dataQualityPage(input: { items: QualityItem[] }): string {
  const worst = input.items[0];
  const full = input.items.filter((x) => x.score >= 80).length;
  const todo = input.items.filter((x) => x.score < 80).length;
  const blocks = [
    renderConclusionBar(
      worst ? '最该补的是' + worst.name + '（' + worst.score + '分），先补它。' : '库中暂无菜谱可体检。',
    ),
    renderFactStrip({
      items: [
        { label: '菜数', value: String(input.items.length) + '道' },
        { label: '满分', value: String(full) + '道' },
        { label: '待补', value: String(todo) + '道' },
        { label: '满分线', value: '八十分' },
      ],
    }),
    ...input.items.map((it) =>
      renderDisclosure({
        title: it.name + '（' + it.score + '分）',
        contentHtml:
          renderDataTable({
            caption: it.name,
            columns: [
              { key: 'k', label: '维度' },
              { key: 'v', label: '读数', align: 'right' },
            ],
            rows: [
              { k: '食材', v: String(it.ingredients_count) + '味' },
              { k: '步骤', v: String(it.steps_count) + '步' },
              { k: '贴士', v: String(it.tips_count) + '条' },
              { k: '技法', v: String(it.techniques_count) + '个' },
              { k: '背景', v: it.has_background ? '有' : '无' },
            ],
          }) +
          (it.missing.length
            ? it.missing.map((m) => renderProseBlock({ text: it.name + '待补' + m })).join('')
            : renderProseBlock({ text: it.name + '五项齐全，无需补。' })),
      }),
    ),
    renderCaliberLine('评分只看完整度，口碑不计入。'),
    renderActionBar({
      buttons: [
        { label: '补最差那道菜', kind: 'primary', actionId: 'quality-fix' },
        { label: '导出一份备份', kind: 'ghost', actionId: 'quality-backup' },
      ],
    }),
  ];
  return shell('数据质量报告', '私家大厨 ｜ 数据管理', blocks);
}

/** 批量改页（过程型目标形态：改前对比＋回执）。 */
export function dataBatchPage(input: { name: string; diffs: { field: string; before: string; after: string }[] }): string {
  const blocks = [
    renderConclusionBar('已对照改前改后，确认无误再复制口令交回。'),
    renderFactStrip({
      items: [
        { label: '菜名', value: input.name },
        { label: '改动', value: String(input.diffs.length) + '处' },
      ],
    }),
    renderChangeRows({
      rows: input.diffs.map((d) => ({ label: d.field, before: d.before || '无', after: d.after || '无' })),
    }),
    renderProseBlock({ text: '只改已有的食材与步骤，不新增；关联步骤暂不支持。' }),
    renderCaliberLine('缺数字用量与时长会当场拦下，补齐再试。'),
    renderActionBar({
      buttons: [
        { label: '复制修改口令', kind: 'primary', actionId: 'batch-copy' },
        { label: '再看一遍菜谱', kind: 'ghost', actionId: 'batch-view' },
      ],
    }),
    renderCopyBlock({
      title: '复制修改说明',
      dataActionId: 'batch-copy-data',
      dataText: input.name + '改' + input.diffs.length + '处：' + input.diffs.map((d) => d.field + d.before + '到' + d.after).join('；'),
    }),
  ];
  return shell('批量改回执', '私家大厨 ｜ 数据管理', blocks);
}

/** 备份回执页（回执型）。 */
export function dataBackupPage(input: { recipeCount: number; tableCount: number; bytes: number }): string {
  const blocks = [
    renderConclusionBar('备份已落盘，全量表一次导出。'),
    renderFactStrip({
      items: [
        { label: '菜数', value: String(input.recipeCount) + '道' },
        { label: '表数', value: String(input.tableCount) + '张' },
        { label: '大小', value: String(input.bytes) + '字节' },
      ],
    }),
    renderProseBlock({ text: '恢复时解压再逐个导入，定时与增量以后再做。' }),
    renderCaliberLine('默认不含已废弃。'),
    renderActionBar({
      buttons: [
        { label: '看看全部菜谱', kind: 'primary', actionId: 'backup-list' },
        { label: '再备一份', kind: 'ghost', actionId: 'backup-again' },
      ],
    }),
    renderCopyBlock({
      title: '复制备份回执',
      dataActionId: 'backup-copy-data',
      dataText: '已备份' + input.recipeCount + '道菜（' + input.tableCount + '张表，共' + input.bytes + '字节）。',
    }),
  ];
  return shell('备份回执', '私家大厨 ｜ 数据管理', blocks);
}
