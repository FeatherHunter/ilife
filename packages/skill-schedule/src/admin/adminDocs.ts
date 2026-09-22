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
 */
import {
  renderCaliberLine, renderConclusionBar, renderCopyBlock, renderDataTable, renderKpiGrid, renderProseBlock,
  type DataTableRow, type KpiCardInput,
} from 'base-paint/blocks';
import { assembleDocPage, type PageHead } from '../shared/docPage.js';
import {
  adminPartsCss, renderSectionTitle, renderSteps, renderVerifyList, type AdminStepView,
} from './adminParts.js';

/** 页眉那一行域词（两张页同一句）。 */
const EYEBROW = '作息管家 辅助与管理';

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
  const content = [
    renderConclusionBar(conclusion),
    renderKpiGrid(cards, { title: '这一趟的读数' }),
    renderSectionTitle('三张表'),
    renderDataTable({
      columns: [
        { key: '表', label: '表' },
        { key: '行数', label: '行数', align: 'right' },
        { key: '管什么', label: '管什么' },
      ],
      rows: tableRows,
      emptyText: '三张表一行没有',
    }),
    renderCaliberLine('再跑一次只会补齐缺的表，已有数据一条不动'),
    renderCopyBlock({
      title: '复制库文件路径',
      dataText: input.paths.dbFile,
      logText: '场景：初始化数据库 ｜ 库文件已确认',
      dataActionId: 'ilife-sch-init-copy-path',
      logActionId: 'ilife-sch-init-copy-path-log',
    }),
    renderSectionTitle('下一步'),
    renderProseBlock({ text: '刚装好就说「首次使用」，向导带你走完六步。平时记一条作息只说一句话就行。' }),
    renderCopyBlock({
      title: '复制初始化结果',
      dataText: '【作息管家 · 初始化回执】' + conclusion + '\n'
        + '作息记录 ' + countText(input.counts.records) + ' 条，日程计划 '
        + countText(input.counts.plans) + ' 条，每日摘要 ' + countText(input.counts.summaries) + ' 组\n'
        + '库文件：' + input.paths.dbFile,
      logText: '场景：初始化数据库 ｜ ' + conclusion,
      dataActionId: 'ilife-sch-init-copy-data',
      logActionId: 'ilife-sch-init-copy-log',
    }),
  ].filter((seg) => seg !== '').join('');
  return assembleDocPage({ head, content, extraCss: adminPartsCss() });
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
  const content = [
    renderConclusionBar(conclusion),
    renderSectionTitle('六步向导'),
    renderSteps(views),
    renderSectionTitle('路径确认'),
    renderProseBlock({ text: '四处落点都在下面，点一下就复制完整路径。落点由配置文件决定，改动去改配置，不用重装。' }),
    renderCopyBlock({
      title: '复制库目录路径',
      dataText: input.paths.dbDir,
      logText: '场景：首次使用 ｜ 库目录已确认',
      dataActionId: 'ilife-sch-firstuse-copy-dbdir',
      logActionId: 'ilife-sch-firstuse-copy-dbdir-log',
    }),
    renderCopyBlock({
      title: '复制库文件路径',
      dataText: input.paths.dbFile,
      logText: '场景：首次使用 ｜ 库文件已确认',
      dataActionId: 'ilife-sch-firstuse-copy-dbfile',
      logActionId: 'ilife-sch-firstuse-copy-dbfile-log',
    }),
    renderCopyBlock({
      title: '复制产物根目录路径',
      dataText: input.paths.pagesRoot,
      logText: '场景：首次使用 ｜ 产物根目录已确认',
      dataActionId: 'ilife-sch-firstuse-copy-pages',
      logActionId: 'ilife-sch-firstuse-copy-pages-log',
    }),
    renderCopyBlock({
      title: '复制帮助页路径',
      dataText: input.paths.helpDir,
      logText: '场景：首次使用 ｜ 帮助页目录已确认',
      dataActionId: 'ilife-sch-firstuse-copy-help',
      logActionId: 'ilife-sch-firstuse-copy-help-log',
    }),
    renderSectionTitle('初始化报告'),
    renderCaliberLine('建库动作 ｜ ' + (input.created ? '三张表本次新建' : '三张表沿用已有')),
    renderCaliberLine('库内现状 ｜ 作息记录 ' + countText(input.counts.records)
      + ' 条，日程计划 ' + countText(input.counts.plans) + ' 条'),
    todoBlock,
    renderSectionTitle('完成验证清单'),
    renderVerifyList(input.verify),
    renderSectionTitle('飞书强引导'),
    renderProseBlock({ text: '配合飞书效果最好，日程能出现在飞书日历上。只有你明确说不用，才跳过这一步。' }),
    renderProseBlock({ text: input.feishu.note }),
    input.feishu.unavailable
      ? renderConclusionBar('飞书同步不可用（先把上面那几道门补上）')
      : renderCaliberLine('飞书三道门都过了，想看档位就说「飞书探测」'),
    renderSectionTitle('完成'),
    renderProseBlock({ text: '下一句说「作息管家 HELP」看全部功能，现在就可以记下第一条作息。' }),
    renderCopyBlock({
      title: '复制初始化 prompt',
      dataText: input.prompt,
      logText: '场景：首次使用 ｜ 六步向导已跑完',
      dataActionId: 'ilife-sch-firstuse-copy-data',
      logActionId: 'ilife-sch-firstuse-copy-log',
    }),
  ].filter((seg) => seg !== '').join('');
  return assembleDocPage({ head, content, extraCss: adminPartsCss() });
}
