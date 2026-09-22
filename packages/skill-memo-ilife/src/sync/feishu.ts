// 取数层·飞书同步点（M2）：lark-cli 四门（存在+登录+写权限scope+端到端由调用方验收），缺失即 throw。
// 老家对照 script/feishu_sync.py：auth status 为身份真值源；auth check --scope 判授权；task 域同步心愿。
import { accessSync, constants } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { MemoFetchError } from '../shared/errors.js';

export const LARK_DEFAULT_TIMEOUT_MS = 30000;
export const LARK_WISH_SCOPE = 'task';

/** 飞书 CLI 官网（面板状态行与失败回执的链接目标，逐字显示见 `LARK_WEBSITE_LINE`）。 */
export const LARK_WEBSITE_URL = 'https://www.feishu.cn/feishu-cli' as const;

/** 面板「飞书 CLI」状态行三档都要逐字显示的官网行（定稿 #759 v5 口径，不改写、不加话）。
 *  显示成文字 ＋ 点一下新窗口跳转（插件侧 `LarkStatus` 落这一条）。 */
export const LARK_WEBSITE_LINE = '飞书CLI官网为：https://www.feishu.cn/feishu-cli' as const;

/** 复制安装指引按钮复制的正文（定稿 #759 v5，唯一真相处；作息管家共用同一段）。
 *  读者是 AI（人把它粘给一个 agent 去装机）：机器自己能给出的真值一律引原文，不转述。
 *  正文逐字，改一字先回定稿票 #759。 */
export const LARK_INSTALL_PROMPT = `在这台机器上安装并配置飞书 CLI（lark-cli）。你来推进，做完为止。

必须满足的终态（每条都要真跑，把命令原文和输出贴回来）：
1) lark-cli --version >= 1.0.82（更低的版本没有我们要用的 --no-wait）
2) where lark-cli（Windows）或 which lark-cli（macOS/Linux）能命中；Windows 上还要确认 %APPDATA%\\npm\\lark-cli.cmd 这个文件存在
3) lark-cli auth status 的输出里有 identities.user.openId
4) lark-cli auth check --scope task 退出码 0（连退出码一起贴）—— 备忘录要用任务域
5) lark-cli calendar +agenda 退出码 0（连退出码一起贴）—— 作息管家要读你的主日历
6) 技能侧也能用：跑一次作息管家的「飞书探测」（＝一条不落地的同步探测），不报「缺 CLI／未登录／日历不可达」

怎么做：
7) Node.js/npm 不可用就先装。
8) 安装：npm install -g @larksuite/cli。只装这个官方包（bin 名 lark-cli）；不要装 npm 上的 lark-cli。
9) 官方指南里的第二件事也照做：npx -y skills add https://open.feishu.cn --skill -y
10) 配置与登录照这两条走（都是 CLI 自己在 --help 里写给 AI agent 的写法，别改写成别的）：
    先初始化：lark-cli config init --new
      它会阻塞等你完成浏览器授权，所以起在后台、从它的输出里把验证链接捞出来
      （CLI 原文：Run it in the background and retrieve the verification URL from its output）；
      链接给我，我批准后你继续。
      如果它报 Inside an Agent context 之类被拒，照它的提示改用 lark-cli config bind。
    再授权：lark-cli auth login --no-wait --json --domain calendar,task
      它会立刻返回一个验证链接（或二维码）；把链接给我，我批准后你再用
      lark-cli auth login --device-code <拿到的 device code> 收尾。
    官方指南：https://open.feishu.cn/document/no_class/mcp-archive/feishu-cli-installation-guide.md
    子命令以 lark-cli auth --help / config --help 和官方文档为准，不要凭猜；做完要能过第 3、4、5 条。
11) npm 全局目录如果不在系统 PATH 上，把它加进系统 PATH（不是只在当前终端 export）。

怎么推进：
12) 除第 13 条那三类，其余你自己一口气做完，不要逐步问我确认：安装、改 PATH、重试、修报错都自己做完。
13) 只有这三类必须我介入；遇到就用 /wizard 生成脚本带我走，走完你接着自动往下做：
    ① 浏览器里的初始化授权 / 登录（把验证链接或二维码给我）；
    ② 系统权限提示（管理员/sudo）；
    ③ Node.js 需要我先定怎么装。
14) 任何一步失败：自己按报错修；修不动再一次性告诉我「卡在哪、报错原文、需要我做什么」。

参考官网：https://www.feishu.cn/feishu-cli` as const;

