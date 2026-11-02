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
 * 本层不做取数（数据由 photo/wizardPort.ts 备齐），空库不返空页（recent 为空即空态行）。
 *
 * #655（负责人验收打回「两页很丑陋」）把这两页从「名＋空框＋灰示例」的三层空表单改成**确认清单**：
 * 值先以只读一行上屏、点开哪一行才出哪一行的输入（形状与样式住姊妹件 `photo/wizardUi.ts`），
 * 三档层级与块间分割由本件与本族页内件定；两页一并补上 `pageUi: true`（#525 的页面级移动端配方，
 * 本族另外七页都在用、只有本件两页漏了——`renderFactStrip` 的形状样式与宽屏 1280 版式都挂在它下面）。
 *
 * **#654（读页复制日志 · 本席位）**：两页底部 ghost 行补回**真**「复制日志」——本件两页以前只有
 * `dataCopyArea`（只出数据那颗），日志那颗靠公共层 #336 兜底补的禁用占位（#654 已撤那条兜底路径）。
 * 现在两页自己给：`copyArea({ data, log })` 双位齐全，第 4 段＝本次命令原文（命令层 `photo/wizard.ts`
 * 传 `commandLine()`）。预检页那颗 prompt（「给 AI 的指令」）与两页可见文本一字未改。
 */
import { renderEmptyBlock, renderKpiGrid, renderParamForm } from 'base-paint/blocks';
import type { ParamFieldInput } from 'base-paint/blocks';
import { renderFactStrip } from 'base-paint';
import type { SerializableEnvelope } from 'base-paint';
import type {
  GifPlannerView,
  PhotoLogWizardView,
} from './wizardPort.js';
import { PHOTO_LOG_TAGS, transitionText } from './wizardPort.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea, copyLog, promptCopyArea } from '../shared/copyArea.js';
import { nowStamp } from '../render/receipt.js';
import { chipRow, photoPickRows, photoUiCss } from './photoUi.js';
import { editRows, noticeBar, wizardUiCss } from './wizardUi.js';
import { m } from '../entries/index.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本页 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。
 *  取词在**调用时**发生（模块级常量不得在顶层取词：语言由运行期上下文决定）。 */
function docTitle(): string {
  return m('skill-calorie.photo-wizardPortDocs.c088');
}

/* ── 身体两页已迁出（#353）：记围度／记体脂文档原样迁入 src/body/wizardDocs.ts，本件只留身材照／GIF。 */

/* ── #654 · 复制区（两页共用口径） ── */

/** 复制日志第 3 段后半的数据来源（前半＝库文件名，由 `shared/copyArea.ts` 的 `copyLog` 拼）。
 *  两页分开命名：预检页**不读库**（只核对待登记的值），规划器读的是照片记录。 */
function logSourceLog(): string {
  return m('skill-calorie.photo-wizardPortDocs.c089');
}
function logSourcePlanner(): string {
  return m('skill-calorie.photo-wizardPortDocs.c090');
}

/** 复制区（#654）：三格式数据 ＋ 复制日志六段（口径与 `photo/galleryDoc.ts` 的 `copyAreaOf` 同形：
 *  `log` 位收 `LogTextInput`＝`{ envelope, copyLog }`，给错形状那颗按钮就落成点不动的死按钮）。 */
function copyAreaOf(envelope: SerializableEnvelope, command: string, source: string): string {
  return copyArea({
    data: { envelope },
    log: {
      envelope,
      copyLog: copyLog({ command, source, actionAt: nowStamp(), version: DOC_VERSION }),
    },
  });
}

/** #474（审查整改 1）· 下拉候选项：**`value` 是机器真值**（`loop` 的 `0/1/3/5`、`transition` 的
 *  `cut/fade/dissolve`，与 `wizardPort.ts` 的校验口径同源），`label` 才是给人看的中文词。
 *  这样当刻视图值能在下拉里**真的落上 `selected`**（先前拿中文当值 → 恒被「选一个」占位顶住，
 *  页上永远看不到当前值＝本票要治的「看不见」在新控件上复现）。 */
