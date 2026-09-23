/** 爱生活面板的更新界面：检查更新按钮、七家结果行、待重启横幅、缺席卡的「装上」。
 *
 * 面板侧纪律（沿 `client.ts` 既有口径）：React.createElement 手写（禁 JSX）、内联 style、
 * 颜色走 DSH 主题别名（深浅主题自适应，写死值只做回退）、只用 `dsh-ctx` 镜像内的上下文成员、
 * 不 import 更新包（电话名与轮询间隔由宿主转交，见 `update-contract.ts` 的 `MANAGER_ACTIONS.targets`）。
 *
 * 视觉对照（用户给的第二张截图，参照实现 `dsh-mattpocock-skills-deck/src/client/views/SettingsPage.js:152-168`）：
 * 标题右侧并排若干件——本文件出「检查更新」一件，隔壁票（爱生活面板头部与底部）在同一个
 * `actions` 容器里补星与气泡两件，故这里把容器单独留出来。
 */
import * as React from 'react';
import { checkTarget, installAbsent, loadTargets, updateInstalled } from './update-client.js';
import type { CallFace, CallFailure } from './update-client.js';
import { reasonText } from './update-contract.js';
import { hasInstallingRow, runSerialUpdateAll } from './update-queue.js';
import { cardActionOf, isAbsent, manualForDisplay, restartBannerText, restartPendingOf, showManualOf, slotStateOf, verdictOf, versionLines } from './update-view.js';
import type { CheckOutcome, TargetInfo, Verdict, VerdictAction } from './update-view.js';

