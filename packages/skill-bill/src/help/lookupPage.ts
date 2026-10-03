/** h02 · 「速查表」整页（#1080 落地切片）：bill.help.lookup --params '{"mode":"lookup"}' 的落盘产物。
 *
 * 判地（冻结原型，只读不抄）：docs/skills/skill-bill/proto/setup-help/h02-速查表-v2.4.html
 * （20604 字节，sha256 7359283e…c5e78）。原型是**判据**不是模板——本件不读它、不抄它的标记。
 *
 * ## 这一页由什么拼成（三摊活，各有归属）
 *
 *  1. **速查索引本体**走公共层 base-paint/blocks 的 lookup-index（G2，#1072 收口，本票只许调不造）：
 *     8 枚页内锚（页内跳转，非筛选）＋ 8 个分组（写入16／查询17／分析25／目标4／账户4／联动2／
 *     开始使用6／别名3）＋ 自律条。**77 行一行不丢**是本票的硬判据（基线那份丢过 77 行）。
 *  2. **页面家具**走共用位 shared/docPage：店头（sheetHead）／主数字（ticketSummary ＋
 *     公共层 renderSummaryHead 的 ticket 版式）／虚线（ticketRule）／段（ticketSection）／
 *     按钮区（ticketActions）／纸（renderSheetFrame 的 ticket 版 ＋ 裁切线）／整页壳
 *     （assembleSheetPage）。复制区走 shared/copyArea（复制数据三格式 ＋ 复制日志）。
 *  3. **本页自有样式**（H02_CSS）只做一件事：把公共层速查索引的槽位摆成原型那一纸的样子。
 *     取值全走皮肤 token（--ilife-*），零自造变量、零 px 圆角、零手写投影。
 *
 * ## 与冻结原型的两处**已知且可判定**的差异（读数见 docs/skills/skill-bill/1080-h02-像素证据.md）
 *
 *  · **分组默认展开**：原型用 details 把 8 组折起来（页高 1258），G2 的形态是「锚 chips ＋
 *    组标题 ＋ 组内行」（页高 5957）。本票的用户可见结果要的是「77 行完整唤醒词索引」，故照 G2 的
 *    形态常显；要改成折叠得动 packages/base-render/ 的 lookup-index（本票禁区）。
 *  · **别名组三行取自 HELP 位的词条**：原型的别名三行（能做什么／饼干记账HELP／帮助）在仓内数据里
 *    没有对应源；本件按「一条词只有一个书写位」的规矩从 HELP_WAKE_WORDS 取，去掉代表词后取满
 *    三行，仍满 74＋3＝77。
 *
 * 载荷一字不动：本件只产 HTML，env.data.* 的键与值由 ./lookup.js ＋ ./items.js 原样出
 * （调用方 src/cli/cmd_read.ts 的 dispatchHelp 只多把本页塞进 deliver.html）。
 */
import {
  renderLookupIndex,
  renderSheetFrame,
  renderSummaryHead,
} from 'base-paint/blocks';
import type { LookupGroup, LookupIndexInput, LookupRow } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { HELP_WAKE_WORDS, WAKE_GROUPS } from '../triggers/wake-assets.js';
import { copyArea, copyLog, actionStamp } from '../shared/copyArea.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION } from '../shared/pageIdentity.js';
import { assembleSheetPage, sheetHead, ticketActions, ticketRule, ticketSection, ticketSummary } from '../shared/docPage.js';
import { commandLine, writeSection } from '../shared/writeParts.js';
import { queryStyleTag } from '../query/pageParts.js';
import { buildHelpLookup } from './lookup.js';
import { buildHelpItems } from './items.js';

/** 页内速查索引的根类名（本页自有样式只挂在它下面，他页零命中）。 */
const H02_INDEX_CLASS = 'ilife-h02-index';
/** 段的序号位（原型 .sec-heading .no 那一格）。 */
const H02_SECTION_NO = '01';
/** 裁切线那句（与其余票据纸页同字）。 */
const CUT_LINE_TEXT = '✂ 裁切线';
/** 别名组的组名（本页自有的一格，不是某个域）。 */
const ALIAS_GROUP_LABEL = '别名';
/** 复制数据那份载荷的上屏标题（用户说法，不带命令名）。 */
const COPY_TITLE = '能力速查';