function loopOptions(): readonly { value: string; label: string }[] {
  return [
    { value: '0', label: m('skill-calorie.photo-wizardPortDocs.c091') }, { value: '1', label: m('skill-calorie.photo-wizardPortDocs.c092') },
    { value: '3', label: m('skill-calorie.photo-wizardPortDocs.c093') }, { value: '5', label: m('skill-calorie.photo-wizardPortDocs.c094') },
  ];
}

function transitionOptions(): readonly { value: string; label: string }[] {
  return [
    { value: 'cut', label: m('skill-calorie.photo-wizardPortDocs.c095') }, { value: 'fade', label: m('skill-calorie.photo-wizardPortDocs.c096') }, { value: 'dissolve', label: m('skill-calorie.photo-wizardPortDocs.c097') },
  ];
}

/** #474（审查整改 3c）· 表单上方那句显著的话：本层表单是零 JS 静态预览——**改了不会自动生效**
 *  （上面那段给 AI 的指令与页上的读数都是按当刻参数生成的，输入框只当"看到的值"）。
 *  不禁用控件（禁用会让人以为"根本不能改"），只把这件事说明白；真接线属公共层另一张票。
 *  #527：句中的 `；` 是并列语义，拆成两句（同一件事一页一处，符号不再顶版面）。
 *  #655：这句的**措辞一字不动**（票面点名要留的就是它），只换承载它的形状——原来用 `<strong>`
 *  当标题使，视觉重量压过字段；现走 `noticeBar()` 的浅底提示条（13px／不上粗体）。 */
function formNotice(): string {
  return m('skill-calorie.photo-wizardPortDocs.c098');
}

/** 块标题行（#655）：标题 15/600 在左，右侧一句辅助档小字（不上加粗）；不给小字就只出标题。
 *  `.phu-sec`（标题档）住 `photo/photoUi.ts`，`.phu-sechead` 一族住 `photo/wizardUi.ts`。 */
function sectionHead(title: string, hint?: string): string {
  return '<div class="phu-sechead"><h2 class="phu-sec">' + title + '</h2>'
    + (hint === undefined ? '' : '<span class="phu-sechead-s">' + hint + '</span>') + '</div>';
}

/** 一行参数（#655）：确认清单的每行只装**一个**字段——值住行上的只读一行，输入框住展开后的编辑体。
 *  一行一个 `renderParamForm` 调用：`min／max／step／options` 的落位口径全归公共层，本层不重写。 */
function paramRow(field: ParamFieldInput): string {
  return renderParamForm({ fields: [field] });
}

/* ── 3. 记身材照 wizard（纯配置） ── */

