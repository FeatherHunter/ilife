/** #790 · 「辅助与管理」域的**页数据与页装配**（口径层）：两张页各自要什么。
 *
 *  为什么口径住这里、不住共用位：共用位不许出现任何一个能力的名字，而「初始化回执报哪三张表、
 *  向导分哪六步、飞书强引导说什么」全是**本域的口径**——摆好再交给 `src/shared/` 的整页装配与
 *  本域的族级件（`./adminParts.ts`）。
 *
 *  两张页（清单 admin 域 → 哪一句唤醒词）：
 *    · **初始化回执**（老侧无家族：建表无产物，清单 `family_null_reason` 原文「建表无产物」）
 *      ←「初始化数据库」（`view=init` 预设）：本次新建还是沿用已有 ＋ 三张表行数 ＋ 库路径 ＋ 下一步；
 *    · **首次使用向导**（老侧 setup 首次使用工作流，不计 18 家族）←「首次使用」（`view=firstUse`
 *      预设）：老侧 6 步（环境检测 → 路径确认 → 建库 → 状态确认 → 初始化报告 → 完成）＋
 *      飞书强引导 ＋ 初始化报告（`items`／`todos`／`verify`，对标备忘录 init-report）＋ 完成。
 *
 *  **载荷即页面**：本票只把「真页 HTML」交回出口，`data` 载荷只装机器读的读数
 *  （`mode`／`created`／计数），页是给人读的那一份。
 *
 *  **页上文案纪律**：不出现命令键、库列名、参数名、英文裸词；并列关系一律用版面表达
 *  （卡片格／对照行／框），不拿 `、`／`·`／`｜`／`；`／`~` 这些符号顶替设计——范围一律写「至」，
 *  不用波浪号。正文位不出现内部命令名（照 #895 推翻 #788 旧判语：上屏一律写「飞书命令行」；老侧 HELP 与本仓
 *  SKILL.md 里命令名照旧，载荷位原文不动）；页上其余文案零命令键、零库列名、零参数名、零票号。
 *
 *  #891 补的**页内定位**（不动件序列，只给已有的段名加锚点与页首目录）：判据（小节数 ≥ 3 出目录）
 *  与装配的唯一一处定义地在 `shared/pageNav.ts` 的 `SECTION_TOC_MIN`。两张页都恒 ≥4 小节（长页）：
 *  初始化回执 4 颗（`这一趟的读数`／`三张表`／`下一步`／`复制初始化结果`）、向导 7 颗。
 */
import {
  renderCaliberLine, renderConclusionBar, renderDataTable, renderKpiGrid, renderProseBlock,
  type DataTableRow, type KpiCardInput,
} from 'base-paint/blocks';
import { renderActionBar } from 'base-paint';
import { scheduleCopyArea, scheduleCopyLog, scheduleNowStamp } from '../render/copyArea.js';
import { assembleDocPage, type PageHead } from '../shared/docPage.js';
import { pageSections } from '../shared/pageNav.js';
import {
  adminPartsCss, renderSectionTitle, renderSteps, renderVerifyList, type AdminStepView,
} from './adminParts.js';
import { m } from '../entries/index.js';

/** 页眉那一行域词（两张页同一句）。#1197：取词在渲染期，故写成函数（模块级常量只会在加载期取到 zh）。 */
function eyebrow(): string { return m('skill-schedule.admin-adminDocs.c102'); }

/** 本域两张页的 key：初始化与首次使用都落在 `schedule.help.lookup` 上（路由表逐字），
 *  形状 `list` ⇒ 复制数据位是一份报告（逐条 `name`／`value`）。 */
const HELP_KEY = 'schedule.help.lookup';

/** 一处落点的复制按钮（#887）：完整路径只进按钮的 `data-t`，页上只印确认语。
 *
 *  **为什么不是「复制区里的自定义按钮」**：`CopyBlockInput.buttons` 收的 `ActionBarButton` 没有
 *  载荷位（公共层自己的注释就是这么写的：「动作条按钮没有 `data-t` 载荷位」），今天给不出
 *  「把某一串文本交给它复制」的按钮。故按票面那一条停档：**每个落点各一枚按钮、不再成对**，
 *  按钮走公共层动作条的数据位（`renderActionBar({ copyData })`，兄弟技能同一条公开面），
 *  技能侧不手搓按钮 HTML、不另造样式；这一处缺口在 #887 票面留言里点名。 */
function pathCopyRow(name: string, path: string, actionId: string): string {
  return renderCaliberLine(m('skill-schedule.admin-adminDocs.c001', { p0: String(name) }))
    + renderActionBar({ copyData: { actionId, label: m('skill-schedule.admin-adminDocs.c002', { p0: String(name) }), text: path } });
}

