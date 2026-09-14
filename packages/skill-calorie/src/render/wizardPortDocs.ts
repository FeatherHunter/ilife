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

/** #474（审查整改 1）· 下拉候选项：**`value` 是机器真值**（`loop` 的 `0/1/3/5`、`transition` 的
 *  `cut/fade/dissolve`，与 `wizardPort.ts` 的校验口径同源），`label` 才是给人看的中文词。
 *  这样当刻视图值能在下拉里**真的落上 `selected`**（先前拿中文当值 → 恒被「选一个」占位顶住，
 *  页上永远看不到当前值＝本票要治的「看不见」在新控件上复现）。 */
const LOOP_OPTIONS = [
  { value: '0', label: '无限' }, { value: '1', label: '1 次' },
  { value: '3', label: '3 次' }, { value: '5', label: '5 次' },
] as const;

const TRANSITION_OPTIONS = [
  { value: 'cut', label: '硬切' }, { value: 'fade', label: '淡入淡出' }, { value: 'dissolve', label: '溶解' },
] as const;

/** #474（审查整改 3c）· 表单上方那句显著的话：本层表单是零 JS 静态预览——**改了不会自动生效**
 *  （上面那段给 AI 的指令与页上的读数都是按当刻参数生成的，输入框只当"看到的值"）。
 *  不禁用控件（禁用会让人以为"根本不能改"），只把这件事说明白；真接线属公共层另一张票。 */
function formNoticeHtml(): string {
  return '<p><strong>这些是 AI 已经用的值；改了不会自动生效——要改就直接跟 AI 说一句。</strong></p>';
}

/* ── 3. 记身材照 wizard（纯配置） ── */

export function buildPhotoLogWizardDoc(v: PhotoLogWizardView): string {
  const content = [
    renderKpiGrid([
      // #474（审查整改 2）：`最多 20 张` 与照片路径字段名里的上限重复 → 这一格明细只报数，不再重复限制。
      { label: '照片', value: String(v.srcPaths.length), unit: '张', detail: '每张一行路径' },
      // #474：tag 格的「同一类用同一 tag」是操作指南不是数字 → 删（折叠标题里已说清怎么填）。
      { label: '标签', value: v.tag ?? '未填' },
    ]),
    renderDisclosure({
      // #474：小标题由操作说明改人话（「常用 tag／8 个／其一」三个词说同一件事）。
      title: '常用标签（点一个填上去）',
      contentHtml: PHOTO_LOG_TAGS.join(' · '),
    }),
    formNoticeHtml(),
    renderParamForm({
      // #474：原说明逐字复述三个字段名（百分百冗余）→ 改成一句「这页是干什么的」。
      description: '照片在你手机或电脑上，这里只登记路径与标签，不会动照片本身',
      fields: [
        // #474：示例改成 Windows 真路径，限制并进字段名（原 hint 只在空栏可见，填过就再也看不到）。
        { name: 'srcPaths', label: '照片文件路径（最多 20 张；如 D:\\照片\\正面1.jpg，多张换行或逗号分隔）', value: v.srcPaths.join('\n'), hint: '每行 1 个', required: true },
        { name: 'tag', label: '标签（最多 20 个字）', value: v.tag ?? '', hint: '如：正面', required: true },
        { name: 'note', label: '备注', value: v.note ?? '', hint: '如：早上空腹 / 减脂期第 30 天' },
      ],
    }),
    // #474：段前一句引导——复制区里是给 AI 的英文命令，先说清「整段复制粘过去就行」。
    '<p>下面这段是给 AI 的指令：整段复制粘过去就行，英文命令不用看懂。</p>',
    promptCopyArea(v.prompt, '给 AI 的指令（复制这一段）'),
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
    // #474：眉标里的内部词「wizard」「纯配置」与副标题说同一件事 → 眉标改人话不重复。
    eyebrow: '记身材照 · 只登记路径',
    subtitle: '选照片 → 选标签 → 加备注 → 复制给 AI 的指令',
    content,
  });
}

/* ── 4. GIF 框选器 ── */

/** #474：照片文件列——**异常才出声**：正常行留空（「存在」是零信息值，还压过表内「缺失」），
 *  找不到才写「找不到（会跳过）」，没校验过写「没核对」。 */
function photoFileCell(fileExists: boolean | null): string {
  if (fileExists === null) return '没核对';
  return fileExists ? '' : '找不到（会跳过）';
}

