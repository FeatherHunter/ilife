/** T2-②b #133 · HELP 接线：HELP key → 资产 → 落盘 → 回执（本模块为唯一接线点）。
 *
 * 链路（每步零旁路）：
 *  1. HELP key：仅 `HELP_WAKE_WORDS`（`卡路里HELP`／`卡路里 help`）放行，其余抛
 *     `bad-input`（调用方 exit 2）；散件 HELP key 唯一性见下 `HELP_FILE_KEY` 注释。
 *  2. 读资产：`WAKE_GROUPS` 直转 5 键 HELP JSON（`skill_name/title/subtitle/contact/groups`，
 *     老实物 `卡路里_HELP_20260906_220726.html:195` 口径；`subtitle` 沿老
 *     `render_help_center.py:182-186` 公式 `〈组数〉 分类 · 〈场景数〉 场景 · 更新于 〈本地分钟〉`；
 *     `contact` 与 `render/helpCenter.ts:HELP_CONTACT` 同源（实物 2 项逐字）；
 *     `init_banner/version/recommendations` 为模板侧可选能力，本接线**不传**——传了即
 *     第二真相源，漂移面无收益）。
 *  3. 命名：`render/helpPaths.ts:buildHelpFileName`（通式 `〈茎〉_<TS>[_<n>].html`）。
 *  4. 落盘：`output.ts:writeFileExclusiveWithRetry`（`wx` 独占＋`EEXIST` 递增 `_N` 重试，
 *     #128 同款；**不可 check-then-write**——`resolveHelpPath` 的 `exists` 回调只做命名
 *     hint，判存与写入之间无独占性，并发同秒必交叉覆盖，红队 S2 硬要求）。
 *     只读类（`EACCES/EPERM/EROFS/EBUSY`，`isReadOnlyWriteFailure`）走内联回退；
 *     结构错（`ENOTDIR/EISDIR/ENAMETOOLONG` 等）原样抛出（调用方 exit 5）。
 *  5. 回执：`render/envelope.ts:buildDelivery + withDelivery`（`delivery.path`
 *     绝对路径不变式；`data.output` 与 `delivery.path` 同值同源）。
 *
 * 调用方 exit 约（沿 `cli/cmd_read.ts` P9 口径，本模块只抛、由 CLI 映 exit）：
 *  `bad-input` → 2（坏 HELP key／空 dbDir／非法日期），`missing-data` → 4（资产分组缺失，
 *  静态资产下不可达、防御性分支），写结构错／渲染错 → 5；缺 dbDir **目录**不算缺数据——
 *  `mkdirSync(recursive)` 建出后照常落盘（exit 0）。
 *
 * 红队 S3-3／S3-4（调用方不接受外部茎／`n` 越权）：
 *  茎在接线层写死 `HELP_FILE_STEM`（`卡路里_HELP`），本模块**无 stem 参数**；
 *  `buildHelpFileName` 的 `n` 本接线**永不传**（初候选无后缀；冲突重试走
 *  `output.ts:nextExclusiveCandidate`，首重试即 `_2`），故 `n<2` 不可达。
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { CALORIE_SKILL, ENVELOPE_VERSION } from '../cli/keys.js';
import { isReadOnlyWriteFailure, writeFileExclusiveWithRetry } from '../output.js';
import { buildDelivery, withDelivery } from './envelope.js';
import { CalorieRenderError } from './errors.js';
import { HELP_CONTACT } from './helpCenter.js';
import { HELP_HTML_DIR_NAME, buildHelpFileName } from './helpPaths.js';
import { WAKE_ASSETS, WAKE_GROUPS } from '../triggers/wake-assets.js';
import type { WakeGroupAsset } from '../triggers/wake-assets.js';

/** HELP key 闭集（HELP 唯一入口；大小写／空格逐字，老 SKILL 口径 `卡路里HELP`）。 */
export const HELP_WAKE_WORDS = ['卡路里HELP', '卡路里 help'] as const;
export type HelpWakeWord = (typeof HELP_WAKE_WORDS)[number];

export function isHelpWakeWord(w: unknown): w is HelpWakeWord {
  return typeof w === 'string' && (HELP_WAKE_WORDS as readonly string[]).includes(w);
}

/** 非 HELP key 即坏参（调用方 exit 2；散件 key 若误入此处同样拦截，HELP 唯一）。 */
export function assertHelpWakeWord(w: unknown): asserts w is HelpWakeWord {
  if (!isHelpWakeWord(w)) {
    throw new CalorieRenderError('bad-input', '非 HELP key（须为 ' + HELP_WAKE_WORDS.join('／') + '）：' + String(w));
  }
}