/** 步骤状态（三态，说人话）。 */
export type AdminStepStatus = 'ok' | 'todo' | 'do';

/** 落点（只算好的绝对路径，调用方给）。 */
export interface AdminPaths {
  readonly dbDir: string;
  readonly dbFile: string;
  readonly pagesRoot: string;
  readonly helpDir: string;
}

/** 库内读数（读不到的那一格给 null，页上印横线，不断整页）。 */
export interface AdminCounts {
  readonly records: number | null;
  readonly days: number | null;
  readonly plans: number | null;
  readonly summaries: number | null;
  readonly firstDate: string | null;
  readonly lastDate: string | null;
}

const countText = (n: number | null): string => (n === null ? '—' : String(n));

/** 初始化回执的输入（调用方摆好，本件只管画）。 */
export interface InitReceiptInput {
  readonly created: boolean;
  readonly paths: AdminPaths;
  readonly counts: AdminCounts;
}

/** 初始化回执：本次新建还是沿用已有 ＋ 三张表 ＋ 库路径 ＋ 下一步。 */
export function renderInitReceiptPage(input: InitReceiptInput): string {
  const head: PageHead = {
    docTitle: m('skill-schedule.admin-adminDocs.c003'),
    eyebrow: eyebrow(),
    title: m('skill-schedule.admin-adminDocs.c004'),
    subtitle: input.created ? m('skill-schedule.admin-adminDocs.c005') : m('skill-schedule.admin-adminDocs.c006'),
  };
  const conclusion = input.created
    ? m('skill-schedule.admin-adminDocs.c007')
    : m('skill-schedule.admin-adminDocs.c008');
  const cards: readonly KpiCardInput[] = [
    { label: m('skill-schedule.admin-adminDocs.c009'), value: input.created ? m('skill-schedule.admin-adminDocs.c010') : m('skill-schedule.admin-adminDocs.c011') },
    { label: m('skill-schedule.admin-adminDocs.c012'), value: countText(input.counts.records), unit: m('skill-schedule.admin-adminDocs.c013') },
    { label: m('skill-schedule.admin-adminDocs.c014'), value: countText(input.counts.plans), unit: m('skill-schedule.admin-adminDocs.c015') },
    { label: m('skill-schedule.admin-adminDocs.c016'), value: countText(input.counts.summaries), unit: m('skill-schedule.admin-adminDocs.c017') },
  ];
  const tableRows: DataTableRow[] = [
    { 表: m('skill-schedule.admin-adminDocs.c018'), 行数: countText(input.counts.records), 管什么: m('skill-schedule.admin-adminDocs.c019') },
    { 表: m('skill-schedule.admin-adminDocs.c020'), 行数: countText(input.counts.summaries), 管什么: m('skill-schedule.admin-adminDocs.c021') },
    { 表: m('skill-schedule.admin-adminDocs.c022'), 行数: countText(input.counts.plans), 管什么: m('skill-schedule.admin-adminDocs.c023') },
  ];
  const { toc, body } = pageSections([
    { html: renderConclusionBar(conclusion) },
    { navText: m('skill-schedule.admin-adminDocs.c024'), html: renderKpiGrid(cards, { title: m('skill-schedule.admin-adminDocs.c025') }) },
    { navText: m('skill-schedule.admin-adminDocs.c026'), html: renderSectionTitle(m('skill-schedule.admin-adminDocs.c027')) + renderDataTable({
      columns: [
        { key: m('skill-schedule.admin-adminDocs.c028'), label: m('skill-schedule.admin-adminDocs.c029') },
        { key: m('skill-schedule.admin-adminDocs.c030'), label: m('skill-schedule.admin-adminDocs.c031'), align: 'right' },
        { key: m('skill-schedule.admin-adminDocs.c032'), label: m('skill-schedule.admin-adminDocs.c033') },
      ],
      rows: tableRows,
      emptyText: m('skill-schedule.admin-adminDocs.c034'),
    }) },
    { html: renderCaliberLine(m('skill-schedule.admin-adminDocs.c035')) },
    // #887：这一处原先是「库文件路径」那个复制区（一页里的第二处复制按钮排），现在收成一行确认语 ＋
    // 单颗复制按钮——完整路径进 `data-t`，页上不印路径（落点名只写人话）。
    { html: pathCopyRow(m('skill-schedule.admin-adminDocs.c036'), input.paths.dbFile, 'ilife-sch-init-copy-path') },
    { navText: m('skill-schedule.admin-adminDocs.c037'), html: renderSectionTitle(m('skill-schedule.admin-adminDocs.c038'))
      + renderProseBlock({ text: m('skill-schedule.admin-adminDocs.c039') }) },
    // #887：一页**一个**复制区（数据＝初始化回执整份、日志＝这一趟六段），原先的第二对按钮合并到这里。
    { navText: m('skill-schedule.admin-adminDocs.c040'), html: scheduleCopyArea({
      title: m('skill-schedule.admin-adminDocs.c041'),
      dataActionId: 'ilife-sch-init-copy-data',
      logActionId: 'ilife-sch-init-copy-log',
      key: HELP_KEY,
      payload: {
        items: [
          { name: m('skill-schedule.admin-adminDocs.c042'), value: input.created ? m('skill-schedule.admin-adminDocs.c043') : m('skill-schedule.admin-adminDocs.c044') },
          { name: m('skill-schedule.admin-adminDocs.c045'), value: m('skill-schedule.admin-adminDocs.c046', { p0: String(countText(input.counts.records)) }) },
          { name: m('skill-schedule.admin-adminDocs.c047'), value: m('skill-schedule.admin-adminDocs.c048', { p0: String(countText(input.counts.plans)) }) },
          { name: m('skill-schedule.admin-adminDocs.c049'), value: m('skill-schedule.admin-adminDocs.c050', { p0: String(countText(input.counts.summaries)) }) },
          { name: m('skill-schedule.admin-adminDocs.c051'), value: input.paths.dbFile },
        ],
        total: 5,
      },
      log: scheduleCopyLog({
        command: 'schedule-cmd-read schedule.help.lookup --params {"view":"init"}',
        source: m('skill-schedule.admin-adminDocs.c052'),
        actionAt: scheduleNowStamp(),
      }),
    }) },
  ]);
  return assembleDocPage({ head, content: toc + body, extraCss: adminPartsCss() });
}

