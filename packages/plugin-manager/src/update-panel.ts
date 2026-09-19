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
import { isAbsent, manualForDisplay, pendingRestartText, verdictOf, versionLines } from './update-view.js';
import type { CheckOutcome, TargetInfo } from './update-view.js';

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
    color: '#fff',
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
    fontSize: 13,
    lineHeight: 1.7,
  } as React.CSSProperties,
  rowHead: { fontWeight: 700, marginBottom: 2 } as React.CSSProperties,
  rowMeta: { color: 'var(--dsw-alias-label-secondary, #9a9a9a)', fontSize: 12 } as React.CSSProperties,
  reason: { color: 'var(--dsw-alias-state-error-primary, #ff6b6b)', fontSize: 12, marginTop: 4 } as React.CSSProperties,
  skill: { color: 'var(--dsw-alias-label-tertiary, #8a8a8a)', fontSize: 12, marginTop: 4 } as React.CSSProperties,
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
  dialog: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '80vh',
    overflow: 'auto',
    padding: '12px 14px',
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
    marginBottom: 8,
  } as React.CSSProperties,
  dialogTitle: { fontSize: 14, fontWeight: 700 } as React.CSSProperties,
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
  /** 结果浮层是否打开（点「检查更新」开，关法三种：×、点遮罩、Esc）。 */
  readonly open: boolean;
  close(): void;
  checkAll(): void;
  act(target: TargetInfo): void;
}

const IDLE: UpdateRowState = { phase: 'idle', outcome: null, failure: null };

/** 面板的更新状态源：挂载时取七个目标的表，之后按需查／装（组件与按钮共用一个 face）。 */
export function useUpdateRows(getCall: () => CallFace | null): UpdateRowsFace {
  const [targets, setTargets] = React.useState<readonly TargetInfo[]>([]);
  const [rows, setRows] = React.useState<Record<string, UpdateRowState>>({});
  const [pollMs, setPollMs] = React.useState(1000);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [checking, setChecking] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    let alive = true;
    void (async () => {
      const loaded = await loadTargets(getCall());
      if (!alive) return;
      if (loaded.ok) {
        setTargets(loaded.value.targets);
        setPollMs(loaded.value.pollMs);
      } else {
        setLoadError(loaded.message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [getCall]);
  const patch = React.useCallback((key: string, next: UpdateRowState) => {
    setRows((previous) => ({ ...previous, [key]: next }));
  }, []);
  const checkAll = React.useCallback(() => {
    setChecking(true);
    setOpen(true);
    const list = targets;
    for (const target of list) patch(target.key, { phase: 'checking', outcome: rows[target.key]?.outcome ?? null, failure: null });
    void Promise.all(
      list.map(async (target) => {
        const result = await checkTarget(getCall(), target);
        patch(target.key, result.ok ? { phase: 'ready', outcome: result.value, failure: null } : { phase: 'failed', outcome: null, failure: result });
      }),
    ).finally(() => setChecking(false));
  }, [getCall, patch, rows, targets]);
  const act = React.useCallback(
    (target: TargetInfo) => {
      const current = rows[target.key] ?? IDLE;
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
        const result = absent
          ? await installAbsent(getCall(), target, version ?? '')
          : await updateInstalled(getCall(), target, pollMs);
        if (result.ok) {
          // 装完不自己编快照：向宿主问一次真实状态（装到磁盘但宿主还跑着旧版 ⇒ 待重启）。
          const refreshed = await checkTarget(getCall(), target, target.phones?.status);
          patch(target.key, refreshed.ok ? { phase: 'ready', outcome: refreshed.value, failure: null } : { phase: 'failed', outcome: null, failure: refreshed });
          return;
        }
        patch(target.key, {
          phase: 'failed',
          outcome: current.outcome,
          failure: { ...result, manual: result.manual ?? current.outcome?.manual ?? null },
        });
      })();
    },
    [getCall, patch, pollMs, rows],
  );
  return { targets, rows, pollMs, loadError, checking, open, close: () => setOpen(false), checkAll, act };
}

/** 标题右侧的「检查更新」：一个按钮一次查七家（吃 `useUpdateRows` 的表）。 */
export function CheckUpdateButton(props: { readonly face: UpdateRowsFace }): React.ReactElement {
  const { checking, checkAll, targets } = props.face;
  const disabled = checking || targets.length === 0;
  return React.createElement(
    'button',
    {
      type: 'button',
      style: disabled ? { ...PANEL_STYLE.btn, opacity: 0.55, cursor: 'default' } : PANEL_STYLE.btn,
      disabled,
      onClick: checkAll,
      title: '一次查七家（总管自己 ＋ 六个单品）的插件包版本',
    },
    checking ? '检查中…' : '检查更新',
  );
}

/** 待重启横幅：任何一家成 `pending-restart` 就常驻显示，重启宿主后自动消失（更新包 README 第 10 节）。 */
function RestartBanners(props: { readonly face: UpdateRowsFace }): React.ReactElement | null {
  const lines: string[] = [];
  for (const target of props.face.targets) {
    const outcome = props.face.rows[target.key]?.outcome;
    if (!outcome) continue;
    const text = pendingRestartText(target, outcome.snapshot);
    if (text) lines.push(text);
  }
  if (lines.length === 0) return null;
  return React.createElement(
    'div',
    { style: PANEL_STYLE.banner },
    lines.map((line, index) => React.createElement('div', { key: String(index) }, line)),
  );
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
  const { targets, rows, loadError, checking, open, close } = props.face;
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);
  const shown = targets.filter((target) => rows[target.key] && rows[target.key].phase !== 'idle');
  if (loadError) return React.createElement('div', { style: PANEL_STYLE.reason }, '更新能力没接上：' + loadError);
  if (targets.length === 0) return null;
  if (shown.length === 0 && !open) return null;
  const body = shown.map((target) => {
    const row = rows[target.key];
    const snapshot = row.outcome?.snapshot ?? null;
    const verdict = snapshot ? verdictOf(target, snapshot) : null;
    const manual = manualForDisplay(target, row.failure?.manual ?? row.outcome?.manual ?? null);
    const busy = row.phase === 'installing';
    const showManual = manual !== null && (row.phase === 'failed' || verdict?.kind === 'blocked');
    return React.createElement(
      'div',
      { key: target.key, style: PANEL_STYLE.row },
      React.createElement('div', { style: PANEL_STYLE.rowHead }, target.title + ' · ' + target.packageName),
      React.createElement(
        'div',
        { style: PANEL_STYLE.rowMeta },
        '当前 ' +
          String(snapshot?.runningVersion ?? target.runningVersion ?? '未安装') +
          ' · 最新 ' +
          String(snapshot?.latestVersion ?? '未查'),
      ),
      React.createElement('div', null, busy ? '正在装，请稍候…' : (verdict?.text ?? (checking ? '检查中…' : ''))),
      verdict?.action
        ? React.createElement(
            'button',
            {
              type: 'button',
              style: busy ? { ...PANEL_STYLE.btn, opacity: 0.55 } : { ...PANEL_STYLE.btn, marginTop: 6 },
              disabled: busy,
              onClick: () => props.face.act(target),
            },
            verdict.action === 'install' ? '装上' : '装上更新',
          )
        : null,
      row.failure ? React.createElement('div', { style: PANEL_STYLE.reason }, '装不上：' + row.failure.message) : null,
      versionLines(target, snapshot).map((line, index) =>
        React.createElement('div', { key: String(index), style: PANEL_STYLE.skill }, line),
      ),
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
              React.createElement('div', { style: PANEL_STYLE.dialogTitle }, '检查更新（七家）'),
              React.createElement(
                'button',
                { type: 'button', style: PANEL_STYLE.close, onClick: () => close(), title: '关闭', 'aria-label': '关闭' },
                '×',
              ),
            ),
            body,
            React.createElement(
              'div',
              { style: PANEL_STYLE.dialogNote },
              '装与更新都在宿主后台跑：关掉这块不影响正在进行的安装，再点「检查更新」可以看到最新状态。',
            ),
          ),
        )
      : null,
  );
}