/** #654：`command`＝本次命令原文（命令层 `photo/wizard.ts` 的 `commandLine()` 派生），进复制日志第 4 段。 */
export function buildPhotoLogWizardDoc(v: PhotoLogWizardView, command: string): string {
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.photo-log-wizard',
    data: { metrics: metricsOf({ fileCount: v.srcPaths.length, hasTag: v.tag ? 1 : 0 }) },
  };
  const content = [
    // 页内样式进 parts 第一项（`assembleDocPage` 没有页内 CSS 入口，同 `photoUi.ts` 的处置）。
    // #655：本件两页的确认清单**样式**另住姊妹件 `photo/wizardUi.ts` —— 那份样式只服务这两页，
    //  并进 `photoUiCss()` 会让读侧族七页的产物字节跟着变（等于本票顺手动了别人的页）。
    photoUiCss(), wizardUiCss(),
    // #655 缺陷 2：这页的定位是「确认 AI 已经用好的值」，改前三个空框一个字的值都看不见
    //（读数卡只说「0 张／未填」）。现改成**确认清单**：值先只读一行，点开哪一行才出哪一行的输入。
    //  原来那两张读数卡（照片 N 张／标签 X）不再单出——同一件事由清单的行名与值行角标承载，
    //  读数一个不丢（张数落 `badge`、标签落它自己那一行的值位）。
    sectionHead(m('skill-calorie.photo-wizardPortDocs.c001'), m('skill-calorie.photo-wizardPortDocs.c002')),
    // #655 缺陷 3：提示句从加粗标题降成浅底条，位置仍在字段之前（#474 的判据不变）。
    noticeBar(formNotice()),
    editRows([
      {
        k: m('skill-calorie.photo-wizardPortDocs.c003'), v: v.srcPaths.join('\n'),
        // 张数是原来读数卡那一格要说的数字 → 改住值行角标（同一件事换形状，不丢读数）。
        ...(v.srcPaths.length > 0 ? { badge: m('skill-calorie.photo-wizardPortDocs.c004', { p0: String(v.srcPaths.length) }) } : {}),
        bodyHtml: paramRow({
          name: 'srcPaths',
          label: m('skill-calorie.photo-wizardPortDocs.c005'),
          value: v.srcPaths.join('\n'), hint: m('skill-calorie.photo-wizardPortDocs.c006'), required: true,
        }),
      },
      {
        k: m('skill-calorie.photo-wizardPortDocs.c007'), v: v.tag ?? '', emptyText: m('skill-calorie.photo-wizardPortDocs.c008'),
        bodyHtml: paramRow({
          name: 'tag', label: m('skill-calorie.photo-wizardPortDocs.c009'), value: v.tag ?? '', hint: m('skill-calorie.photo-wizardPortDocs.c010'), required: true,
        }),
      },
      {
        k: m('skill-calorie.photo-wizardPortDocs.c011'), v: v.note ?? '', emptyText: m('skill-calorie.photo-wizardPortDocs.c012'),
        bodyHtml: paramRow({
          name: 'note', label: m('skill-calorie.photo-wizardPortDocs.c013'), value: v.note ?? '', hint: m('skill-calorie.photo-wizardPortDocs.c014'),
        }),
      },
    ]),
    // #655 缺陷 7：常用标签原来是首屏第一个块（折叠着也占掉一行）——现在**下移**到这里，
    //  紧跟三个值之后；8 个词仍逐字可见（本票只改它住哪，不改它说什么）。
    sectionHead(m('skill-calorie.photo-wizardPortDocs.c015')),
    chipRow([...PHOTO_LOG_TAGS]),
    // #474：段前一句引导——复制区里是给 AI 的英文命令，先说清「整段复制粘过去就行」。
    '<p>下面这段是给 AI 的指令：整段复制粘过去就行，英文命令不用看懂。</p>',
    promptCopyArea(v.prompt, m('skill-calorie.photo-wizardPortDocs.c016')),
    copyAreaOf(envelope, command, logSourceLog()),
  ].join('');
  return assembleDocPage({
    docTitle: docTitle(),
    title: m('skill-calorie.photo-wizardPortDocs.c017'),
    // #474：眉标里的内部词「wizard」「纯配置」与副标题说同一件事 → 眉标改人话不重复。
    // #527：眉标的 `记身材照 · 只登记路径` 是 `·` 串两件事，且页名已经说了「记身材照」→ 只留后半句。
    eyebrow: m('skill-calorie.photo-wizardPortDocs.c018'),
    subtitle: m('skill-calorie.photo-wizardPortDocs.c019'),
    content,
    // #525 页面级移动端配方：本族另外七页都在用，只有本件两页漏了（`renderFactStrip` 的形状
    // 样式与宽屏 1280 版式都挂在根类下，不启用则一条都命中不到）。本票补上，与全族同值。
    pageUi: true,
  });
}

/* ── 4. GIF 框选器 ── */

/** 循环次数的人话（KPI 与下拉共用一份，防两处走散）。 */
function loopText(loop: number): string {
  return loop === 0 ? m('skill-calorie.photo-wizardPortDocs.c020') : m('skill-calorie.photo-wizardPortDocs.c021', { p0: String(loop) });
}

/** 输出规格那三件事（每帧多久／循环几次／有没有水印）：KPI 卡的明细槽吃纯文本，形状落不进去，
 *  故在卡下另出一排**事实条**（#525 的 `renderFactStrip` 口径，本域只给数据）。 */
