/** #353 · 身体域预检确认页文档装配（记围度／记体脂两页）：
 * 自 `render/wizardPortDocs.ts` **原样迁入**能力目录 `src/body/`（归属律：只属身体的东西住身体目录）。
 * 身材照／GIF 两页仍住 `render/wizardPortDocs.ts`，本件不碰。
 * 本层不做取数（数据由 `body/wizardPlate.ts` 备齐）。
 *
 * **#366 · 复制—执行闭环 ＋ 裁定 1／3**（基准 `docs/skills/skill-calorie/t395-融合基准.md` §四）：
 *   ① 复制区（`promptCopyArea`，位置与老页同位不动）里那一段＝**能直接执行的写命令**；填不全时是老正本
 *      的缺项／越界清单注释串（`body_composition_wizard.html:487-524` 四句，逐字结构）。
 *   ② 老页 `#promptBox` 的人读参数清单搬到「核对」折叠区（`preview`，`renderPreBlock`）——它是给人核对的，
 *      **不是**要粘贴的那一段（粘贴的只有复制区那一块）。
 *   ③ 输入口径全部走 `wizardPlate.ts` 的同一处常量：`CALIPER_INPUT`／`BF_INPUT`／`MEASURE_STEP`＋逐部位
 *      `MEASUREMENT_BOUNDS`（裁定 3）；体脂率在皮褶钳模式下 `readonly`（裁定 1），显示的是命令将算出的那一个。
 *   ④ 老页 `:352-355` 的算式区（7 处总和 ＋ JP7 公式原文）恒可见；来源／性别改下拉（老页 `:269-272`／`:283-286`）。
 */
import {
  renderDisclosure,
  renderEmptyBlock,
  renderKpiGrid,
  renderParamForm,
  renderPreBlock,
} from 'base-paint/blocks';
import type {
  CompositionWizardView,
  MeasureWizardView,
} from './wizardPlate.js';
import {
  BF_INPUT,
  CALIPER_INPUT,
  MEASURE_STEP,
  WIZARD_MEASURE_CAMEL,
  WIZARD_MEASURE_LABELS,
  bfRangeText,
  caliperRangeText,
  isCaliperMode,
  measureRangeText,
} from './wizardPlate.js';
import { SOURCE_CHOICES, SOURCE_LABELS } from '../kcal.js';
import { MEASUREMENT_BOUNDS } from '../fetch/body.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { dataCopyArea, notice, promptCopyArea } from '../shared/copyArea.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件两页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·配置向导';

/** 核对区的折叠标题（与复制区同一个区号前缀，读者一眼看出两块的分工）。 */
const CHECK_TITLE = '核对：本次要写入的参数（要粘贴的只有下方复制区那一段）';

/** 老页 `body_composition_wizard.html:354` 的公式原文（**逐字**，含 `²`／`Σ`／U+2212 减号）。 */
const JP7_FORMULA = 'BD = 1.112 - 0.00043499×Σ + 0.00000055×Σ² - 0.00028826×年龄(男) · 体脂率 = (495 / BD) − 450';

/** 老页 `:330` 的范围提示（逐字）。 */
const CALIPER_HINT = '每项范围 ' + caliperRangeText() + ' · 总和 7 处建议 40–250';

function fmtDate(d: string): string {
  return d;
}

/* ── 1. 记围度预检确认页 ── */

const MEASURE_GROUPS: { title: string; fields: string[] }[] = [
  { title: '上身围度（5 项）', fields: ['chestCm', 'waistCm', 'abdomenCm', 'hipCm', 'shoulderCm'] },
  { title: '下身围度（4 项）', fields: ['leftThighCm', 'rightThighCm', 'leftCalfCm', 'rightCalfCm'] },
  { title: '手臂围度（4 项）', fields: ['leftArmCm', 'rightArmCm', 'leftForearmCm', 'rightForearmCm'] },
];

/** 一个围度输入框：区间逐部位取唯一来源 `MEASUREMENT_BOUNDS`，步长取 `MEASURE_STEP`（裁定 3）。 */
function measureField(camel: string, value: string) {
  const snake = WIZARD_MEASURE_CAMEL[camel] as string;
  const b = MEASUREMENT_BOUNDS[snake] as [number, number];
  return {
    name: snake,
    label: (WIZARD_MEASURE_LABELS[camel] as string) + '（cm）',
    value,
    hint: measureRangeText(snake) + ' · 如 95.0',
    step: MEASURE_STEP,
    min: b[0],
    max: b[1],
  };
}

