/** #203 · HELP 产物的**唯一落盘点**（独占创建 ＋ `EEXIST` 递补 ＋ 绝对路径回执）。
 *
 * 归属＝结构裁定 `docs/skills/skill-schedule/t199-structure-verdict.md` §「消费共享 help 模板的技术路线」
 * 第 4 条：照 bill 的 `src/output.ts` 自持一份最小管线，只抄**需要的那一小块**
 * （`nextExclusiveCandidate`／`writeExclusiveWithRetry` ＋ `file` 态交付），不搬三态交付、分类表、
 * `key→中文 command`／动态段／回执落点——那些都是各自自己的产物模型。
 *
 * #128 的因果（照抄注释，别重演）：默认落点曾是「`readdirSync` 计数选名 → `writeFileSync`（`w` 覆盖）」
 * 两步，两步之间无独占性；多进程并发同秒都选同一路径 → 后写覆盖先写，用户按回执路径可能打开
 * 另一次调用的产物。修法：`flag:'wx'` 独占创建，`EEXIST` 时递增 `_N` 重试（原子，无需锁）。
 *  - 串行语义不变：首选仍是 `helpPaths.resolveStemTarget` 的初候选，首试即中 → 文件名与老版逐字一致；
 *  - 并发下由文件系统仲裁：败者 `EEXIST` → `_N+1` 重试，保证每个回执路径的内容就是本次产物；
 *  - 大小写不敏感（Windows `normcase`）由 `wx` 天然覆盖：`.HTML` 占位同样 `EEXIST`；
 *  - **仅** `EEXIST` 重试，其余错误原样抛出（不把权限／路径错伪装成「换个名再写一次」）。
 *
 * #83 返修 R-1 的教训（同抄）：回执路径必须 `resolve()` 归一为**绝对路径**——`SKILLS_DB_PATH`
 * 本身可以是相对路径，产物已写盘却把相对串回传给调用方，下游按它打开就会找不到（或找到别处的同名文件）。
 *
 * 写失败**不静默降级**（本票面第 3 条）：照本包 `src/render/errors.ts` 的既有形状抛
 * `ScheduleRenderError`（`code` 取该类型已有的 `'SCHEDULE_HTML_TOO_LARGE'`＝「体积／落盘门」那一条，
 * 不新增错误类、不改既有导出面），由出口 `cmd_read.ts` 走 exit 5 ＋ stderr 回执。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { ScheduleRenderError } from '../render/errors.js';

/** 落盘失败一律抛本包渲染层错误（`cause` 保留原始系统错，信息不丢）。 */
function writeFailed(path: string, e: unknown): never {
  if (e instanceof ScheduleRenderError) throw e;
  const code = (e as NodeJS.ErrnoException | undefined)?.code;
  const detail = (e as Error | undefined)?.message ?? String(e);
  throw new ScheduleRenderError('SCHEDULE_HTML_TOO_LARGE',
    '[skill-schedule] HELP 落盘失败：' + path + '（' + (code ? code + '：' : '') + detail + '）');
}

/** 下一独占候选（可单测）：`〈stem〉_<YYYYMMDD_HHMMSS>[_N].html` 的 `_N` 递增；无 `_N` 则 `_2`。 */
export function nextExclusiveCandidate(currentAbs: string): string {
  const dir = dirname(currentAbs);
  const base = currentAbs.slice(dir.length + 1);
  const m = base.match(/^(.*_\d{8}_\d{6})(?:_(\d+))?(\.html)$/i);
  if (m) {
    const prefix = m[1] as string;
    const n = m[2] !== undefined ? Number.parseInt(m[2] as string, 10) : 1;
    return join(dir, prefix + '_' + String(n + 1) + m[3]);
  }
  const dot = base.lastIndexOf('.');
  const stem = dot >= 0 ? base.slice(0, dot) : base;
  return join(dir, stem + '_2' + (dot >= 0 ? base.slice(dot) : ''));
}

/** 独占写 ＋ 递补（可单测）：`wx` 首试，`EEXIST` 则 `_N+1` 重试；目录不存在递归创建。 */
export function writeExclusiveWithRetry(initialAbs: string, html: string): string {
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
      writeFailed(candidate, e);
    }
  }
  /* istanbul ignore next — 1000 次独占重试全撞名：真故障，不静默失败。 */
  throw new ScheduleRenderError('SCHEDULE_HTML_TOO_LARGE',
    '[skill-schedule] HELP 落点独占创建重试超限：' + initialAbs);
}

/** 交付结果（`file` 态唯一；`path` 必为绝对路径；形状＝票面第 2 条的顶层 `delivery{mode,path,bytes}`）。 */
export interface HtmlDelivery {
  readonly mode: 'file';
  readonly path: string;
  readonly bytes: number;
}

/** 交付一次 HTML 产物（**唯一落盘点**）：
 *  - `explicit`（`--html <路径>`，用户逐字指定）→ **覆盖写**（`w`），语义与该参数既有口径一致（票面第 3 条）；
 *  - `target`（本次产物按通式算出的初候选）→ **独占创建 ＋ 递补**（#128）；
 *  - 两者都给时 `explicit` 优先（用户指定胜过默认落点；**逐字覆盖写，不带时间戳、不递补**）。
 *  只 `mkdirSync` 父目录，不做任何「写不进去就换形态」的兜底——失败抛错给调用方走 exit 5。 */
export function deliverHtml(input: { explicit?: string; target?: string; html: string }): HtmlDelivery {
  const bytes = Buffer.byteLength(input.html, 'utf8');
  if (input.explicit !== undefined && input.explicit.length > 0) {
    const written = resolve(input.explicit);
    try {
      mkdirSync(dirname(written), { recursive: true });
      writeFileSync(written, input.html, 'utf8');
    } catch (e) {
      writeFailed(written, e);
    }
    return { mode: 'file', path: written, bytes };
  }
  if (input.target === undefined || input.target.length === 0) {
    throw new ScheduleRenderError('SCHEDULE_HTML_TOO_LARGE',
      '[skill-schedule] deliverHtml 缺落点（`explicit` 与 `target` 至少给一个）');
  }
  const finalPath = writeExclusiveWithRetry(resolve(input.target), input.html);
  return { mode: 'file', path: finalPath, bytes };
}
