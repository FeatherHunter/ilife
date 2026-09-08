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
import { mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { CALORIE_COMBOS } from './cli/keys.js';
import { CalorieRenderError } from './render/errors.js';
import { resolveDbDir } from './paths.js';

export const HTML_DIR_NAME = 'calorie_html';
export const HTML_EXT = '.html';

/** 旧版 `_sanitize_filename_part` 逐字复刻：非法字符 → `_`、trim、截断 32 字符（按字符，中文/emoji 安全）。 */
export function sanitizeFilenamePart(text: string | null | undefined): string {
  if (text === null || text === undefined) return '';
  let s = String(text).trim();
  for (const ch of '\\/:*?"<>|[]') s = s.split(ch).join('_');
  return s.slice(0, 32);
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

/** 同秒冲突计数：`<command>_<stamp>*.html`（旧版 `glob` 语义；目录不存在视为 0）。 */
function countSameSecond(dir: string, command: string, stamp: string): number {
  let names: readonly string[];
  try {
    names = readdirSync(dir);
  } catch {
    return 0;
  }
  const prefix = command + '_' + stamp;
  return names.filter((n) => n.startsWith(prefix) && n.endsWith(HTML_EXT)).length;
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

/** 旧版 `html_path()`：`<SKILLS_DB_PATH>/calorie_html/<中文command>_<stamp>[_N].html`（完整可写路径）。 */
export function resolveDefaultHtmlPath(key: string, opts: { now?: Date; dbDir?: string } = {}): string {
  const d = htmlDir(opts.dbDir ?? resolveDbDir());
  const name = htmlFileName(chineseCommandFor(key), { dir: d, now: opts.now ?? new Date() });
  return join(d, name);
}

/** 显式 `--output` / `--html` 落点：命名规则不参与，只保证父目录存在。 */
export function resolveExplicitHtmlPath(file: string): string {
  mkdirSync(dirname(file), { recursive: true });
  return file;
}