function outputFacts(v: GifPlannerView): string {
  return renderFactStrip({
    items: [
      { label: m('skill-calorie.photo-wizardPortDocs.c022'), value: m('skill-calorie.photo-wizardPortDocs.c023', {
        p0: String((v.duration / 1000).toFixed(2).replace(/0$/, '')),
      }) },
      { label: m('skill-calorie.photo-wizardPortDocs.c024'), value: loopText(v.loop) },
      ...(v.watermark === null ? [] : [{ label: m('skill-calorie.photo-wizardPortDocs.c025'), value: v.watermark }]),
    ],
  });
}

/** #527 候选行（原六列表在窄屏被挤成长串）：一行一张照片——编号／标签／文件名／异常徽标各占一槽，
 *  日期与整图或裁剪走第二行的徽章列。**不印 `#N`**（内部标识符口径），改「照片 31」这种读者话；
 *  正常张留空（「存在」是零信息值），找不到文件才挂徽标。 */
function gifCandidates(v: GifPlannerView): string {
  if (v.photos.length === 0) {
    return renderEmptyBlock({ text: m('skill-calorie.photo-wizardPortDocs.c026') });
  }
  return photoPickRows(v.photos.map((p) => ({
    no: m('skill-calorie.photo-wizardPortDocs.c027', { p0: String(p.id) }),
    file: p.photoPath,
    tag: p.tagList.join('、') || m('skill-calorie.photo-wizardPortDocs.c028'),
    ...(p.fileExists === false ? { badge: { tone: 'warn' as const, text: m('skill-calorie.photo-wizardPortDocs.c029') } } : {}),
    meta: [p.date, p.selected ? m('skill-calorie.photo-wizardPortDocs.c030') : m('skill-calorie.photo-wizardPortDocs.c031'), p.crop ? m('skill-calorie.photo-wizardPortDocs.c032') : m('skill-calorie.photo-wizardPortDocs.c033')],
  })));
}

/** #474：预填过的字段看不见 placeholder——限制与单位一律进字段名（固定小字），
 *  只有**空字段**才留 hint（那时它显示得出来）；下拉不再给「选一个」占位：
 *  **当刻值那一条恒 `selected`**（#527 第 5 条：下拉显示当前值，不显示「选一个」）。
 *
 *  #655 缺陷 8：改前把九项默认值全画成输入框，看着像要用户逐个核对的表单 —— 改成三组
 *  **只读键值行**（`editRows`）：值先以当刻值上屏，只展开「要改的那一项」。
 *  分组按**变化频率**切（照片选择／播放／画面与文件），块与块之间由 `.phu-sechead` 分割。 */
