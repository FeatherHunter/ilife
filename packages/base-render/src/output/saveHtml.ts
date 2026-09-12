/** `base-render/src/output/` 是 base-paint 的**画完落盘层**，与 `skill-〈技能名〉/src/output.ts`（各技能自己的交付件）无关。
 *
 * #237 · HTML 产物的**共用落盘点**（时间戳命名 ＋ 独占创建 ＋ 同秒递补 ＋ 撞名策略 ＋ 绝对路径回执）。
 *
 * 归属裁决：维护者 2026-09-12 裁决 8「不应该是一个独立的 base 包，放在 `base-paint` 吧，是绘制出 html
 * 后的相关操作」＝落点；地图 #208 的 Q7 裁「乙」＝把「命名与落盘」收成共用位。此前两家各抄一份同名件
 * （`skill-bill/src/output.ts:27-58` 与 `skill-calorie/src/output.ts:144-174` 的 `nextExclusiveCandidate`／
 * `writeFileExclusiveWithRetry`，30 行 vs 29 行只差两处字面量、语义等价）＝铁律二禁止的「同一件事两份实现」。
 *
 * ⚠️ `skill-bill/src/render/helpPaths.ts` 与 `skill-calorie/src/render/helpPaths.ts` 记的旧结论
 * 「不上移 `base-paint`（被 #96 冻结、落盘是 IO、主题错位）」**已被裁决 8 就地改判**：落盘正是「画完之后」
 * 的半步，与 `base-paint` 同族；出口走子路径 `./save-html`，**不从包根开**（包根受 `spec/index.ts` 的
 * 契约面锁死，且带 `fs` 的件不该牵连只要渲染的消费者）。
 *
 * 对外两个函数：`saveHtmlFile`（落盘）与 `reuseWindowOfHours`（**窗口参数的唯一定义地**，见下）＋ 一个默认窗口
 * 常量（＋ 三个类型）。#245 起「几小时＝多少毫秒」也有唯一定义地——五家技能出口都从 `--params` 的
 * `reuseHours` 走它，不许各抄一份转换与校验（铁律二）。**本件自己的判断**：扩展名 `.html`／时间戳格式
 * `YYYYMMDD_HHMMSS`（本地时间）／同秒递补规则／绝不静默覆盖／回执形状／`bytes` 按 UTF-8 真实字节算——
 * 若把这些也做成参数，这里就只剩 `fs.writeFile` 包一层（铁律五点名的「白占一层的转发包装」）。
 * `dir`／`stem`／`file`／`html`／`onExists` 由调用者给，那就是各家的自定义。
 *
 * ## 名字怎么给：`stem` 与 `file` 是**两个正交的口子**
 *
 *  - `stem`：**文件名主体，不含扩展名**——「按通式落一份」的调用者只给主体；
 *  - `file`：**确切文件名，含扩展名**——「用户逐字指定的落点」的调用者给这个（`--output`／`--html` 那一路）；
 *    给了 `file` 就不给 `stem`（同时给即 `EINVAL`：说不清要落哪个）。扩展名由调用者给时本件不再补。
 *  - **`onExists` 只表态「撞名怎么办」，不改名字怎么解释**——两件事各走各的口子，一个参数不背两个语义。
 *
 * `onExists` 四态：
 *  - `succession`（**缺省**）：`〈stem〉_<YYYYMMDD_HHMMSS>.html`，撞名自动 `_2`／`_3`… 递补（三家 HELP 现行为）；
 *  - `overwrite`：名字照 `stem`／`file` 给的落（**不带时间戳、不递补**），已存在就逐字覆写
 *    ——记账／卡路里 `--output`／`--html` 的既有口径（用户逐字指定的落点就是这个语义）；
 *  - `fail`：名字同 `overwrite`（不带时间戳、不递补），撞名即抛（`code:'EEXIST'`），不改写已有那份；
 *  - `{reuse:'byDay'}`／`{reuse:'byContent'}`／`{reuse:{byAge:ms}}`：返回**已有那份**，不新建、不改写。
 *    `byDay`＝当天已有同一主体的一份（取当天最新的）；`byContent`＝内容哈希相同；
 *    **`byAge`＝已有那份的落盘时刻距现在比 `byAge` 毫秒更近（取最新的那一份）——判据严格小于**：`{byAge: 86_400_000}`
 *    就是「一天内直接返回同一份」，`{byAge: 0}` 就是「永远不命中＝每次都落新的」（判据 `<=` 会让同秒重跑失效）。
 *    判据**一律不按调用者给的名字**（时间戳到秒，两次跑几乎不可能同名），
 *    而是按本件自己产出的名字（`<主体>_<YYYYMMDD_HHMMSS>[_N].html`）扫目录；`byAge` 读名字里的时间戳。
 *    **未命中则与 `succession` 同路落一份新的**（带时间戳、绝不覆盖）——落不带戳的名字会让「自己落的
 *    自己下次查不中」，等于没做复用。这三支只认 `stem`（不认 `file`：逐字落点与「按通式扫目录」自相矛盾）。
 *  - 时间戳在**一次调用里只算一次**（`byAge` 的判据与落盘名同源，不跨秒错位）。
 *
 * ⇒ `stem`／`file` 与四态的组合：`succession` ＋ `stem` 是通式默认路；`overwrite`／`fail` ＋ `file` 是逐字落点路；
 * `reuse`（三支）＋ `stem` 是「有就不新建」路；`succession` ＋ `file`／`reuse` ＋ `file` 都不许（`EINVAL`）。
 *
 * 不做原子写（先写 `.tmp` 再改名）：HELP 是一次性产物，风险低，不值得加这层。
 * 落点**目录建不动**（`mkdirSync` 失败）与「候选已存在」是两类错误，前者原样抛、不进递补循环
 * （旧件把 `mkdirSync` 的 `EEXIST` 当候选撞名空转 1000 次，见 `docs/skills/skill-memo-ilife/t240-latent-eeexist-note.md`）。
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/** 撞名策略（四态；只表态「撞名怎么办」，**不改** `stem`／`file` 怎么解释。三支 `reuse` 见件头）。
 *
 *  `reuse` 的三支都「有就不新建」：`byDay`（当天已有）／`byContent`（内容相同）／`{byAge: 毫秒}`（不超龄）。 */
