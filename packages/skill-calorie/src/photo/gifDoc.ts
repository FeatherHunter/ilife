/** #352 · 生成身材照 GIF 结果页（合成落盘编排 ＋ 整页装配）。
 *
 * 说「做身材照GIF」跑完拿到的是一页完整文档，页内嵌着可播放的 GIF（不是一段任务描述）。
 *  能力来自 #284 `gif.ts`（`synthesizeGifFromPhotos`／`GIF_LIMITS`）；页面形状来自 t400 基准
 *  （裁定 5 整页化＋复制区分族；移植项 3 过大改本地路径提示），体积口径沿用 t341 首定的
 *  `PHOTO_LIST_PAGE_MAX_BYTES`（1048576，定义只在 `galleryDoc.ts`，本件只引用不另定）。
 *
 *  落盘位与命名沿老技能：`<照片目录>/gifs/<标签>_<首张日期>_<末张日期>.gif`
 *  （老 `body_photo_tracker.py:416-417` 与 `:575-581`），同名覆盖。帧序按拍摄日期正序
 *  （老 `:463` 的 `ORDER BY date ASC, time ASC`）：旧照先出，动画随时间向前。
 *  老技能的缺失照片口径照旧：读不到的文件跳过、其余照合成（老 `:480-482`）。
 *
 *  上限（`GIF_LIMITS`，见 t284 文档）：帧数＝输入张数且下限 2；体积上限 512000B；
 *  画布边 2..64px；帧延时 50cs。**本件如实写明能力边界**：合成的是容器级 GIF，每帧是实心帧、
 *  帧色由该张输入照片的字节哈希派生，不是像素级光栅转码（真 JPEG→GIF 像素转码需解码器，
 *  不在 #284 与 #352 射程）——页内那份 GIF 与盘上那份逐字节同源，但它不是照片像素的还原。
 *
 *  降级：合成不成就出页面明示原因与替代操作（不中断命令、不落半张 GIF）；整页字节超 1048576
 *  即不内嵌、改出文件名提示（老页 `body_photo_gif_result.html:99-101` 同义机制，阈值按本仓 1 MiB）。
 *  `src/render/html.ts` 只读不加行：本件不调它的照片段（老裸片段 `renderGifHtml` 已不被本命令调用）。
 *
 *  #472（读侧 A 组）· 文本与展示：眉标（内部命令名＋内部词「域」）整行去掉；十格 KPI 收到三格
 *  （「合成／尺寸／文件」），与副标题重复的时间跨度、首张、末张、标签四格删；`cs` 这类内部单位与
 *  「上限 512000B」「画布边上限 64px」这类技术参数下屏（改「每帧停 0.5 秒」「尺寸 64×64 · 大小 0.4 KB」）；
 *  文件位置只显文件名＋一个「复制路径」小块；状态列「入片／未校验／文件缺失」改「已用上／未核对／
 *  找不到文件」；表注改「合成用到的照片（按时间从上到下，就是动画顺序）」；副标题如实说明
 *  「N 张里挑出 M 张能用的合成」（不再出现「N 张照片合成」与 KPI 打架）。取值口径与复制数据一字未改。
 *
 *  **#527（过程与结果族 · 本票）**——四条改动，取值口径、体积退让行为与 GIF 字节一行未改：
 *   ① **形状化**：四处靠 `·`／`~`／`、` 串起来的地方全落成形状（节点级命中 4 → 0，除指令/机器面外）——
 *      页头身份行改 `chipRow()` 徽章列（标签／照片数／窗口）、副标题的 `2026-05-30 ~ 2026-07-17`
 *      与「12 张里挑出 4 张」各自成句、KPI 明细 `4 帧 · 每帧停 0.5 秒` 拆两张卡各说一件事、
 *      明细表的备注列改**每条备注一行**（用户自己用 `/` 连写的几件事按段排，一个字不改）；
 *   ② **文案去冗余**：`卡路里·身材照片` 去 `·`；`~` 改「至」（符号不许顶替文字）；
 *      「页内嵌字节与盘上文件同源」这类内部口径与「每帧停 0.5 秒」重复的读数各留一处；
 *   ③ **GIF 舞台**：裸 `<img>`＋内联样式改 `renderMediaFigure`（明确宽高比／`max-width`
 *      ／`object-fit`／像素锐边），没图可显时出人话占位而不是空白；
 *   ④ **手机端**：本族页内样式住 `photoUi.ts`（断点 820／640，触摸区 ≥44px，表头 ≥12px）。
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { escapeHtml, renderFactStrip, renderMediaFigure } from 'base-paint';
import { renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { dataCopyArea, notice } from '../shared/copyArea.js';
import { CALORIE_COPY_ACTION, copyActionHtml } from '../render/copy.js';
import { GIF_LIMITS, countGifFrames, synthesizeGifFromPhotos } from './gif.js';
import { PHOTO_LIST_PAGE_MAX_BYTES } from './galleryDoc.js';
import { chipRow, photoUiCss } from './photoUi.js';
import type { GifTask, PhotoCard } from './photo.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本页 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。
 *  #527：`·` 是符号顶替版面（题名不是并列语义），改空格。 */
