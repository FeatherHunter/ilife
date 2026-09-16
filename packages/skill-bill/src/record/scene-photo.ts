/** 场景件：拍账单（`kind=photo`）。**本票：两格都换成这一件自己的装配体**。
 *
 * 服务哪条唤醒词：拍账单（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里 `preset: { kind: 'photo' }`）。
 * 本件出哪张页：**本场景定制的两张**——采集页（先收三要素那一支）与回执页（落库后那一支）。
 * 待哪一族窗口来填：特殊收支族（本件＝那一族的交付）。
 *
 * 本件的场景差异（施工图 `docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「拍账单」那一行
 *  ＋第三节「图片识别入口」那一行，缺陷见第四节第 7 条）：
 *   ① **识别在本仓之外办**：本仓不装识别引擎、也不做上传控件（老侧同样没有，只有一行「已收到 N 张账单图片」）。
 *     页面只讲两件事——已收到几张图、三要素还缺哪样；补齐后照抄哪条口令仍由缺项阻断条给（收在折叠区里）。
 *   ② **文字三要素填空**：金额／分类／时间三格，名字取自 `../shared/outsideScan.ts` 的 `ESCAPE_FIELDS`
 *     （**唯一定义地**），明示表与表单两处都引它，本件不另抄一份；
 *   ③ **缺一不许写库**：三要素缺哪样，阻断条就报哪样，缺项时不出可跑的写库指令（不给复制按钮）。
 *     也不替用户猜三要素里缺的值。
 *
 * 本轮整改（架构级，派单点名的两页之一；只动本件的可见正文与块序，不动行为判定与信封字段）：
 *   ① **首屏同形「未给」卡清零**：删结论摘要行那一网格（三要素的「未给」在标签与明示表里各说一次已够）；
 *   ② **常驻黑清零**（B 席首案）：原先那张深色毛玻璃「已收图片数与识别分工」说明块换成两行浅色口径
 *     （识别在哪一步办＋已收几张图），不再带「带知道了」关闭按钮，动作只剩复制区；
 *   ③ **口令原文块折叠**：共用的缺项阻断条整条走 `./collectBody.ts` 的 `collectBlockedFold` 收进折叠区；
 *   ④ **下半屏三表合并成一张**：原先「三要素明示表 ⟶ 每一步在谁那里办 ⟶ 预填标注」三张逐项重复，
 *     现在明示表只留`要素／现在`两列（第三列与每行那句「外部识别结果（或用你眼睛看一眼账单）」删），
 *     分工那句并进口径行，缺项明示表随阻断条折叠——页内表格只剩两张，且互不重复；
 *   ⑤ 祈使句改陈述；页标题只留唤醒词。形状取 `../shared/collectFrame.ts` 里面向用户的那三种（进度／缺项标签／分段标题）；该件另两种（架头／按钮层级）的固定文案是页面自指话，本席未上屏，作残项报给该件所属窗口。
 *
 * 两个页面级的入参约定（本件读 `params`，不由命令注册表声明）：
 *   `params.images`＝本次交上来的账单图片张数（不给＝0）；`params.imageWhere`＝这些图现在在哪（不给＝「助手那边」）。
 *   本仓不落图片，这两格只用来把「收图」这一步讲清楚。
 *
 * 必有块（逐块在这里落点，核对见证据件第三节）：
 *   采集页＝页头与页面外框、类型徽章 `typeBadge`、口径行（识别外置＋已收图片数）、三要素明示表、
 *     重复检测提示条、预填标注、缺项阻断条（折叠）、字段卡（文字三要素填空）、复制指令块、
 *     动作区（复制数据／复制日志）、错误回执（阻断条内）。
 *   回执页＝页头与页面外框、类型徽章（`ok` 档）、结论摘要行、写入明细表、对账折叠区、退出口、复制区。
 */
