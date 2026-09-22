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
 *  不用波浪号。`lark-cli` 是例外（照 #788：它是用户要自己动手装的东西，老侧 HELP 与本仓
 *  SKILL.md 都用这个词，故有意不在禁用词里）；页上其余文案零命令键、零库列名、零参数名、零票号。
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

/** 页眉那一行域词（两张页同一句）。 */
const EYEBROW = '作息管家 辅助与管理';

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
  return renderCaliberLine(name + '已确认')
    + renderActionBar({ copyData: { actionId, label: '复制' + name + '路径', text: path } });
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
    docTitle: '初始化回执',
    eyebrow: EYEBROW,
    title: '初始化回执',
    subtitle: input.created ? '库是这一趟新建的，已经就绪' : '库早就在了，这一趟没有动它',
  };
  const conclusion = input.created
    ? '本次新建了三张表，库已就绪'
    : '三张表都在，库是就绪的';
  const cards: readonly KpiCardInput[] = [
    { label: '本次动作', value: input.created ? '新建' : '沿用已有' },
    { label: '作息记录', value: countText(input.counts.records), unit: '条' },
    { label: '日程计划', value: countText(input.counts.plans), unit: '条' },
    { label: '每日摘要', value: countText(input.counts.summaries), unit: '组' },
  ];
  const tableRows: DataTableRow[] = [
    { 表: '作息记录', 行数: countText(input.counts.records), 管什么: '记下来的每一段作息' },
    { 表: '每日摘要', 行数: countText(input.counts.summaries), 管什么: '按天按类汇总的分钟数' },
    { 表: '日程计划', 行数: countText(input.counts.plans), 管什么: '未来排布的事件' },
  ];
  const { toc, body } = pageSections([
    { html: renderConclusionBar(conclusion) },
    { navText: '这一趟的读数', html: renderKpiGrid(cards, { title: '这一趟的读数' }) },
    { navText: '三张表', html: renderSectionTitle('三张表') + renderDataTable({
      columns: [
        { key: '表', label: '表' },
        { key: '行数', label: '行数', align: 'right' },
        { key: '管什么', label: '管什么' },
      ],
      rows: tableRows,
      emptyText: '三张表一行没有',
    }) },
    { html: renderCaliberLine('再跑一次只会补齐缺的表，已有数据一条不动') },
    // #887：这一处原先是「库文件路径」那个复制区（一页里的第二处复制按钮排），现在收成一行确认语 ＋
    // 单颗复制按钮——完整路径进 `data-t`，页上不印路径（落点名只写人话）。
    { html: pathCopyRow('库文件', input.paths.dbFile, 'ilife-sch-init-copy-path') },
    { navText: '下一步', html: renderSectionTitle('下一步')
      + renderProseBlock({ text: '刚装好就说「首次使用」，向导带你走完六步。平时记一条作息只说一句话就行。' }) },
    // #887：一页**一个**复制区（数据＝初始化回执整份、日志＝这一趟六段），原先的第二对按钮合并到这里。
    { navText: '复制初始化结果', html: scheduleCopyArea({
      title: '复制初始化结果',
      dataActionId: 'ilife-sch-init-copy-data',
      logActionId: 'ilife-sch-init-copy-log',
      key: HELP_KEY,
      payload: {
        items: [
          { name: '本次动作', value: input.created ? '新建' : '沿用已有' },
          { name: '作息记录', value: countText(input.counts.records) + ' 条' },
          { name: '日程计划', value: countText(input.counts.plans) + ' 条' },
          { name: '每日摘要', value: countText(input.counts.summaries) + ' 组' },
          { name: '库文件路径', value: input.paths.dbFile },
        ],
        total: 5,
      },
      log: scheduleCopyLog({
        command: 'schedule-cmd-read schedule.help.lookup --params {"view":"init"}',
        source: '建库与三张表（辅助与管理）',
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
    docTitle: '首次使用向导',
    eyebrow: EYEBROW,
    title: '首次使用向导',
    subtitle: pending === 0 ? '六步已跑完，作息管家就绪' : '六步跑完，有 ' + String(pending) + ' 项要你动手',
  };
  const conclusion = pending === 0
    ? '六步向导已跑完，作息管家就绪'
    : '向导跑完，有 ' + String(pending) + ' 项要你动手（下面标着动手的那几步）';
  const views: AdminStepView[] = input.steps.map((s) => ({ ...s }));
  const todoBlock = input.todos.length === 0
    ? renderProseBlock({ text: '这一趟没有待办，装完就能用。' })
    : renderDataTable({
      columns: [
        { key: '待办', label: '待办' },
        { key: '怎么做', label: '怎么做' },
      ],
      rows: input.todos.map((t) => ({ 待办: t.title, 怎么做: t.steps.join('／') })),
      emptyText: '这一趟没有待办',
    });
  const { toc, body } = pageSections([
    { html: renderConclusionBar(conclusion) },
    { navText: '六步向导', html: renderSectionTitle('六步向导') + renderSteps(views) },
    { navText: '路径确认', html: renderSectionTitle('路径确认')
      + renderProseBlock({ text: '四处落点都在下面，点一下就复制完整路径。落点由配置文件决定，改动去改配置，不用重装。' })
      // #887：四处落点各**一枚**复制按钮（原先四个复制区＝四对按钮，现各收成一行确认语 ＋ 一颗按钮）。
      + pathCopyRow('库目录', input.paths.dbDir, 'ilife-sch-firstuse-copy-dbdir')
      + pathCopyRow('库文件', input.paths.dbFile, 'ilife-sch-firstuse-copy-dbfile')
      + pathCopyRow('产物根目录', input.paths.pagesRoot, 'ilife-sch-firstuse-copy-pages')
      + pathCopyRow('帮助页', input.paths.helpDir, 'ilife-sch-firstuse-copy-help') },
    { navText: '初始化报告', html: renderSectionTitle('初始化报告')
      + renderCaliberLine('建库动作 ｜ ' + (input.created ? '三张表本次新建' : '三张表沿用已有'))
      + renderCaliberLine('库内现状 ｜ 作息记录 ' + countText(input.counts.records)
        + ' 条，日程计划 ' + countText(input.counts.plans) + ' 条')
      + todoBlock },
    { navText: '完成验证清单', html: renderSectionTitle('完成验证清单') + renderVerifyList(input.verify) },
    { navText: '飞书强引导', html: renderSectionTitle('飞书强引导')
      + renderProseBlock({ text: '配合飞书效果最好，日程能出现在飞书日历上。只有你明确说不用，才跳过这一步。' })
      + renderProseBlock({ text: input.feishu.note })
      + (input.feishu.unavailable
        ? renderConclusionBar('飞书同步不可用（先把上面那几道门补上）')
        : renderCaliberLine('飞书三道门都过了，想看档位就说「飞书探测」')) },
    { navText: '完成', html: renderSectionTitle('完成')
      + renderProseBlock({ text: '下一句说「作息管家 HELP」看全部功能，现在就可以记下第一条作息。' }) },
    // #887：一页**一个**复制区（数据＝向导报告整份、日志＝这一趟六段）——原先五对按钮合并到这里。
    // 报告里带 `初始化 prompt` 那一条：复制出去的文本里就有与 HELP 单源的那一句（探针量的是标记面）。
    { navText: '复制初始化 prompt', html: scheduleCopyArea({
      title: '复制初始化 prompt',
      dataActionId: 'ilife-sch-firstuse-copy-data',
      logActionId: 'ilife-sch-firstuse-copy-log',
      key: HELP_KEY,
      payload: {
        items: [
          ...input.steps.map((s) => ({ name: s.name, value: s.statusText + '，' + s.desc })),
          { name: '待办', value: input.todos.length === 0 ? '这一趟没有待办' : String(input.todos.length) + ' 项' },
          { name: '完成验证清单', value: input.verify.join('，') },
          { name: '库目录路径', value: input.paths.dbDir },
          { name: '库文件路径', value: input.paths.dbFile },
          { name: '产物根目录路径', value: input.paths.pagesRoot },
          { name: '帮助页路径', value: input.paths.helpDir },
          { name: '初始化 prompt', value: input.prompt },
        ],
        total: input.steps.length + 7,
      },
      log: scheduleCopyLog({
        command: 'schedule-cmd-read schedule.help.lookup --params {"view":"firstUse"}',
        source: '六步向导与四处落点（辅助与管理）',
        actionAt: scheduleNowStamp(),
      }),
    }) },
  ]);
  return assembleDocPage({ head, content: toc + body, extraCss: adminPartsCss() });
}