export type HtmlOnExists =
  | 'succession'
  | 'overwrite'
  | 'fail'
  | { readonly reuse: 'byDay' | 'byContent' | { readonly byAge: number } };

/** **HELP 产物的缺省复用窗口**：一天（小时数）——「24 小时内只产出 1 个」。
 *
 *  维护者 2026-09-12 原话：「该方法内需要提供过期时间，比如 1 天内直接返回一份，不会再创建新的。又或者 3 天
 *  这种参数。」⇒ **缺省就是一天**；要别的窗口由调用方显式给（见 `reuseWindowOfHours`）。
 *  与 `byAge` 同源，单位换算只有一处（本件）。 */
export const HELP_REUSE_DEFAULT_HOURS = 24;

/** 落点**意图**（给「按通式落一份」的调用者）：`dir` 落哪个目录、`stem` 文件名**主体**（不含扩展名）。
 *
 *  扩展名、时间戳、同秒递补都由本件钉死——调用者只声明「落哪、叫什么」。要**确切文件名**的调用者
 *  改走 `file`（见件头「两个正交的口子」）。 */
export interface HtmlLanding {
  readonly dir: string;
  readonly stem: string;
}

/** 落盘回执：`path` 恒绝对路径；`bytes` 恒**实际落盘**字节数（写后回读，不是期望值）。 */
export interface HtmlReceipt {
  readonly mode: 'file';
  readonly path: string;
  readonly bytes: number;
}

