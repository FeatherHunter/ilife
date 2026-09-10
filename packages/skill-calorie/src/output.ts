/** #87 · 输出命名规范复刻（M10 · 手册 §4.1 跨 Skill 通用 · 旧基线逐行对照）。
 *
 * 旧版真值（只读基线 `D:\2Study\StudyNotes\SKILLS\卡路里\scripts\html_paths.py`）：
 *   - `html_dir()`             → `DATA_DIR / "calorie_html"`（`DATA_DIR = find_db_path().parent`，跟随 `SKILLS_DB_PATH`）
 *   - `html_name()`            → `<command>_<YYYYMMDD>_<HHMMSS>.html`；同秒已有 N 个同名 → 追加 `_(N+1)`（首个冲突 `_2`）
 *   - `html_path()`            → 一步到位：目录不存在则递归创建
 *   - `--output`               → 显式路径覆盖，绕过命名规则（旧 `SKILL.md` L104「仍可显式覆盖到任意路径」）
 *   - `_sanitize_filename_part()` → `\\ / : * ? " < > | [ ]` → `_`、去前后空格、截断 32 字符
 *
 * 新架构 `<中文command>` 真值来源（#87 侦察结论）＝ `CALORIE_COMBOS[key].title`
 * （`packages/base-combos/combos.yaml` 同值镜像，两处逐键一致；见 `test/output-naming-87.test.mjs`）。
 * 不取 triggers 的 `wake_word`：唤醒词是用户话术（含空格/括号，如「看体重 vs 摄入(最近 7 天)」），
 * 且与 CLI 组合键非一一对应（一场景多唤醒词），做不了「一个键一个命令名」。
 *
 * 与老家的有意偏离（逐条见 `docs/research/t87-*.md` 偏离记账）：
 *   1. 默认落盘改由 CLI 出口（`cli/cmd_read.ts`）执行，本模块只出路径，不做 IO 副作用判断；
 *   2. 同秒冲突用 `readdirSync` + `startsWith` 计数，不用 `glob`——命令名已 sanitize，无 `[]` 元字符，
 *      语义等价且不引入依赖；
 *   3. 显式 `--output` 路径自动建父目录（老家直接 `open()` 会 ENOENT）；对旧行为是超集。
 */
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { CALORIE_COMBOS } from './cli/keys.js';
import { CalorieRenderError } from './render/errors.js';
import { resolveDbDir } from './paths.js';

export const HTML_DIR_NAME = 'calorie_html';
export const HTML_EXT = '.html';

/** 旧版 `_sanitize_filename_part` 逐字复刻：非法字符 → `_`、trim、截断 32 字符（按字符，中文/emoji 安全）。
 *
 * #87 返修 F1（A2 S2-1）：截断必须按 **Unicode 码点**（旧 Python `s[:32]` 语义），不得按 UTF-16 码元。
 * 按码元切会把代理对劈成孤立代理项：落盘时文件系统把它换成 U+FFFD，而 `data.output` 回传的仍是
 * 带 `\ud83d` 的原串 → **回传路径 ≠ 实际落盘文件**。`[...s]` 按码点迭代后再 `slice`，逐字对齐旧版。
 */
export function sanitizeFilenamePart(text: string | null | undefined): string {
  if (text === null || text === undefined) return '';
  let s = String(text).trim();
  for (const ch of '\\/:*?"<>|[]') s = s.split(ch).join('_');
  return [...s].slice(0, 32).join('');
}

/** 旧版 `datetime.now().strftime("%Y%m%d_%H%M%S")` 等价物（本地时区，零填充）。 */
export function formatStamp(now: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return (
    String(now.getFullYear()) +
    p(now.getMonth() + 1) +
    p(now.getDate()) +
    '_' +
    p(now.getHours()) +
    p(now.getMinutes()) +
    p(now.getSeconds())
  );
}