/** 缺席卡：**按宿主的装机读数分两态**，不让层与层的结论互相顶替。
 *
 * - 宿主说磁盘上没有这个包 →「未安装」＋「装上」按钮（这是本票原有的能力）；
 * - 宿主说装着（`installedVersion` 非空）却没进页签槽 → 说实情、**不给「装上」**：
 *   重装改不了产物里有没有注册代码这件事（真机实测：作息/居家/大厨/记账 的已发布 0.2.0
 *   产物里根本没有页签槽注册，见票 #723）。给出可复制命令仅作参考。
 *
 * 原实现只看页签槽 ledger 就断言「未安装」——那对上面第二种情形是说假话，且点「装上」
 * 会走进更新包的流程（它已经装着 ⇒ 没有新版 ⇒ 没有凭证）并报出误导的「查新版失败」。
 */
export function AbsentCard(props: {
  readonly target: TargetInfo | null;
  readonly fallbackCommand: string;
  readonly face: UpdateRowsFace;
}): React.ReactElement {
  const target = props.target;
  const row = target ? props.face.rows[target.key] : null;
  const busy = row?.phase === 'installing';
  const manual = (target ? manualForDisplay(target, row?.failure?.manual ?? row?.outcome?.manual ?? null) : null) ?? props.fallbackCommand;
  const installed = target ? (target.installedVersion ?? target.runningVersion) : null;
  let reason: string | null = row?.failure?.message ?? null;
  if (target && reason === null && row?.outcome && row.outcome.snapshot.blockedReason !== null) {
    reason = verdictOf(target, row.outcome.snapshot).text;
  }
  const headline = !target
    ? '这个页签对应的插件还没装。'
    : installed === null
      ? '未安装[' + target.packageName + ']，装上后这个页签就能用了。'
      : '插件已装（' + installed + '），但它这一版没把设置页接上爱生活面板：要等它发新版才对得上（重启与重装都不会变）。';
  return React.createElement(
    'div',
    { style: PANEL_STYLE.reco },
    React.createElement('div', null, headline),
    target && installed === null
      ? React.createElement(
          'button',
          {
            type: 'button',
            style: busy ? { ...PANEL_STYLE.btn, marginTop: 8, opacity: 0.55 } : { ...PANEL_STYLE.btn, marginTop: 8 },
            disabled: busy,
            onClick: () => props.face.act(target),
          },
          busy ? '正在装，请稍候…' : '装上',
        )
      : null,
    reason ? React.createElement('div', { style: PANEL_STYLE.reason }, reason) : null,
    React.createElement('code', { style: PANEL_STYLE.cmd }, manual),
  );
}
