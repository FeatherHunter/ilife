/** #352 · 生成身材照 GIF 结果页（合成落盘编排 ＋ 整页装配）。
 *
 * 说「做身材照GIF」跑完拿到的是一页完整文档，页内嵌着可播放的 GIF（不是一段任务描述）。
 * 能力来自 #284 `gif.ts`（`synthesizeGifFromPhotos`／`GIF_LIMITS`）；页面形状来自 t400 基准
 * （裁定 5 整页化＋复制区分族；移植项 3 过大改本地路径提示），体积口径沿用 t341 首定的
 * `PHOTO_LIST_PAGE_MAX_BYTES`（1048576，定义只在 `galleryDoc.ts`，本件只引用不另定）。
 *
 * 落盘位与命名沿老技能：`<照片目录>/gifs/<标签>_<首张日期>_<末张日期>.gif`
 * （老 `body_photo_tracker.py:416-417` 与 `:575-581`），同名覆盖。帧序按拍摄日期正序
 * （老 `:463` 的 `ORDER BY date ASC, time ASC`）：旧照先出，动画随时间向前。
 * 老技能的缺失照片口径照旧：读不到的文件跳过、其余照合成（老 `:480-482`）。
 *
 * 上限（`GIF_LIMITS`，见 t284 文档）：帧数＝输入张数且下限 2；体积上限 512000B；
 * 画布边 2..64px；帧延时 50cs。**本件如实写明能力边界**：合成的是容器级 GIF，每帧是实心帧、
 * 帧色由该张输入照片的字节哈希派生，不是像素级光栅转码（真 JPEG→GIF 像素转码需解码器，
 * 不在 #284 与 #352 射程）——页内那份 GIF 与盘上那份逐字节同源，但它不是照片像素的还原。
 *
 * 降级：合成不成就出页面明示原因与替代操作（不中断命令、不落半张 GIF）；整页字节超 1048576
 * 即不内嵌、改出本地路径提示（老页 `body_photo_gif_result.html:99-101` 同义机制，阈值按本仓 1 MiB）。
 * `src/render/html.ts` 只读不加行：本件不调它的照片段（老裸片段 `renderGifHtml` 已不被本命令调用）。
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { escapeHtml } from 'base-paint';
import { renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import { GIF_LIMITS, countGifFrames, synthesizeGifFromPhotos } from './gif.js';
import { PHOTO_LIST_PAGE_MAX_BYTES } from './galleryDoc.js';
import type { GifTask, PhotoCard } from './photo.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本页 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·身材照片';

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

function kbText(bytes: number): string {
  return (bytes / 1024).toFixed(1) + ' KB';
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

function stageHtml(s: Synth, embed: boolean): string {
  if (s.path === null) {
    return '<div data-gif-stage>GIF 未合成：' + escapeHtml(s.reason ?? '未知原因')
      + ' · 替代操作：把照片文件补回照片目录后重跑，或先跑 <code>calorie-cmd-read calorie.view.gif-planner</code> 核对候选</div>';
  }
  if (!embed) {
    return '<div data-gif-stage>GIF 文件较大未内嵌，请本地打开：<code>' + escapeHtml(s.path) + '</code>（'
      + String(s.bytes) + ' 字节）</div>';
  }
  const uri = 'data:image/gif;base64,' + Buffer.from(readFileSync(s.path)).toString('base64');
  return '<div data-gif-stage><img src="' + uri + '" alt="身材变化 GIF" /></div>';
}

function detailRows(cards: readonly PhotoCard[], s: Synth): Array<Record<string, unknown>> {
  return cards.map((c) => ({
    id: c.id, date: c.date, time: c.time ?? DASH, tags: c.tagList.join('、') || DASH,
    note: c.note ?? DASH, file: c.photoPath,
    status: s.taken.includes(c) ? '入片' : (c.fileExists === null ? '未校验' : '文件缺失'),
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
    summary: 'GIF：标签 ' + task.tag + ' 共 ' + task.photoCount + ' 张（' + dash(task.firstDate) + ' ~ '
      + dash(task.lastDate) + '）· ' + framesText + ' · ' + state
      + (s.path === null ? '' : ' · 落点 ' + s.path),
    gif: {
      path: s.path,
      fileName: s.path === null ? null : s.path.slice(s.path.lastIndexOf('\\') + 1).slice(s.path.lastIndexOf('/') + 1),
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

function contentOf(task: GifTask, cards: readonly PhotoCard[], s: Synth, embed: boolean, data: GifPageData): string {
  const span = task.firstDate === null && task.lastDate === null
    ? DASH : dash(task.firstDate) + ' ~ ' + dash(task.lastDate);
  const parts: string[] = [renderKpiGrid([
    { label: '合成照片总数', value: task.photoCount + ' 张', detail: '入片 ' + s.taken.length + ' 张 · 缺文件 ' + s.missing.length + ' 张' },
    { label: '帧数', value: s.frames === null ? DASH : s.frames + ' 帧', detail: s.frames === null ? '未产出' : '帧延时 ' + GIF_LIMITS.delayCs + 'cs · 循环播放' },
    { label: '时间跨度', value: span },
    { label: '首张日期', value: dash(task.firstDate) },
    { label: '末张日期', value: dash(task.lastDate) },
    { label: '标签', value: task.tag },
    { label: '画布', value: s.width === null || s.height === null ? DASH : s.width + '×' + s.height + ' px', detail: '画布边上限 ' + GIF_LIMITS.maxEdge + 'px' },
    { label: '体积', value: s.bytes === null ? DASH : kbText(s.bytes), detail: s.bytes === null ? '未产出' : s.bytes + ' 字节 · 上限 ' + GIF_LIMITS.maxBytes + 'B' },
    { label: '文件位置', value: s.path === null ? DASH : s.path, detail: s.path === null ? '未产出' : '重跑同标签同跨度即刷新此文件（同名覆盖）' },
    { label: '内嵌', value: embed ? '1/1 已内嵌' : '0/1 未内嵌', detail: embed ? '页内嵌字节与盘上文件同源' : (data.gif.note ?? '超单页上限 1 MiB') },
  ])];
  parts.push(stageHtml(s, embed));
  parts.push(renderDataTable({
    columns: [
      { key: 'id', label: 'ID', align: 'right' },
      { key: 'date', label: '日期' },
      { key: 'time', label: '时间' },
      { key: 'tags', label: '标签' },
      { key: 'note', label: '备注' },
      { key: 'file', label: '文件' },
      { key: 'status', label: '状态' },
    ],
    rows: detailRows(cards, s),
    caption: '入片明细（按帧顺序）',
    emptyText: '无入片明细',
  }));
  parts.push(dataCopyArea('复制数据', {
    envelope: { version: DOC_VERSION, skill: DOC_SKILL, shape: 'analysis', key: 'calorie.photo.gif', data },
  }));
  return parts.join('');
}

function shellOf(task: GifTask, content: string): string {
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '生成身材照 GIF',
    eyebrow: 'calorie.photo.gif · 身材照片域',
    subtitle: '标签「' + task.tag + '」 · ' + task.photoCount + ' 张照片合成',
    content,
    charts: false,
  });
}

/** 生成身材照 GIF 结果页：先合成落盘，再整页装配；超单页上限即改为本地路径提示。 */
export function buildPhotoGifPage(input: GifPageInput): GifPageResult {
  const ordered = byFrameOrder(input.cards);
  const s = synthOf(input.task, ordered, input.photosDir);
  const render = (embed: boolean, note: string | null): string =>
    shellOf(input.task, contentOf(input.task, ordered, s, embed, pageDataOf(input.task, s, embed, note)));
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
