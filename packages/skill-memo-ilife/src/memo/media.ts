// 口径层·附件（#712）：附件目录 = 一个绝对路径值；附件路径 = 真包含判定。老实现见仓外
// `备忘录/script/memo_cli.py:106-116` 的 `_resolve_media_path`——它把配置值当**字符串前缀**比对，
// 于是 `mediafoo/x.jpg` 被误放行（`media` 是 `mediafoo` 的开头），
// `media/../../C:/Windows/x.jpg` 也被放行并原样存下来（恰恰拦不住它本来要拦的那件事）。
//
// 现在的三条口径：
//   1. 附件目录解析成**绝对路径**，并**必须真的存在**且是个目录；取不到／指向不存在的地方
//      ⇒ 抛错并给出人话原因（读哪个值、该在哪配），绝不静默降级成「按开头比对」；
//   2. 传入路径与附件目录**都归一成绝对路径**，算相对路径；相对路径为空（＝配置指的目录自己）、
//      以 `..` 开头（穿出去了）、或是绝对路径（换盘）⇒ 拒。
//      **相对输入按附件目录解**（附件就住那儿），老技能那种以配置值开头的写法（`media/x.jpg`）
//      照样认——认的方式是去掉开头那一段目录名，而不是老实现那种「切字符串前缀」；
//      绝对输入照绝对路径算。
//   3. 存进数据库的仍是相对路径（`notes.media_path` 这一列的取值形状一字不改），故老数据
//      （相对路径）不用迁——本票只改路径的**判定**，不改那个列的**取值形状**。
//
// 「附件目录」这个配置项的**取值口**就是这一件里的 `resolveMediaDir()`：**#695 起读配置文件**
// （`~/.ilife/memo.yaml` 的 `media.dir`；#760 起空串＝`<数据目录>/media`，定稿 #759）。
// 环境变量读取已按用户裁决删除。
import { statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { MemoPolicyError } from '../shared/errors.js';
import { loadMemoConfig } from '../config.js';
import { mediaDirOf } from '../fetch/paths.js';

/** 附件路径不在附件目录内时的错码（口径层的坏输入）。 */
const CODE = 'POLICY_BAD_INPUT' as const;

function bad(message: string): never {
  throw new MemoPolicyError(CODE, message);
}

/** 当前配到的附件目录（人话报错要指它）：配置项 `media.dir`，空串＝`<数据目录>/media`（#760）。
 *  返回的是**解析后的绝对路径**（与 `resolveMediaDir()` 同一算式，只是不判存在）。 */
export function mediaDirText(): string {
  const cfg = loadMemoConfig();
  return mediaDirOf(cfg.dataDir, cfg.values.media.dir);
}

/**
 * 附件目录：解析成绝对路径并确认它真的在。三条都抛 `POLICY_BAD_INPUT`：
 * 目录不存在／那个位置不是目录（含 UNC 与坏盘符）／路径本身为空。
 */
export function resolveMediaDir(): string {
  const abs = mediaDirText();
  let st;
  try {
    st = statSync(abs);
  } catch {
    bad(
      '附件目录不存在：' + abs + '（取自配置项 media.dir，空串＝<数据目录>/media）——' +
        '请把 ~/.ilife/memo.yaml 里的 media.dir 指向一个已存在的附件目录，或先把目录建出来；' +
        '本技能不替你建目录，也不退回按路径开头比对',
    );
  }
  if (!st.isDirectory()) bad('附件目录不是目录：' + abs + '——media.dir 要指向目录，不是文件');
  return abs;
}

/** 相对路径是否「从属且不穿出去」：空串＝就是目录自己（不算包含），`..` 开头＝在外面，绝对＝换盘。 */
function contains(rel: string): boolean {
  return rel !== '' && rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel);
}

/** 传入路径 → 绝对路径。相对值按**当前工作目录**解（老实现就是拿配置值去比调用面递进来的路径，
 *  故「同开头不同目录」必须解到外面去才拦得住）；老写法那种以目录名开头的相对值（`media/x.jpg`）
 *  照旧认——认法是去掉那一段目录名再按附件目录解，不是老实现那种切字符串前缀。 */
function absoluteOf(input: string, dir: string, dirText: string): string {
  if (isAbsolute(input)) return resolve(input);
  const head = dirText.split(/[\\/]+/).filter((s) => s !== '').pop() ?? '';
  const lead = head + '/';
  return head !== '' && (input.startsWith(lead) || input.startsWith(head + '\\'))
    ? resolve(dir, input.slice(lead.length))
    : resolve(input);
}

/**
 * 附件路径 → 落库的相对路径。空值＝无附件（回 `null`）。拒绝的三种：
 * 不在附件目录内（含同开头不同目录）、带 `..` 穿出去、附件目录自己。
 */
export function normalizeMediaPath(v: unknown): string | null {
  if (!v) return null;
  if (typeof v !== 'string') bad('附件须为文本路径');
  const dir = resolveMediaDir();
  const rel = relative(dir, absoluteOf(v, dir, mediaDirText()));
  if (!contains(rel)) {
    bad('附件路径不在附件目录内：' + v + '（附件目录：' + dir + '）——请给附件目录内的路径，不用 .. 穿出去');
  }
  return rel;
}