/** 面板视觉（沿用总管既有语言：内联 style，主题别名带回退）。 */
export const PANEL_STYLE = {
  head: { fontSize: 15, fontWeight: 700, margin: '2px 0 8px', color: 'var(--dsw-alias-label-primary, inherit)' } as React.CSSProperties,
  headRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' } as React.CSSProperties,
  actions: { display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
  meta: { color: 'var(--dsw-alias-label-secondary, #9a9a9a)', fontSize: 12, lineHeight: 1.7, marginBottom: 10 } as React.CSSProperties,
  tablist: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } as React.CSSProperties,
  tab: {
    border: '1px solid var(--dsw-alias-border, rgba(128,128,128,.35))',
    background: 'transparent',
    color: 'var(--dsw-alias-label-primary, inherit)',
    borderRadius: 999,
    padding: '4px 12px',
    fontSize: 13,
    cursor: 'pointer',
  } as React.CSSProperties,
  tabActive: {
    background: 'var(--dsw-alias-brand-primary, #0a84ff)',
    borderColor: 'transparent',
    // 同 #931：与 brand-primary 成对的前景别名，别写死 `#fff`。
    color: 'var(--dsw-alias-label-primary-foreground, #0f1115)',
    fontWeight: 700,
  } as React.CSSProperties,
  reco: {
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px dashed var(--dsw-alias-border, rgba(128,128,128,.45))',
    color: 'var(--dsw-alias-label-secondary, #9a9a9a)',
    fontSize: 13,
    lineHeight: 1.7,
  } as React.CSSProperties,
  cmd: {
    display: 'block',
    marginTop: 8,
    padding: '8px 10px',
    borderRadius: 8,
    background: 'var(--dsw-alias-bg-base, rgba(128,128,128,.12))',
    color: 'var(--dsw-alias-label-primary, inherit)',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 12,
    userSelect: 'all',
  } as React.CSSProperties,
  btn: {
    border: '1px solid var(--dsw-alias-border, rgba(128,128,128,.35))',
    background: 'transparent',
    color: 'var(--dsw-alias-label-primary, inherit)',
    borderRadius: 8,
    padding: '4px 12px',
    fontSize: 13,
    cursor: 'pointer',
  } as React.CSSProperties,
  banner: {
    padding: '10px 12px',
    marginBottom: 10,
    borderRadius: 8,
    border: '1px solid var(--dsw-alias-state-warning-primary, #d8a300)',
    background: 'var(--dsw-alias-bg-base, rgba(216,163,0,.12))',
    color: 'var(--dsw-alias-label-primary, inherit)',
    fontSize: 13,
    lineHeight: 1.7,
  } as React.CSSProperties,
  row: {
    padding: '10px 12px',
    marginBottom: 8,
    borderRadius: 10,
    border: '1px solid var(--dsw-alias-border, rgba(128,128,128,.3))',
    borderLeftWidth: 3,
    fontSize: 13,
    lineHeight: 1.7,
  } as React.CSSProperties,
  rowHead: { display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 } as React.CSSProperties,
  rowTitle: { fontWeight: 700, color: 'var(--dsw-alias-label-primary, inherit)' } as React.CSSProperties,
  rowPkg: {
    color: 'var(--dsw-alias-label-tertiary, #8a8a8a)',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 12,
  } as React.CSSProperties,
  rowMeta: { color: 'var(--dsw-alias-label-secondary, #9a9a9a)', fontSize: 12 } as React.CSSProperties,
  /** 版本号用等宽字：数字要能对齐着读（「当前」「最新」两列一眼比大小）。 */
  ver: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    color: 'var(--dsw-alias-label-primary, inherit)',
    fontWeight: 600,
  } as React.CSSProperties,
  /** 结论那一行：**只有要动的那几档上色**（绿／灰不抢注意力，照 health-view 的三档口径）。 */
  verdictLine: { fontSize: 12.5, marginTop: 2 } as React.CSSProperties,
  reason: { color: 'var(--dsw-alias-state-error-primary, #ff6b6b)', fontSize: 12, marginTop: 4 } as React.CSSProperties,
  skill: {
    color: 'var(--dsw-alias-label-tertiary, #8a8a8a)',
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  } as React.CSSProperties,
  /** 行内主按钮（装上／装上更新）：品牌底色 —— 全屏只有「能点的」这一种是这个颜色。 */
  btnPrimary: {
    border: '1px solid transparent',
    background: 'var(--dsw-alias-brand-primary, #0a84ff)',
    // 同 #931：品牌底上的前景一律取配对别名。
    color: 'var(--dsw-alias-label-primary-foreground, #0f1115)',
    borderRadius: 8,
    padding: '5px 14px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 6,
  } as React.CSSProperties,
  /** 分档标记：**形状是第二条读数**（灰度截图、色弱视角下也分得开哪一行要动）。 */
  mark: { fontWeight: 700, fontSize: 13, lineHeight: 1 } as React.CSSProperties,
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    background: 'rgba(0,0,0,.45)',
  } as React.CSSProperties,
  /** 浮层是**竖排两段**：题头固定、结果列表自己滚（题头跟着滚会把关闭键滚出视野 —— 用户实测反馈）。 */
  dialog: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: 12,
    border: '1px solid var(--dsw-alias-border, rgba(128,128,128,.4))',
    background: 'var(--dsw-alias-bg-elevated, var(--dsw-alias-bg-base, #222))',
    color: 'var(--dsw-alias-label-primary, inherit)',
    boxShadow: '0 12px 32px rgba(0,0,0,.35)',
  } as React.CSSProperties,
  dialogHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flex: '0 0 auto',
    padding: '12px 14px',
    borderBottom: '1px solid var(--dsw-alias-border, rgba(128,128,128,.3))',
  } as React.CSSProperties,
  dialogTitle: { fontSize: 14, fontWeight: 700 } as React.CSSProperties,
  /** 唯一会滚的那一段。 */
  dialogBody: {
    flex: '1 1 auto',
    minHeight: 0,
    overflowY: 'auto',
    padding: '12px 14px',
  } as React.CSSProperties,
  close: {
    border: '1px solid var(--dsw-alias-border, rgba(128,128,128,.35))',
    background: 'transparent',
    color: 'var(--dsw-alias-label-primary, inherit)',
    borderRadius: 8,
    width: 26,
    height: 26,
    lineHeight: 1,
    fontSize: 14,
    cursor: 'pointer',
  } as React.CSSProperties,
  dialogNote: { color: 'var(--dsw-alias-label-tertiary, #8a8a8a)', fontSize: 12, marginTop: 4 } as React.CSSProperties,
};

