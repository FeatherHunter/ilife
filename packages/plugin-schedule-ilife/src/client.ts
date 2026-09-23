/** dsh-schedule-ilife client 适配器（六边形：port=contract，adapter=本文件）。
 *
 * 产物经 tsdown 打成 loader 工厂包（browser/CJS，见 tsdown.config.ts）。
 * 本文件传递闭包：禁 node、禁 DOM 直写（document/window/process）。
 * 注册一处：**技能设置页** → 爱生活页签槽（总管声明的 children，各技能自研自家配置页）。
 * 取数只经 connection.rpc.call 进 host 通道；缺席/错误纯条件渲染，不返空冒充。
 * 组件 React.createElement 手写，不引入 JSX。
 *
 * #909：设置页本体（样式表／行渲染／卡片骨架／状态机／取值与填值／配置面三通电话／
 * 目录选择入口）**收进共用件** `dsh-life-pack/config-panel`，本文件只留四处接线：
 *   ① 行表（住 `settings.ts`——那是本家自己的配置数据，不是 UI）；
 *   ② 通道路由名（`RPC_CHANNEL`，本家唯一那个真变量）；
 *   ③ 三个可选钩子（卡片标题／跟随映射／自家附加块＝「飞书 CLI」状态行）；
 *   ④ 两格宿主取数接线（`getCall`／`getService`）。
 * 本家**不再有**设置页的样式表与行渲染函数：改一次共用面板，六家一起变；
 * 附加块的视觉走面板经插槽传进来的样式（`PanelParts.styles`），不另外抄一份。
 * 照 CONTEXT.md，「技能设置页」只配置、不干活：本页没有记作息／看时间轴之类的入口。
 */
import * as React from 'react';
import { ConfigPanel, StatusBlock } from 'dsh-life-pack/config-panel';
import { RPC_CHANNEL, RPC_ENDPOINT_CONFIG_CHECK, isRpcResult } from './contract.js';
import { PLUGIN, SLOT_ORDER, SLOT_TITLE } from './slot.js';
import { CONFIG_ITEMS } from './settings.js';
import type { ClientCtx, RpcCallFace } from './dsh-ctx.js';

/** client 短名声明：只有这两个（#736 的目录选择走**可选查找**，不写进来——
 * 写进来＝硬依赖，提供方缺席时整包被停靠，设置页会跟着装不上；见 cookbook §13）。 */
export const inject: readonly string[] = ['slots', 'connection'];

/** 调用口取用器：每次取数时现取（connection 后到也不永久缺席）。 */
export type GetCall = () => unknown;

/** 请求超时毫秒：与 host 侧 SPAWN_TIMEOUT_MS 同级，UI 永不无限转圈。 */
export const READ_TIMEOUT_MS = 20_000 as const;

/** 体检回执 / 失败落字（本家附加块那一通电话；永不抛）。 */
export type HealthOutcome =
  | { readonly ok: true; readonly report: unknown }
  | { readonly ok: false; readonly message: string };

/** 读一次配置体检（只读；判据由技能侧出，本包只透传，不重写一个字）。 */
export async function fetchHealthSurface(call: unknown): Promise<HealthOutcome> {
  if (typeof call !== 'function') return { ok: false, message: '宿主连接缺席：connection.rpc.call 不可用' };
  try {
    const raw: unknown = await (call as RpcCallFace)('/api', RPC_CHANNEL.slice(1), { method: RPC_ENDPOINT_CONFIG_CHECK, payload: {} }, AbortSignal.timeout(READ_TIMEOUT_MS));
    if (!isRpcResult(raw)) return { ok: false, message: '回执信封异常（非 ok 信封）' };
    if (!raw.ok) return { ok: false, message: raw.error?.message ?? '体检回执被拒（宿主未给报文）' };
    return { ok: true, report: raw.value };
  } catch (e) {
    if (e instanceof Error && (e.name === 'AbortError' || e.name === 'TimeoutError')) {
      return { ok: false, message: `配置请求超时（${Math.round(READ_TIMEOUT_MS / 1000)}s）：宿主未回` };
    }
    return { ok: false, message: `体检失败：${e instanceof Error ? e.message : String(e)}` };
  }
}

