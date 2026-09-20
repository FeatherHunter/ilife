/** 目录浏览器的纯逻辑半（**不认识宿主**：只认两格原语）。
 *
 * 为什么在这里：六个单品插件的设置页各有一批「值是一个目录」的行，它们要的界面是同一个东西。
 * 界面的**取数**来自宿主给的两个原语（`list`／`createDirectory`），而这两个原语的形状是**调用方喂进来的**
 * ——本件不 import 宿主的任何实现，也不认识 `remote.directoryPicker` 这个名字（那两件住在各家的
 * `dsh-ctx.ts` 镜像里）。于是本件在 Windows 桌面、远程浏览器、SSH 三种部署下是同一份代码。
 *
 * 装什么：本次要浏览的那一层怎么走（进子目录／回上一级／跳面包屑）、路径怎么切出「目录部分」与
 * 「筛选词」、回执怎么认。**不装**任何 IO、不装任何持久化——`list`／`createDirectory` 由调用方执行。
 *
 * 与平台自带浏览器件的关系：`@deepseek-ai/dsh-client-ui-directory-picker-browse` 的 `DirectoryBrowser`
 * 是包内私有件（只经 `ui-workspace` 的流程空位暴露），插件侧取不到，所以这里是一份独立实现，
 * 只对齐它的**交互结果**（进/选/新建），不对齐它的 DOM。
 */

/** 一层目录里的一个子目录。`hidden` 由宿主判，本件只照传。 */
export interface DirectoryEntry {
  readonly name: string;
  readonly path: string;
  readonly hidden: boolean;
}

/** 面包屑的一格：从文件系统根到当前层，每一格都是一个可跳转目标。 */
export interface DirectoryCrumb {
  readonly name: string;
  readonly path: string;
  readonly hidden: boolean;
}

/** 一次列举的回执（形状照宿主 browse 原语：`path`／`home`／`crumbs`／`entries`／`truncated`）。 */
export interface DirectoryListing {
  readonly path: string;
  readonly home: string;
  readonly crumbs: readonly DirectoryCrumb[];
  readonly entries: readonly DirectoryEntry[];
  readonly truncated: boolean;
}

/** 取数面：由调用方注入。本件只调这两个方法，别的什么都不调。 */
export interface DirectoryBrowseFace {
  list(path?: string, signal?: AbortSignal): Promise<DirectoryListing>;
  createDirectory(path: string, name: string): Promise<string>;
}

/** 浏览失败的人话（`code` 保留给用例断言，`message` 直接上图）。 */
export interface BrowseFailure {
  readonly code: string;
  readonly message: string;
}

/** 目录行入口的三态判定结果：拿到的能力是哪种，决定界面上画什么。 */
export type PickerMode = 'native' | 'browse' | 'none';

/** 平台回执的信封（各家的 `DirectoryPickerAnswer` 与此同形；本件只认这三格，不认别家的类名）。 */
export interface PickEnvelope {
  readonly ok: boolean;
  readonly value?: string | null;
  readonly error?: { readonly code?: string; readonly message?: string };
}

/** 一次「唤起选择器」的归一结果：选中／取消／供不了，永不抛。 */
export type PickOutcome =
  | { readonly kind: 'picked'; readonly path: string }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'unavailable'; readonly message: string };

/** 认一认某个值是不是可用的目录取数面（软依赖守卫用：认不出就当没有，绝不把页面带下来）。 */
export function isBrowseFace(raw: unknown): raw is DirectoryBrowseFace {
  if (typeof raw !== 'object' || raw === null) return false;
  const face = raw as Partial<DirectoryBrowseFace>;
  return typeof face.list === 'function' && typeof face.createDirectory === 'function';
}

/** 认一认某个值有没有 `pick`（对应宿主 composition 里的 `native` 能力）。 */
export function hasPickFn(raw: unknown): boolean {
  if (typeof raw !== 'object' || raw === null) return false;
  return typeof (raw as { pick?: unknown }).pick === 'function';
}

/** 三态判定：先 native（有 pick），再 browse（有两格原语），都没有＝`none`。 */
export function pickerModeOf(raw: unknown): PickerMode {
  if (hasPickFn(raw)) return 'native';
  return isBrowseFace(raw) ? 'browse' : 'none';
}

/** 平台回执 → 三态（**永不抛**）：成功回的是信封里的 `value` 不是路径；`ok:false` 是「供不了」不是「取消」。
 *
 * 出处：`@deepseek-ai/dsh-api-gateway/lib/client.js` 的 `invoke()`（失败不抛、成功也不回裸值），
 * 第一方消费方 `@deepseek-ai/dsh-client-ui-workspace/lib/client.js:99-103` 就照这个信封拆。
 * 裸串照收（老形状兜底），认不出的形状当「供不了」报出来，不当取消吞掉（#743 的教训）。 */