function gifForm(v: GifPlannerView): string {
  const all = v.photos.length > 0 && v.selectedIds.length === v.photos.length;
  const allPrefix = all ? m('skill-calorie.photo-wizardPortDocs.c034') : '';
  const picked = v.selectedIds.length === 0 ? ''
    : m('skill-calorie.photo-wizardPortDocs.c035', { p0: String(allPrefix + v.selectedIds.length) });
  return [
    sectionHead(m('skill-calorie.photo-wizardPortDocs.c036'), m('skill-calorie.photo-wizardPortDocs.c037')),
    editRows([
      {
        k: m('skill-calorie.photo-wizardPortDocs.c038'), v: v.tag ?? '', emptyText: m('skill-calorie.photo-wizardPortDocs.c039'),
        bodyHtml: paramRow({ name: 'tag', label: m('skill-calorie.photo-wizardPortDocs.c040'), value: v.tag ?? '', hint: m('skill-calorie.photo-wizardPortDocs.c041') }),
      },
      {
        k: m('skill-calorie.photo-wizardPortDocs.c042'), v: picked, emptyText: m('skill-calorie.photo-wizardPortDocs.c043'),
        // #474（审查整改 3a）的口径照旧：`crops` 那一栏**真撤掉**（`name="crops"` 不留空框），
        //  要裁就在对话里说一句；`crops` 键本身仍在 `wizardPort.ts` 的入参允许清单与 prompt 复刻里。
        bodyHtml: paramRow({
          name: 'photoIds', label: m('skill-calorie.photo-wizardPortDocs.c044'),
          value: v.selectedIds.join(','), hint: m('skill-calorie.photo-wizardPortDocs.c045'),
        }),
      },
    ]),
    sectionHead(m('skill-calorie.photo-wizardPortDocs.c046')),
    editRows([
      {
        k: m('skill-calorie.photo-wizardPortDocs.c047'), v: m('skill-calorie.photo-wizardPortDocs.c048', { p0: String(v.duration) }),
        bodyHtml: paramRow({
          name: 'duration', label: m('skill-calorie.photo-wizardPortDocs.c049'),
          value: String(v.duration), min: 50, max: 5000, step: 50,
        }),
      },
      {
        k: m('skill-calorie.photo-wizardPortDocs.c050'), v: loopText(v.loop),
        bodyHtml: paramRow({ name: 'loop', label: m('skill-calorie.photo-wizardPortDocs.c051'), value: String(v.loop), options: loopOptions() }),
      },
      {
        k: m('skill-calorie.photo-wizardPortDocs.c052'), v: transitionText(v.transition),
        bodyHtml: paramRow({
          name: 'transition', label: m('skill-calorie.photo-wizardPortDocs.c053'), value: v.transition, options: transitionOptions(),
        }),
      },
    ]),
    sectionHead(m('skill-calorie.photo-wizardPortDocs.c054')),
    editRows([
      {
        k: m('skill-calorie.photo-wizardPortDocs.c055'), v: m('skill-calorie.photo-wizardPortDocs.c056', { p0: String(v.width) }),
        bodyHtml: paramRow({
          name: 'width', label: m('skill-calorie.photo-wizardPortDocs.c057'), value: String(v.width), min: 100, max: 2000, step: 1,
        }),
      },
      {
        k: m('skill-calorie.photo-wizardPortDocs.c058'), v: m('skill-calorie.photo-wizardPortDocs.c059', { p0: String(v.height) }),
        bodyHtml: paramRow({
          name: 'height', label: m('skill-calorie.photo-wizardPortDocs.c060'), value: String(v.height), min: 100, max: 2000, step: 1,
        }),
      },
      {
        k: m('skill-calorie.photo-wizardPortDocs.c061'), v: v.watermark ?? '', emptyText: m('skill-calorie.photo-wizardPortDocs.c062'),
        bodyHtml: paramRow({
          name: 'watermark', label: m('skill-calorie.photo-wizardPortDocs.c063'), value: v.watermark ?? '', hint: m('skill-calorie.photo-wizardPortDocs.c064'),
        }),
      },
      {
        k: m('skill-calorie.photo-wizardPortDocs.c065'), v: v.output ?? '', emptyText: m('skill-calorie.photo-wizardPortDocs.c066'),
        bodyHtml: paramRow({
          name: 'output', label: m('skill-calorie.photo-wizardPortDocs.c067'), value: v.output ?? '', hint: m('skill-calorie.photo-wizardPortDocs.c068'),
        }),
      },
    ]),
  ].join('');
}

