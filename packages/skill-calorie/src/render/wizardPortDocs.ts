/** #86 · wizard 身材照／GIF 两页 HTML 填充器（D1 静态 HTML ＋ copyText）。
 *（#353 后：记围度／记体脂两页已迁入 `src/body/wizardDocs.ts`，本件只留两页。）
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
  GifPlannerView,
  PhotoLogWizardView,
} from './wizardPort.js';
import { PHOTO_LOG_TAGS } from './wizardPort.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { dataCopyArea, promptCopyArea } from '../shared/copyArea.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件两页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·配置向导';

/* ── 身体两页已迁出（#353）：记围度／记体脂文档原样迁入 src/body/wizardDocs.ts，本件只留身材照／GIF。 */

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