/** 一行的分档：**要动的那几档才上色**（`ok`／`idle` 保持素色，不跟红黄抢注意力 —— 照 `health-view.ts` 的三档口径）。
 *  每档同时给**形状**（`↑ ! ✕ ✓`）：颜色之外的第二条读数，灰度截图与色弱视角下同样分得开。 */
type RowTone = 'ok' | 'update' | 'blocked' | 'failed' | 'idle';

const ROW_TONE: Readonly<Record<RowTone, { readonly mark: string; readonly color: string; readonly tint: string }>> = {
  update: { mark: '↑', color: 'var(--dsw-alias-brand-primary, #0a84ff)', tint: 'rgba(10,132,255,.08)' },
  blocked: { mark: '!', color: 'var(--dsw-alias-state-warning-primary, #d8a300)', tint: 'rgba(216,163,0,.10)' },
  failed: { mark: '✕', color: 'var(--dsw-alias-state-error-primary, #ff6b6b)', tint: 'rgba(255,107,107,.10)' },
  ok: { mark: '✓', color: 'var(--dsw-alias-state-success-primary, #4ec9a0)', tint: 'transparent' },
  idle: { mark: '·', color: 'var(--dsw-alias-label-tertiary, #8a8a8a)', tint: 'transparent' },
};

/** 这一行算哪一档：取数失败 > 装不上 > 有新版 > 待重启／源码装 > 已是最新 > 未查。 */
export function rowToneOf(row: UpdateRowState, verdict: Verdict | null): RowTone {
  if (row.failure !== null || row.phase === 'failed') return 'failed';
  if (row.phase === 'installing') return 'update';
  if (verdict === null) return 'idle';
  switch (verdict.kind) {
    case 'update-available': return 'update';
    case 'blocked': return 'blocked';
    case 'up-to-date': return 'ok';
    default: return 'idle';
  }
}

/** 一行的运行时状态：还没查 / 查着 / 有结果 / 装着 / 出错。 */
export interface UpdateRowState {
  readonly phase: 'idle' | 'checking' | 'ready' | 'installing' | 'failed';
  readonly outcome: CheckOutcome | null;
  readonly failure: CallFailure | null;
}

export interface UpdateRowsFace {
  readonly targets: readonly TargetInfo[];
  readonly rows: Readonly<Record<string, UpdateRowState>>;
  readonly pollMs: number;
  readonly loadError: string | null;
  readonly checking: boolean;
  /** 一键全部更新是否在串行中（逐家查→装→收尾，一家收尾才起下一家）。 */
  readonly updatingAll: boolean;
  /** 结果浮层是否打开（点「检查更新」开，关法三种：×、点遮罩、Esc）。 */
  readonly open: boolean;
  close(): void;
  checkAll(): void;
  /** 一键全部更新：按目标顺序串行收尾，失败一家记 failed 继续下一家。 */
  updateAll(): void;
  /** 执行这一行按钮对应的动作（装上／装上更新／重试安装／重新检查）。 */
  act(target: TargetInfo, action: VerdictAction): void;
}

/** 四个动作在屏上的名字：按钮文案与判据同源（票 #740）。 */
const ACTION_LABEL: Readonly<Record<VerdictAction, string>> = {
  install: '装上',
  update: '装上更新',
  retry: '重试安装',
  recheck: '重新检查',
};

const IDLE: UpdateRowState = { phase: 'idle', outcome: null, failure: null };

/** 面板的更新状态源：挂载时取七个目标的表，之后按需查／装（组件与按钮共用一个 face）。
 *
 * 并发形状（#925 拍板四条，用户已确认）：
 * - 一键全部更新按目标顺序串行（查→装→轮询到收尾，一家收尾才起下一家；失败记 failed 继续）；
 * - 任一行 installing 时 checkAll 入口直接返回、题头禁用；
 * - act 入口有忙直接返回（有忙拒 update-busy 且不改 rows，含同家第二点）；
 * - 每行各自显示（patch 只写本家 key），题头不汇总排队数。
 */