import { renderCaliberLine, renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { blockedItems, blockedMessage } from '../shared/blockedSlots.js';
import { collectMissingTags, collectProgress, collectSectionTitle } from '../shared/collectFrame.js';
import { copyArea, copyLog, promptCopyArea, undoExit } from '../shared/copyArea.js';
import { duplicateNote, findDuplicates } from '../shared/duplicateNote.js';
import type { DuplicateProbe } from '../shared/duplicateNote.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, sceneKeyOf } from '../shared/pageIdentity.js';
import { pageShell } from '../shared/pageShell.js';
import { blockedPromptOf, fieldCardOf, valuesOf } from '../shared/photoEscape.js';
import { ESCAPE_FIELDS } from '../shared/outsideScan.js';
import type { PhotoScale } from '../shared/outsideScan.js';
import { prefillOf } from '../shared/prefillNote.js';
import { textOf } from '../shared/recentPicks.js';
import { receiptStatusCard, reconcileDisclosure } from '../shared/receiptParts.js';
import { summaryCards } from '../shared/summaryRow.js';
import { nextStepOf, typeBadge } from '../shared/typeBadge.js';
import { fieldLabelOf } from '../shared/userWording.js';
import { commandLine } from '../shared/writeParts.js';
import { collectBlockedFold, prefillShort } from './collectBody.js';
import type { CollectInput, ReceiptInput, Scene } from './scene.js';

/** 服务哪条唤醒词（`Scene.wakeWord`）。 */
const WORD = '拍账单';

/** 本件认的 `kind`。 */
const KIND = 'photo';

/** 缺项时那条「补齐后重跑」的写库指令用什么占位：三要素各给自己那一格的说法。 */
const REPLACES: Readonly<Record<string, string>> = {
  amount: '<外部识别出的金额：支出为负、收入为正>',
  category: '<外部识别出的分类，要选到最细那一级>',
  time: '<账单上的时间，如 2026-09-14>',
};

/** 三要素的字段卡格（名字与提示取自 `ESCAPE_FIELDS`，本件只补「必需」这一格；形状照 `fieldCardOf` 要的那一格给）。 */
const ESCAPE_SLOTS = ESCAPE_FIELDS.map((f) => ({
  name: f.name,
  label: f.label,
  // 提示一律说人话：D 席 D-/-02 与 C 席的括号项都点名 `L1/L2/L3` 与 `（L3 即名目）` 不上屏，
  // 故这一格由本件给短句；三要素的名字与顺序仍只认 `ESCAPE_FIELDS` 那一处定义。
  hint: f.name === 'category'
    ? '三级分类，如 餐饮/外卖/午餐'
    : f.name === 'amount' ? '支出为负、收入为正，如 -12.5' : '账单上的日期，如 2026-09-14',
  required: true,
}));

/** 一个值算不算「给了」：`undefined`／`null`／空白串都不算，0 算给了。 */
function isGiven(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  return !(typeof v === 'string' && v.trim() === '');
}

/** 已收图片数入参（页面级约定，见件头）：`params.images` 是张数、`params.imageWhere` 是图现在在哪。 */
function scaleOf(params: Record<string, unknown>): PhotoScale {
  const raw = params['images'];
  const n = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim());
  const where = isGiven(params['imageWhere']) ? String(params['imageWhere']) : '助手那边（本仓不存图、也不读图）';
  return { count: Number.isFinite(n) ? n : 0, where };
}

/** 还没填的三要素（明示表与提示行两处共引这一处判定）。 */
function missingEscape(params: Record<string, unknown>): readonly { readonly name: string; readonly label: string }[] {
  return ESCAPE_FIELDS.filter((f) => textOf(params[f.name]) === '');
}

/** 页面内置 envelope（采集页 `ok:false`、回执页 `ok:true`；两页同一形状）。 */
function envelopeOf(key: string, ok: boolean, message: string): SerializableEnvelope {
  return {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: sceneKeyOf(key),
    data: { ok, message },
  };
}

/** 回执页的重复检测探针：写完再报一次，排除本次这条编号。 */
function probeOfReceipt(input: ReceiptInput): DuplicateProbe {
  return {
    amount: input.facts.amount,
    category: input.facts.category,
    date: input.facts.time,
    account: input.facts.account,
    ...(input.receipt.recordId === null ? {} : { excludeId: input.receipt.recordId }),
  };
}

/** 回执页那张网格：落值那几格不再缀缺省说法（值已经落库，那句「不填就记到…」在回执页没有动作可做）。 */
function receiptCardsOf(input: ReceiptInput): ReturnType<typeof summaryCards> {
  return summaryCards(input.facts).map((c) => (
    c.value === '未给' || c.detail === undefined || !c.detail.startsWith('不填就记')
      ? c
      : { label: c.label, value: c.value }
  ));
}

/** 采集页复制 prompt 区那段话：只报缺哪样与去向，不回抄命令原文（口令只有阻断条那一处，给看不给复制）。 */
function promptOf(labels: readonly string[]): string {
  return '拍账单：三要素由外部识别给出，还差 ' + labels.length + ' 样：' + labels.join('、')
    + '。这一页先不写库。补齐后跟助手说一遍「' + WORD + '」。';
}

