/** T351-v13 · **计划编辑器**的页内样式（唯一产出者）。
 *
 * 为什么这一件要有自己的样式表：编辑器是本技能里第一种**可写页**（前面 37 份都是只读页），
 * 它比只读页多三样只读页没有的东西——**可点的行**、**可填的格**、**可选的选择层**。
 * 这三样必须有自己的形状语言，且必须与只读页共用同一套 token（`--fg/--fg2/--fg3/--bg/--card/
 * --line/--blue/--blue2/--soft/--ok/--shadow`），否则同一个技能里会长出两套观感。
 *
 * 三条纪律（照 `docs/agents/structure.md` 与负责人 2026-09-15 六条口径）：
 *   ① 色值只用冻结 token（`#ff3b30` 是本仓没有冻结对应、照老页写死的一档危险色，同 `reviewDocsCss.ts` 成例）；
 *   ② 触摸目标 ≥44px、`-webkit-tap-highlight-color:transparent` ＋ `touch-action:manipulation`；
 *   ③ 820 断点：窄屏把「周 × 日 × 时段」三层从横排塌成竖排，选择层改全屏抽屉。
 *
 * 页宽与页壳那一套不在这里——住姊妹件 `./pageChromeCss.ts`（三族共用）。
 */

/** 编辑器专属样式（页面级那套由 `pageChromeCss` 出，调用方拼在前面）。 */
export const PLAN_EDITOR_CSS = `
/* ── 设置条：总周数 stepper ＋ 起日。放在页头下面第一件，因为它是「这份计划有多大」的唯一入口 ── */
.pe-setup{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0 0 14px;padding:14px 18px;background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow)}
.pe-setup-lab{font-size:12.5px;font-weight:700;color:var(--fg2)}
/* 「标签 ＋ 它的控件」成组不许拆：390 宽时 flex 换行会把标签和控件拆到两行去。 */
.pe-pair{display:inline-flex;align-items:center;gap:8px;white-space:nowrap}
.pe-step{display:inline-flex;align-items:center;gap:2px;border:1px solid var(--line);border-radius:999px;background:var(--card)}
.pe-step button{min-width:44px;min-height:44px;border:0;background:transparent;color:var(--blue);font-size:19px;font-weight:700;cursor:pointer;border-radius:999px;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.pe-step button:disabled{color:var(--fg3);cursor:not-allowed}
.pe-step-n{min-width:52px;text-align:center;font-size:14px;font-weight:700;font-variant-numeric:tabular-nums}
.pe-date{min-height:44px;border:1.5px solid var(--line);border-radius:10px;padding:0 12px;font-size:14px;font-family:inherit;color:var(--fg);background:var(--card)}
.pe-date:focus{outline:none;border-color:var(--blue)}
.pe-count{margin-left:auto;font-size:12.5px;color:var(--fg2);font-variant-numeric:tabular-nums}

/* ── 空态：还没有计划时只出这一块（负责人：初始页面什么都没有，只提示「定计划」） ── */
.pe-empty{margin:0 0 14px;padding:34px 20px;text-align:center;background:var(--card);border:1px dashed var(--line);border-radius:16px}
.pe-empty-ico{font-size:34px;line-height:1;margin-bottom:10px}
.pe-empty-t{font-size:16px;font-weight:700;margin:0 0 6px}
.pe-empty-d{font-size:13px;color:var(--fg2);margin:0 0 16px}

/* ── 周卡：第 1 周是母版，其余周默认「同母版」 ── */
.pe-week{margin:0 0 12px;background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow)}
.pe-week.is-master{border-color:var(--blue)}
.pe-week-head{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--line)}
.pe-week-n{font-size:15.5px;font-weight:700}
.pe-badge{font-size:11.5px;font-weight:700;padding:2px 9px;border-radius:999px;background:var(--soft);color:var(--blue)}
.pe-badge.is-plain{background:var(--bg);color:var(--fg3)}
.pe-week-body{padding:6px 18px 14px}
.pe-week.is-inherit .pe-week-body{padding-bottom:0}
.pe-same{font-size:13px;color:var(--fg2);padding:12px 0}
.pe-ghost{min-height:44px;padding:0 14px;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--blue);font-size:12.5px;font-weight:700;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;font-family:inherit}
.pe-ghost:hover{border-color:var(--blue)}
.pe-ghost:disabled{color:var(--fg3);border-color:var(--line);cursor:not-allowed}
.pe-head-actions{margin-left:auto;display:flex;gap:8px}

/* ── 日行：左边星期，右边该日全部动作（时段做在动作行上，不占一列——每天 ≤4 个动作是硬上限） ── */
.pe-day{display:grid;grid-template-columns:72px 1fr;gap:12px;padding:12px 0;border-top:1px solid var(--line)}
.pe-day:first-child{border-top:0}
.pe-day-dow{font-size:13.5px;font-weight:700;color:var(--fg);padding-top:8px}
.pe-day-main{min-width:0}
.pe-moves{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.pe-move{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px;align-items:center;padding:8px 10px;background:var(--bg);border-radius:10px}
.pe-move-nm{font-size:13.5px;font-weight:700;min-width:0;overflow-wrap:anywhere}
.pe-move-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:3px}
.pe-tag{font-size:11px;padding:1px 7px;border-radius:5px;background:var(--card);color:var(--fg2);border:1px solid var(--line)}
.pe-tag.is-slot{background:var(--soft);color:var(--blue2);border-color:transparent}
.pe-params{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.pe-param{display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--fg2)}
.pe-param input{width:58px;min-height:36px;border:1px solid var(--line);border-radius:8px;padding:0 8px;font-size:12.5px;font-family:inherit;font-variant-numeric:tabular-nums;color:var(--fg);background:var(--card);text-align:right}
.pe-param input:focus{outline:none;border-color:var(--blue)}
.pe-param-u{color:var(--fg3)}
.pe-del{width:40px;height:40px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--fg3);font-size:15px;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.pe-del:hover{color:#ff3b30;border-color:#ff3b30}
.pe-add{min-height:44px;width:100%;border:1px dashed var(--line);border-radius:10px;background:transparent;color:var(--blue);font-size:13px;font-weight:700;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;font-family:inherit}
.pe-add:hover{border-color:var(--blue);background:var(--soft)}
.pe-add:disabled{color:var(--fg3);cursor:not-allowed;border-style:solid}
.pe-limit{font-size:11.5px;color:var(--fg3);margin:4px 0 0}

/* ── 选择层：动作库。桌面是居中抽屉，窄屏全屏 ── */
.pe-sheet{position:fixed;inset:0;z-index:40;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.28);padding:20px}
.pe-sheet.is-open{display:flex}
.pe-sheet-box{width:min(560px,100%);max-height:86vh;display:flex;flex-direction:column;background:var(--card);border-radius:18px;box-shadow:var(--shadow);overflow:hidden}
.pe-sheet-head{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--line)}
.pe-sheet-t{font-size:15px;font-weight:700}
.pe-sheet-x{margin-left:auto;width:44px;height:44px;border:0;background:transparent;color:var(--fg3);font-size:19px;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.pe-sheet-filters{padding:12px 18px 0;display:flex;flex-wrap:wrap;gap:6px}
.pe-filter{min-height:36px;padding:0 12px;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--fg2);font-size:12.5px;font-weight:700;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;font-family:inherit}
.pe-filter.is-on{background:var(--blue);border-color:var(--blue);color:#fff}
.pe-search{margin:12px 18px 0;min-height:44px;border:1.5px solid var(--line);border-radius:10px;padding:0 12px;font-size:14px;font-family:inherit;color:var(--fg)}
.pe-search:focus{outline:none;border-color:var(--blue)}
.pe-lib{list-style:none;margin:12px 0 0;padding:0 12px 14px;overflow:auto}
.pe-lib-row{display:flex;align-items:center;gap:10px;width:100%;min-height:56px;padding:8px 10px;border:1px solid transparent;border-radius:12px;background:transparent;text-align:left;cursor:pointer;font-family:inherit;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.pe-lib-row:hover{background:var(--soft);border-color:var(--blue)}
.pe-lib-row:disabled{cursor:not-allowed;opacity:.5}
.pe-lib-nm{font-size:14px;font-weight:700;color:var(--fg)}
.pe-lib-meta{font-size:11.5px;color:var(--fg3);margin-top:2px}
.pe-lib-src{margin-left:auto;font-size:11.5px;color:var(--fg3);text-align:right;flex:none}
.pe-lib-empty{padding:22px 18px;font-size:13px;color:var(--fg3);text-align:center}

/* ── 产物预览：编辑器把结果渲染成一张规范表，AI 拿到的就是它 ── */
.pe-out{margin:16px 0 0}
.pe-out-t{font-size:13.5px;font-weight:700;margin:0 0 8px}

/* ── 窄屏（820 · 同 HELP）：三层塌竖排、选择层全屏 ── */
@media (max-width:820px){
.pe-setup{gap:8px;padding:12px 14px}
.pe-count{margin-left:0;width:100%}
.pe-week-head{padding:12px 14px;gap:8px}
.pe-head-actions{margin-left:0;width:100%}
.pe-week-body{padding:4px 14px 12px}
.pe-day{grid-template-columns:1fr;gap:6px}
.pe-day-dow{padding-top:0}
.pe-move{grid-template-columns:1fr;gap:8px}
.pe-del{width:44px;height:44px;justify-self:end}
.pe-sheet{padding:0}
.pe-sheet-box{width:100%;max-height:100vh;height:100vh;border-radius:0}
}
`;