export function useUpdateRows(getCall: () => CallFace | null): UpdateRowsFace {
  const [targets, setTargets] = React.useState<readonly TargetInfo[]>([]);
  const [rows, setRows] = React.useState<Record<string, UpdateRowState>>({});
  const [pollMs, setPollMs] = React.useState(1000);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [checking, setChecking] = React.useState(false);
  const [updatingAll, setUpdatingAll] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const alive = React.useRef(true);
  React.useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );
  /** 重取七个目标的表（装机读数变了就重取：缺席卡的态是拿这张表算的，缓存住它会继续说旧话）。 */
  const reload = React.useCallback(async () => {
    const loaded = await loadTargets(getCall());
    if (!alive.current) return;
    if (loaded.ok) {
      setTargets(loaded.value.targets);
      setPollMs(loaded.value.pollMs);
      setLoadError(null);
    } else {
      setLoadError(loaded.message);
    }
  }, [getCall]);
  React.useEffect(() => {
    void reload();
  }, [reload]);
  const patch = React.useCallback((key: string, next: UpdateRowState) => {
    setRows((previous) => ({ ...previous, [key]: next }));
  }, []);
  // 回调闭包里读到的 rows/targets 可能是旧的：忙守卫必须看最新值，故用 ref 镜像。
  const rowsRef = React.useRef(rows);
  rowsRef.current = rows;
  const targetsRef = React.useRef(targets);
  targetsRef.current = targets;
  const pollMsRef = React.useRef(pollMs);
  pollMsRef.current = pollMs;
  const updatingAllRef = React.useRef(false);
  const checkAll = React.useCallback(() => {
    // 安装中题头点不得：任一行 installing 直接返回，不改任何行。
    if (hasInstallingRow(rowsRef.current) || updatingAllRef.current) return;
    setChecking(true);
    setOpen(true);
    const list = targetsRef.current;
    const snapshot = rowsRef.current;
    for (const target of list) patch(target.key, { phase: 'checking', outcome: snapshot[target.key]?.outcome ?? null, failure: null });
    void Promise.all(
      list.map(async (target) => {
        const result = await checkTarget(getCall(), target);
        patch(target.key, result.ok ? { phase: 'ready', outcome: result.value, failure: null } : { phase: 'failed', outcome: null, failure: result });
      }),
    ).finally(() => {
      if (alive.current) setChecking(false);
    });
  }, [getCall, patch]);
  const updateAll = React.useCallback(() => {
    // 一键串行期间不重入；任一行 installing 也不重入（不进队列）。
    if (hasInstallingRow(rowsRef.current) || updatingAllRef.current) return;
    const list = targetsRef.current;
    if (list.length === 0) return;
    updatingAllRef.current = true;
    setUpdatingAll(true);
    setOpen(true);
    void (async () => {
      try {
        await runSerialUpdateAll(list, {
          check: (target) => checkTarget(getCall(), target),
          checkStatus: (target) => checkTarget(getCall(), target, target.phones?.status),
          installAbsent: (target, version) => installAbsent(getCall(), target, version),
          installPresent: (target) => updateInstalled(getCall(), target, pollMsRef.current),
          patch,
          getRow: (key) => rowsRef.current[key],
        });
        // 装机读数变了（磁盘上多／换了一个包）：重取目标表，缺席卡的态跟着变。
        await reload();
      } finally {
        updatingAllRef.current = false;
        if (alive.current) setUpdatingAll(false);
      }
    })();
  }, [getCall, patch, reload]);
  const act = React.useCallback(
    (target: TargetInfo, action: VerdictAction) => {
      // 行按钮全局互斥：有忙拒 update-busy 且不改 rows（含同家第二点，不进队列）。
      if (hasInstallingRow(rowsRef.current) || updatingAllRef.current) return;
      const current = rowsRef.current[target.key] ?? IDLE;
      // 「重新检查」：只重读这一家（重新绑一次安装态指纹）。
      if (action === 'recheck') {
        patch(target.key, { phase: 'checking', outcome: current.outcome, failure: null });
        void (async () => {
          const checked = await checkTarget(getCall(), target);
          patch(target.key, checked.ok
            ? { phase: 'ready', outcome: checked.value, failure: null }
            : { phase: 'failed', outcome: null, failure: checked });
        })();
        return;
      }
      patch(target.key, { ...current, phase: 'installing', failure: null });
      void (async () => {
        const absent = isAbsent(target);
        let version = current.outcome?.snapshot.latestVersion ?? null;
        if (absent && version === null) {
          const checked = await checkTarget(getCall(), target);
          if (!checked.ok) {
            patch(target.key, { phase: 'failed', outcome: null, failure: checked });
            return;
          }
          patch(target.key, { phase: 'installing', outcome: checked.value, failure: null });
          version = checked.value.snapshot.latestVersion;
        }
        // 已装的那条路，`updateInstalled` **自己会先查一次**再提交（凭证是那一查现签的）——
        // 这就是「装了别家之后，这一家的「装上更新」照样点得动」的原因：面板从不拿旧凭证去提交。
        const result = absent
          ? await installAbsent(getCall(), target, version ?? '')
          : await updateInstalled(getCall(), target, pollMsRef.current);
        if (result.ok) {
          // 装完不自己编快照：向宿主问一次真实状态（装到磁盘但宿主还跑着旧版 ⇒ 待重启）。
          const refreshed = await checkTarget(getCall(), target, target.phones?.status);
          patch(target.key, refreshed.ok ? { phase: 'ready', outcome: refreshed.value, failure: null } : { phase: 'failed', outcome: null, failure: refreshed });
          // 装机读数变了（磁盘上多／换了一个包）：重取目标表，缺席卡的态跟着变，
          // 否则它会拿着挂载时那份读数继续说「未安装」，直到用户刷新页面。
          await reload();
          return;
        }
        patch(target.key, {
          phase: 'failed',
          outcome: current.outcome,
          failure: { ...result, manual: result.manual ?? current.outcome?.manual ?? null },
        });
      })();
    },
    [getCall, patch, reload],
  );
  return { targets, rows, pollMs, loadError, checking, updatingAll, open, close: () => setOpen(false), checkAll, updateAll, act };
}