/** 向导的一步（调用方排好 6 步，含状态与一句话说明）。 */
export interface FirstUseStep {
  readonly name: string;
  readonly status: AdminStepStatus;
  readonly statusText: string;
  readonly desc: string;
}

/** 向导的一条待办（标题 ＋ 怎么做）。 */
export interface FirstUseTodo {
  readonly title: string;
  readonly steps: readonly string[];
}

/** 飞书强引导位（结论只此一处：三道门全过就随时可跑，否则先跳过并醒目标注）。 */
export interface FirstUseFeishu {
  readonly note: string;
  readonly unavailable: boolean;
}

/** 首次使用向导的输入（调用方摆好 6 步与报告三件套）。 */
export interface FirstUseInput {
  readonly created: boolean;
  readonly paths: AdminPaths;
  readonly counts: AdminCounts;
  readonly steps: readonly FirstUseStep[];
  readonly todos: readonly FirstUseTodo[];
  readonly verify: readonly string[];
  readonly prompt: string;
  readonly feishu: FirstUseFeishu;
}

/** 首次使用向导：老侧 6 步 ＋ 飞书强引导 ＋ 初始化报告 ＋ 完成。 */
export function renderFirstUsePage(input: FirstUseInput): string {
  const pending = input.steps.filter((s) => s.status !== 'ok').length;
  const head: PageHead = {
    docTitle: m('skill-schedule.admin-adminDocs.c053'),
    eyebrow: eyebrow(),
    title: m('skill-schedule.admin-adminDocs.c054'),
    subtitle: pending === 0 ? m('skill-schedule.admin-adminDocs.c055') : m('skill-schedule.admin-adminDocs.c056', { p0: String(String(pending)) }),
  };
  const conclusion = pending === 0
    ? m('skill-schedule.admin-adminDocs.c057')
    : m('skill-schedule.admin-adminDocs.c058', { p0: String(String(pending)) });
  const createdText = input.created ? m('skill-schedule.admin-adminDocs.c059') : m('skill-schedule.admin-adminDocs.c060');
  const views: AdminStepView[] = input.steps.map((s) => ({ ...s }));
  const todoBlock = input.todos.length === 0
    ? renderProseBlock({ text: m('skill-schedule.admin-adminDocs.c061') })
    : renderDataTable({
      columns: [
        { key: m('skill-schedule.admin-adminDocs.c062'), label: m('skill-schedule.admin-adminDocs.c063') },
        { key: m('skill-schedule.admin-adminDocs.c064'), label: m('skill-schedule.admin-adminDocs.c065') },
      ],
      rows: input.todos.map((t) => ({ 待办: t.title, 怎么做: t.steps.join('／') })),
      emptyText: m('skill-schedule.admin-adminDocs.c066'),
    });
  const { toc, body } = pageSections([
    { html: renderConclusionBar(conclusion) },
    { navText: m('skill-schedule.admin-adminDocs.c067'), html: renderSectionTitle(m('skill-schedule.admin-adminDocs.c068')) + renderSteps(views) },
    { navText: m('skill-schedule.admin-adminDocs.c069'), html: renderSectionTitle(m('skill-schedule.admin-adminDocs.c070'))
      + renderProseBlock({ text: m('skill-schedule.admin-adminDocs.c071') })
      // #887：四处落点各**一枚**复制按钮（原先四个复制区＝四对按钮，现各收成一行确认语 ＋ 一颗按钮）。
      + pathCopyRow(m('skill-schedule.admin-adminDocs.c072'), input.paths.dbDir, 'ilife-sch-firstuse-copy-dbdir')
      + pathCopyRow(m('skill-schedule.admin-adminDocs.c073'), input.paths.dbFile, 'ilife-sch-firstuse-copy-dbfile')
      + pathCopyRow(m('skill-schedule.admin-adminDocs.c074'), input.paths.pagesRoot, 'ilife-sch-firstuse-copy-pages')
      + pathCopyRow(m('skill-schedule.admin-adminDocs.c075'), input.paths.helpDir, 'ilife-sch-firstuse-copy-help') },
    { navText: m('skill-schedule.admin-adminDocs.c076'), html: renderSectionTitle(m('skill-schedule.admin-adminDocs.c077'))
      // #1223：条件分支里的文案先抽成变量——整句化只认「一段文案 ＋ 若干变量」。
      + renderCaliberLine(m('skill-schedule.admin-adminDocs.c078', { p0: String(createdText) }))
      + renderCaliberLine(m('skill-schedule.admin-adminDocs.c079', {
        p0: String(countText(input.counts.records)),
        p1: String(countText(input.counts.plans)),
      }))
      + todoBlock },
    { navText: m('skill-schedule.admin-adminDocs.c080'), html: renderSectionTitle(m('skill-schedule.admin-adminDocs.c081')) + renderVerifyList(input.verify) },
    { navText: m('skill-schedule.admin-adminDocs.c082'), html: renderSectionTitle(m('skill-schedule.admin-adminDocs.c083'))
      + renderProseBlock({ text: m('skill-schedule.admin-adminDocs.c084') })
      + renderProseBlock({ text: input.feishu.note })
      + (input.feishu.unavailable
        ? renderConclusionBar(m('skill-schedule.admin-adminDocs.c085'))
        : renderCaliberLine(m('skill-schedule.admin-adminDocs.c086'))) },
    { navText: m('skill-schedule.admin-adminDocs.c087'), html: renderSectionTitle(m('skill-schedule.admin-adminDocs.c088'))
      + renderProseBlock({ text: m('skill-schedule.admin-adminDocs.c089') }) },
    // #887：一页**一个**复制区（数据＝向导报告整份、日志＝这一趟六段）——原先五对按钮合并到这里。
    // 报告里带 `初始化 prompt` 那一条：复制出去的文本里就有与 HELP 单源的那一句（探针量的是标记面）。
    { navText: m('skill-schedule.admin-adminDocs.c090'), html: scheduleCopyArea({
      title: m('skill-schedule.admin-adminDocs.c091'),
      dataActionId: 'ilife-sch-firstuse-copy-data',
      logActionId: 'ilife-sch-firstuse-copy-log',
      key: HELP_KEY,
      payload: {
        items: [
          ...input.steps.map((s) => ({ name: s.name, value: s.statusText + '，' + s.desc })),
          { name: m('skill-schedule.admin-adminDocs.c092'), value: input.todos.length === 0 ? m('skill-schedule.admin-adminDocs.c093') : m('skill-schedule.admin-adminDocs.c094', { p0: String(String(input.todos.length)) }) },
          { name: m('skill-schedule.admin-adminDocs.c095'), value: input.verify.join('，') },
          { name: m('skill-schedule.admin-adminDocs.c096'), value: input.paths.dbDir },
          { name: m('skill-schedule.admin-adminDocs.c097'), value: input.paths.dbFile },
          { name: m('skill-schedule.admin-adminDocs.c098'), value: input.paths.pagesRoot },
          { name: m('skill-schedule.admin-adminDocs.c099'), value: input.paths.helpDir },
          { name: m('skill-schedule.admin-adminDocs.c100'), value: input.prompt },
        ],
        total: input.steps.length + 7,
      },
      log: scheduleCopyLog({
        command: 'schedule-cmd-read schedule.help.lookup --params {"view":"firstUse"}',
        source: m('skill-schedule.admin-adminDocs.c101'),
        actionAt: scheduleNowStamp(),
      }),
    }) },
  ]);
  return assembleDocPage({ head, content: toc + body, extraCss: adminPartsCss() });
}