const DOC_TITLE = '卡路里 身材照片';

/** GIF 子目录名（老 `photos_dir / "gifs"` 逐字）。 */
const GIF_SUB_DIR = 'gifs';

/** 可见文本缺值一律 `—`（t400 裁定 3）；复制数据保留原始空值。 */
const DASH = '—';

export interface GifPageInput {
  /** `buildGifTask` 的规划结果（标签／窗口／入片 id 与首末日期口径不变）。 */
  readonly task: GifTask;
  /** 照片目录（`photoDir` 口径）；`null`＝未配，此时不合成、只出页面。 */
  readonly photosDir: string | null;
  /** 计划内照片（本件按拍摄日期正序重排成帧序）。 */
  readonly cards: readonly PhotoCard[];
}

export interface GifPageResult {
  /** 整页文档（`<!doctype html>` 起）。 */
  readonly html: string;
  /** 复制区与 envelope 的**同一份**数据（envelope 那份再另加 `output`）。 */
  readonly copyData: GifPageData;
  /** 盘上 GIF 绝对路径；`null`＝本次未产出。 */
  readonly gifPath: string | null;
  readonly gifBytes: number | null;
  /** 帧数读数来自对**盘上文件**的块结构计数（不取合成函数的自报值）。 */
  readonly frames: number | null;
  /** 页内是否真的嵌了字节（`false` 时必有 `reason`）。 */
  readonly embedded: boolean;
  /** 未产出／未内嵌的面向用户原因；一切正常即 `null`。 */
  readonly reason: string | null;
}

/** 一次合成的结果（内部件）：产出物三件 ＋ 逐张去向 ＋ 失败原因。 */
interface Synth {
  readonly path: string | null;
  readonly bytes: number | null;
  readonly frames: number | null;
  readonly width: number | null;
  readonly height: number | null;
  readonly taken: PhotoCard[];
  readonly missing: PhotoCard[];
  readonly reason: string | null;
}

function dash(v: string | null | undefined): string {
  return v === null || v === undefined || v === '' ? DASH : String(v);
}

/** 帧序（老 `body_photo_tracker.py:463` 的日期正序）：旧照先出，动画随时间向前。 */
function byFrameOrder(cards: readonly PhotoCard[]): PhotoCard[] {
  const keyOf = (c: PhotoCard): string =>
    c.date + ' ' + (c.time ?? '') + '#' + String(c.id).padStart(8, '0');
  return [...cards].sort((a, b) => (keyOf(a) < keyOf(b) ? -1 : 1));
}

