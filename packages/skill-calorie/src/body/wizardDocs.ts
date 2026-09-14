/** #353 · 身体域预检确认页文档装配（记围度／记体脂两页）：
 * 自 `render/wizardPortDocs.ts` **原样迁入**能力目录 `src/body/`（归属律：只属身体的东西住身体目录）。
 * 身材照／GIF 两页仍住 `render/wizardPortDocs.ts`，本件不碰。
 * 本层不做取数（数据由 `body/wizardPlate.ts` 备齐）。
 */
import {
  renderDisclosure,
  renderEmptyBlock,
  renderKpiGrid,
  renderParamForm,
} from 'base-paint/blocks';
import type {
  CompositionWizardView,
  MeasureWizardView,
} from './wizardPlate.js';
import { WIZARD_MEASURE_CAMEL, WIZARD_MEASURE_LABELS } from './wizardPlate.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { dataCopyArea, promptCopyArea } from '../shared/copyArea.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件两页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·配置向导';

function fmtDate(d: string): string {
  return d;
}

/* ── 1. 记围度预检确认页 ── */

const MEASURE_GROUPS: { title: string; fields: string[] }[] = [
  { title: '上身围度（5 项）', fields: ['chestCm', 'waistCm', 'abdomenCm', 'hipCm', 'shoulderCm'] },
  { title: '下身围度（4 项）', fields: ['leftThighCm', 'rightThighCm', 'leftCalfCm', 'rightCalfCm'] },
  { title: '手臂围度（4 项）', fields: ['leftArmCm', 'rightArmCm', 'leftForearmCm', 'rightForearmCm'] },
];

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
        fields: g.fields.map((camel) => ({
          name: WIZARD_MEASURE_CAMEL[camel] as string,
          label: (WIZARD_MEASURE_LABELS[camel] as string) + '（cm）',
          value: valOf(camel),
          hint: '如 95.0',
        })),
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
    subtitle: '13 部位分 3 组，量了哪项填哪项',
    content,
  });
}

/* ── 2. 记体脂预检确认页 ── */

function compositionForm(v: CompositionWizardView): string {
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
  return renderParamForm({
    description: '日期＋来源（必填）＋体脂率实测值（必填，换算未移植，直传实测值）',
    fields: [
      { name: 'date', label: '日期', value: v.date, hint: 'YYYY-MM-DD', required: true },
      { name: 'source', label: '来源', value: v.source ?? '', hint: 'home_caliper / hospital / gym（皮褶钳/医院/健身房）', required: true },
      { name: 'age', label: '年龄', value: v.age === null ? '' : String(v.age), hint: '体脂率公式需要，如 30' },
      { name: 'sex', label: '性别', value: v.sex ?? '', hint: 'male / female（男/女）' },
      { name: 'body_fat_pct', label: '体脂率 %', value: v.bodyFatPct === null ? '' : String(v.bodyFatPct), hint: '(0, 60)，如 18.5', required: true },
      { name: 'note', label: '备注', value: v.note ?? '', hint: '如：早上空腹 / Jackson-Pollock 7 点法' },
    ],
  }) + renderDisclosure({
    title: '皮褶钳 7 点（仅来源=home_caliper，已填 ' + v.calipers.length + '/7）',
    contentHtml: renderParamForm({
      fields: caliperFields.map((c) => ({ name: c.f, label: c.label, value: calVal(c.f), hint: '(0, 100) mm' })),
    }),
  });
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
      { label: '来源', value: v.sourceLabel ?? '未选', detail: v.source ?? '' },
      { label: '体脂率', value: v.bodyFatPct === null ? '—' : v.bodyFatPct + '%', detail: v.sum7 === null ? '' : '7 点总和 ' + v.sum7 + ' mm' },
      { label: '最近', value: v.recent ? fmtDate(v.recent.date) : '无记录' },
    ]),
    compositionRecent(v),
    compositionForm(v),
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
    subtitle: '皮褶钳 7 点先换算成体脂率（换算未移植，调用方算好直传）',
    content,
  });
}
