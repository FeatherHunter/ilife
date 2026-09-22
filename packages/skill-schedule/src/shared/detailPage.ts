/** #786 · 「作息详情」（单条记录）的**页型配方**（形状维度的唯一定义地）。
 *
 *  为什么新立一张（接手 `出页交接-页型配方怎么用.md` §一的口径）：老侧 f06「单条详情」这一族
 *  在 #782 那一轮没有冻骨架（那一轮只裁了三张：今天总结／查日程／周视图），交接件写着「其余 15 个家族
 *  出页前先把骨架与件序列定下来」——这里是本票定的那一份，别的域不许各造一份。
 *
 *  形状＝件序列（照老侧 f06 的必现块摆位，一块不少）：
 *
 *    读数卡 → 结论条 → 逐条详情（段名 ＋ 字段事实条 ＋ AI 推理链那一段）→ 复制区
 *
 *  老侧 f06 的两个必现块：**每条 11 字段全展开**＝每个字段都上台面（老侧 `render_records_detail`
 *  自己写的 11 个字段：id／date／time_start／time_end／duration_minutes／activity／category／
 *  source_contents／source_timestamps／analysis_reasoning／created_at；老侧页把前十个摆成字段格、
 *  后一个摆成「人工智能推理链」那一段，本件同一分工）、**analysis_reasoning 完整展示**＝它自己那一段的
 *  正文（不截断、不折进键值行；空的那一条写「（无）」，与老侧页同一个写法）。老侧「100% 字段暴露原则」
 *  说的就是这件事。
 *
 *  **本件只认形状，不认口径**：字段怎么取、缺失写什么、段名怎么拼，都由 `query` 侧算好再进来
 *  （与 `rangePage.ts`／`overviewPage.ts` 同一分工）。件序列**不随数据多寡变形**：
 *  按日查（N 条）与按 ID 查（1 条）走同一套，一条也走这一套。
 */
import {
  renderConclusionBar, renderKpiGrid, renderProseBlock,
  type KpiCardInput,
} from 'base-paint/blocks';
import { renderFactStrip, type FactItemInput } from 'base-paint';
import { scheduleCopyArea, type ScheduleCopyAreaInput } from '../render/copyArea.js';
import { assembleDocPage, type PageHead } from './docPage.js';

/** 一条记录在页上的一段（段名 ＋ 字段 ＋ 推理链）。 */
export interface RecordDetailItem {
  /** 段名（记录号、日期、起止与活动，调用方拼好）。 */
  readonly title: string;
  /** 这一条除 `analysis_reasoning` 以外的字段（老侧那一套；空值写「无」，由调用方定）。 */
  readonly fields: readonly FactItemInput[];
  /** `analysis_reasoning` **全文**（老侧那 11 个字段里的第 11 个）：空的那一条写「（无）」，
   *  与老侧页同一个写法——**这一段恒在**，字段还是 11 个，不因缺内容少一块。 */
  readonly reasoning: string;
}

/** 「作息详情」一页要的全部东西（6 个字段）。 */
export interface DetailPageData {
  readonly head: PageHead;
  /** 读数卡（记录条数／覆盖时长／带推理链／一级分类数）。 */
  readonly kpis: readonly KpiCardInput[];
  readonly conclusion: string;
  /** 逐条详情：一条一段，顺序即调用方给的顺序。 */
  readonly records: readonly RecordDetailItem[];
  readonly copy: ScheduleCopyAreaInput;
}

/** 出「作息详情」整页。 */
export function renderDetailPage(data: DetailPageData): string {
  const records = data.records.map((rec) => (
    '<h2 class="heat-title">' + escText(rec.title) + '</h2>'
    + renderFactStrip({ items: rec.fields })
    + '<h2 class="heat-title">AI 推理链</h2>' + renderProseBlock({ text: rec.reasoning })
  )).join('');
  const content = [
    renderKpiGrid(data.kpis),
    renderConclusionBar(data.conclusion),
    records,
    scheduleCopyArea({
      title: '复制与留档',
      dataActionId: 'ilife-sch-detail-copy-data',
      logActionId: 'ilife-sch-detail-copy-log',
      ...data.copy,
    }),
  ].filter((seg) => seg !== '').join('');
  return assembleDocPage({ head: data.head, content });
}

/** 五字符转义（与公共层同口径；本件只为段名用一次，与 `dayPage.ts` 那一处同法）。 */
function escText(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    if (ch === '&') return '&amp;';
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    if (ch === '"') return '&quot;';
    return '&#39;';
  });
}