/** 标题右侧两件：「检查更新」一次查七家 ＋ 「全部更新」按顺序串行装（吃 `useUpdateRows` 的表）。
 *
 * 禁用形状（#925 第 2 条）：任一行 installing 时两件都点不得；人话沿用 `update-busy` 原句
 * （挂在 title 上，按钮文本仍是动作名）。题头不汇总排队数：串行进度只在各行自己显示。
 */
export function CheckUpdateButton(props: { readonly face: UpdateRowsFace }): React.ReactElement {
  const { checking, updatingAll, checkAll, updateAll, targets, rows } = props.face;
  const busy = hasInstallingRow(rows) || updatingAll;
  const checkDisabled = checking || updatingAll || busy || targets.length === 0;
  const allDisabled = checking || updatingAll || busy || targets.length === 0;
  const busyText = reasonText('update-busy');
  return React.createElement(
    'span',
    { style: PANEL_STYLE.actions },
    React.createElement(
      'button',
      {
        type: 'button',
        style: checkDisabled ? { ...PANEL_STYLE.btn, opacity: 0.55, cursor: 'default' } : PANEL_STYLE.btn,
        disabled: checkDisabled,
        onClick: checkAll,
        title: busy ? busyText : '检查总管与六家插件的版本',
      },
      checking ? '检查中…' : '检查更新',
    ),
    React.createElement(
      'button',
      {
        type: 'button',
        style: allDisabled ? { ...PANEL_STYLE.btn, opacity: 0.55, cursor: 'default' } : PANEL_STYLE.btn,
        disabled: allDisabled,
        onClick: updateAll,
        title: busy ? busyText : '按顺序逐家装上更新（一家收尾才起下一家）',
      },
      updatingAll ? '更新中…' : '全部更新',
    ),
  );
}