/** `<中文command>` 真值：注册表 `title`（未注册即抛，缺失阻断不返空）。 */
export function chineseCommandFor(key: string): string {
  const hit = (CALORIE_COMBOS as Record<string, { title?: string }>)[key];
  if (!hit || typeof hit.title !== 'string' || hit.title.length === 0) {
    throw new CalorieRenderError('bad-input', '无中文 command 名（未注册键）：' + key);
  }
  return sanitizeFilenamePart(hit.title);
}

/** 同秒冲突计数：`<command>_<stamp>*.html`（旧版 `glob` 语义；目录不存在视为 0）。
 *
 * #87 返修 F2（A2 S2-2）：旧 `glob.glob()` 在 Windows 下走 `fnmatch.filter` → `os.path.normcase`，
 * 文件名匹配**大小写不敏感**（`..._123000.HTML` 同样计入冲突）。故此处两侧 `toLowerCase()` 后比较：
 * 否则目录内已有 `X.HTML` 时会再选 `X.html`，在 Windows 上**直接覆盖原文件**。
 */
function countSameSecond(dir: string, command: string, stamp: string): number {
  let names: readonly string[];
  try {
    names = readdirSync(dir);
  } catch {
    return 0;
  }
  const prefix = (command + '_' + stamp).toLowerCase();
  const ext = HTML_EXT.toLowerCase();
  return names.filter((n) => {
    const lower = n.toLowerCase();
    return lower.startsWith(prefix) && lower.endsWith(ext);
  }).length;
}

/** 旧版 `html_name()`：只出文件名 `<command>_<stamp>[_N].html`，冲突时 `N = 同秒已有数 + 1`。 */
export function htmlFileName(command: string, opts: { dir: string; now: Date }): string {
  const stamp = formatStamp(opts.now);
  const n = countSameSecond(opts.dir, command, stamp);
  return n === 0
    ? command + '_' + stamp + HTML_EXT
    : command + '_' + stamp + '_' + String(n + 1) + HTML_EXT;
}

/** 旧版 `html_dir()`：`<SKILLS_DB_PATH>/calorie_html`，递归创建。 */
export function htmlDir(dbDir: string = resolveDbDir()): string {
  const d = join(dbDir, HTML_DIR_NAME);
  mkdirSync(d, { recursive: true });
  return d;
}

/** 旧版 `html_path()`：`<SKILLS_DB_PATH>/calorie_html/<中文command>_<stamp>[_N].html`（完整可写路径）。
 *  #119 · 按段拼接：`<覆盖|title>[_回执][_动态段][_内容标识]_<TS>[_N].html`
 *  （旧 `html_scene_path()` 类型段 ＋ `_cmd_maps.py` 动态段 ＋ `html_name(suffix=)` 内容标识段）。 */
export function resolveDefaultHtmlPath(
  key: string,
  opts: { now?: Date; dbDir?: string; suffix?: string | null; params?: Record<string, unknown> } = {},
): string {
  const d = htmlDir(opts.dbDir ?? resolveDbDir());
  const segs = [LEGACY_COMMAND_OVERRIDES[key] ?? chineseCommandFor(key)];
  const type = sceneTypeFor(key);
  if (type) segs.push(OUTPUT_TYPE_LABELS[type] as string);
  const dyn = dynamicSegmentFor(key, opts.params ?? {});
  if (dyn) segs.push(dyn);
  const suf = opts.suffix ? sanitizeFilenamePart(opts.suffix) : '';
  if (suf) segs.push(suf);
  return join(d, htmlFileName(segs.join('_'), { dir: d, now: opts.now ?? new Date() }));
}

/** 显式 `--output` / `--html` 落点：命名规则不参与，只保证父目录存在。 */
export function resolveExplicitHtmlPath(file: string): string {
  mkdirSync(dirname(file), { recursive: true });
  return file;
}