/** 产物扩展名（本件自己钉死：走 `stem` 由本件补 `.html`；走 `file` 的调用者自带扩展名）。 */
const HTML_EXT = '.html';
/** 主体长度上限（按 **Unicode 码点**）：Windows 单段 255 上限下给时间戳与递补段留足余量。 */
const STEM_MAX_CODE_POINTS = 180;
/** Windows 非法字符（`\` 亦非法，但它是路径分隔符，不会出现在文件名主体里）。 */
const ILLEGAL_CHARS = /[/:*?"<>|]/g;
/** 递补上限：同秒同主体的产物到不了这个量级；到不了即视为落点被占，不再空转。 */
const SUCCESSION_LIMIT = 1000;

function err(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

/** 复用窗口的**参数面**（`reuseHours`）→ 毫秒（`onExists:{reuse:{byAge}}`）。
 *
 *  唯一出口，五家技能命令行（卡路里／记账／备忘录／作息／大厨）都走这里——「几小时＝多少毫秒」与
 *  「坏参怎么判」不许各抄一份（铁律二）。
 *  口径（#245）：
 *   - `undefined`／空串 ⇒ **缺省**：有 `defaultHours` 时用它（各技能缺省＝ `HELP_REUSE_DEFAULT_HOURS`
 *     ＝一天），没有就返回 `0`（＝「每次都落新的」）；
 *   - `0` ⇒ 同上「每次都落新的」——**显式要一份最新的**；
 *   - 正的有限数 ⇒ 该窗口的毫秒数（3 天＝`72`）／数字串按数算（JSON 与 argv 两路同口径）；
 *   - 其余（负数／`NaN`／非数／非空的非数字串）⇒ 抛 `RangeError`「reuseHours 非法…」
 *     （**坏参阻断，不静默当 0**；各技能出口把它归到「参数错」那一档退出码）。
 */
export function reuseWindowOfHours(value: unknown, defaultHours?: number): number {
  const raw = typeof value === 'string' && value.trim() === '' ? undefined : value;
  if (raw === undefined) return (defaultHours ?? 0) * 3_600_000;
  if (typeof raw !== 'number' && typeof raw !== 'string') {
    throw new RangeError('[base-paint] reuseHours 非法（' + JSON.stringify(value) + '）：须为非负小时数');
  }
  const hours = Number(raw);
  if (!Number.isFinite(hours) || hours < 0) {
    throw new RangeError('[base-paint] reuseHours 非法（' + JSON.stringify(value) + '）：须为非负小时数');
  }
  return hours * 3_600_000;
}

/** 去结尾的点与空格（Windows 会把它们吃掉，落盘名与回执名会不一致）。
 *  只用于**主体**——`file` 是逐字落点，含扩展名，结尾的 `.` 属调用者本意，不动。 */
function stripTail(s: string): string {
  return s.replace(/[. ]+$/, '');
}

/** 名字安全化的公共半：非法字符 → `_`、按码点截断。空串由各自的入口报错。 */
function washName(s: string): string {
  return [...s.replace(ILLEGAL_CHARS, '_')].slice(0, STEM_MAX_CODE_POINTS).join('');
}

/** 主体安全化：非法字符 → `_`、去结尾的点与空格、按码点截断（`#237` §三·不做就是个坑）。 */
function sanitizeStem(stem: string): string {
  if (typeof stem !== 'string' || stem.trim().length === 0) {
    throw err('EINVAL', '[base-paint] saveHtmlFile 缺文件名主体（`stem` 须为非空字符串）。');
  }
  const s = stripTail(washName(stem));
  if (s.length === 0) {
    throw err('EINVAL', '[base-paint] saveHtmlFile 文件名主体清洗后为空：' + JSON.stringify(stem));
  }
  return s;
}

/** 确切文件名安全化：与主体同一套非法字符口径，但**不去结尾的点**（扩展名是调用者本意）。 */
function sanitizeFile(file: string): string {
  if (typeof file !== 'string' || file.trim().length === 0) {
    throw err('EINVAL', '[base-paint] saveHtmlFile 缺确切文件名（`file` 须为非空字符串，含扩展名）。');
  }
  const s = washName(file);
  if (s.length === 0) {
    throw err('EINVAL', '[base-paint] saveHtmlFile 文件名清洗后为空：' + JSON.stringify(file));
  }
  return s;
}

/** 时间戳 `YYYYMMDD_HHMMSS`（**本地时间**、零填充）——老 `strftime("%Y%m%d_%H%M%S")` 同口径。 */
function formatStamp(now: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return String(now.getFullYear()) + p(now.getMonth() + 1) + p(now.getDate())
    + '_' + p(now.getHours()) + p(now.getMinutes()) + p(now.getSeconds());
}

/** 解析「这次落哪个名字」：`file` 与 `stem` **只许给一个**（同时给说不清要落哪个，即阻断）。
 *  返回 `{name, stem}`：`name` 是本次要落的确切文件名（带扩展名）；`stem` 供回执／`reuse` 判据用。
 *
 *  `withStamp` = 「要不要时间戳」：**只有** `succession` 要——`file` 是「逐字落点」，与 `succession` 同时给
 *  自相矛盾（既有时间戳又逐字？），阻断而**不是**静默挑一个。 */
function resolveName(input: { stem?: string; file?: string }, withStamp: boolean, now: Date): { name: string; stem: string } {
  if (input.file !== undefined) {
    if (input.stem !== undefined) {
      throw err('EINVAL', '[base-paint] saveHtmlFile `stem` 与 `file` 只能给一个'
        + '（`stem`＝主体、`file`＝确切文件名；同时给说不清要落哪个）。');
    }
    if (withStamp) {
      throw err('EINVAL', '[base-paint] saveHtmlFile `file`（确切文件名）不能用 `onExists:"succession"`'
        + '（那一态要加时间戳）；要按通式落请给 `stem`。');
    }
    const name = sanitizeFile(input.file);
    return { name, stem: name.endsWith(HTML_EXT) ? name.slice(0, -HTML_EXT.length) : name };
  }
  if (input.stem === undefined) {
    throw err('EINVAL', '[base-paint] saveHtmlFile 缺落点名（`stem` 或 `file` 至少给一个）。');
  }
  const stem = sanitizeStem(input.stem);
  return { name: withStamp ? stem + '_' + formatStamp(now) + HTML_EXT : stem + HTML_EXT, stem };
}

/** 下一独占候选：`〈主体〉_<stamp>[_N].html` 的 `_N` 递增；无 `_N` 则 `_2`（#128 口径，照抄旧件原样）。 */
function nextCandidate(currentAbs: string): string {
  const dir = dirname(currentAbs);
  const base = currentAbs.slice(dir.length + 1);
  const m = base.match(/^(.*_\d{8}_\d{6})(?:_(\d+))?(\.[^.]+)$/);
  if (m) {
    const prefix = m[1] as string;
    const n = m[2] !== undefined ? Number.parseInt(m[2] as string, 10) : 1;
    return join(dir, prefix + '_' + String(n + 1) + HTML_EXT);
  }
  const dot = base.lastIndexOf('.');
  const stem = dot >= 0 ? base.slice(0, dot) : base;
  return join(dir, stem + '_2' + HTML_EXT);
}

/** `wx` 独占创建（绝不静默覆盖）：`true`＝本次写入成功；`false`＝该候选已被占（`EEXIST`）；
 *  其余错误（只读／路径非法）**原样抛**，不伪装成「换个名再写一次」。 */
function tryCreateExclusive(absPath: string, html: string): boolean {
  try {
    writeFileSync(absPath, html, { flag: 'wx', encoding: 'utf8' });
    return true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException | null)?.code === 'EEXIST') return false;
    throw e;
  }
}