/** 待重启横幅：一行总账，只点名哪几家要重启（理由与做法写在各家卡片上，见 `restartBannerText`）。 */
function RestartBanners(props: { readonly face: UpdateRowsFace }): React.ReactElement | null {
  const titles: string[] = [];
  for (const target of props.face.targets) {
    const outcome = props.face.rows[target.key]?.outcome;
    if (!outcome) continue;
    if (restartPendingOf(outcome.snapshot)) titles.push(target.title);
  }
  const text = restartBannerText(titles);
  if (text === null) return null;
  return React.createElement('div', { style: PANEL_STYLE.banner }, text);
}

/** 七家结果：装不了的与待重启的常驻（横幅），详细结果放**居中浮层**（点「检查更新」开）。
 *
 * 为什么是浮层：内联展开会把面板本体撑长、且它自身没有关闭控件（真机第一次做成内联后用户反馈
 * 「打开就无法收回了」）。参照实现也是浮层：`dsh-mattpocock-skills-deck/src/client/views/SettingsPage.js`
 * 的 `upd.dialog`。关法三种：右上角 ×、点遮罩、Esc（Esc 靠浮层自己拿焦点后收 keydown，
 * 不摸 window——客户端纪律禁直写 DOM 全局）。
 * 手工命令只在「装不了」或「装失败」的行显示：正常用户用不到，摊在每行上既吵又误导。
 */
