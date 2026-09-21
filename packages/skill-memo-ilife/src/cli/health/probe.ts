/** 配置体检 · **机器面探针**（票 #706 判据，票 #855 从这里分件出来）。
 *
 * 只四件事，每条都**只报不改**：目录在不在／能不能写（写探针当场删）／包内模板件数／库文件表数，
 * 外加飞书 CLI 的三档只读探测。凡是要建目录才算得出的结论，一律当「不在」报。
 *
 * 谁在用：`src/cli/health/items.ts`（九条体检项）。
 */
import { accessSync, constants, existsSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

/** 库表数门槛：老库 `init.sql` 两张业务表（`notes`＋`reminders`），新建库时由老技能建。 */
export const DB_TABLE_THRESHOLD = 2 as const;

/** 飞书写权限那一道门要的 scope（与 `src/sync/feishu.ts` 目标态的 `LARK_WISH_SCOPE` 同值）。 */
const LARK_SCOPE = 'task' as const;

/** 探测两档超时（与飞书链的 30 秒同档；`auth status` 走它自己的短档）。 */
const LARK_AUTH_TIMEOUT_MS = 15000 as const;

/** 包根：`dist/cli/health/probe.js` 往上三级。 */
export function packageRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
}

/** 人话里的路径一律用正斜杠：报告给页面看，也让跨平台读数可比。 */
export function p(path: string): string {
  return path.replace(/\\/g, '/');
}

/** 目录那一项的形状是**段串**（默认 `memo_html` 一段），段数与 `src/config.ts` 自己的
 *  `splitDirSegments` 同一口径。本件不 import 它：health 面与配置面互锁没有好处，而这条规则只有三行。 */
export function splitDirSegments(value: string): string[] {
  return value.split(/[\\/]+/).filter((s) => s.length > 0);
}

/** 目录项：在不在 ＋ 能不能写。 */
export interface DirVerdict {
  readonly exists: boolean;
  readonly writable: boolean;
  readonly reason: string;
}