/** 写后回读：`bytes` 取**实际落盘**字节数；本次写入另做字节数校验（截断即抛，不返期望值）。 */
function receiptOf(absPath: string, expected?: string): HtmlReceipt {
  const actual = readFileSync(absPath);
  if (expected !== undefined && actual.length !== Buffer.byteLength(expected, 'utf8')) {
    throw err('EIO', '[base-paint] saveHtmlFile 写后回读字节数不符：' + absPath
      + '（期望 ' + String(Buffer.byteLength(expected, 'utf8')) + '，实得 ' + String(actual.length) + '）');
  }
  return { mode: 'file', path: absPath, bytes: actual.length };
}

/** 本件自己产出的名字（防把无关文件当复用对象）：`<主体>_<YYYYMMDD_HHMMSS>[_N].html`。
 *  ⚠️ 组 1 **必须是那个时间戳**——`ownStampOf` 靠它取落盘时刻（改这里要同步改 `ownStampOf`）。 */
function ownNameRe(stem: string): RegExp {
  const esc = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('^' + esc + '_(\\d{8}_\\d{6})(?:_\\d+)?' + HTML_EXT.replace('.', '\\.') + '$');
}

/** 目录内的候选名（目录不存在＝还没落过，视为空）。 */
function readNames(dirAbs: string): readonly string[] {
  try {
    return readdirSync(dirAbs);
  } catch {
    return [];
  }
}

