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
  renderDisclosure,
  renderEmptyBlock,
  renderKpiGrid,
  renderParamForm,
} from 'base-paint/blocks';
import { renderFactStrip } from 'base-paint';
import type {
  GifPlannerView,
  PhotoLogWizardView,
} from './wizardPort.js';
import { PHOTO_LOG_TAGS } from './wizardPort.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { dataCopyArea, promptCopyArea } from '../shared/copyArea.js';
import { chipRow, photoPickRows, photoUiCss } from '../photo/photoUi.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件两页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。
 *  #527：`卡路里·配置向导` 里的 `·` 是符号顶替版面（题名不是并列语义），改空格。 */
const DOC_TITLE = '卡路里 配置向导';

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
 *  不禁用控件（禁用会让人以为"根本不能改"），只把这件事说明白；真接线属公共层另一张票。
 *  #527：句中的 `；` 是并列语义，拆成两句（同一件事一页一处，符号不再顶版面）。 */
function formNoticeHtml(): string {
  return '<p><strong>这些是 AI 已经用的值。改了不会自动生效——要改就直接跟 AI 说一句。</strong></p>';
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
        { name: 'srcPaths', label: '照片文件路径（最多 20 张。如 D:\\照片\\正面1.jpg，多张换行或逗号分隔）', value: v.srcPaths.join('\n'), hint: '每行 1 个', required: true },
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
    // #527：眉标的 `记身材照 · 只登记路径` 是 `·` 串两件事，且页名已经说了「记身材照」→ 只留后半句。
    eyebrow: '只登记路径',
    subtitle: '先核对要登记的照片与标签，再复制指令给 AI。照片本身不会被动。',
    content,
  });
}

/* ── 4. GIF 框选器 ── */

/** 循环次数的人话（KPI 与下拉共用一份，防两处走散）。 */
function loopText(loop: number): string {
  return loop === 0 ? '无限循环' : loop + ' 次循环';
}

/** 输出规格那三件事（每帧多久／循环几次／有没有水印）：KPI 卡的明细槽吃纯文本，形状落不进去，
 *  故在卡下另出一排**事实条**（#525 的 `renderFactStrip` 口径，本域只给数据）。 */
function outputFacts(v: GifPlannerView): string {
  return renderFactStrip({
    items: [
      { label: '每帧停', value: (v.duration / 1000).toFixed(2).replace(/0$/, '') + ' 秒' },
      { label: '循环', value: loopText(v.loop) },
      ...(v.watermark === null ? [] : [{ label: '水印', value: v.watermark }]),
    ],
  });
}

/** #527 候选行（原六列表在窄屏被挤成长串）：一行一张照片——编号／标签／文件名／异常徽标各占一槽，
 *  日期与整图或裁剪走第二行的徽章列。**不印 `#N`**（内部标识符口径），改「照片 31」这种读者话；
 *  正常张留空（「存在」是零信息值），找不到文件才挂徽标。 */
function gifCandidates(v: GifPlannerView): string {
  if (v.photos.length === 0) {
    return renderEmptyBlock({ text: '这个标签／时间窗里没有照片：换个标签，或把时间窗放宽一点' });
  }
  return photoPickRows(v.photos.map((p) => ({
    no: '照片 ' + p.id,
    file: p.photoPath,
    tag: p.tagList.join('、') || '无标签',
    ...(p.fileExists === false ? { badge: { tone: 'warn' as const, text: '会跳过' } } : {}),
    meta: [p.date, p.selected ? '已框选' : '没框选', p.crop ? '裁剪过' : '整图'],
  })));
}

/** #474：预填过的字段看不见 placeholder——限制与单位一律进字段名（固定小字），
 *  只有**空字段**才留 hint（那时它显示得出来）；下拉不再给「选一个」占位：
 *  **当刻值那一条恒 `selected`**（#527 第 5 条：下拉显示当前值，不显示「选一个」）。 */
function gifForm(v: GifPlannerView): string {
  return renderParamForm({
    description: '选要进 GIF 的照片，再调快慢与大小。下面每项都已填好常用值，只改你要改的',
    fields: [
      { name: 'tag', label: '标签（留空就是全部标签）', value: v.tag ?? '', hint: '如：正面' },
      { name: 'photoIds', label: '框选照片编号（逗号分隔，留空就是全部）', value: v.selectedIds.join(','), hint: '如 12,15,22' },
      // #474（审查整改 3a）：`crops` 那一栏**真撤掉**——先前只换了字段名，`name="crops"` 仍在盘上，
      //  是个带名字却没人接线的空框（看着能填、填了不进指令）。裁剪由表单上方那句话承接：
      //  要裁就在对话里说一句。`crops` 键本身仍在 `wizardPort.ts` 的入参白名单与 prompt 复刻里（机器面原样）。
      { name: 'duration', label: '每帧多久（毫秒，50 到 5000）', value: String(v.duration), min: 50, max: 5000, step: 50 },
      { name: 'loop', label: '循环', value: String(v.loop), options: LOOP_OPTIONS },
      { name: 'width', label: '宽（像素，100 到 2000）', value: String(v.width), min: 100, max: 2000, step: 1 },
      { name: 'height', label: '高（像素，100 到 2000）', value: String(v.height), min: 100, max: 2000, step: 1 },
      { name: 'watermark', label: '水印文字（可选）', value: v.watermark ?? '', hint: '右下角，如：减脂 30 天' },
      { name: 'transition', label: '切换效果', value: v.transition, options: TRANSITION_OPTIONS },
      { name: 'output', label: '输出文件名（可选）', value: v.output ?? '', hint: '如：front_30days.gif' },
    ],
  });
}

export function buildGifPlannerDoc(v: GifPlannerView): string {
  // 本轮照片里文件找不到的张数（与候选行「会跳过」徽标同一口径）；不是框选缺 ID，两者分开命名。
  const notFound = v.photos.filter((p) => p.fileExists === false).length;
  const content = [
    // 页内样式进 parts 第一项（`assembleDocPage` 没有页内 CSS 入口，同 `photoUi.ts` 的处置）。
    photoUiCss(),
    // 身份行（#527）：`标签 正面 · 近 N 天` 那样的 `·` 串改徽章列——同一件事换形状，不是删字符。
    chipRow([
      v.tag === null || v.tag === '' ? '全部标签' : '标签 ' + v.tag,
      v.selectedIds.length + ' 张进 GIF',
      notFound > 0 ? notFound + ' 张找不到文件' : '',
    ]),
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
      // #527：明细原句 `500ms/帧 · 无限循环` 是 `·` 串出来的两件事 → 撤到卡下的事实条（本行只说尺寸）。
      { label: 'GIF 输出', value: v.width + '×' + v.height },
    ]),
    outputFacts(v),
    gifCandidates(v),
    formNoticeHtml(),
    gifForm(v),
    promptCopyArea(v.prompt, '复制指令（给 AI 的那段）'),
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
    // #527：副标题原用 `→` 串三步、还与页名/表单说明三处说同一件事 → 改一句「这页帮你做什么」。
    eyebrow: '',
    subtitle: '先看会进 GIF 的照片，再定快慢与尺寸。改哪项直接跟 AI 说一句。',
    content,
  });
}