function measureForm(v: MeasureWizardView): string {
  const valOf = (camel: string): string => {
    const hit = v.filled.find((f) => f.camel === camel);
    return hit ? String(hit.value) : '';
  };
  const head = renderParamForm({
    description: '测量日期（默认今天；补记历史日期同样适用）＋备注（可选）',
    fields: [
      { name: 'date', label: '测量日期', value: v.date, hint: 'YYYY-MM-DD', required: true },
      { name: 'note', label: '备注', value: v.note ?? '', hint: '如：早上空腹 / 减脂期第 30 天' },
    ],
  });
  const groups = MEASURE_GROUPS.map((g) =>
    renderDisclosure({
      title: g.title + '（已填 ' + g.fields.filter((f) => valOf(f) !== '').length + '/' + g.fields.length + '）',
      contentHtml: renderParamForm({
        fields: g.fields.map((camel) => measureField(camel, valOf(camel))),
      }),
    }),
  ).join('');
  return head + groups;
}

function measureRecent(v: MeasureWizardView): string {
  if (!v.recent) return renderEmptyBlock({ text: '暂无围度记录（首次记录：填好上方至少 1 项后复制 prompt）' });
  const cells = Object.entries(v.recent.values)
    .filter(([, n]) => n !== null)
    .map(([camel, n]) => (WIZARD_MEASURE_LABELS[camel] as string) + ' ' + n + 'cm');
  return renderDisclosure({
    title: '最近一次：' + fmtDate(v.recent.date),
    contentHtml: cells.length > 0 ? cells.join(' · ') : '（该记录无围度明细）',
  });
}

export function buildMeasureWizardDoc(v: MeasureWizardView): string {
  const content = [
    renderKpiGrid([
      { label: '已填', value: v.filledCount + '/13 项', detail: '至少 1 项必填' },
      { label: '日期', value: fmtDate(v.date) },
      { label: '最近', value: v.recent ? fmtDate(v.recent.date) : '无记录' },
    ]),
    measureRecent(v),
    measureForm(v),
    renderDisclosure({ title: CHECK_TITLE, contentHtml: renderPreBlock({ command: v.preview }) }),
    promptCopyArea(v.prompt),
    dataCopyArea('复制数据', {
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.measure-wizard',
        data: { metrics: metricsOf({ filledCount: v.filledCount, hasRecent: v.recent ? 1 : 0 }) },
      },
    }),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '记围度',
    eyebrow: '配置型 wizard · 填表→复制 prompt→AI 写库',
    subtitle: '13 部位分 3 组，量了哪项填哪项；填好至少 1 项，复制区那一段就是能直接跑的命令',
    content,
  });
}

/* ── 2. 记体脂预检确认页 ── */

/** 算式区那一块（裁定 1／老页 `:352-355`）：7 处总和 ＋ JP7 公式原文 ＋ 体脂率留空口径。
 *  恒可见（老页的 `.sum-box` 也不随来源模式隐藏），缺项写 `—`（裁定 2）。 */
function compositionFormula(v: CompositionWizardView): string {
  const isCaliper = isCaliperMode(v.source);
  return notice({
    title: '换算口径（' + (isCaliper ? '皮褶钳' : '外部测量') + '）',
    msg: isCaliper
      ? '体脂率可留空，由命令按 7 点换算'
      : '体脂率填设备读数（范围 ' + bfRangeText() + '）；皮褶钳来源的体脂率可留空，由命令按 7 点换算',
    detail: '7 处总和:' + (v.sum7 === null ? '—' : v.sum7) + ' mm · 公式: ' + JP7_FORMULA,
  });
}