/* ── #128 · 并发原子落盘：独占创建 + 重试（S2 数据完整性） ───────────────────────────
 *
 * 根因：默认落点曾是「`readdirSync` 计数选名 → `writeFileSync`（`w` 覆盖）」两步，
 * 两步之间无独占性；多进程并发同秒时都选同一路径 → 后写覆盖先写，
 * 用户按 envelope 的 `data.output` 可能打开另一次调用的产物（#91 红队 3 轮 ×5 实测）。
 * #91 后 `help.center` file 态约 1 MB，写窗口 200–300 ms，撞名概率显著放大。
 *
 * 修法（票面建议 1）：`flag:'wx'` 独占创建，`EEXIST` 时递增 `_N` 重试（原子，无需锁）。
 *  - 串行语义不变：首选仍是 `htmlFileName` 的计数 hint，首试即中 → 路径与旧版逐字一致；
 *  - 并发下由文件系统仲裁：败者 `EEXIST` → `_N+1` 重试，保证每个 envelope 的落点内容即本次产物；
 *  - 大小写不敏感（Windows `normcase`，#87 F2）由 `wx` 天然覆盖：`.HTML` 占位同样 `EEXIST`；
 *  - 仅 `EEXIST` 重试；只读类（`EACCES` 等）仍走 #83 内联回退，其余原样抛出走回执；
 *  - 显式 `--output`／`--html` 保持覆盖语义（`w`），不参与重试：那是用户逐字指定的落点；
 *  - `target`（回执落点，`resolveReceiptHtmlPath` 的默认命名）与默认路径同走独占重试。
 */