export function readPickAnswer(raw: unknown): PickOutcome {
  if (typeof raw === 'string') return raw.trim() === '' ? { kind: 'cancelled' } : { kind: 'picked', path: raw };
  const answer = (typeof raw === 'object' && raw !== null ? raw : {}) as PickEnvelope;
  if (answer.ok === true) {
    const value = answer.value;
    return typeof value === 'string' && value.trim() !== '' ? { kind: 'picked', path: value } : { kind: 'cancelled' };
  }
  const detail = answer.error?.message?.trim() ?? '';
  return { kind: 'unavailable', message: '打不开系统文件夹对话框' + (detail === '' ? '' : '（' + detail + '）') + '：请直接在框里填绝对路径。' };
}

/** 一段路径里最后那个分隔符的位置（Windows 上 `\` 与 `/` 都算；POSIX 上 `\` 是合法文件名字符，不算）。 */
function lastSeparator(path: string): number {
  const back = path.lastIndexOf('\\');
  const slash = path.lastIndexOf('/');
  // 只含 `\` 的路径按 Windows 规则解；两者都有时取更靠后的那个。
  return back > slash ? back : slash;
}

/** 上一层：`'C:\\a\\b\\'` → `'C:\\a'`；已经是根则回自身；相对名（没有任何分隔符）也回自身。
 *
 * 尾分隔符先吃掉再切——否则「回上一级」会在原地打转。**盘根单独认**：`C:\` 掐掉尾分隔符会剩成
 * `C:`，而 `C:` 是「当前盘」不是「上一层」，回它就会多跑一趟、还可能跨到别的盘上去。
 * UNC（`\\server\share`）不特殊处理：切到头就是共享名本身，浏览停在共享根。 */
export function parentOf(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, '');
  if (trimmed === '') return path;
  const sep = path.includes('\\') ? '\\' : '/';
  if (/^[A-Za-z]:$/.test(trimmed)) return trimmed + sep;
  const cut = lastSeparator(trimmed);
  if (cut === -1) return trimmed;
  if (cut === 0) return path.slice(0, 1);
  if (cut === 2 && /^[A-Za-z]:/.test(trimmed)) return trimmed.slice(0, 2) + sep;
  return trimmed.slice(0, cut);
}

/** 把「当前路径 ＋ 一段输入」拼成一个目标路径。 */
export function joinPath(directory: string, name: string): string {
  const sep = directory.includes('\\') ? '\\' : '/';
  const base = directory.replace(/[\\/]+$/, '');
  if (base === '') return sep + name;
  return base + sep + name;
}

/** 一层列举里，哪些行可进：隐藏目录按开关过滤，其余照宿主给的顺序。 */
export function visibleEntries(listing: DirectoryListing, showHidden: boolean): readonly DirectoryEntry[] {
  return showHidden ? listing.entries : listing.entries.filter((entry) => !entry.hidden);
}

/** 这一层有多少个被藏起来的目录（用来决定「显示隐藏目录」那个开关要不要出现在图上）。 */
export function hiddenCount(listing: DirectoryListing): number {
  return listing.entries.filter((entry) => entry.hidden).length;
}

/** 拿一段文本按「最后一个分隔符」切成「目录部分 ＋ 筛选词」。
 *
 * 没打过任何分隔符时目录部分＝null（那段文字还不指任何目录，只当筛选词用）。
 * Windows 上 `/` 也当分隔符（宿主那边两种都收），POSIX 上不。 */
export function splitDraft(draft: string): { readonly directory: string | null; readonly filter: string } {
  const cut = lastSeparator(draft);
  if (cut === -1) return { directory: null, filter: draft };
  return { directory: draft.slice(0, cut + 1), filter: draft.slice(cut + 1) };
}

/** 按筛选词过一层目录（大小写不敏感；空筛选词＝全留）。 */
export function filterEntries(entries: readonly DirectoryEntry[], filter: string): readonly DirectoryEntry[] {
  const needle = filter.trim().toLowerCase();
  if (needle === '') return entries;
  return entries.filter((entry) => entry.name.toLowerCase().includes(needle));
}

/** 给界面用的一句话位置说明：优先显示相对 home 的说法，省得整条绝对路径占满一行。 */
export function locationLabel(listing: DirectoryListing): string {
  const home = listing.home.replace(/[\\/]+$/, '');
  if (home !== '' && listing.path !== home && listing.path.startsWith(home)) {
    const tail = listing.path.slice(home.length).replace(/^[\\/]+/, '');
    if (tail !== '') return '~' + (listing.path.includes('\\') ? '\\' : '/') + tail;
  }
  return listing.path;
}

/** 新建文件夹的名字合不合法（单个路径段：不许分隔符、不许空、不许 `.`／`..`）。
 *
 * 与宿主 browse 后端的校验同口径——这里先拦一道，是为了在图上给得出人话，不是替代宿主校验。 */
export function validateFolderName(name: string): { readonly ok: true } | { readonly ok: false; readonly reason: string } {
  const trimmed = name.trim();
  if (trimmed === '') return { ok: false, reason: '文件夹名不能为空。' };
  if (/[\\/]/.test(trimmed)) return { ok: false, reason: '文件夹名里不能带路径分隔符。' };
  if (trimmed === '.' || trimmed === '..') return { ok: false, reason: '「.」与「..」不是文件夹名。' };
  return { ok: true };
}
