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
  renderDistributionRows,
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
  isCaliperMode,
  measureRangeText,
} from './wizardPlate.js';
import { SOURCE_CHOICES, SOURCE_LABELS } from '../kcal.js';
import { MEASUREMENT_BOUNDS } from '../fetch/body.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyActionHtml } from '../render/copy.js';
import { dataCopyArea, notice } from '../shared/copyArea.js';
import { renderFactStrip } from 'base-paint';
import { wizardUiCss } from './wizardUi.js';

/** 页面级移动端配方（`assembleDocPage({ pageUi: true })`，本族五页同值）。 */
const PAGE_UI = true;

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件两页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。
 *  取域内统一口径（编排者 2026-09-15 裁定，照场景 09 已交付先例）：空格分隔、不上任何符号。 */
const DOC_TITLE = '卡路里 身体细节';

/** 核对区的折叠标题：一句人话（改前印「本次要写入的参数（要粘贴的只有下方复制区那一段）」，
 *  括号里是给开发者看的分工说明，读者只要知道「这一栏是核对用」）。 */
const CHECK_TITLE = '核对：这次要写进去的值';

/** 皮褶 7 点这一组的说明：**不印系数与变量**（负责人第 4 条）。
 *  换算方法一句话说清，公式留给命令层；范围由每一格的 `min`／`max` 自己约束，不在这里列字面量。 */
const CALIPER_HINT = '每处按毫米读皮褶值，7 处都量到才换算得出体脂率。';

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
    description: '量了哪项就填哪项，没量的留空，至少填 1 项。',
    fields: [
      { name: 'date', label: '测量日期', value: v.date, hint: 'YYYY-MM-DD', required: true },
      { name: 'note', label: '备注', value: v.note ?? '', hint: '如：早上空腹，或减脂期第 30 天' },
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

/** 「上次记的」那一块：**一条一行**（改前把最多 13 件事拿 `·` 串成一行）。
 *  日期只写在折叠标题里那一处，块里不重复（同一事实一页一处）。 */
function measureRecent(v: MeasureWizardView): string {
  if (!v.recent) return '';
  const rows = Object.entries(v.recent.values)
    .filter(([, n]) => n !== null)
    .map(([camel, n]) => ({
      label: WIZARD_MEASURE_LABELS[camel] as string,
      value: n + 'cm',
      pct: 100,
    }));
  if (rows.length === 0) return '';
  return renderDisclosure({
    title: '上次记的（' + fmtDate(v.recent.date) + '）',
    contentHtml: renderDistributionRows({ rows }),
  });
}

export function buildMeasureWizardDoc(v: MeasureWizardView): string {
  const content = [
    wizardUiCss(),
    renderKpiGrid([
      { label: '已填', value: v.filledCount + '/13 项', detail: '至少填 1 项' },
      { label: '这次记在哪天', value: fmtDate(v.date), detail: '补记历史日期就填旧的那天' },
    ]),
    measureRecent(v),
    measureForm(v),
    renderDisclosure({ title: CHECK_TITLE, contentHtml: renderPreBlock({ command: v.preview }) }),
    // 复制区：**一个动作区**里出两颗按钮——「复制指令」（那一段能直接跑的命令）＋「复制数据 ▾」（三格式）。
    // 改前是「复制指令 ＋ 复制日志」与「复制数据 ＋ 复制日志」两处动作区，四颗按钮两颗各占半宽，
    // 且「复制日志」出现两次（#494 记的旧缺陷）；日志那一颗在页面上不重复出、只有真产生日志时才该有。
    copyActionHtml(v.prompt) + dataCopyArea('复制数据', {
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.measure-wizard',
        data: { metrics: metricsOf({ filledCount: v.filledCount, hasRecent: v.recent ? 1 : 0 }) },
      },
    }),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '记围度',
    // #539 收口：B 线（给了 metaLeft）不渲染 eyebrow，这一串写了也白写——还留着 `·` 就是颗 latent 探针雷，
    // 改成无符号的归属词。零产物变化（B 线只认 metaLeft，见 shared/docPage.ts:131-141）。
    eyebrow: '身体细节',
    subtitle: null,
    metaLeft: '填好确认一遍，再照复制区那一段把记录写进库里。',
    content,
    pageUi: PAGE_UI,
  });
}

/* ── 2. 记体脂预检确认页 ── */

/** 换算口径那一块（裁定 1）：**只说你该怎么填，不印系数与变量**（负责人第 4 条）。
 *  改前这里印 `7 处总和:— mm · 公式: BD = 1.112 - 0.00043499×Σ + …`——`BD`／`Σ` 是公式变量，
 *  `—` 是「这个字段还没值」的内部写法，两样都不该上屏。 */