/** `reuse:'byDay'` 判据：当天已有同一主体的一份（取当天最新的一份）。 */
function reuseByDay(dirAbs: string, stem: string, now: Date): string | null {
  const dayPrefix = stem + '_' + formatStamp(now).slice(0, 8) + '_';
  const re = ownNameRe(stem);
  const hits = readNames(dirAbs).filter((n) => re.test(n) && n.startsWith(dayPrefix)).sort();
  const last = hits[hits.length - 1];
  return last === undefined ? null : join(dirAbs, last);
}

/** 本件自己产出的名字里的落盘时刻（`<主体>_<YYYYMMDD_HHMMSS>[_N].html` → 那个时刻；读不出＝`null`）。
 *  按**名字里的时间戳**判，不看文件系统 mtime——mtime 会被复制／同步／touch 改掉，名字是落盘时钉死的。 */
function ownStampOf(name: string, stem: string): Date | null {
  const m = ownNameRe(stem).exec(name);
  if (!m) return null;
  const d = m[1] as string;
  const t = new Date(
    Number(d.slice(0, 4)), Number(d.slice(4, 6)) - 1, Number(d.slice(6, 8)),
    Number(d.slice(9, 11)), Number(d.slice(11, 13)), Number(d.slice(13, 15)),
  );
  return Number.isNaN(t.getTime()) ? null : t;
}

/** `reuse:{byAge:ms}` 判据：**已有那份不超龄**就返回它（取最新的那一份）——「一天内不再新建」用它。
 *  超龄（或名字读不出时刻）的那一份**不算命中**，与未命中同路落一份新的。
 *
 *  ⚠️ 判据是**严格区间** `0 ≤ now − at < ms`：
 *   - `byAge:0` ⇒ **永远不命中**＝每次都落一份新的（「要一份最新的」走这条）。落盘时刻是**秒级**的
 *     （无毫秒），同一秒内重跑 `now − at` 恰为 0 ⇒ 写成 `<=` 会把「本秒刚落的这一份」当命中，
 *     「每次都落新的」当场失效（#245 施工期实测踩到，用例已锁这条边界）；
 *   - `now − at < 0`（**落盘名的时间戳比现在晚**）**不算命中**。正常单机跑不会出现，但时钟回拨／
 *     虚拟机时钟与文件时间不同步时会出现（#245 施工期实测：本机 `new Date()` 比文件名里的秒**晚**
 *     几百毫秒，`delta` 一度为 −298 —— `delta < ms` 会把未来的那份当命中，与「过期窗口」的意图相反）。
 *     这种将来时刻的名字跳过继续看更旧的候选。 */