/** 文件名茎（接线层写死；调用方不接受外部茎，S3-3）。 */
export const HELP_FILE_STEM = '卡路里_HELP' as const;
/** 根镜像名（老 `mirror_to_root` 的 `<skill_dir>/卡路里.html`，ADR-0001）。 */
export const HELP_FILE_MIRROR_NAME = '卡路里.html' as const;
/** 5 键头（实物逐字）。 */
export const HELP_FILE_SKILL_NAME = '卡路里' as const;
export const HELP_FILE_TITLE = '唤醒词速查台' as const;
/** envelope 注册键：复用既有 `calorie.help.center`（#91 全量速查台键），不新增 registry key——
 * 散件 HELP key 若存在则删（HELP 唯一）：`calorie.help.center/lookup` 是既有读键
 * （照片现找／唤醒词现找），非 HELP 文件 key，故不动；本模块之外不得再立 HELP 文件 key。 */
export const HELP_FILE_KEY = 'calorie.help.center' as const;
/** 实物 payload 容器 id（`help-data`，老 `:195`）。 */
export const HELP_FILE_DATA_ID = 'help-data' as const;

/** 5 键 HELP JSON（实物顶层键集；`groups` 由资产直转，只读引用不 clone）。 */
export interface HelpFileData {
  readonly skill_name: typeof HELP_FILE_SKILL_NAME;
  readonly title: typeof HELP_FILE_TITLE;
  readonly subtitle: string;
  readonly contact: typeof HELP_CONTACT;
  readonly groups: readonly WakeGroupAsset[];
}

/** 老 `%Y-%m-%d %H:%M` 等价物（本地时区，零填充；非法 Date 即坏参，不返空串）。 */
export function formatHelpMinute(now: Date): string {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new CalorieRenderError('bad-input', 'HELP 更新时间须为有效 Date（缺失阻断不返空）。');
  }
  const p = (n: number): string => String(n).padStart(2, '0');
  return String(now.getFullYear()) + '-' + p(now.getMonth() + 1) + '-' + p(now.getDate())
    + ' ' + p(now.getHours()) + ':' + p(now.getMinutes());
}

/** 资产 → 5 键 JSON（纯函数；组数／场景数由资产派生，不写死 10／436）。 */
export function buildHelpFileData(now: Date = new Date()): HelpFileData {
  const groups: readonly WakeGroupAsset[] = WAKE_GROUPS;
  if (groups.length === 0 || WAKE_ASSETS.length === 0) {
    throw new CalorieRenderError('missing-data', 'HELP 资产分组缺失（WAKE_GROUPS 空）');
  }
  return {
    skill_name: HELP_FILE_SKILL_NAME,
    title: HELP_FILE_TITLE,
    subtitle: String(groups.length) + ' 分类 · ' + String(WAKE_ASSETS.length)
      + ' 场景 · 更新于 ' + formatHelpMinute(now),
    contact: HELP_CONTACT,
    groups,
  };
}

/** 换行（仓库口径：`String.fromCharCode(10)`，不写字面 `\n`）。 */
const LF = String.fromCharCode(10);

/** 5 键 JSON → 最小数据载体 HTML（`help-data` 内联；F3 `help_template.html`
 * 611 行全量视觉 parity——Tab／搜索／Sheet——非本票范围，本壳只保证契约可解析＋
 * `file://` 可开；`<` 转 `\u003c` 防 `</script>` 破壳，`JSON.parse` 后逐字一致）。 */
export function renderHelpFileHtml(data: HelpFileData): string {
  if (!data || !Array.isArray(data.groups) || data.groups.length === 0) {
    throw new CalorieRenderError('missing-data', 'HELP 渲染缺分组（不返空页）。');
  }
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return '<!DOCTYPE html>' + LF
    + '<html lang="zh-CN">' + LF
    + '<head>' + LF
    + '<meta charset="UTF-8">' + LF
    + '<title>' + data.title + '</title>' + LF
    + '</head>' + LF
    + '<body>' + LF
    + '<script id="' + HELP_FILE_DATA_ID + '" type="application/json">' + json + '</script>' + LF
    + '</body>' + LF
    + '</html>' + LF;
}

export interface HelpFileRunOptions {
  /** DB 目录（`SKILLS_DB_PATH` 口径的目录；空串即坏参 exit 2，不存在则建出）。 */
  readonly dbDir: string;
  /** HELP key（闭集外即坏参 exit 2）。 */
  readonly wakeWord: string;
  /** 产出时刻（文件名秒＋subtitle 分钟取此；缺省 now）。 */
  readonly now?: Date;
  /** 根镜像开关（缺省关；见 `writeHelpMirror` 的默认关闭理由）。 */
  readonly mirrorRoot?: boolean;
}

export type HelpFileDelivery =
  | {
    readonly mode: 'file';
    readonly path: string;
    readonly bytes: number;
    readonly mirrorPath?: string;
    readonly envelope: Record<string, unknown>;
  }
  | {
    readonly mode: 'inline';
    readonly reason: string;
    readonly bytes: number;
    readonly html: string;
    readonly envelope: Record<string, unknown>;
  };

/** 分组索引（envelope `list` 形载荷：`items/total` 守卫所需；`sceneTotal/subgroupTotal`
 * 口径沿 `cli/cmd_read.ts:helpCenterIndex`，不把百 KB 产物塞 envelope）。 */