/** 目录能不能写：建一个探针文件再删掉（老技能三家同一套做法）。**不建目录本身**。 */
function writeProbe(dir: string): { readonly ok: boolean; readonly reason: string } {
  const probe = join(dir, '.ilife-health-probe-' + String(process.pid) + '-' + String(Date.now()));
  try {
    writeFileSync(probe, 'probe', { encoding: 'utf8', flag: 'wx' });
    unlinkSync(probe);
    return { ok: true, reason: '' };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

/** 已算过的目录结论按路径记一份：同一份报告里同一个目录不重复起写探针。 */
const dirMemo = new Map<string, DirVerdict>();

export function dirVerdict(dir: string): DirVerdict {
  const memoized = dirMemo.get(dir);
  if (memoized !== undefined) return memoized;
  const verdict = dirVerdictUncached(dir);
  dirMemo.set(dir, verdict);
  return verdict;
}

function dirVerdictUncached(dir: string): DirVerdict {
  if (!existsSync(dir)) return { exists: false, writable: false, reason: '' };
  try {
    if (!statSync(dir).isDirectory()) return { exists: false, writable: false, reason: '同名文件占了它的位置' };
  } catch (e) {
    return { exists: false, writable: false, reason: e instanceof Error ? e.message : String(e) };
  }
  const probe = writeProbe(dir);
  return { exists: true, writable: probe.ok, reason: probe.reason };
}

/** 模板件数：把 `templates/` 数一遍（只数 `.html`，含子目录；读不出来的子树按 0 计）。
 *  报文里给这个数，是为了让「包内模板目录在不在」这句话能自证——件数对不上就是包装不完整。 */
export function templateFileCount(dir: string): number {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  let out = 0;
  for (const entry of entries) {
    out += entry.isDirectory()
      ? templateFileCount(join(dir, entry.name))
      : (entry.name.endsWith('.html') ? 1 : 0);
  }
  return out;
}

/** 开库读表数（只读打开，不建库、不迁移）。打不开即当作「读不出」。 */
export function tableCount(file: string): { readonly ok: boolean; readonly count: number; readonly reason: string } {
  let db: DatabaseSync | null = null;
  try {
    db = new DatabaseSync(file, { readOnly: true });
    const rows = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name?: unknown }>;
    const names = rows.map((row) => String(row.name ?? '')).filter((name) => name !== '' && !name.startsWith('sqlite_'));
    return { ok: true, count: names.length, reason: '' };
  } catch (e) {
    return { ok: false, count: 0, reason: e instanceof Error ? e.message : String(e) };
  } finally {
    try {
      db?.close();
    } catch {
      /* 关不掉不影响结论 */
    }
  }
}

/** lark-cli 在哪：只读探测（不 import 飞书链的 `findLarkCli`——那份是 9 档，本件这份**只用前 5 档**，
 *  不进锁）。5 档＝Windows npm 全局 → `where`／`which` → 两条固定路径；找不到返 null（不抛）。
 *  本件「只报不改」：文件不在时不落默认配置（`loadMemoConfig` 会落盘，故这里不调它）。 */
export function findLarkCli(configured: string): string | null {
  if (configured !== '') {
    try {
      accessSync(configured, constants.X_OK);
      return configured;
    } catch {
      return null;
    }
  }
  if (process.platform === 'win32') {
    const cand = join(homedir(), 'AppData', 'Roaming', 'npm', 'lark-cli.cmd');
    try { accessSync(cand, constants.X_OK); return cand; } catch { /* 继续 */ }
    try {
      // 与飞书链同一条 `where` 行选择（无扩展名 shim 调不动，优先 `.cmd`／`.exe`）。
      const lines = execFileSync('where', ['lark-cli'], { stdio: 'pipe', encoding: 'utf8' })
        .split(/\r?\n/).map((s) => s.trim()).filter((s) => s !== '');
      const runnable = lines.find((l) => /\.(cmd|exe)$/i.test(l));
      if (runnable !== undefined) return runnable;
      if (lines[0] !== undefined) return lines[0];
    } catch { /* 继续 */ }
  } else {
    try {
      const out = execFileSync('which', ['lark-cli'], { stdio: 'pipe', encoding: 'utf8' }).trim();
      if (out) return out.split('\n')[0];
    } catch { /* 继续 */ }
  }
  for (const cand of ['/usr/local/bin/lark-cli', '/usr/bin/lark-cli']) {
    try { accessSync(cand, constants.X_OK); return cand; } catch { /* 继续 */ }
  }
  return null;
}

/** 调一次 lark-cli（只读子命令）：同一套 Windows `cmd.exe /d /s /c` 中转（`.cmd` 直 spawn 报 EINVAL）。
 *  失败一律回 `{ok:false}`，**不抛**——体检不许因为探测失败而崩。 */
function runLark(cli: string, args: string[], timeoutMs: number): { readonly ok: boolean; readonly stdout: string } {
  let file = cli;
  let argv = args;
  if (process.platform === 'win32' && /\.cmd$/i.test(cli)) {
    file = 'cmd.exe';
    argv = ['/d', '/s', '/c', cli, ...args];
  }
  try {
    return { ok: true, stdout: execFileSync(file, argv, { stdio: 'pipe', encoding: 'utf8', timeout: timeoutMs }) };
  } catch {
    return { ok: false, stdout: '' };
  }
}

/** 飞书三档：找不到 CLI＝missing；找得到但没登录／没授权＝partial；登录且 task 域可写＝full。
 *  能探测到哪一档就报哪一档——CLI 都不在就停在第 1 档，**不往下起子进程试登录**。 */
export function larkTier(cli: string | null): 'missing' | 'partial' | 'full' {
  if (cli === null) return 'missing';
  const status = runLark(cli, ['auth', 'status'], LARK_AUTH_TIMEOUT_MS);
  if (!status.ok) return 'partial';
  let openId = '';
  try {
    const j = JSON.parse(status.stdout) as { identities?: { user?: { openId?: unknown } } };
    const id = j.identities?.user?.openId;
    if (typeof id === 'string') openId = id;
  } catch {
    return 'partial';
  }
  if (openId === '') return 'partial';
  return runLark(cli, ['auth', 'check', '--scope', LARK_SCOPE], LARK_AUTH_TIMEOUT_MS).ok ? 'full' : 'partial';
}
