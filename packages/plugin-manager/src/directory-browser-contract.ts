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

/** 宿主拒了一条路的说法随宿主变化，**本件不认识**：调用方把它的回执码传进 `openRowBrowser`。
 *
 * 它为什么是唯一信号：一次组合里只服务一种能力（native 或 browse），另一条路上的动词一律被拒
 * （`@deepseek-ai/dsh-api-workspace-controller/lib/types/directory-picker.js` 的 `requireCapability`）；
 * 而三条动词在客户端命名空间上都在（都由 `TYPERT_REMOTE.descriptors` 生成），
 * 所以「有没有 `pick`／有没有 `list`」问不出组合里服务哪种能力，只有真调一次、看它拒没拒才知道。 */

/** 目录行入口的三态判定结果：**按命名空间上有什么动词**看一眼，不是问组合里服务哪种能力。 */
export type PickerMode = 'native' | 'browse' | 'none';

/** 一个「根」是什么类型：界面只拿它写悬停说明，不拿它做任何判断。
 *
 * 这五个值由**取数方**（宿主半）归一：Windows 上是 `DriveInfo.DriveType` 映过来的；
 * 别的根（挂载点等）落 `other`。本件不认识任何宿主名词，只认识这五个值。 */
export type RootKind = 'fixed' | 'network' | 'removable' | 'optical' | 'other';

/** 一个可跳转的根：`path` 是绝对路径（Windows 上形如 `D:\`），`kind` 只用于显示。 */
export interface RootRow {
  readonly path: string;
  readonly kind: RootKind;
}

/** 平台回执的信封（各家的 `DirectoryPickerAnswer` 与此同形；本件只认这三格，不认别家的类名）。 */
export interface PickEnvelope {
  readonly ok: boolean;
  readonly value?: string | null;
  readonly error?: { readonly code?: string; readonly message?: string };
}

/** 一次「唤起选择器」的归一结果：选中／取消／供不了，永不抛。
 *
 * `code` 只在平台给了的时候带上（就是 `error.code`）：调用方据它分辨「宿主没给这条路」与
 * 「别的失败」——前者该换一条路走，后者才该报出来。那个码由调用方从自己的宿主镜像里传进来
 * （见 `openRowBrowser` 的 `refusalCode`），本件不认它的名字。 */
export type PickOutcome =
  | { readonly kind: 'picked'; readonly path: string }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'unavailable'; readonly code?: string; readonly message: string };

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

/** 三态判定：**先看两格浏览原语**（都在＝应用内浏览器这条路在），再看单独的 `pick`，都没有＝`none`。
 *
 * 为什么浏览优先：客户端命名空间上三条动词一定都在（由 `TYPERT_REMOTE.descriptors` 生成，
 * 与组合里服务哪种能力无关），所以两格原语在＝这台宿主**可能**给浏览；真调一次才知道给不给，
 * 不给（{@link CAPABILITY_REFUSED}）再由调用方换系统对话框。反过来先认 `pick` 就会在
 * Desktop 这种「只服务 browse」的宿主上每次都去唤一次系统对话框、被拒一次（#744 实测）。 */
export function pickerModeOf(raw: unknown): PickerMode {
  if (isBrowseFace(raw)) return 'browse';
  return hasPickFn(raw) ? 'native' : 'none';
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
  const code = answer.error?.code;
  return {
    kind: 'unavailable',
    ...(typeof code === 'string' && code !== '' ? { code } : {}),
    message: '打不开系统文件夹对话框' + (detail === '' ? '' : '（' + detail + '）') + '：请直接在框里填绝对路径。',
  };
}

/** 取数原语失败：带上宿主给的回执码，好让调用方分辨「没这条路」与「这一层读不出来」。
 *
 * `code` 就是 `humanize`（状态那半）读的那一格，人话直接上图。 */
export class BrowseAnswerError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'BrowseAnswerError';
    this.code = code;
  }
}

/** 宿主 browse 原语的**信封** → 值，或按信封里的 `error` 抛。
 *
 * 为什么必须走这一道：`list`／`createDirectory` 与 `pick` 一样是 Remote 动词，客户端拿到的是
 * `{ok:true,value}`／`{ok:false,error}`（`@deepseek-ai/dsh-api-gateway/lib/client.js` 的 `invoke()`）。
 * 把信封当值用，图上就会是一层「读出来了但一行都没有」的空目录（#744 实测），
 * 而不是报错——所以宁可在这里抛，也不许把它当列举结果传下去。
 * 第一方消费方同口径：`@deepseek-ai/dsh-client-ui-workspace/lib/client.js:105-113` 也是这么拆的。 */
export function readBrowseAnswer<T>(raw: unknown, what: string): T {
  const answer = (typeof raw === 'object' && raw !== null ? raw : {}) as {
    ok?: unknown;
    value?: unknown;
    error?: { code?: string; message?: string };
  };
  if (answer.ok === true && answer.value !== undefined && answer.value !== null) return answer.value as T;
  const detail = answer.error?.message?.trim() ?? '';
  const code = answer.error?.code;
  throw new BrowseAnswerError(
    typeof code === 'string' && code !== '' ? code : 'browse-failed',
    detail === '' ? what + '没有回执' : detail,
  );
}

/** 宿主命名空间 → 本件的取数面：把两条原语的信封拆开，成功给值、失败按码抛。
 *
 * 命名空间上两格原语不在就回 null（调用方据此不画入口）。**透传参数个数照宿主的规矩**：
 * 描述符声明了可选 `AbortSignal`（`cancellation: {parameter:'signal'}`），而客户端按
 * `values.length === 业务参数个数 + 1` 判有没有 signal——显式传一个 `undefined` 会被当成 signal
 * 去 `AbortSignal.any([…, undefined])` 而炸。本件的界面不做取消，故**从不传 signal**。 */
export function browseFaceOf(raw: unknown): DirectoryBrowseFace | null {
  if (!isBrowseFace(raw)) return null;
  const namespace = raw as DirectoryBrowseFace;
  return {
    list: async (path) =>
      readBrowseAnswer<DirectoryListing>(path === undefined ? await namespace.list() : await namespace.list(path), '列举目录'),
    createDirectory: async (path, name) => readBrowseAnswer<string>(await namespace.createDirectory(path, name), '新建文件夹'),
  };
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