function gifTable(v: GifPlannerView): string {
  if (v.photos.length === 0) {
    return renderEmptyBlock({ text: '这个标签／时间窗里没有照片：换个标签，或把时间窗放宽一点' });
  }
  return renderDataTable({
    columns: [
      { key: 'id', label: 'ID' }, { key: 'date', label: '日期' },
      { key: 'tag', label: '标签' }, { key: 'file', label: '文件' },
      // #474：表头「存在」＋值「存在／缺失」自相打架 → 列名说清是**照片文件**，
      // 值只说「找不到（会跳过）」——与 KPI 的「框选里没有的 ID」分开命名（那是两回事）。
      { key: 'exists', label: '照片文件' },
      // #474：列名不该印 JSON 键名 `x,y,w,h` → 只留「裁剪」，值说人话。
      { key: 'crop', label: '裁剪' },
    ],
    rows: v.photos.map((p) => ({
      id: '#' + p.id + (p.selected ? ' ✓' : ''),
      date: p.date,
      tag: p.tagList.join('、') || '—',
      file: p.photoPath,
      exists: photoFileCell(p.fileExists),
      crop: p.crop ? '已裁剪' : '整图',
    })),
  });
}

/** 循环次数的人话（KPI 与下拉共用一份，防两处走散）。 */
function loopText(loop: number): string {
  return loop === 0 ? '无限' : loop + ' 次';
}

/** #474：预填过的字段看不见 placeholder——限制与单位一律进字段名（固定小字），
 *  只有**空字段**才留 hint（那时它显示得出来）；下拉的 hint 作首项占位，照旧给。 */
function gifForm(v: GifPlannerView): string {
  return renderParamForm({
    description: '选要进 GIF 的照片，再调快慢与大小；下面每项都已填好常用值，只改你要改的',
    fields: [
      { name: 'tag', label: '标签', value: v.tag ?? '', hint: '如：正面（留空＝全部标签）' },
      { name: 'photoIds', label: '框选照片编号（逗号分隔，留空＝全部）', value: v.selectedIds.join(','), hint: '如 12,15,22' },
      // #474（审查整改 3a）：`crops` 那一栏**真撤掉**——先前只换了字段名，`name="crops"` 仍在盘上，
      //  是个带名字却没人接线的空框（看着能填、填了不进指令）。裁剪由表单上方那句话承接：
      //  要裁就在对话里说一句。`crops` 键本身仍在 `wizardPort.ts` 的入参白名单与 prompt 复刻里（机器面原样）。
      { name: 'duration', label: '每帧多久（毫秒）', value: String(v.duration), hint: '50..5000', min: 50, max: 5000, step: 50 },
      { name: 'loop', label: '循环', value: String(v.loop), options: LOOP_OPTIONS, hint: '选一个' },
      { name: 'width', label: '宽（像素）', value: String(v.width), hint: '100..2000', min: 100, max: 2000, step: 1 },
      { name: 'height', label: '高（像素）', value: String(v.height), hint: '100..2000', min: 100, max: 2000, step: 1 },
      { name: 'watermark', label: '水印文字（可选）', value: v.watermark ?? '', hint: '右下角，如：减脂 30 天' },
      { name: 'transition', label: '切换效果', value: v.transition, options: TRANSITION_OPTIONS, hint: '选一个' },
      { name: 'output', label: '输出文件名（可选）', value: v.output ?? '', hint: '如：front_30days.gif' },
    ],
  });
}

export function buildGifPlannerDoc(v: GifPlannerView): string {
  // 本轮照片里文件找不到的张数（与表内「找不到（会跳过）」同一口径）；不是框选缺 ID，两者分开命名。
  const notFound = v.photos.filter((p) => p.fileExists === false).length;
  const content = [
    renderKpiGrid([
      // #474：原「共 N 张可用」把「可用」当「库里有」用，与表内「找不到」正面冲突 → 说清是库里共几张。
      { label: '要用', value: String(v.selectedIds.length), unit: '张', detail: '库里共 ' + v.photos.length + ' 张' },
      // #474：原「文件丢失」其实数的是框选里点不到的 ID（`missingIds`）→ 换名，不再与表内冲突。
      {
        label: '框选里没有的 ID', value: String(v.missingIds.length),
        ...(v.missingIds.length > 0 ? { detail: '已跳过 ' + v.missingIds.join('、') } : {}),
      },
      // #474：本轮新立一格——文件找不到是另一回事，异常才挂状态徽标（正常格不出徽标）。
      notFound > 0
        ? { label: '文件找不到', value: String(notFound), unit: '张', status: 'warn', statusText: '会跳过' }
        : { label: '文件找不到', value: '0', unit: '张' },
      // #474：原格 label「尺寸」与明细（帧速／循环）不是一件事 → 改「GIF 输出」，label 与明细对得上。
      { label: 'GIF 输出', value: v.width + '×' + v.height, detail: v.duration + 'ms/帧 · ' + loopText(v.loop) + '循环' },
    ]),
    gifTable(v),
    formNoticeHtml(),
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
    // #474：眉标原句自述「本项目缺什么」（无 cropper.js／手动 4 数字坐标），对用户零收益 → 删。
    eyebrow: '',
    subtitle: '挑照片 → 调快慢与尺寸 → 复制指令',
    content,
  });
}