function compositionForm(v: CompositionWizardView): string {
  const isCaliper = isCaliperMode(v.source);
  const calVal = (f: string): string => {
    const hit = v.calipers.find((c) => c.field === f);
    return hit ? String(hit.value) : '';
  };
  const caliperFields = [
    { f: 'caliper_chest_mm', label: '胸部（mm）' }, { f: 'caliper_abdominal_mm', label: '腹部（mm）' },
    { f: 'caliper_thigh_mm', label: '大腿（mm）' }, { f: 'caliper_tricep_mm', label: '三头肌（mm）' },
    { f: 'caliper_subscapular_mm', label: '肩胛下（mm）' }, { f: 'caliper_suprailiac_mm', label: '髂上（mm）' },
    { f: 'caliper_midaxillary_mm', label: '腋中线（mm）' },
  ];
  // 体脂率那一格（裁定 1）：皮褶钳模式只读，显示命令将算出的那一个；其余来源可手填。
  const bfValue = isCaliper
    ? (v.previewBodyFatPct === null ? '' : String(v.previewBodyFatPct))
    : (v.bodyFatPct === null ? '' : String(v.bodyFatPct));
  const head = renderParamForm({
    description: '日期（必填）＋来源（必填）＋年龄／性别（皮褶钳换算要用）＋体脂率＋备注（可选）',
    fields: [
      { name: 'date', label: '日期', value: v.date, hint: 'YYYY-MM-DD', required: true },
      {
        name: 'source', label: '来源', value: v.source ?? '', hint: '选一个', required: true,
        options: SOURCE_CHOICES.map((s) => ({ value: s, label: SOURCE_LABELS[s] })),
      },
      { name: 'age', label: '年龄', value: v.age === null ? '' : String(v.age), hint: '体脂率公式需要，如 30', min: 1, max: 120 },
      {
        name: 'sex', label: '性别', value: v.sex ?? '', hint: '不填',
        options: [{ value: 'male', label: '男' }, { value: 'female', label: '女' }],
      },
      {
        name: 'body_fat_pct', label: '体脂率 %', value: bfValue, required: !isCaliper, readonly: isCaliper,
        hint: isCaliper ? '皮褶钳:7 皮褶＋年龄／性别填齐后按公式算，无需手填' : '外部设备:填设备读数，范围 ' + bfRangeText(),
        step: BF_INPUT.step, min: BF_INPUT.min, max: BF_INPUT.max,
      },
      { name: 'note', label: '备注', value: v.note ?? '', hint: '如：早上空腹 / Jackson-Pollock 7 点法' },
    ],
  }) + renderDisclosure({
    title: '皮褶钳 7 点（已填 ' + v.calipers.length + '/7）' + (v.sum7 === null ? '' : ' · 7 处总和:' + v.sum7 + ' mm'),
    contentHtml: renderParamForm({
      description: CALIPER_HINT,
      fields: caliperFields.map((c) => ({
        name: c.f, label: c.label, value: calVal(c.f), hint: 'mm',
        step: CALIPER_INPUT.step, min: CALIPER_INPUT.min, max: CALIPER_INPUT.max,
      })),
    }),
  });
  return head;
}

function compositionRecent(v: CompositionWizardView): string {
  if (!v.recent) return renderEmptyBlock({ text: '暂无体脂记录（首次记录：填好上方必填后复制 prompt）' });
  return renderDisclosure({
    title: '最近一次：' + fmtDate(v.recent.date),
    contentHtml: '体脂率 ' + (v.recent.bodyFatPct === null ? '—' : v.recent.bodyFatPct + '%') + ' · 来源 ' + (v.recent.source ?? '—'),
  });
}

export function buildCompositionWizardDoc(v: CompositionWizardView): string {
  const content = [
    renderKpiGrid([
      { label: '来源', value: v.sourceLabel ?? '（未给，按皮褶钳）', detail: v.source ?? '' },
      { label: '体脂率', value: v.bodyFatPct === null ? '—' : v.bodyFatPct + '%', detail: v.sum7 === null ? '' : '7 点总和 ' + v.sum7 + ' mm' },
      { label: '最近', value: v.recent ? fmtDate(v.recent.date) : '无记录' },
    ]),
    compositionRecent(v),
    compositionFormula(v),
    compositionForm(v),
    renderDisclosure({ title: CHECK_TITLE, contentHtml: renderPreBlock({ command: v.preview }) }),
    promptCopyArea(v.prompt),
    dataCopyArea('复制数据', {
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.composition-wizard',
        data: {
          metrics: metricsOf({
            filledCount: (v.source ? 1 : 0) + (v.bodyFatPct === null ? 0 : 1) + v.calipers.length,
            caliperCount: v.calipers.length, sum7: v.sum7, hasRecent: v.recent ? 1 : 0,
          }),
        },
      },
    }),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '记体脂',
    eyebrow: '配置型 wizard · 填表→复制 prompt→AI 写库',
    subtitle: '皮褶钳来源按 Jackson-Pollock 7 点法换算（体脂率可留空），外部设备直填读数',
    content,
  });
}