/** #654：`command`＝本次命令原文（命令层 `photo/wizard.ts` 的 `commandLine()` 派生），进复制日志第 4 段。 */
export function buildGifPlannerDoc(v: GifPlannerView, command: string): string {
  // 本轮照片里文件找不到的张数（与候选行「会跳过」徽标同一口径）；不是框选缺 ID，两者分开命名。
  const notFound = v.photos.filter((p) => p.fileExists === false).length;
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.gif-planner',
    data: {
      metrics: metricsOf({
        photoCount: v.photos.length, selectedCount: v.selectedIds.length,
        missingCount: v.missingIds.length,
        cropCount: v.photos.filter((p) => p.crop).length,
      }),
    },
  };
  const content = [
    // 页内样式进 parts 第一项（`assembleDocPage` 没有页内 CSS 入口，同 `photoUi.ts` 的处置）。
    // #655：本件两页的确认清单**样式**另住姊妹件 `photo/wizardUi.ts`（同上页那一段的理由）。
    photoUiCss(), wizardUiCss(),
    // 身份行（#527）：`标签 正面 · 近 N 天` 那样的 `·` 串改徽章列——同一件事换形状，不是删字符。
    chipRow([
      v.tag === null || v.tag === '' ? m('skill-calorie.photo-wizardPortDocs.c069') : m('skill-calorie.photo-wizardPortDocs.c070', { p0: String(v.tag) }),
      m('skill-calorie.photo-wizardPortDocs.c071', { p0: String(v.selectedIds.length) }),
      notFound > 0 ? m('skill-calorie.photo-wizardPortDocs.c072', { p0: String(notFound) }) : '',
    ]),
    renderKpiGrid([
      // #474：原「共 N 张可用」把「可用」当「库里有」用，与表内「找不到」正面冲突 → 说清是库里共几张。
      { label: m('skill-calorie.photo-wizardPortDocs.c073'), value: String(v.selectedIds.length), unit: m('skill-calorie.photo-wizardPortDocs.c074'), detail: m('skill-calorie.photo-wizardPortDocs.c075', { p0: String(v.photos.length) }) },
      // #474：原「文件丢失」其实数的是框选里点不到的 ID（`missingIds`）→ 换名，不再与表内冲突。
      {
        label: m('skill-calorie.photo-wizardPortDocs.c076'), value: String(v.missingIds.length),
        ...(v.missingIds.length > 0 ? { detail: m('skill-calorie.photo-wizardPortDocs.c077', { p0: String(v.missingIds.join('、')) }) } : {}),
      },
      // #474：本轮新立一格——文件找不到是另一回事，异常才挂状态徽标（正常格不出徽标）。
      notFound > 0
        ? { label: m('skill-calorie.photo-wizardPortDocs.c078'), value: String(notFound), unit: m('skill-calorie.photo-wizardPortDocs.c079'), status: 'warn', statusText: m('skill-calorie.photo-wizardPortDocs.c080') }
        : { label: m('skill-calorie.photo-wizardPortDocs.c081'), value: '0', unit: m('skill-calorie.photo-wizardPortDocs.c082') },
      // #474：原格 label「尺寸」与明细（帧速／循环）不是一件事 → 改「GIF 输出」，label 与明细对得上。
      // #527：明细原句 `500ms/帧 · 无限循环` 是 `·` 串出来的两件事 → 撤到卡下的事实条（本行只说尺寸）。
      { label: m('skill-calorie.photo-wizardPortDocs.c083'), value: v.width + '×' + v.height },
    ]),
    outputFacts(v),
    // #655：候选清单原来直接跟在事实条后头、与下方参数区连成一片 → 补一条块标题（15/600）分开两块。
    sectionHead(m('skill-calorie.photo-wizardPortDocs.c084')),
    gifCandidates(v),
    noticeBar(formNotice()),
    // #655 缺陷 3：表单说明原是一段 13px 灰字，与新提示条抢同一格 → 收成一条 12px 辅助行。
    //  `；` 是并列语义，拆成两句（`audit-separators.mjs` 的 R2 节点级判据：#527 起本仓不许拿它串行）。
    '<p class="phu-note">下面每项都已填好常用值，点开哪一项就改哪一项。改完把下面那段指令复制给 AI。</p>',
    gifForm(v),
    promptCopyArea(v.prompt, m('skill-calorie.photo-wizardPortDocs.c085')),
    copyAreaOf(envelope, command, logSourcePlanner()),
  ].join('');
  return assembleDocPage({
    docTitle: docTitle(),
    title: m('skill-calorie.photo-wizardPortDocs.c086'),
    // #474：眉标原句自述「本项目缺什么」（无 cropper.js／手动 4 数字坐标），对用户零收益 → 删。
    // #527：副标题原用 `→` 串三步、还与页名/表单说明三处说同一件事 → 改一句「这页帮你做什么」。
    eyebrow: '',
    subtitle: m('skill-calorie.photo-wizardPortDocs.c087'),
    content,
    // #525 页面级移动端配方：本族另外七页都在用，只有本件两页漏了（`renderFactStrip` 的形状
    // 样式与宽屏 1280 版式都挂在根类下，不启用则一条都命中不到）。本票补上，与全族同值。
    pageUi: true,
  });
}