/** 过程型采集页：先收三要素（只采集、不写库）。 */
function collectPhoto(input: CollectInput): string {
  const { params } = input;
  const blocked = blockedItems({ params, missing: input.missing, kind: KIND });
  const message = blockedMessage(input.missing, blocked);
  const marks = prefillOf({ params, recent: input.recent, today: input.today });
  const { pick, probe } = valuesOf({ recent: input.recent, params, kind: KIND, today: input.today });
  const bp = blockedPromptOf({ key: input.key, params, blocked, replaces: REPLACES });
  const scale = scaleOf(params);
  const lack = missingEscape(params);
  const envelope = envelopeOf(input.key, false, message);
  const content = [
    typeBadge({
      kind: KIND,
      status: 'danger',
      state: blocked.length > 0 ? '待补槽位 · 未写库（已阻断）' : '待补槽位 · 未写库',
      next: '',
    }),
    collectProgress({ wakeWord: WORD, missing: blocked.length }),
    collectMissingTags({ labels: blocked.map((i) => i.label) }),
    collectSectionTitle({ no: 1, title: '三要素缺哪样' }),
    renderCaliberLine('三要素由外部识别提供；收图在你交图那头，读图在本仓之外，本仓不存图也不读图。'),
    renderCaliberLine(scale.count > 0
      ? '已收 ' + Math.floor(scale.count) + ' 张账单图片，图放在 ' + scale.where + '。'
      : '这次一张图都没交上来，走三要素文字填空。'),
    renderDataTable({
      columns: [{ key: 'field', label: '要素' }, { key: 'now', label: '现在' }],
      rows: ESCAPE_FIELDS.map((f) => ({
        field: f.label,
        now: textOf(params[f.name]) === '' ? '还没填' : textOf(params[f.name]),
      })),
      caption: lack.length === 0
        ? '三样要素都给齐了'
        : '缺一样就先不写库',
    }),
    duplicateNote(findDuplicates(input.recent, probe), probe),
    marks.length === 0 ? '' : renderCaliberLine('预填标注：下面几格已经替你填上，来源写在格子里。'),
    collectBlockedFold({
      items: blocked,
      command: bp.command,
      note: '补齐后照上面那条口令跟助手说一遍。',
    }),
    collectSectionTitle({ no: 2, title: '把三样要素填回来' }),
    fieldCardOf({
      description: '金额、分类、时间三样填回这里，金额带符号（支出为负、收入为正）。',
      slots: ESCAPE_SLOTS,
      params,
      marks: prefillShort(marks),
      pick,
    }),
    promptCopyArea(promptOf(lack.map((f) => f.label)), '这一段就是补齐后要发给助手的话'),
    collectSectionTitle({ no: 3, title: '补齐了再请助手记' }),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command: commandLine(input.key, params),
          source: input.source,
          detail: '没写库（采集页） · 已收 ' + (scale.count > 0 ? scale.count : 0) + ' 张图',
          actionAt: input.actionAt,
          version: DOC_VERSION,
        }),
      },
    }),
  ].join('');
  return pageShell({
    docTitle: DOC_TITLE + '·采集页',
    title: WORD,
    subtitle: lack.length === 0 ? '三样要素都给齐了，详见下表。' : '三要素还没齐，详见下表。',
    slot: 'collect',
    page: 'collect',
    shape: envelope.shape,
    key: input.key,
    content,
  });
}

/** 结果型回执页：写库成功后出这一页（写库那一半在 `./write.ts`）。 */
function receiptPhoto(input: ReceiptInput): string {
  const probe = probeOfReceipt(input);
  const envelope = envelopeOf(input.key, true, input.receipt.summary);
  const content = [
    typeBadge({
      kind: KIND,
      status: 'ok',
      state: '写库成功（三要素来自外部识别）',
      next: nextStepOf({ page: 'receipt', exit: true }),
    }),
    renderKpiGrid([
      ...receiptCardsOf(input),
      receiptStatusCard(input.receipt, input.writtenDetail),
      { label: '这次记了几笔', value: input.receipt.affectedRows + ' 笔' },
      {
        label: '写进去的项',
        value: input.receipt.writtenFields.length + ' 项',
        detail: '共 ' + input.receipt.writtenFields.length + ' 项，详见下表。',
      },
    ]),
    renderCaliberLine('三要素来自本仓之外，本仓不存图也不读图。'),
    duplicateNote(findDuplicates(input.recent, probe), probe),
    renderDataTable({
      columns: [{ key: 'k', label: '哪一项' }, { key: 'v', label: '记成什么' }],
      rows: input.detail,
      caption: '这一笔记成什么',
    }),
    reconcileDisclosure(input.receipt),
    input.receipt.recordId === null ? '' : undoExit(input.receipt.recordId),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command: commandLine(input.key, input.params),
          source: input.receipt.source,
          detail: '改了 ' + input.receipt.affectedRows + ' 笔，写进去 '
            + (input.receipt.writtenFields.map((f) => fieldLabelOf(f)).join('、') || '没改到任何一项'),
          actionAt: input.receipt.actionAt,
          version: DOC_VERSION,
        }),
      },
    }),
  ].join('');
  return pageShell({
    docTitle: DOC_TITLE + '·写库回执',
    title: WORD + ' · 回执',
    subtitle: input.receipt.summary,
    slot: 'receipt',
    page: 'receipt',
    shape: envelope.shape,
    key: input.key,
    content,
  });
}

export const SCENE: Scene = {
  id: 'photo',
  wakeWord: WORD,
  key: 'bill.record.add',
  kind: KIND,
  op: '',
  family: '特殊收支族',
  collect: collectPhoto,
  receipt: receiptPhoto,
};