/** 本页自有样式：把 G2 的槽位摆成原型那一纸（取值全走皮肤 token，见件头第 3 条）。 */
const H02_CSS = [
  '/* 锚点胶囊：原型 .toc-chips a 的几何（圆角走皮肤闭集，边色取最近的一档 token）。 */',
  '.' + H02_INDEX_CLASS + ' .ilife-block-lookup-index-nav { display: flex; flex-wrap: wrap; gap: 8px; margin: 2px 0 4px; }',
  '.' + H02_INDEX_CLASS + ' .ilife-block-lookup-index-anchor { display: inline-flex; align-items: center; padding: 8px 14px; border: 1.5px solid var(--ilife-edge); border-radius: var(--ilife-radius-pill); background: var(--ilife-surface); color: var(--ilife-ink); font-size: var(--ilife-fs-sm); font-weight: 800; text-decoration: none; }',
  '/* 组：原型 .qgroup 的暖底卡片（圆角照皮肤闭集）。 */',
  '.' + H02_INDEX_CLASS + ' .ilife-block-lookup-index-group { margin-top: 14px; padding: 0 14px 12px; border: 1px solid var(--ilife-line); border-radius: var(--ilife-radius-sm); background: var(--ilife-surface-2); }',
  '/* 组标题：原型 .qgroup-head 的高度与字重（计数由自律条统一声明，不逐组挂胶囊）。 */',
  '.' + H02_INDEX_CLASS + ' .ilife-block-lookup-index-head { display: flex; align-items: center; min-height: 48px; padding: 12px 0; font-size: var(--ilife-fs-h3); font-weight: 800; letter-spacing: .5px; }',
  '/* 组内行：原型 .qrows li（44 触摸行 ＋ 点线分隔）。 */',
  '.' + H02_INDEX_CLASS + ' .ilife-block-lookup-index-row { display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 10px 0; border-top: 1px dotted var(--ilife-line); font-size: var(--ilife-fs-sm); }',
  '.' + H02_INDEX_CLASS + ' .ilife-block-lookup-index-wake { flex: none; padding: 2px 7px; border: 1px solid var(--ilife-edge); border-radius: var(--ilife-radius-sm); background: var(--ilife-surface); color: var(--ilife-accent-text); font-family: var(--ilife-font-num); font-size: var(--ilife-fs-xs); font-weight: 700; }',
  '.' + H02_INDEX_CLASS + ' .ilife-block-lookup-index-goto { flex: 1 1 auto; color: var(--ilife-ink-2); font-size: var(--ilife-fs-xs); text-align: right; }',
  '/* 自律条：原型 .check-mini 的浅绿卡（绿底＋一行字）。 */',
  '.' + H02_INDEX_CLASS + ' .ilife-block-lookup-index-note { margin-top: 10px; padding: 10px 12px; border: 1px solid var(--ilife-ok-soft); border-radius: var(--ilife-radius-sm); background: var(--ilife-ok-soft); color: var(--ilife-ink-2); font-size: var(--ilife-fs-xs); line-height: 1.6; }',
].join('\n');

/** 一个场景行的去向：域 · 二级组（两处都是声明里的事实，不在本件复写）。 */
function gotoOf(groupLabel: string, subgroupLabel: string): string {
  return groupLabel + ' · ' + subgroupLabel;
}

/** 74：场景总数（由资产派生，不复写数字）。 */
function sceneTotal(): number {
  return WAKE_GROUPS.reduce((n, g) => n + g.subgroups.reduce((m, s) => m + s.scenes.length, 0), 0);
}