/** 体检报告里「飞书 CLI」那一项的最小形状（面板只读这三格，不认全报告）。 */
export interface HealthItemLite {
  readonly id: string;
  readonly status: string;
  readonly message: string;
  readonly action: string;
}

/** 从体检报告里挑出 `lark.cli` 那一项；形状不对回 null（不抛）。 */
export function larkItemOf(report: unknown): HealthItemLite | null {
  if (typeof report !== 'object' || report === null) return null;
  const items = (report as { items?: unknown }).items;
  if (!Array.isArray(items)) return null;
  for (const it of items) {
    if (typeof it !== 'object' || it === null) continue;
    const rec = it as Record<string, unknown>;
    if (rec['id'] !== 'lark.cli') continue;
    if (typeof rec['id'] !== 'string' || typeof rec['status'] !== 'string' || typeof rec['message'] !== 'string') return null;
    return { id: rec['id'], status: rec['status'], message: rec['message'], action: typeof rec['action'] === 'string' ? rec['action'] : '' };
  }
  return null;
}

/** 飞书 CLI 官网（面板状态行与安装 prompt 里的同一地址，唯一定义地是这里）。 */
export const LARK_OFFICIAL_URL = 'https://www.feishu.cn/feishu-cli' as const;

/** 状态行上逐字显示的那一行（三档都在、显示成文字、可点击跳转，不改写、不加话）。 */
export const LARK_OFFICIAL_LINE = '飞书CLI官网为：https://www.feishu.cn/feishu-cli' as const;

/** 「复制 prompt」按钮复制的内容（定稿住 #759 最新一条评论 v5 的逐字全文，两家的实施票都引它，
 *  不在本票里另写一份；官网指南 shape 变化时改 #759 那一条，这里跟着换）。 */
export const LARK_PROMPT_V5 = `在这台机器上安装并配置飞书 CLI（lark-cli）。你来推进，做完为止。

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

参考官网：https://www.feishu.cn/feishu-cli`;

/** 复制的依赖注入（浏览器剪贴板缺席时只走兜底；两格都没有即回 false，不抛）。 */
export interface CopyDeps {
  readonly clipboard?: { writeText(text: string): Promise<void> } | undefined;
  readonly execCopy?: ((text: string) => boolean) | undefined;
}

/** 复制一段文本：先剪贴板，不成再走兜底（永不抛，回是否成功）。 */
export async function copyText(text: string, deps: CopyDeps = {}): Promise<boolean> {
  if (deps.clipboard !== undefined) {
    try {
      await deps.clipboard.writeText(text);
      return true;
    } catch { /* 走兜底 */ }
  }
  if (deps.execCopy !== undefined) {
    try {
      return deps.execCopy(text);
    } catch {
      return false;
    }
  }
  return false;
}

/** 当刻环境的剪贴板（经 `globalThis` 懒取：顶层不碰 DOM，loader 沙箱与 node 单测都不炸；拿不到回 null）。 */
export function clipboardOf(): { writeText(text: string): Promise<void> } | null {
  try {
    const nav = (globalThis as { navigator?: { clipboard?: { writeText(text: string): Promise<void> } } }).navigator;
    return nav?.clipboard ?? null;
  } catch {
    return null;
  }
}

/** 跟随映射（#863）：触发键一脏，这些只读派生行就进“将跟随更新”态。纯函数，面板与单测共用。 */
const DB_FOLLOWERS: readonly string[] = ['db.name', 'html.dir'];

/** 脏键 → 跟随行（#863 纯函数，交给共用面板当钩子）。 */
export function followKeysOf(dirtyKeys: readonly string[]): readonly string[] {
  return dirtyKeys.includes('db.dir') ? [...DB_FOLLOWERS] : [];
}