/** 失败回执上带的安装指引（与复制按钮同一内容）：prompt 全文 ＋ 官网行。 */
export interface LarkSetupInfo {
  readonly prompt: string;
  readonly websiteLine: string;
}

/** 取一份安装指引（单点构造，调用方只 spread 它）。 */
export function larkSetupInfo(): LarkSetupInfo {
  return { prompt: LARK_INSTALL_PROMPT, websiteLine: LARK_WEBSITE_LINE };
}

// 跨平台定位（#760 起**无显式配置覆盖**：`lark.cliPath` 键已删，检测不到就提示＋复制安装指引）。
// 候选＝既有 5 档（Windows npm 全局 → where／which → 两条固定路径）＋ #760 补注的 4 条
// （scoop 家目录派生 exe／cmd、`/opt/homebrew/bin`、家目录 `.npm-global/bin`、家目录 `.local/bin`，
// 一律 `os.homedir()` 派生，不读 `%APPDATA%`／`$HOME`）；**与作息管家那张表逐条相同**（跨包锁进 #758）。
// `src/cli/health/probe.ts` 里那份只读副本只用前 5 档，不进锁（体检不落盘，调 `loadMemoConfig` 会落默认配置）。
// 找不到返 null（不抛，larkReady 抛）。#695 起环境变量读取已删（`LARK_CLI_PATH` 与 `APPDATA` 全删）。
export function findLarkCli(): string | null {
  if (process.platform === 'win32') {
    const home = homedir();
    const cand = join(home, 'AppData', 'Roaming', 'npm', 'lark-cli.cmd');
    try { accessSync(cand, constants.X_OK); return cand; } catch { /* 继续 */ }
    try {
      // `where` 常把无扩展名的 npm shim 排在前面——那份经 CreateProcess 调不动（ENOENT），
      // 故优先 `.cmd`／`.exe` 行；都没有才回第一行（#760 实测：本机 `where` 首行即无扩展名那份）。
      const lines = execFileSync('where', ['lark-cli'], { stdio: 'pipe', encoding: 'utf8' })
        .split(/\r?\n/).map((s) => s.trim()).filter((s) => s !== '');
      const runnable = lines.find((l) => /\.(cmd|exe)$/i.test(l));
      if (runnable !== undefined) return runnable;
      if (lines[0] !== undefined) return lines[0];
    } catch { /* 继续 */ }
    for (const extra of [
      join(home, 'AppData', 'Local', 'Programs', 'lark-cli', 'lark-cli.exe'),
      join(home, 'AppData', 'Local', 'Programs', 'lark-cli', 'lark-cli.cmd'),
    ]) {
      try { accessSync(extra, constants.X_OK); return extra; } catch { /* 继续 */ }
    }
  } else {
    try {
      const out = execFileSync('which', ['lark-cli'], { stdio: 'pipe', encoding: 'utf8' }).trim();
      if (out) return out.split('\n')[0];
    } catch { /* 继续 */ }
  }
  const home = homedir();
  for (const cand of [
    '/opt/homebrew/bin/lark-cli',
    join(home, '.npm-global', 'bin', 'lark-cli'),
    join(home, '.local', 'bin', 'lark-cli'),
    '/usr/local/bin/lark-cli',
    '/usr/bin/lark-cli',
  ]) {
    try { accessSync(cand, constants.X_OK); return cand; } catch { /* 继续 */ }
  }
  return null;
}

export interface LarkRunOk { ok: true; stdout: string; }
export interface LarkRunDenied { ok: false; exit: number | null; stderr: string; }

// 调 lark-cli：超时/缺失 throw；非 0 退出返 ok:false（供 scope 判定），不抛。
// Windows 的 lark-cli 本体即 .cmd（老家实证 %APPDATA%/npm/lark-cli.cmd），直 spawn 报 EINVAL，故经 cmd.exe /c 中转。
// `cwd` 可选（授权 QR 那条要进目录执行，老 `feishu_auth_helper.py` 同形）。
export function runLark(cli: string, args: string[], timeoutMs = LARK_DEFAULT_TIMEOUT_MS, cwd?: string): LarkRunOk | LarkRunDenied {
  let file = cli;
  let argv = args;
  if (process.platform === 'win32' && /\.cmd$/i.test(cli)) {
    file = 'cmd.exe';
    argv = ['/d', '/s', '/c', cli, ...args];
  }
  try {
    const out = execFileSync(file, argv, { cwd, stdio: 'pipe', encoding: 'utf8', timeout: timeoutMs });
    return { ok: true, stdout: out };
  } catch (e) {
    const err = e as { code?: unknown; status?: number | null; stderr?: unknown; message?: string };
    if (err.code === 'ENOENT') throw new MemoFetchError('LARK_UNAVAILABLE', '飞书命令行工具不可用：程序无法启动');
    if (err.code === 'ETIMEDOUT') throw new MemoFetchError('LARK_TIMEOUT', '飞书命令行工具超时：命令没在时限内返回');
    return { ok: false, exit: err.status ?? null, stderr: String(err.stderr ?? err.message ?? e) };
  }
}

