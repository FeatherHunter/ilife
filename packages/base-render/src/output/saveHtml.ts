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
 * 对外只有 `saveHtmlFile` 一个函数（＋ 三个类型）。**本件自己的判断**：扩展名 `.html`／时间戳格式
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
 *  - `{reuse:'byDay'}`／`{reuse:'byContent'}`：返回**已有那份**，不新建。判据**不按文件名**（时间戳到秒，
 *    两次跑几乎不可能同名，按名字判等于没做）：`byDay`＝当天已有同一主体的一份，`byContent`＝内容哈希相同。
 *    未命中则与 `succession` 同路落一份新的（绝不覆盖）。
 *
 * ⇒ `stem`／`file` 与四态可自由组合：`succession` ＋ `stem` 是通式默认路；`overwrite` ＋ `file` 是逐字落点路；
 * `fail` ＋ 哪个都能当「落点已占就报错」的探针。
 *
 * 不做原子写（先写 `.tmp` 再改名）：HELP 是一次性产物，风险低，不值得加这层。
 * 落点**目录建不动**（`mkdirSync` 失败）与「候选已存在」是两类错误，前者原样抛、不进递补循环
 * （旧件把 `mkdirSync` 的 `EEXIST` 当候选撞名空转 1000 次，见 `docs/skills/skill-memo-ilife/t240-latent-eeexist-note.md`）。
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/** 撞名策略（四态；只表态「撞名怎么办」，**不改** `stem`／`file` 怎么解释。两支 `reuse` 见件头）。 */
export type HtmlOnExists = 'succession' | 'overwrite' | 'fail' | { readonly reuse: 'byDay' | 'byContent' };

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
function resolveName(input: { stem?: string; file?: string }, withStamp: boolean): { name: string; stem: string } {
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
  return { name: withStamp ? stem + '_' + formatStamp(new Date()) + HTML_EXT : stem + HTML_EXT, stem };
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

/** 本件自己产出的名字（防把无关文件当复用对象）：`<主体>_<YYYYMMDD_HHMMSS>[_N].html`。 */
function ownNameRe(stem: string): RegExp {
  const esc = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('^' + esc + '_\\d{8}_\\d{6}(?:_\\d+)?' + HTML_EXT.replace('.', '\\.') + '$');
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
  const { name, stem } = resolveName(input, onExists === 'succession');
  // 目录一次性递归创建：**建不动**（`EEXIST`＝被同名文件占位／`ENOTDIR`…）与「候选已存在」是两类错误，
  // 前者原样抛给调用方走回执，不混进下面的递补循环。
  mkdirSync(dirAbs, { recursive: true });
  if (onExists === 'overwrite') {
    const abs = join(dirAbs, name);
    writeFileSync(abs, input.html, 'utf8');
    return receiptOf(abs, input.html);
  }
  if (typeof onExists === 'object') {
    const hit = onExists.reuse === 'byDay'
      ? reuseByDay(dirAbs, stem, new Date())
      : reuseByContent(dirAbs, stem, input.html);
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