/** 附加块照面板的视觉写（不各写一套内联样式）：这里只声明本块真用到的那几格，
 *  样式表本身由共用面板经插槽传进来（`PanelParts.styles`）。面板改视觉，本块跟着变。 */
export interface PanelStyleSlots {
  readonly rows?: React.CSSProperties | undefined;
  readonly label?: React.CSSProperties | undefined;
  readonly muted?: React.CSSProperties | undefined;
  readonly okText?: React.CSSProperties | undefined;
  readonly error?: React.CSSProperties | undefined;
  readonly hint?: React.CSSProperties | undefined;
  readonly info?: React.CSSProperties | undefined;
  readonly bar?: React.CSSProperties | undefined;
  readonly btn?: React.CSSProperties | undefined;
}

/** 飞书状态行的三档读数（`reading` ＝ 体检回执新交的 `lark` 格，带路径与短版本号；旧技能包为 null）。 */
type LarkReading =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly item: HealthItemLite; readonly reading: LarkCell | null }
  | { readonly kind: 'failed'; readonly message: string };

/** 体检回执里 `lark` 那一格的形状（#936 技能侧交）。 */
type LarkCell = { readonly tier: string; readonly cliPath: string | null; readonly version: string | null };

/** 「飞书 CLI」状态行（#764 定稿 #761；**#936 起照真源 `.ic-status` 画**）：不是配置项——
 *  三档读数由技能侧体检出，面板只显示；**形状由共用件的 `StatusBlock` 给**（两家同形）。
 *  两枚按钮的字面照真源：左「复制安装指引」、右「重新检测」。骨架期画「检测中」＋ 路径位骨架条、
 *  两枚按钮照画 ⇒ 与就绪态同高（真源 `planRows()` 的口径：骨架期就定行高，填充时不跳）。
 *
 * 为什么单起一个组件：这通体检电话是本家自己的（共用面板不认识 `config.check` 的回执），
 * 组件自己持读数与「复制回执」两点状态，面板只管把它画进插槽。 */