/** #128 · 下一独占候选（可单测）：`<cmd>_<TS>[_N].html` 的 `_N` 递增；无 `_N` 则 `_2`。导出仅供测试。 */
export function nextExclusiveCandidate(currentAbs: string): string {
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

/** #128 · 独占写 + 重试（可单测）：`wx` 首试，`EEXIST` 则 `_N+1` 重试。导出仅供测试。 */
export function writeFileExclusiveWithRetry(initialAbs: string, html: string): string {
  let candidate = initialAbs;
  for (let i = 0; i < 1000; i++) {
    try {
      mkdirSync(dirname(candidate), { recursive: true });
      writeFileSync(candidate, html, { flag: 'wx', encoding: 'utf8' });
      return candidate;
    } catch (e) {
      if ((e as NodeJS.ErrnoException)?.code === 'EEXIST') {
        candidate = nextExclusiveCandidate(candidate);
        continue;
      }
      throw e;
    }
  }
  throw Object.assign(new Error('落点独占创建重试超限：' + initialAbs), { code: 'EEXIST' });
}

/* ── #83 · 三态交付：落盘／只读回退（M4「必须渲染并打开」的机械保证） ───────────────────────── */

/** 只读／沙箱类写失败码 → ② 内联态（产物随 envelope 回传，绝不因写不进去而文字答）。
 *  **结构错**（`EEXIST`／`ENOTDIR`／`EISDIR`／`ENAMETOOLONG` 等）**不**回退：那是落点本身非法，
 *  按旧契约走「渲染失败回执」（exit 5），避免把用户笔误静默变成另一种交付形态。 */
export const READONLY_WRITE_CODES = ['EACCES', 'EPERM', 'EROFS', 'EBUSY'] as const;

export function isReadOnlyWriteFailure(e: unknown): boolean {
  const code = (e as NodeJS.ErrnoException | null | undefined)?.code;
  return typeof code === 'string' && (READONLY_WRITE_CODES as readonly string[]).includes(code);
}

export type HtmlDelivery =
  | { readonly mode: 'file'; readonly path: string; readonly bytes: number }
  | { readonly mode: 'inline'; readonly reason: string; readonly bytes: number };

/** 交付一次 HTML 产物（**唯一落盘点**）：
 *  - `target` 显式给定时为回执类默认命名 → **独占创建 + 重试**（#128，与默认同）；
 *    `explicit`（`--output`／`--html`）为用户逐字指定 → **覆盖写**（`w`，语义不变）；
 *    否则默认 `<SKILLS_DB_PATH>/calorie_html/<中文command>_<TS>[_N].html` → **独占创建 + 重试**（#128）；
 *  - 只读类失败 → `{mode:'inline'}`（调用方把产物随 envelope 回传）；其余失败**原样抛出**（走回执）。
 *  落点**解析**与写入同在一个 try 内：`calorie_html` 被同名文件占位等解析期失败同样归类（#87 返修 F4）。 */
export function deliverHtml(input: {
  key: string;
  params: Record<string, unknown>;
  explicit?: string;
  target?: string;
  html: string;
  now?: Date;
}): HtmlDelivery {
  const bytes = Buffer.byteLength(input.html, 'utf8');
  try {
    if (input.target !== undefined) {
      const written = resolve(input.target);
      const finalPath = writeFileExclusiveWithRetry(written, input.html);
      return { mode: 'file', path: finalPath, bytes };
    }
    if (input.explicit !== undefined) {
      const written = resolve(input.explicit);
      writeFileSync(resolveExplicitHtmlPath(written), input.html, 'utf8');
      return { mode: 'file', path: written, bytes };
    }
    const hint = resolveDefaultHtmlPath(input.key, {
      params: input.params,
      suffix: writeSuffixFor(input.key, input.params),
      now: input.now,
    });
    // #83 返修 R-1（红队 S1）：落点可为**相对路径**（`SKILLS_DB_PATH` 本身可为相对，`--output` 亦文档化为
    // 「任意路径」），而 `delivery.path` 契约要求绝对路径。此前把原样字符串回传 → `buildDelivery` 抛
    // `bad-input` → **产物已写盘却 exit 2**。此处与 `writeFileSync` 同口径 `resolve`（写的就是它），
    // 只归一化回传值，落盘行为与旧版逐字一致。
    const written = resolve(hint);
    const finalPath = writeFileExclusiveWithRetry(written, input.html);
    return { mode: 'file', path: finalPath, bytes };
  } catch (e) {
    if (isReadOnlyWriteFailure(e)) return { mode: 'inline', reason: (e as Error).message, bytes };
    throw e;
  }
}

/** #83 · 回执落点：`<SKILLS_DB_PATH>/calorie_html/<中文command>_<TS>[_N].html`（旧 `render_error_receipt.py`
 *  的 `COMMAND_CN = '操作失败'` 逐字对齐；回执本身也走三态，写不进去即内联）。 */
export function resolveReceiptHtmlPath(command = '操作失败', now: Date = new Date()): string {
  const d = htmlDir();
  return join(d, htmlFileName(command, { dir: d, now }));
}

/** #119 · 旧 `html_scene_path()` 的「类型中文」段真值（`html_paths.py` OUTPUT_TYPE_LABELS）。 */
export const OUTPUT_TYPE_LABELS: Record<string, string> = { process: '过程', result: '结果', receipt: '回执' };

/** #119 · 该键的旧版类型段：写键一律 `receipt`（旧 `render_*_receipt.py` 全部走 `html_scene_path(..., 'receipt')`）；
 *  视图键**默认不加段**（旧视图多数走 `html_path()` 无类型段，只有少数走场景命名，须逐键核对旧脚本后登记）。 */
export function sceneTypeFor(key: string): 'process' | 'result' | 'receipt' | null {
  const hit = (CALORIE_COMBOS as Record<string, { shape?: string }>)[key];
  return hit?.shape === 'receipt' ? 'receipt' : null;
}

/** #119 · 旧 `html_path()` 实参与注册表 `title` 不同的键（逐键核对旧脚本后登记）。
 *  `calorie.view.ranking`：旧 `render_food_ranking.py` 用 `'食物排行_' + FOOD_RANKING_CATEGORY_MAP[category]`
 * （`title` 为 `食品排行`，差一字；同秒五榜＋全榜互撞的根因，见 `docs/research/t87-output-naming.md` §5.1）。 */
export const LEGACY_COMMAND_OVERRIDES: Record<string, string> = {
  'calorie.view.ranking': '食物排行',
};

/** #119 · 旧 `_cmd_maps.py` 的动态参数中文化映射（逐表复刻；未命中即不加段）。
 *  只收录新架构确有同名参数且旧映射无歧义的两张表；其余旧动态场景（体重历史日期驱动、
 *  运动汇总 mode、饮食复盘 type 等）在新分发中无对应参数或已被合并，记残留（见 `docs/research/t119-dynamic-suffix.md`）。 */
export const DYNAMIC_COMMAND_SEGMENTS: Record<string, Record<string, string>> = {
  'calorie.view.ranking': {
    high_calorie: '高热量', low_calorie: '低热量', frequent: '常吃', high_carb: '高碳水', high_protein: '高蛋白', all: '全部',
  },
  'calorie.view.contraindication': { 腰: '腰', 膝: '膝', 肩: '肩', all: '全部' },
};

/** #119 · 动态段：ranking 取 `category`、contraindication 取 `part`；缺省 `all`；旧表未命中 → 不加段。 */
export function dynamicSegmentFor(key: string, params: Record<string, unknown>): string {
  const table = DYNAMIC_COMMAND_SEGMENTS[key];
  if (!table) return '';
  const raw = key === 'calorie.view.ranking' ? (params['category'] ?? 'all') : (params['part'] ?? 'all');
  const v = raw === undefined || raw === null ? 'all' : String(raw);
  return sanitizeFilenamePart(table[v] ?? '');
}

/** #119 · 旧版 `html_name(suffix=)`／`html_scene_path(suffix=)` 的内容标识段（issue #49／#266／#284／#286 拍板）。
 *  纯 params 派生（落点解析在写库前后均可调用，不读库）：需要写后回执值的键（删饮食/删食品/
 *  下架食品/删身材照/id 删体重/删体脂/删围度）返回 ''，记残留（见 `docs/research/t119-dynamic-suffix.md`）。
 *  返回值未经 sanitize（由调用方 `resolveDefaultHtmlPath` 统一清洗＋截断 32 码点）。 */
export function writeSuffixFor(key: string, params: Record<string, unknown>): string {
  const str = (...names: string[]): string => {
    for (const n of names) {
      const v = params[n];
      if (typeof v === 'string' && v.trim().length > 0) return v.trim();
    }
    return '';
  };
  /** YYYY-MM-DD → YYYYMMDD（旧 `str(date).replace('-', '')`）；非法格式原样返回（sanitize 兜底）。 */
  const compactDate = (v: unknown): string =>
    typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v.replace(/-/g, '') : (typeof v === 'string' ? v : '');
  /** 旧 `format(float(x), 'g')`：去尾零（68.0→'68'、70.5→'70.5'）；非有限 number → ''。 */
  const numG = (v: unknown): string =>
    typeof v === 'number' && Number.isFinite(v) ? String(v) : '';
  const firstItem = (): Record<string, unknown> => {
    const items = params['items'];
    if (!Array.isArray(items) || items.length === 0) return {};
    const o = items[0];
    return typeof o === 'object' && o !== null ? (o as Record<string, unknown>) : {};
  };
  const batchCount = (): number => (Array.isArray(params['items']) ? (params['items'] as unknown[]).length : 0);
  switch (key) {
    case 'calorie.diet.add':
    case 'calorie.diet.update':
      return str('foodName', 'food_name'); // 旧：记一餐带食物名（#49）／改后名（#266 Q4A）
    case 'calorie.diet.batch': {
      const first = firstItem();
      const food = typeof first['foodName'] === 'string' && (first['foodName'] as string).trim()
        ? String(first['foodName']).trim()
        : (typeof first['food_name'] === 'string' ? String(first['food_name']).trim() : '');
      if (!food) return '';
      const n = batchCount();
      return n > 1 ? food + '等' + n + '项' : food; // 旧 #266 Q1A：首食物＋等N项
    }
    case 'calorie.diet.copy':
      return compactDate(params['from'] ?? params['fromDate']); // 旧 #266 Q2A：源日期
    case 'calorie.diet.update-by-date':
    case 'calorie.diet.remove-by-date':
      return compactDate(params['date']); // 旧：目标日期
    case 'calorie.diet.remove-by-range':
      return compactDate(params['start']) && compactDate(params['end'])
        ? compactDate(params['start']) + '至' + compactDate(params['end']) : ''; // 旧：起止范围
    case 'calorie.diet.remove-by-type':
      return compactDate(params['date']) + str('mealType'); // 旧：日期＋餐别
    case 'calorie.water.log':
      return numG(params['ml']) ? numG(params['ml']) + 'ml' : ''; // 旧 #284 Q1A：毫升
    case 'calorie.weight.log':
      return numG(params['kg']) ? numG(params['kg']) + 'kg' : ''; // 旧 #286：体重值
    case 'calorie.weight.update':
      return compactDate(params['date']) || (numG(params['kg']) ? numG(params['kg']) + 'kg' : ''); // 旧 #284 Q3A：日期
    case 'calorie.weight.remove':
      if (typeof params['date'] === 'string') return compactDate(params['date']);
      if (typeof params['start'] === 'string' && typeof params['end'] === 'string') {
        return compactDate(params['start']) + '至' + compactDate(params['end']);
      }
      return ''; // id 删：旧带记录日期（需读库），记残留
    case 'calorie.weight.batch': {
      const first = firstItem();
      const kg = numG(first['kg']);
      if (!kg) return '';
      const n = batchCount();
      return n > 1 ? kg + 'kg等' + n + '项' : kg + 'kg'; // 旧 #286：首条体重＋等N项
    }
    case 'calorie.exercise.add': {
      if (params['copyFrom'] !== undefined) return ''; // 旧带源日期（需读库），记残留
      if (params['items'] !== undefined) {
        const first = firstItem();
        const t = typeof first['type'] === 'string' && (first['type'] as string).trim()
          ? String(first['type']).trim()
          : (typeof first['exerciseType'] === 'string' ? String(first['exerciseType']).trim() : '');
        if (!t) return '';
        const n = batchCount();
        return n > 1 ? t + '等' + n + '项' : t;
      }
      return str('type', 'exerciseType'); // 旧 render_exercise_receipt：运动类型
    }
    case 'calorie.exercise.update':
      return compactDate(params['date']) || str('type', 'exerciseType');
    case 'calorie.exercise.remove':
      if (typeof params['date'] === 'string') return compactDate(params['date']);
      if (typeof params['from'] === 'string' && typeof params['to'] === 'string') {
        return compactDate(params['from']) + '至' + compactDate(params['to']);
      }
      return '';
    case 'calorie.photo.add':
      return str('tag'); // 旧 body_photo_receipt：标签／首项内容
    case 'calorie.photo.tag': {
      const raw = params['tags'] ?? params['tag'];
      if (Array.isArray(raw)) {
        const tags = (raw as unknown[]).map(String).filter((t) => t.trim().length > 0);
        return tags.length > 0 ? tags.join('、') : ''; // 旧：'、'.join
      }
      return str('tag');
    }
    case 'calorie.product.add':
    case 'calorie.product.update':
      return str('productName', 'product_name'); // 旧 #284 Q2A：食品名
    case 'calorie.photo.gif':
      return str('tag'); // 旧 gif_planner：tag＋数量（数量需读库，记残留）
    default:
      return '';
  }
}