function helpFileIndex(data: HelpFileData): {
  items: Record<string, unknown>[];
  total: number;
  sceneTotal: number;
  subgroupTotal: number;
} {
  let sceneTotal = 0;
  let subgroupTotal = 0;
  const items = data.groups.map((group) => {
    const sceneCount = group.subgroups.reduce((n, sub) => n + sub.scenes.length, 0);
    sceneTotal += sceneCount;
    subgroupTotal += group.subgroups.length;
    return { id: group.id, icon: group.icon, label: group.label, subgroupCount: group.subgroups.length, sceneCount };
  });
  return { items, total: items.length, sceneTotal, subgroupTotal };
}

/** 根镜像（老 `mirror_to_root` 新版等价：`<dbDir>/卡路里.html` 覆盖写）。
 *
 * 默认关闭的理由（老 `main` 默认开 mirror＋`.scratch` archive 轮转）：
 *  ① 根文件是消费侧入口（用户／SKILL 直接打开），每次渲染默认覆盖会与并发渲染竞写，
 *     且惊扰 pin 住根路径的调用方（最小惊讶）；
 *  ② 老轮转在 `.scratch` 下无界堆 archive（每次 HELP 渲染 ＋1 份百 KB），新架构单调用
 *     只产一份版本化产物（`卡路里_HELP_<TS>[_<n>].html`），归档不属渲染管线职责；
 *  ③ 根目录归属消费侧而非渲染管线。需镜像时显式 `mirrorRoot: true`
 *    （老 `--no-mirror` 反转）；镜像写失败**不**吞错（抛给调用方 exit 5），但主产物已落盘。
 */
function writeHelpMirror(dbDir: string, srcAbs: string): string {
  const mirrorAbs = resolve(join(resolve(dbDir), HELP_FILE_MIRROR_NAME));
  copyFileSync(srcAbs, mirrorAbs);
  return mirrorAbs;
}

/** HELP 接线全链（HELP key → 资产 5 键 → 命名 → `wx` 独占落盘 → envelope 回执）。
 *
 * 初候选只用 `buildHelpFileName(HELP_FILE_STEM, now)`（S3-4：`n` 永不传，`n<2` 不可达；
 * 冲突重试走 `nextExclusiveCandidate`，首重试即 `_2`）。落点已由
 * `join(resolve(dbDir), …)` 构成绝对路径，回执再 `resolve` 归一化（`buildDelivery`
 * 绝对路径不变式）。 */
export function runHelpFile(opts: HelpFileRunOptions): HelpFileDelivery {
  assertHelpWakeWord(opts.wakeWord);
  if (typeof opts.dbDir !== 'string' || opts.dbDir.length === 0) {
    throw new CalorieRenderError('bad-input', 'HELP 落盘缺 dbDir（SKILLS_DB_PATH 目录，不返空）。');
  }
  const now = opts.now ?? new Date();
  const data = buildHelpFileData(now);
  const html = renderHelpFileHtml(data);
  const bytes = Buffer.byteLength(html, 'utf8');
  const index = helpFileIndex(data);
  try {
    const dir = join(resolve(opts.dbDir), HELP_HTML_DIR_NAME);
    mkdirSync(dir, { recursive: true });
    const initial = join(dir, buildHelpFileName(HELP_FILE_STEM, now));
    const finalPath = resolve(writeFileExclusiveWithRetry(initial, html));
    if (!isAbsolute(finalPath)) {
      throw new CalorieRenderError('bad-input', 'HELP 落点须为绝对路径：' + finalPath);
    }
    let mirrorPath: string | undefined;
    if (opts.mirrorRoot === true) mirrorPath = writeHelpMirror(opts.dbDir, finalPath);
    const outData: Record<string, unknown> = {
      ...index,
      mode: 'file' as const,
      output: finalPath,
      ...(mirrorPath === undefined ? {} : { mirror: mirrorPath }),
    };
    const envelope = withDelivery(
      { version: ENVELOPE_VERSION, skill: CALORIE_SKILL, shape: 'list', key: HELP_FILE_KEY, data: outData },
      buildDelivery({ mode: 'file', path: finalPath, shape: 'list', html, bytes }),
    );
    return {
      mode: 'file' as const,
      path: finalPath,
      bytes,
      ...(mirrorPath === undefined ? {} : { mirrorPath }),
      envelope,
    };
  } catch (e) {
    if (isReadOnlyWriteFailure(e)) {
      const reason = (e as Error).message || String(e);
      const outData: Record<string, unknown> = { ...index, mode: 'inline' as const, html };
      const envelope = withDelivery(
        { version: ENVELOPE_VERSION, skill: CALORIE_SKILL, shape: 'list', key: HELP_FILE_KEY, data: outData },
        buildDelivery({ mode: 'inline', shape: 'list', html, bytes }),
      );
      return { mode: 'inline' as const, reason, bytes, html, envelope };
    }
    throw e;
  }
}