function compositionFormula(v: CompositionWizardView): string {
  const isCaliper = isCaliperMode(v.source);
  return notice({
    title: '这几格怎么填（' + (isCaliper ? '皮褶钳' : '外部测量') + '）',
    msg: isCaliper
      ? '皮褶钳这一支：体脂率不用手填。把 7 处皮褶填齐，再补上年龄和性别，命令就会按 Jackson-Pollock 7 点法算出体脂率。'
      : '外部设备这一支：体脂率就填设备读数（0 到 60）。皮褶钳那一支可以留空，交给命令换算。',
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
    // 字段说明**不拿 `＋` 串成一行**（改前：「日期（必填）＋来源（必填）＋年龄／性别…」）：
    // 一句人话在上头，必填由每一格自己的星号承担。#539 收口：后半句
    // 「皮褶钳那一支的体脂率不用手填」与上面那块换算口径说同一件事，只留「带星号的必填」。
    description: '带星号的必填。',
    fields: [
      { name: 'date', label: '日期', value: v.date, hint: 'YYYY-MM-DD', required: true },
      {
        name: 'source', label: '来源', value: v.source ?? '', hint: '选一个', required: true,
        options: SOURCE_CHOICES.map((s) => ({ value: s, label: SOURCE_LABELS[s] })),
      },
      {
        name: 'age', label: '年龄', value: v.age === null ? '' : String(v.age),
        hint: '填了才换算得出体脂率，如 30', min: 1, max: 120,
      },
      {
        name: 'sex', label: '性别', value: v.sex ?? '', hint: '填了才换算得出体脂率',
        options: [{ value: 'male', label: '男' }, { value: 'female', label: '女' }],
      },
      {
        name: 'body_fat_pct', label: '体脂率 %', value: bfValue, required: !isCaliper, readonly: isCaliper,
        hint: isCaliper ? '皮褶钳这一支不用手填，由命令换算' : '填设备上的读数，0 到 60',
        step: BF_INPUT.step, min: BF_INPUT.min, max: BF_INPUT.max,
      },
      { name: 'note', label: '备注', value: v.note ?? '', hint: '如：早上空腹，或减脂期第 30 天' },
    ],
  }) + renderDisclosure({
    // 折叠标题只报「填了几处」；总和改由块里那条口径行承载（改前把 `· 7 处总和:20 mm` 塞进标题）。
    title: '皮褶钳 7 点（已填 ' + v.calipers.length + '/7）',
    contentHtml: renderParamForm({
      description: CALIPER_HINT + (v.sum7 === null ? '' : ' 这 7 处已填齐，总和 ' + v.sum7 + ' 毫米。'),
      fields: caliperFields.map((c) => ({
        name: c.f, label: c.label, value: calVal(c.f), hint: '换算用',
        step: CALIPER_INPUT.step, min: CALIPER_INPUT.min, max: CALIPER_INPUT.max,
      })),
    }),
  });
  return head;
}

/** 「上次记的」那一块：来源印**中文名**（改前印 `gym` 这样的英文枚举名），两条事实一格一条。 */
function compositionRecent(v: CompositionWizardView): string {
  if (!v.recent) return '';
  const src = v.recent.source === null
    ? '没记来源'
    : (SOURCE_LABELS as Record<string, string>)[v.recent.source] ?? v.recent.source;
  return renderDisclosure({
    title: '上次记的（' + fmtDate(v.recent.date) + '）',
    contentHtml: renderFactStrip({
      items: [
        { label: '体脂率', value: v.recent.bodyFatPct === null ? '没记' : v.recent.bodyFatPct + '%' },
        { label: '来源', value: src },
      ],
    }),
  });
}

export function buildCompositionWizardDoc(v: CompositionWizardView): string {
  const content = [
    wizardUiCss(),
    renderKpiGrid([
      // 卡槽吃纯文本，只放短值：来源写中文名；体脂率那一格没值就整张卡不出（零信息值的卡不如不印）。
      { label: '来源', value: v.sourceLabel ?? '家测皮褶钳', detail: v.source === null ? '没指定，按这一支打开' : '' },
      ...(v.previewBodyFatPct === null && v.bodyFatPct === null
        ? []
        : [{
          label: '体脂率',
          value: (v.previewBodyFatPct ?? v.bodyFatPct) + '%',
          detail: v.previewBodyFatPct === null ? '设备读数' : '按 7 处皮褶换算出来的',
        }]),
      { label: '这次记在哪天', value: fmtDate(v.date), detail: '补记历史日期就填旧的那天' },
    ]),
    compositionRecent(v),
    compositionFormula(v),
    compositionForm(v),
    renderDisclosure({ title: CHECK_TITLE, contentHtml: renderPreBlock({ command: v.preview }) }),
    // 复制区：一个动作区里两颗按钮（「复制指令」＋「复制数据 ▾」）；日志那一颗不重复出（同围度页那条注释）。
    copyActionHtml(v.prompt) + dataCopyArea('复制数据', {
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
    // #539 收口：同上，B 线不渲染 eyebrow，无符号归属词即可，零产物变化。
    eyebrow: '身体细节',
    subtitle: null,
    metaLeft: '填好确认一遍，再照复制区那一段把记录写进库里。',
    content,
    pageUi: PAGE_UI,
  });
}
