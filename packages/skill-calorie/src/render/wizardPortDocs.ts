/** #86 · wizard 4 页 HTML 填充器（D1 静态 HTML ＋ copyText）。
 *
 * 包裹约定（沿 #111/#112/#113，不新增）：
 * sharedCss = buildStyleSheet().css + blocksCss()，不走 extraCss；
 * 复制文本 metrics 块一律 buildDataText（#77 契约）：stat 投影只收确定数字。
 * 用户路径的复制＝prompt 预览（renderPreBlock）＋复制按钮（render/copy.ts 的
 * copyActionHtml，走 Base P0 双通道，禁本地改写）——旧模板 btn-copy＋copyText
 * 的新架构同形（B-11 复制区；行为归宿主 B7，本层零 JS）。
 * 表单＝renderParamForm 预填值（B-09 静态 label＋input，零 JS；无 select 控件，
 * 来源/性别等以下拉候选写进 hint，B7 边界）。
 * 本层不做取数（数据由 render/wizardPort.ts 备齐），空库不返空页（recent 为空即空态行）。
 */
import {
  renderDataTable,
  renderDisclosure,
  renderEmptyBlock,
  renderKpiGrid,
  renderParamForm,
} from 'base-paint/blocks';
import type {
  CompositionWizardView,
  GifPlannerView,
  MeasureWizardView,
  PhotoLogWizardView,
} from './wizardPort.js';
import { PHOTO_LOG_TAGS } from './wizardPort.js';
import { WIZARD_MEASURE_CAMEL, WIZARD_MEASURE_LABELS } from './wizardPort.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { dataCopyArea, promptCopyArea } from '../shared/copyArea.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件四页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·配置向导';

function fmtDate(d: string): string {
  return d;
}

/* ── 1. 记围度 wizard ── */

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

/* ── 2. 记体脂 wizard ── */

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

/* ── 3. 记身材照 wizard（纯配置） ── */

export function buildPhotoLogWizardDoc(v: PhotoLogWizardView): string {
  const content = [
    renderKpiGrid([
      { label: '照片', value: v.srcPaths.length + ' 张', detail: '至多 20 张' },
      { label: 'tag', value: v.tag ?? '未填', detail: '同一类用同一 tag' },
    ]),
    renderDisclosure({
      title: '常用 tag（8 个，填 tag 栏其一）',
      contentHtml: PHOTO_LOG_TAGS.join(' · '),
    }),
    renderParamForm({
      description: '照片源文件路径（每行 1 个，或逗号分隔）＋ tag ＋备注',
      fields: [
        { name: 'srcPaths', label: '照片文件路径', value: v.srcPaths.join('\n'), hint: '如：/path/a.jpg（多张换行或逗号分隔）', required: true },
        { name: 'tag', label: 'tag', value: v.tag ?? '', hint: '≤20 字符，如：正面', required: true },
        { name: 'note', label: '备注', value: v.note ?? '', hint: '如：早上空腹 / 减脂期第 30 天' },
      ],
    }),
    promptCopyArea(v.prompt),
    dataCopyArea('复制数据', {
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.photo-log-wizard',
        data: { metrics: metricsOf({ fileCount: v.srcPaths.length, hasTag: v.tag ? 1 : 0 }) },
      },
    }),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '记身材照',
    eyebrow: '配置型 wizard · 纯配置，填好后复制 prompt 给 AI',
    subtitle: '选本地照片 → 选 tag → 加备注 → 复制 prompt',
    content,
  });
}

/* ── 4. GIF 框选器 ── */

function gifTable(v: GifPlannerView): string {
  if (v.photos.length === 0) {
    return renderEmptyBlock({ text: '该标签/窗口下无可用照片（换 tag 或扩大窗口）' });
  }
  return renderDataTable({
    columns: [
      { key: 'id', label: 'ID' }, { key: 'date', label: '日期' },
      { key: 'tag', label: '标签' }, { key: 'file', label: '文件' },
      { key: 'exists', label: '存在' }, { key: 'crop', label: '裁剪 x,y,w,h' },
    ],
    rows: v.photos.map((p) => ({
      id: '#' + p.id + (p.selected ? ' ✓' : ''),
      date: p.date,
      tag: p.tagList.join('、') || '—',
      file: p.photoPath,
      exists: p.fileExists === null ? '未校验' : (p.fileExists ? '存在' : '缺失'),
      crop: p.crop ? p.crop.join(',') : '整图',
    })),
  });
}

function gifForm(v: GifPlannerView): string {
  return renderParamForm({
    description: '框选（photoIds 逗号分隔，空＝全选）＋每张单独裁剪（crops JSON {id:[x1,y1,x2,y2]}，空＝整图）＋ GIF 细节',
    fields: [
      { name: 'tag', label: '标签', value: v.tag ?? '', hint: '如：正面（空＝全部标签）' },
      { name: 'photoIds', label: '框选照片 ID', value: v.selectedIds.join(','), hint: '逗号分隔，如 12,15,22；空＝全选' },
      { name: 'crops', label: '单独裁剪 JSON', value: '', hint: '{"12":[x1,y1,x2,y2]}（像素，左上原点）' },
      { name: 'duration', label: '速度（单帧 ms）', value: String(v.duration), hint: '50..5000，默认 500' },
      { name: 'loop', label: '循环', value: String(v.loop), hint: '0/1/3/5（0=无限）' },
      { name: 'width', label: '宽度（像素）', value: String(v.width), hint: '100..2000' },
      { name: 'height', label: '高度（像素）', value: String(v.height), hint: '100..2000' },
      { name: 'watermark', label: '水印文字（可选）', value: v.watermark ?? '', hint: '右下角，如：减脂 30 天' },
      { name: 'transition', label: '过渡效果', value: v.transition, hint: 'cut / fade / dissolve' },
      { name: 'output', label: '输出文件名（可选）', value: v.output ?? '', hint: '如：front_30days.gif' },
    ],
  });
}

export function buildGifPlannerDoc(v: GifPlannerView): string {
  const content = [
    renderKpiGrid([
      { label: '已选', value: v.selectedIds.length + ' 张', detail: '共 ' + v.photos.length + ' 张可用' },
      { label: '文件丢失', value: v.missingIds.length + ' 张', detail: v.missingIds.length > 0 ? '已跳过 ID ' + v.missingIds.join(',') : '无' },
      { label: '尺寸', value: v.width + '×' + v.height, detail: v.duration + 'ms/帧 · ' + (v.loop === 0 ? '无限循环' : v.loop + ' 次') },
    ]),
    gifTable(v),
    gifForm(v),
    promptCopyArea(v.prompt),
    dataCopyArea('复制数据', {
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.gif-planner',
        data: {
          metrics: metricsOf({
            photoCount: v.photos.length, selectedCount: v.selectedIds.length,
            missingCount: v.missingIds.length,
            cropCount: v.photos.filter((p) => p.crop).length,
          }),
        },
      },
    }),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '身材照 GIF 规划器',
    eyebrow: 'GIF 框选器 · 无 cropper.js，手动 4 数字坐标',
    subtitle: '框选照片 → 填裁剪与细节 → 复制 prompt 给 AI',
    content,
  });
}