export function UpdateResults(props: { readonly face: UpdateRowsFace }): React.ReactElement | null {
  const { targets, rows, loadError, checking, updatingAll, open, close } = props.face;
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);
  const shown = targets.filter((target) => rows[target.key] && rows[target.key].phase !== 'idle');
  if (loadError) return React.createElement('div', { style: PANEL_STYLE.reason }, '更新能力没接上：' + loadError);
  if (targets.length === 0) return null;
  if (shown.length === 0 && !open) return null;
  // 行按钮全局互斥（#925 第 3 条）：任一行 installing 或一键串行中，其余行禁用、不进队列；
  // installing 行自己同样自锁。各行进度自显：他行保持各自 phase，这里只读不改。
  const locked = hasInstallingRow(rows) || updatingAll;
  const body = shown.map((target) => {
    const row = rows[target.key];
    const snapshot = row.outcome?.snapshot ?? null;
    // 快照在就按它画卡。（第四轮改：装成一家之后**不再**把别家换成「重新检查」——
    // 装的那条路本来就会在提交前重查一次拿新凭证，旧快照从不到达守卫，那句作废提示只是白挡一次点击。）
    const verdict = snapshot ? verdictOf(target, snapshot) : null;
    const manual = manualForDisplay(target, row.failure?.manual ?? row.outcome?.manual ?? null);
    const busy = row.phase === 'installing';
    // 手工命令只在**面板代劳不了**时才摊出来（判据收在 `showManualOf` 里，与单测同一份）。
    const showManual = manual !== null && showManualOf(verdict, row.phase);
    // 失败的行没有快照、也就没有结论，但照样要给一颗够得着的按钮（票 #740 第三轮，见 `cardActionOf`）。
    const buttonAction = cardActionOf(verdict, row.phase);
    const tone = rowToneOf(row, verdict);
    const paint = ROW_TONE[tone];
    /** 这一行「当前／最新」两个版本号：不等才算有新版，把「最新」那格上色（用户扫一眼先看有没有箭头）。 */
    const running = snapshot?.runningVersion ?? target.runningVersion ?? null;
    const latest = snapshot?.latestVersion ?? null;
    const newer = running !== null && latest !== null && latest !== running;
    const lit = tone === 'update' || tone === 'blocked' || tone === 'failed';
    return React.createElement(
      'div',
      { key: target.key, style: { ...PANEL_STYLE.row, borderLeftColor: paint.color, background: paint.tint } },
      React.createElement(
        'div',
        { style: PANEL_STYLE.rowHead },
        React.createElement('span', { style: { ...PANEL_STYLE.mark, color: paint.color }, 'aria-hidden': 'true' }, paint.mark),
        React.createElement('span', { style: PANEL_STYLE.rowTitle }, target.title),
        React.createElement('span', { style: PANEL_STYLE.rowPkg }, '· ' + target.packageName),
      ),
      React.createElement(
        'div',
        { style: PANEL_STYLE.rowMeta },
        '当前 ',
        React.createElement('b', { style: PANEL_STYLE.ver }, String(running ?? '未安装')),
        ' · 最新 ',
        React.createElement(
          'b',
          { style: newer ? { ...PANEL_STYLE.ver, color: paint.color } : PANEL_STYLE.ver },
          String(latest ?? '未查'),
        ),
      ),
      React.createElement(
        'div',
        { style: lit ? { ...PANEL_STYLE.verdictLine, color: paint.color, fontWeight: 600 } : { ...PANEL_STYLE.verdictLine, color: 'var(--dsw-alias-label-secondary, #9a9a9a)' } },
        busy ? '正在装，请稍候…' : (verdict?.text ?? (checking ? '检查中…' : '')),
      ),
      buttonAction
        ? React.createElement(
            'button',
            {
              type: 'button',
              style: locked ? { ...PANEL_STYLE.btnPrimary, opacity: 0.55, cursor: 'default' } : PANEL_STYLE.btnPrimary,
              disabled: locked,
              title: locked ? reasonText('update-busy') : undefined,
              onClick: () => {
                props.face.act(target, buttonAction);
              },
            },
            ACTION_LABEL[buttonAction],
          )
        : null,
      row.failure ? React.createElement('div', { style: PANEL_STYLE.reason }, '装不上：' + row.failure.message) : null,
      versionLines(target, snapshot).map((line, index) =>
        React.createElement('div', { key: String(index), style: PANEL_STYLE.skill }, line),
      ),
      // 命令块先说它是干什么的（票 #740）：给一条命令不给用途，用户不知道该不该敲。
      showManual ? React.createElement('div', { style: PANEL_STYLE.skill }, '在终端里执行这条命令可以手动完成这一步：') : null,
      showManual ? React.createElement('code', { style: PANEL_STYLE.cmd }, manual) : null,
    );
  });
  return React.createElement(
    'div',
    null,
    React.createElement(RestartBanners, { face: props.face }),
    open
      ? React.createElement(
          'div',
          {
            style: PANEL_STYLE.overlay,
            role: 'presentation',
            onClick: () => close(),
          },
          React.createElement(
            'div',
            {
              ref: dialogRef,
              tabIndex: -1,
              role: 'dialog',
              'aria-label': '检查更新结果',
              style: PANEL_STYLE.dialog,
              onClick: (event: React.MouseEvent) => event.stopPropagation(),
              onKeyDown: (event: React.KeyboardEvent) => {
                if (event.key === 'Escape') close();
              },
            },
            React.createElement(
              'div',
              { style: PANEL_STYLE.dialogHead },
              // 标题只说「检查更新」：查的是几个包由每行自己交代，不必在标题里数数。
              React.createElement('div', { style: PANEL_STYLE.dialogTitle }, '检查更新'),
              React.createElement(
                'button',
                { type: 'button', style: PANEL_STYLE.close, onClick: () => close(), title: '关闭', 'aria-label': '关闭' },
                '×',
              ),
            ),
            React.createElement(
              'div',
              { style: PANEL_STYLE.dialogBody },
              body,
              React.createElement(
                'div',
                { style: PANEL_STYLE.dialogNote },
                '安装在宿主后台继续：关掉这块不会中断它。再点「检查更新」看最新进度。',
              ),
            ),
          ),
        )
      : null,
  );
}

/** 缺席卡：**按两处独立事实分三态**，每态只给能改变状态的动作。
 *
 * - `absent`（磁盘上没有这个包）→「未安装」＋「装上」按钮（本票原有的能力）；
 * - `unregistered-product`（装着，但产物里没有页签槽注册代码）→ 说实情、**不给按钮**：
 *   重装改不了产物里有没有注册代码（真机实测：作息／居家／大厨／记账 的已发布 0.2.0
 *   产物里根本没有注册代码，见票 #723）；给可复制命令只是参考；
 * - `not-connected`（装着、产物也有注册代码，设置页却没送到浏览器）→ 重启宿主；仍不行看日志；
 * - `connected` 不归本卡管：那时面板显示的是那家自己的设置页。
 *
 * 原实现只看页签槽 ledger 就断言「未安装」——那对后两种情形是说假话，且点「装上」
 * 会走进更新包的流程（它已经装着 ⇒ 没有新版 ⇒ 没有凭证）并报出误导的「查新版失败」。
 */