function LarkLine(props: { readonly getCall: GetCall; readonly styles: PanelStyleSlots }): React.ReactElement {
  const [lark, setLark] = React.useState<LarkReading>({ kind: 'loading' });
  const [copied, setCopied] = React.useState<'idle' | 'done' | 'failed'>('idle');

  const loadHealth = React.useCallback(async (): Promise<void> => {
    setLark({ kind: 'loading' });
    const r = await fetchHealthSurface(props.getCall());
    if (!r.ok) {
      setLark({ kind: 'failed', message: r.message });
      return;
    }
    const item = larkItemOf(r.report);
    setLark(
      item === null
        ? { kind: 'failed', message: '体检回执里没有飞书 CLI 那一项' }
        : { kind: 'ready', item, reading: r.report.lark ?? null },
    );
  }, [props.getCall]);

  React.useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  /** 「复制 prompt」：剪贴板不在就报失败，不抛（按钮三档都在，见 #761 定稿）。 */
  const onCopyPrompt = async (): Promise<void> => {
    const ok = await copyText(LARK_PROMPT_V5, { clipboard: clipboardOf() ?? undefined });
    setCopied(ok ? 'done' : 'failed');
  };

  if (lark.kind === 'loading') {
    // 骨架期照真源：状态点默认灰 ＋「检测中」＋ 路径位骨架条 ＋ 版本胶囊不画；两枚按钮**照画**
    // ⇒ 与就绪态同高，填充时不跳（真源 `planRows()` 的口径）。
    return React.createElement(StatusBlock, {
      name: '飞书 CLI',
      tone: 'pending',
      // 真源在「检测中」后面带一个省略号，本仓有一条跨包锁（控件文案零省略号，`t764` 的 E 组）⇒
      // 这里去掉那一个字符，是本件与真源唯一的字面差（已记账）。
      text: '检测中',
      path: null,
      version: null,
      actions: [
        { text: '复制安装指引', onPress: () => void onCopyPrompt() },
        { text: '重新检测', onPress: () => void loadHealth() },
      ],
      link: { text: LARK_OFFICIAL_LINE, href: LARK_OFFICIAL_URL },
    });
  }
  if (lark.kind === 'failed') {
    return React.createElement(StatusBlock, {
      name: '飞书 CLI',
      tone: 'bad',
      text: lark.message,
      path: '',
      actions: [{ text: '重新检测', onPress: () => void loadHealth() }],
      link: { text: LARK_OFFICIAL_LINE, href: LARK_OFFICIAL_URL },
    });
  }
  const item = lark.item;
  const reading = lark.reading;
  return React.createElement(
    'div',
    null,
    React.createElement(StatusBlock, {
      name: '飞书 CLI',
      // 档位与真源同：绿点＝就绪／红点＝没找到／黄点＝找到了但还差点什么。
      tone: item.status === 'green' ? 'ok' : item.status === 'red' ? 'bad' : 'warn',
      // 短句按档给（真源 `.ic-stxt` 就是一行短句）；「去哪修」那句长话不在这一行里。
      text:
        item.status === 'green'
          ? '已登录，日历可读'
          : item.status === 'red'
            ? '没找到飞书 CLI'
            : '找到了，但还没登录／日历读不到',
      // 路径与版本胶囊取体检回执新交的那一格（#936 技能侧）；旧技能包不带 ⇒ 路径空、无胶囊。
      path: reading?.cliPath ?? '',
      version: reading?.version ?? null,
      actions: [
        { text: '复制安装指引', onPress: () => void onCopyPrompt() },
        { text: '重新检测', onPress: () => void loadHealth() },
      ],
      link: { text: LARK_OFFICIAL_LINE, href: LARK_OFFICIAL_URL },
    }),
    copied === 'done'
      ? React.createElement('div', { style: props.styles.okText }, '已复制安装指引')
      : copied === 'failed'
        ? React.createElement('div', { style: props.styles.error }, '复制失败：剪贴板不可用，请手动复制对话框里的安装指引')
        : null,
  );
}

export function apply(ctx: ClientCtx): void {
  // 调用口取用器：每次取数时现取（connection 后到也不永久缺席）。
  const getCall: GetCall = () => ctx.connection?.rpc?.call ?? null;
  // #736 目录选择：**软依赖**。形状守卫与「拿不到就不出入口」都住在共用件里（判断只有一处），
  // 本处只把宿主服务查找原样交出去；提供方后到／中途卸载都不留痕（不声明、不停靠，见 cookbook §13）。
  const getService = (name: string): unknown => (typeof ctx.get === 'function' ? ctx.get(name) : undefined);

  // 技能设置页 → 爱生活页签槽（总管声明；总管缺席时 inject 等待，不断链）。
  ctx.slots.inject('ilife.config-tab', () =>
    ctx.slots.register(
      {
        name: 'ilife.config-tab',
        id: PLUGIN,
        order: SLOT_ORDER,
        label: () => SLOT_TITLE,
        // #706：本包自己那条 RPC 通道交给总管（各家都写这一格），总管据此调配置体检——
        // 它因此不必在源码里写死任何一家的通道名（零单品依赖照旧成立）。
        channel: RPC_CHANNEL,
      },
      () => React.createElement(ConfigPanel, {
        channel: RPC_CHANNEL,
        items: CONFIG_ITEMS,
        title: SLOT_TITLE,
        followKeysOf,
        // 状态行只在读到整面之后画（照改版前的形状：读取中／读取失败那两屏不占这一行）。
        extra: (parts) => (parts.reply === null ? null : React.createElement(LarkLine, { getCall, styles: parts.styles })),
        getCall,
        getService,
      }),
    ),
  );
}