function reuseByAge(dirAbs: string, stem: string, now: Date, ms: number): string | null {
  if (!Number.isFinite(ms) || ms < 0) {
    throw err('EINVAL', '[base-paint] saveHtmlFile `reuse.byAge` 须为非负毫秒数，实得：' + String(ms));
  }
  // 名字含时间戳 ⇒ 字典序即时间序（`byDay` 同此理）。
  const hits = readNames(dirAbs).filter((n) => ownNameRe(stem).test(n)).sort();
  for (let i = hits.length - 1; i >= 0; i--) {
    const n = hits[i] as string;
    const at = ownStampOf(n, stem);
    if (at === null) continue;
    const age = now.getTime() - at.getTime();
    if (age < 0) continue; // 将来时刻的名字：跳过，继续看更旧的候选
    if (age < ms) return join(dirAbs, n);
    break; // 最新的一份都超龄 ⇒ 更旧的必然也超龄，不必再扫
  }
  return null;
}

/** `reuse:'byContent'` 判据：内容哈希相同就返回已有那份（不按名字——按名字等于没做）。 */
function reuseByContent(dirAbs: string, stem: string, html: string): string | null {
  const want = createHash('sha256').update(html, 'utf8').digest('hex');
  const re = ownNameRe(stem);
  for (const n of readNames(dirAbs).filter((x) => re.test(x)).sort()) {
    try {
      if (createHash('sha256').update(readFileSync(join(dirAbs, n))).digest('hex') === want) {
        return join(dirAbs, n);
      }
    } catch {
      /* 读不动就跳过这一份，继续找 */
    }
  }
  return null;
}

/** 落一份 HTML 产物（**唯一落盘点**，对外唯一函数）。见件头：两个名字口子／四态／回执口径。
 *
 *  `stem`（主体）与 `file`（确切文件名）**只给一个**；`onExists` 只表态撞名怎么办。 */
export function saveHtmlFile(input: {
  dir: string;
  stem?: string;
  file?: string;
  html: string;
  onExists?: HtmlOnExists;
}): HtmlReceipt {
  const dirAbs = resolve(input.dir);
  const onExists: HtmlOnExists = input.onExists ?? 'succession';
  const reuse = typeof onExists === 'object' ? onExists.reuse : null;
  // `succession` 与三支 `reuse` 都按通式算名字（要时间戳）；`overwrite`／`fail` 是逐字落点。
  const stamped = onExists === 'succession' || reuse !== null;
  const now = new Date(); // 一次调用只算一次：`byAge` 的判据与落盘名同源，不跨秒错位
  const { name, stem } = resolveName(input, stamped, now);
  // 目录一次性递归创建：**建不动**（`EEXIST`＝被同名文件占位／`ENOTDIR`…）与「候选已存在」是两类错误，
  // 前者原样抛给调用方走回执，不混进下面的递补循环。
  mkdirSync(dirAbs, { recursive: true });
  if (onExists === 'overwrite') {
    const abs = join(dirAbs, name);
    writeFileSync(abs, input.html, 'utf8');
    return receiptOf(abs, input.html);
  }
  if (reuse !== null) {
    const hit = reuse === 'byDay'
      ? reuseByDay(dirAbs, stem, now)
      : reuse === 'byContent'
        ? reuseByContent(dirAbs, stem, input.html)
        : reuseByAge(dirAbs, stem, now, reuse.byAge);
    if (hit !== null) return receiptOf(hit); // 复用：不新建、不覆盖；`bytes` ＝已有那份的实际字节数
  }
  const initial = join(dirAbs, name);
  if (onExists === 'fail') {
    if (!tryCreateExclusive(initial, input.html)) {
      throw err('EEXIST', '[base-paint] saveHtmlFile 落点已被占（`onExists:"fail"` 不递补）：' + initial);
    }
    return receiptOf(initial, input.html);
  }
  let candidate = initial;
  for (let i = 0; i < SUCCESSION_LIMIT; i++) {
    if (tryCreateExclusive(candidate, input.html)) return receiptOf(candidate, input.html);
    candidate = nextCandidate(candidate);
  }
  throw err('EEXIST', '[base-paint] saveHtmlFile 独占创建递补超限（' + String(SUCCESSION_LIMIT) + ' 次）：' + initial);
}