export function larkVersion(cli: string): string {
  const r = runLark(cli, ['--version'], 10000);
  if (!r.ok) return 'unknown';
  return r.stdout.trim().split('\n')[0] || 'unknown';
}

// 身份真值源：auth status 输出 identities.user.openId；无 openId 即未登录 throw。
export function authOpenId(cli: string): string {
  const r = runLark(cli, ['auth', 'status']);
  if (!r.ok) throw new MemoFetchError('LARK_NOT_LOGGED_IN', '飞书登录状态查询失败：可能还没登录，先登录一次');
  let j: unknown = null;
  try { j = JSON.parse(r.stdout); }
  catch { throw new MemoFetchError('LARK_BAD_RESPONSE', '飞书登录状态读不出内容：先按安装指引重新登录一次'); }
  const id = (j as { identities?: { user?: { openId?: unknown } } }).identities?.user?.openId;
  if (typeof id !== 'string' || id.length === 0) {
    throw new MemoFetchError('LARK_NOT_LOGGED_IN', '飞书未登录：登录状态里没有你的身份，先登录一次');
  }
  return id;
}

// 写权限门：auth check --scope exit 0=已授权。
export function checkScope(cli: string, scope: string): boolean {
  return runLark(cli, ['auth', 'check', '--scope', scope]).ok;
}

export interface LarkReady { cliPath: string; version: string; openId: string; }

// 四门全绿才取数：存在→版本→登录→scope；任一红 throw（调用方阻断，不返空）。
export function larkReady(scope = LARK_WISH_SCOPE): LarkReady {
  const cli = findLarkCli();
  if (!cli) throw new MemoFetchError('LARK_UNAVAILABLE', '飞书命令行工具未找到：这一步要它，先按安装指引装好');
  const version = larkVersion(cli);
  const openId = authOpenId(cli);
  if (!checkScope(cli, scope)) throw new MemoFetchError('LARK_DENIED', '飞书授权不足：这一步要的权限还没给，重新授权时请一并勾上');
  return { cliPath: cli, version, openId };
}

/** 面板「飞书 CLI」状态行的三档（判据由技能侧出，面板只显示，定稿 #759）：
 *  missing＝没找到 CLI；partial＝找到了但没登录／没 task 权限；full＝就绪（路径＋版本）。 */
export type LarkTier = 'missing' | 'partial' | 'full';

export interface LarkTierInfo {
  readonly tier: LarkTier;
  /** 找到的 CLI 绝对路径（missing 时为 null）。 */
  readonly cliPath: string | null;
  /** `lark-cli --version` 原文（missing 时为 null；partial 时也照实给，面板按档决定显不显示）。 */
  readonly version: string | null;
}

/** 探一遍三档：CLI 都不在就停在第 1 档，不往下起子进程试登录。**不抛**——面板与回执要的是状态，不是异常。
 *  调不动的候选（无扩展名 shim 之类 ENOENT）按 partial 计（找得到条目但用不了≈没登录那一档的黄），
 *  绝不把一次探测变成 `memo.config.read` 的 exit 1。 */
export function larkTierInfo(scope = LARK_WISH_SCOPE): LarkTierInfo {
  let cli: string | null = null;
  try {
    cli = findLarkCli();
  } catch {
    cli = null;
  }
  if (cli === null) return { tier: 'missing', cliPath: null, version: null };
  let version = 'unknown';
  try {
    version = larkVersion(cli);
  } catch {
    return { tier: 'partial', cliPath: cli, version };
  }
  let openId = '';
  try {
    openId = authOpenId(cli);
  } catch {
    return { tier: 'partial', cliPath: cli, version };
  }
  if (openId === '') return { tier: 'partial', cliPath: cli, version };
  try {
    return checkScope(cli, scope)
      ? { tier: 'full', cliPath: cli, version }
      : { tier: 'partial', cliPath: cli, version };
  } catch {
    return { tier: 'partial', cliPath: cli, version };
  }
}

export function fetchIndex(): string[] { return ['db', 'feishu']; }