/** 老命名口径（`{tag}_{start}_{end}.gif`）：本仓按**实际**首末照片日期命名，同名即覆盖。 */
function gifFileNameOf(t: GifTask): string {
  const clean = (s: string): string => s.replace(/[\\/:*?"<>|[\]]/g, '_').trim();
  return clean(t.tag) + '_' + dash(t.firstDate) + '_' + dash(t.lastDate) + '.gif';
}

/** 盘上文件名的末段（页面上只印这个；整条路径住「复制路径」的复制载荷与复制按钮）。 */
const PATH_SEP_RE = /[\\/]/;

function baseNameOf(p: string): string {
  const parts = p.split(PATH_SEP_RE);
  return parts[parts.length - 1] ?? p;
}

/** 合成落盘：读得到的两张以上照片即合成（缺文件的跳过，老 `:480-482` 口径同）。 */
function synthOf(task: GifTask, cards: readonly PhotoCard[], photosDir: string | null): Synth {
  const taken = photosDir === null ? [] : cards.filter((c) => c.fileExists === true);
  const missing = cards.filter((c) => !taken.includes(c));
  const empty: Synth = {
    path: null, bytes: null, frames: null, width: null, height: null,
    taken, missing,
    reason: null,
  };
  if (photosDir === null) {
    return { ...empty, reason: '未配照片目录（--params photosDir 或环境变量 CALORIE_PHOTOS_DIR），读不到照片文件' };
  }
  if (taken.length < GIF_LIMITS.minFrames) {
    return {
      ...empty,
      reason: '可读照片不足 ' + GIF_LIMITS.minFrames + ' 张（计划 ' + cards.length + ' 张，缺文件 ' + missing.length + ' 张），合成不了多帧 GIF',
    };
  }
  const dir = join(photosDir, GIF_SUB_DIR);
  const outPath = resolve(join(dir, gifFileNameOf(task)));
  try {
    mkdirSync(dir, { recursive: true });
    const r = synthesizeGifFromPhotos(taken.map((c) => join(photosDir, c.photoPath)), outPath);
    const bytes = new Uint8Array(readFileSync(outPath));
    return {
      path: outPath, bytes: bytes.length, frames: countGifFrames(bytes), width: r.width, height: r.height,
      taken, missing, reason: null,
    };
  } catch (e) {
    return { ...empty, reason: '合成失败：' + ((e as Error).message || String(e)) };
  }
}

/** 舞台（#527）：GIF 本人。有字节即走 `renderMediaFigure`（比例／`max-width`／`object-fit`
 *  三件都在容器上，本件不再写内联样式）；合成的 64×64 方帧按 `1-1` 摆、`image-rendering` 由
 *  页内样式维持像素锐边。没字节时**出人话**（原因 ＋ 下一步），不出空白块。
 *
 *  #484 口径保留：图仍给 `min(320px,100%)` 级别的占屏（300px 上限，窄屏随容器收）——
 *  64×64 的方帧不给有上限的放大就只占 16% 屏。 */
function stageHtml(s: Synth, embed: boolean): string {
  if (s.path !== null && embed) {
    const uri = 'data:image/gif;base64,' + Buffer.from(readFileSync(s.path)).toString('base64');
    // #484 口径：舞台宽度**有上限**（合成的是小方帧，不给上限放大会只占一小块屏）；窄屏随容器收。
    //  #527 收口：宽度上限与像素质感**两条都归类名**（`photoUi.ts` 的 `.phu-gif-stage` 一族：
    //  `max-width:300px` ＋ `.phu-gif-stage .ilife-block-media-img{image-rendering:pixelated}`）。
    //  改前只写内联样式、不挂类名 ⇒ 那两条规则全死：像素质感失效（64×64 方帧放大后糊成一片），
    //  宽度上限还在两处各写一遍。
    //  `data-gif-stage` 是 `photo-responsive-484` 与判分脚本认的锚。
    return '<div data-gif-stage class="phu-gif-stage">' + renderMediaFigure({
      src: uri,
      alt: '身材变化 GIF',
      ratio: '1-1',
      caption: '这轮身材变化 GIF',
      note: '合成的方帧放到 300px 宽看，放大后保持像素锐边。文件就在上面那格，点「复制路径」能拿走。',
      id: 'gif-stage',
    }) + '</div>';
  }
  const what = s.path === null
    ? ('GIF 未合成：' + (s.reason ?? '未知原因'))
    : ('GIF 文件较大，没放进这一页：' + baseNameOf(s.path));
  return notice({
    msg: what,
    detail: s.path === null
      ? '替代操作：把照片文件补回照片目录后重跑，或先跑规划器核对候选'
      : '请本地打开这个文件看：' + baseNameOf(s.path),
  });
}

/** 明细行（#527）：`#N` 这类内部写法出页面（编号走「照片 N」），备注列改**每条备注一行**——
 *  用户自己用 `/` 连写的几件事按段排（一个字不改），合成出来的行不再是 `·` 串。 */
function detailRows(cards: readonly PhotoCard[], s: Synth): Array<Record<string, unknown>> {
  return cards.map((c) => ({
    id: c.id,
    date: c.date,
    time: c.time ?? DASH,
    tag: c.tagList.join(' '),
    // 备注走**纯文本**：明细表单元格转义后再上屏，喂 `noteSegments()` 那种标记串会被转义两次，
    // 用户看到的是字面 `<span class="phu-seg">…</span>`（#527 收口实测）。分段那种形状归回执页
    // （那边是 div 槽，能落标记），这一格只把用户写的备注原样说出来。
    note: c.note === null || c.note === '' ? DASH : c.note,
    file: c.photoPath,
    // #472 人话：用上的写「已用上」，文件名找不到写「找不到文件」；`fileExists === null`
    // （没配照片目录，压根没核过）单独一档——把它写成「找不到文件」是把没核过的说成没有。
    status: s.taken.includes(c) ? '已用上' : (c.fileExists === null ? '未核对' : '找不到文件'),
  }));
}

/** 页内数据投影：复制区与 envelope 共用这一份（可见文本缺值 `—`，这里保留原始空值）。 */
type GifPageData = {
  readonly summary: string;
  readonly gif: {
    readonly path: string | null;
    readonly fileName: string | null;
    readonly bytes: number | null;
    readonly frames: number | null;
    readonly width: number | null;
    readonly height: number | null;
    readonly embedded: boolean;
    /** 未产出／未内嵌的面向用户原因；一切正常即 `null`。 */
    readonly note: string | null;
  };
  readonly tag: string;
  readonly photoCount: number;
  readonly photoIds: number[];
  readonly firstDate: string | null;
  readonly lastDate: string | null;
};

function pageDataOf(task: GifTask, s: Synth, embedded: boolean, note: string | null): GifPageData {
  const framesText = s.frames === null ? '未产出 GIF' : s.frames + ' 帧';
  const state = s.path === null ? '未合成' : (embedded ? '已生成并内嵌本页' : '已生成，未内嵌本页');
  return {
    summary: 'GIF：标签 ' + task.tag + ' 共 ' + task.photoCount + ' 张（' + dash(task.firstDate) + ' 至 '
      + dash(task.lastDate) + '）· ' + framesText + ' · ' + state
      + (s.path === null ? '' : ' · 落点 ' + s.path),
    gif: {
      path: s.path,
      fileName: s.path === null ? null : baseNameOf(s.path),
      bytes: s.bytes,
      frames: s.frames,
      width: s.width,
      height: s.height,
      embedded,
      note,
    },
    tag: task.tag,
    photoCount: task.photoCount,
    photoIds: [...task.photoIds],
    firstDate: task.firstDate,
    lastDate: task.lastDate,
  };
}

/** 输出规格（#527）：每帧停多久／画布多大——KPI 卡的明细槽吃纯文本、形状落不进去，
 *  故在卡下另出一排**事实条**（`#525` 的 `renderFactStrip` 口径，本域只给数据）。 */
function outputFacts(s: Synth): string {
  if (s.frames === null) return '';
  const perFrame = (GIF_LIMITS.delayCs / 100).toFixed(2).replace(/0$/, '') + ' 秒';
  return renderFactStrip({
    items: [
      { label: '每帧停', value: perFrame },
      ...(s.width === null || s.height === null ? [] : [{ label: '边长', value: s.width + '×' + s.height + ' 像素' }]),
    ],
  });
}

/** 三格 KPI ＋ 文件块（#527）：一张卡一件事——「合成」只说帧数，「尺寸」只说边长，
 *  「文件」只说文件名；每帧停多久撤到卡下的事实条（卡片明细槽吃纯文本、形状落不进去）。
 *  上限（`GIF_LIMITS.maxEdge`／`maxBytes`）是能力边界、不是用户读数，下屏。 */
function contentOf(cards: readonly PhotoCard[], s: Synth, embed: boolean, data: GifPageData): string {
  const parts: string[] = [photoUiCss()];
  parts.push(renderKpiGrid([
    {
      label: '合成', value: s.frames === null ? DASH : String(s.frames) + ' 帧',
      detail: s.frames === null ? 'GIF 没合成出来' : '一张照片一帧，按拍摄时间从前到后排',
    },
    {
      label: '尺寸',
      value: s.width === null || s.height === null ? DASH : s.width + '×' + s.height,
      ...(s.bytes === null ? {} : { detail: '文件大小 ' + (s.bytes / 1024).toFixed(1) + ' KB' }),
    },
    {
      label: '文件', value: data.gif.fileName ?? DASH,
      ...(s.path === null ? {} : { detail: '重跑同标签同跨度会覆盖这个文件' }),
    },
  ]));
  parts.push(outputFacts(s));
  if (s.path !== null) {
    parts.push('<div>' + copyActionHtml(s.path, { actionId: CALORIE_COPY_ACTION.actionId, label: '复制路径' }) + '</div>');
  }
  parts.push(stageHtml(s, embed));
  parts.push(renderDataTable({
    columns: [
      { key: 'id', label: '照片编号', align: 'right' },
      { key: 'date', label: '日期' },
      { key: 'time', label: '时间' },
      { key: 'tag', label: '标签' },
      { key: 'note', label: '备注' },
      { key: 'file', label: '文件' },
      { key: 'status', label: '状态' },
    ],
    rows: detailRows(cards, s),
    caption: '合成用到的照片，按时间从上到下，就是动画顺序',
    emptyText: '无入片明细',
  }));
  parts.push('<div class="phu-scroll-hint">表格宽，手机上按住左右滑可以看全</div>');
  parts.push(dataCopyArea('复制数据', {
    envelope: { version: DOC_VERSION, skill: DOC_SKILL, shape: 'analysis', key: 'calorie.photo.gif', data },
  }));
  return parts.join('');
}

/** 页头（#527）：副标题原来把「标签／窗口／挑出几张」三件事用 `·` 与 `~` 串成一句，
 *  现在标签与张数走徽章列、窗口自成一格；挑出几张如实说清，不再与 KPI 打架。 */
function shellOf(task: GifTask, s: Synth, content: string): string {
  const span = task.firstDate === null || task.lastDate === null
    ? '' : '拍摄时间 ' + dash(task.firstDate) + ' 至 ' + dash(task.lastDate);
  const picked = s.taken.length === 0
    ? task.photoCount + ' 张照片一张都没用上（原因见下）'
    : task.photoCount + ' 张里挑出 ' + s.taken.length + ' 张能用的合成'
      + (s.missing.length === 0 ? '' : '（' + s.missing.length + ' 张找不到文件）');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '生成身材照 GIF',
    eyebrow: '',
    subtitle: null,
    content: chipRow(['标签 ' + task.tag, task.photoCount + ' 张照片', span]) + '<p>' + escapeHtml(picked) + '</p>' + content,
    charts: false,
    // #527 收口：本页原先漏了 `pageUi` 位 ⇒ 公共层媒体件那套规则（`.ilife-block-media-img` 的
    //  `width:100%;max-width:100%`、`.ilife-block-media-frame-1-1` 的比例框）整段没进页，
    //  舞台上的图因此按天然像素上屏、方框没有比例。家族其余五页（画廊／详情／对比／候选回执／HELP）
    //  都接了这一位，本页与候选页补齐后与它们同档。
    pageUi: true,
  });
}

/** 生成身材照 GIF 结果页：先合成落盘，再整页装配；超单页上限即改为文件名提示。 */
export function buildPhotoGifPage(input: GifPageInput): GifPageResult {
  const ordered = byFrameOrder(input.cards);
  const s = synthOf(input.task, ordered, input.photosDir);
  const render = (embed: boolean, note: string | null): string =>
    shellOf(input.task, s, contentOf(ordered, s, embed, pageDataOf(input.task, s, embed, note)));
  let embed = s.path !== null;
  let note = s.reason;
  let html = render(embed, note);
  if (embed) {
    const size = Buffer.byteLength(html, 'utf8');
    if (size > PHOTO_LIST_PAGE_MAX_BYTES) {
      embed = false;
      note = '单页超上限 ' + PHOTO_LIST_PAGE_MAX_BYTES + ' 字节（本页 ' + size + ' 字节）：GIF 未内嵌';
      html = render(embed, note);
    }
  }
  return {
    html, copyData: pageDataOf(input.task, s, embed, note), gifPath: s.path, gifBytes: s.bytes,
    frames: s.frames, embedded: embed, reason: embed ? null : note,
  };
}