export function AbsentCard(props: {
  readonly target: TargetInfo | null;
  readonly fallbackCommand: string;
  readonly inLedger: boolean;
  readonly face: UpdateRowsFace;
}): React.ReactElement {
  const target = props.target;
  const row = target ? props.face.rows[target.key] : null;
  const busy = row?.phase === 'installing';
  // 缺席卡同理全局互斥（#925 第 3 条）：别家 installing 或一键串行中，这张卡的装上／重新检查都不进队列。
  const locked = busy || hasInstallingRow(props.face.rows) || props.face.updatingAll;
  const manual = (target ? manualForDisplay(target, row?.failure?.manual ?? row?.outcome?.manual ?? null) : null) ?? props.fallbackCommand;
  const installed = target ? (target.installedVersion ?? target.runningVersion) : null;
  const state = slotStateOf(target, props.inLedger);
  const blockedVerdict = target && row?.outcome && row.outcome.snapshot.blockedReason !== null ? verdictOf(target, row.outcome.snapshot) : null;
  let reason: string | null = row?.failure?.message ?? null;
  if (reason === null && blockedVerdict) reason = blockedVerdict.text;
  // 这张卡也要有一颗够得着的按钮（票 #740 第三轮）：上一次失败之后，屏上那句写着「再点「重新检查」」，
  // 这张卡原先一颗都不给（absent 态只给「装上」）。判据与结果行同一份（`cardActionOf`）。
  const retryAction = row ? cardActionOf(blockedVerdict, row.phase) : null;
  let headline: string;
  switch (state) {
    case 'absent':
      headline = target
        ? '未安装[' + target.packageName + ']，装上后这个页签就能用了。'
        : '这个页签对应的插件还没装。';
      break;
    case 'unregistered-product':
      headline =
        target!.packageName +
        ' ' +
        String(installed) +
        ' 已安装，但这一版的插件包里没有「爱生活页签」的注册代码：要等它发布带注册代码的新版本。重启和重装都不会改变这一点。';
      break;
    default:
      headline =
        target!.packageName +
        ' ' +
        String(installed) +
        ' 已安装，插件包里也有注册代码，但它的设置页没有加载到面板：重启 DSH 后再看这个页签；仍然这样，就在 DSH 日志里找它的报错。';
      break;
  }
  return React.createElement(
    'div',
    { style: PANEL_STYLE.reco },
    React.createElement('div', null, headline),
    state === 'absent'
      ? React.createElement(
          'button',
          {
            type: 'button',
            style: locked ? { ...PANEL_STYLE.btn, marginTop: 8, opacity: 0.55 } : { ...PANEL_STYLE.btn, marginTop: 8 },
            disabled: locked,
            title: locked ? reasonText('update-busy') : undefined,
            onClick: () => {
              if (target) props.face.act(target, 'install');
            },
          },
          busy ? '正在装，请稍候…' : '装上',
        )
      : null,
    // 「重新检查」只在上面那句真写了它、且这张卡上还没有同一颗按钮时补出来（absent 态的「装上」不动）。
    retryAction === 'recheck' && target
      ? React.createElement(
          'button',
          {
            type: 'button',
            style: locked ? { ...PANEL_STYLE.btn, marginTop: 8, marginLeft: 8, opacity: 0.55 } : { ...PANEL_STYLE.btn, marginTop: 8, marginLeft: 8 },
            disabled: locked,
            title: locked ? reasonText('update-busy') : undefined,
            onClick: () => props.face.act(target, 'recheck'),
          },
          ACTION_LABEL.recheck,
        )
      : null,
    reason ? React.createElement('div', { style: PANEL_STYLE.reason }, reason) : null,
    React.createElement('code', { style: PANEL_STYLE.cmd }, manual),
  );
}