/** 8 个分组：7 个域（词序＝声明里的书写顺序）＋ 末尾的别名组。 */
export function buildLookupGroups(): readonly LookupGroup[] {
  const groups: LookupGroup[] = WAKE_GROUPS.map((g) => ({
    label: g.label,
    rows: g.subgroups.flatMap((s) => s.scenes.map((x): LookupRow => ({
      wake: x.wake_word,
      goto: gotoOf(g.label, s.label),
    }))),
  }));
  const aliases: readonly LookupRow[] = HELP_WAKE_WORDS.slice(1).map((w): LookupRow => ({
    wake: w,
    goto: '帮助页 · ' + String(WAKE_GROUPS.length) + ' 域 ' + String(sceneTotal()) + ' 场景',
    alias: true,
  }));
  return [...groups, { label: ALIAS_GROUP_LABEL, rows: aliases }];
}

/** 速查索引的入参（锚与组的 id 由公共层按组名拼，两处同源故逐字相同）。 */
export function buildLookupIndexInput(): LookupIndexInput {
  const groups = buildLookupGroups();
  const counts = groups.map((g) => String(g.rows.length));
  const total = groups.reduce((n, g) => n + g.rows.length, 0);
  return {
    anchors: groups.map((g) => ({ id: 'lookup-' + g.label, label: g.label })),
    groups,
    total,
    countNote: counts.join('＋') + '＝' + String(total),
    aliasMark: '别名行标黄，不与场景行混数',
    extraClass: H02_INDEX_CLASS,
  };
}

/** 速查表整页 HTML（mode 取 lookup 的落盘产物）。 */
export function renderLookupPageHtml(): string {
  const index = buildLookupIndexInput();
  const hits = buildHelpItems(buildHelpLookup(), undefined);
  // 复制区那份载荷＝索引的三列投影（唤醒词／命令／照抄即跑的命令行）：77 条 × 三格式的体积要留在
  // 出口体积门（BILL_HTML_MAX_BYTES＝256KiB）以内——整条 hits 三条格式一起塞进来会顶到 98.8%。
  // **stdout 的 env.data.* 不在这里**：那是 cmd_read 的 buildBillEnvelope 原样出的，本件一字不动。
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'help.lookup',
    data: { items: hits.items.map((h) => ({ phrase: h.phrase, key: h.key, cli: h.cli })), total: hits.total },
  };
  const sceneRows = index.groups.slice(0, WAKE_GROUPS.length).reduce((n, g) => n + g.rows.length, 0);
  const paper = sheetHead(DOC_TITLE + ' · 能力速查', String(index.total) + ' 条唤醒词，一句话直达', '与 HELP 帮助页分名 · 照着唤醒词用')
    + ticketSummary(
      renderSummaryHead({ eyebrow: '速查可用 · LOOKUP OK', value: String(index.total), unit: '条', layout: 'ticket' }),
      '<p class="ilife-ticket-summary-note">' + String(sceneRows) + ' 场景唤醒词 ＋ ' + String(index.total - sceneRows) + ' 别名行</p>',
    )
    + ticketRule()
    + ticketSection({ title: '按域速查', tag: H02_SECTION_NO, content: renderLookupIndex(index) })
    + ticketActions(copyArea({
      data: { envelope, title: COPY_TITLE },
      log: {
        envelope,
        copyLog: copyLog({
          command: commandLine('bill.help.lookup', { mode: 'lookup' }),
          source: '本机记账库（只读）',
          detail: String(index.total) + ' 条唤醒词',
          actionAt: actionStamp(),
          version: DOC_VERSION,
        }),
      },
    }));
  const content = queryStyleTag() + '<style>' + H02_CSS + '</style>'
    + renderSheetFrame({ variant: 'ticket', cutLine: true, cutLineText: CUT_LINE_TEXT, content: paper });
  return assembleSheetPage({
    docTitle: DOC_TITLE + '·能力速查',
    bodyHtml: writeSection({ slot: 'list', page: 'list', shape: 'list', key: 'bill.help.lookup', content }),
    paper: 'detail',
  });
}