/** T351-v14 · **计划编辑器**的页内样式（唯一产出者）。
 *
 * 与只读页相比，可写页多三样只读页没有的东西——**可点的行**、**可填的格**、**可选的选择层**，
 * 这三样要有自己的形状语言，且与只读页共用同一套 token（`--fg/--fg2/--fg3/--bg/--card/
 * --line/--blue/--blue2/--soft/--ok/--shadow`），否则一个技能里会长出两套观感。
 *
 * 三条纪律：① 只用冻结 token（`#ff3b30` 是本仓没有冻结对应、照老页写死的一档危险色，同 `reviewDocsCss.ts` 成例）；
 * ② 触摸目标 ≥44px、`-webkit-tap-highlight-color:transparent` ＋ `touch-action:manipulation`；
 * ③ 820 断点：窄屏把「日 → 段 → 参数」三层塌成竖排，选择层改全屏抽屉。
 * 页宽与页壳那一套不在这里，住姊妹件 `./pageChromeCss.ts`。
 */
export const PLAN_EDITOR_CSS = `
/* 设置条 */
.pe-setup{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0 0 12px;padding:14px 18px;background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow)}
.pe-lab{font-size:12.5px;font-weight:700;color:var(--fg2)}
.pe-pair{display:inline-flex;align-items:center;gap:8px;white-space:nowrap}
.pe-step{display:inline-flex;align-items:center;gap:2px;border:1px solid var(--line);border-radius:999px}
.pe-step button{min-width:44px;min-height:44px;border:0;background:transparent;color:var(--blue);font-size:19px;font-weight:700;cursor:pointer;border-radius:999px;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.pe-step button:disabled{color:var(--fg3);cursor:not-allowed}
.pe-step-n{min-width:52px;text-align:center;font-size:14px;font-weight:700;font-variant-numeric:tabular-nums}
.pe-date{min-height:44px;padding:0 14px;border:1.5px solid var(--line);border-radius:10px;background:var(--card);color:var(--fg);font-size:14px;font-family:inherit;font-weight:600;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.pe-date:hover{border-color:var(--blue);color:var(--blue)}
.pe-count{margin-left:auto;font-size:12.5px;color:var(--fg2);font-variant-numeric:tabular-nums}
/* 空态 */
.pe-empty{margin:0 0 14px;padding:34px 20px;text-align:center;background:var(--card);border:1px dashed var(--line);border-radius:16px}
.pe-empty-ico{color:var(--blue);margin-bottom:10px}
.pe-empty-t{font-size:16px;font-weight:700;margin:0 0 6px}
.pe-empty-d{font-size:13px;color:var(--fg2);margin:0 0 16px;line-height:1.7}
.pe-cta{min-height:44px;padding:0 22px;border:0;border-radius:999px;background:var(--blue);color:#fff;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.pe-cta:active{filter:brightness(.94)}
/* 周页签 */
/* 周页签：**单行横向滑动，不换行**（负责人 2026-09-15）。滚动条**显出来**——
   上一版在只读页把滚动条藏掉过，结果第 11、12 周等于看不见，这条教训在这里不重犯。 */
.pe-tabs{display:flex;flex-wrap:nowrap;gap:6px;margin:0 0 12px;overflow-x:auto;padding-bottom:6px;scrollbar-width:thin}
.pe-tabs::-webkit-scrollbar{height:6px}
.pe-tabs::-webkit-scrollbar-thumb{background:var(--line);border-radius:999px}
.pe-tab{flex:none;display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 14px;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--fg2);font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.pe-tab:hover{border-color:var(--blue);color:var(--blue)}
.pe-tab.is-on{background:var(--blue);border-color:var(--blue);color:#fff}
.pe-tab-b{font-size:10.5px;font-weight:700;padding:1px 6px;border-radius:999px;background:var(--soft);color:var(--blue2)}
.pe-tab.is-on .pe-tab-b{background:rgba(255,255,255,.24);color:#fff}
.pe-tab-add{border-style:dashed;color:var(--blue)}
/* 周标题条 */
.pe-weekbar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:0 0 10px}
.pe-week-t{font-size:15.5px;font-weight:700}
.pe-master{font-size:11.5px;font-weight:700;padding:2px 9px;border-radius:999px;background:var(--soft);color:var(--blue)}
.pe-lock{font-size:11.5px;font-weight:700;padding:2px 9px;border-radius:999px;background:var(--bg);color:var(--fg2)}
/* 周与日 */
.pe-week{background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);padding:4px 18px 14px}
/* 日页签：与周页签同形（负责人：周一到周日也做成页签切换），一次只显示一天。 */
.pe-daytabs{display:flex;flex-wrap:nowrap;gap:6px;margin:0 0 10px;overflow-x:auto;padding-bottom:6px;scrollbar-width:thin}
.pe-daytabs::-webkit-scrollbar{height:6px}
.pe-daytabs::-webkit-scrollbar-thumb{background:var(--line);border-radius:999px}
.pe-daytab{flex:none;min-width:62px;min-height:40px;padding:0 12px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--fg2);font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.pe-daytab:hover{border-color:var(--blue);color:var(--blue)}
.pe-daytab.is-on{background:var(--blue);border-color:var(--blue);color:#fff}
.pe-daytab .pe-daytab-n{font-size:11px;font-weight:600;opacity:.8;margin-left:4px}
.pe-day{padding:4px 0 0}
.pe-day:first-child{border-top:0}
.pe-dow{font-size:13.5px;font-weight:700;padding-top:10px}
.pe-day-main{min-width:0;display:flex;flex-direction:column;gap:10px}
.pe-hint{margin:0;font-size:12.5px;color:var(--fg3)}
/* 一次训练 */
.pe-sess{border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--card)}
.pe-sess.is-locked{background:var(--bg);border-style:dashed}
.pe-sess-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.pe-slot-set{display:inline-flex;flex-wrap:wrap;gap:4px}
.pe-slot{min-height:34px;padding:0 11px;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--fg3);font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.pe-slot:hover{border-color:var(--blue);color:var(--blue)}
.pe-slot.is-on{background:var(--soft);border-color:var(--blue);color:var(--blue2)}
.pe-slot:disabled{cursor:default}
.pe-slot:disabled:hover{border-color:var(--line);color:var(--fg3)}
.pe-slot.is-on:disabled{background:var(--soft);border-color:var(--blue);color:var(--blue2)}
.pe-slot-set .pe-slot{min-height:34px}
.pe-x{margin-left:auto;width:44px;height:44px;border:0;background:transparent;color:var(--fg3);font-size:15px;cursor:pointer;border-radius:10px;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.pe-x:hover{color:#ff3b30}
/* 动作行 */
.pe-moves{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}
.pe-move{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px;align-items:center;padding:8px 10px;background:var(--soft);border-radius:10px}
.pe-sess.is-locked .pe-move{background:var(--card)}
.pe-move-main{min-width:0}
.pe-move-nm{font-size:13.5px;font-weight:700;overflow-wrap:anywhere}
.pe-move-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.pe-tag{font-size:11px;padding:1px 7px;border-radius:5px;background:var(--card);color:var(--fg2);border:1px solid var(--line);white-space:nowrap}
.pe-tag.is-goal{background:var(--soft);color:var(--blue2);border-color:transparent}
.pe-params{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.pe-param{display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--fg2)}
.pe-param input{width:60px;min-height:38px;border:1px solid var(--line);border-radius:8px;padding:0 8px;font-size:12.5px;font-family:inherit;font-variant-numeric:tabular-nums;color:var(--fg);background:var(--card);text-align:right}
.pe-param input:focus{outline:none;border-color:var(--blue);box-shadow:0 0 0 3px rgba(0,122,255,.12)}
.pe-param-u{color:var(--fg3)}
.pe-mode{min-height:38px;padding:0 12px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--blue);font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.pe-lockico{display:inline-flex;align-items:center;color:var(--fg3)}
.pe-plain{font-size:12.5px;color:var(--fg2);font-variant-numeric:tabular-nums}
.pe-add{min-height:44px;width:100%;border:1px dashed var(--line);border-radius:10px;background:transparent;color:var(--blue);font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.pe-add:hover:not(:disabled){border-color:var(--blue);background:var(--soft)}
.pe-add:disabled{color:var(--fg3);cursor:not-allowed;border-style:solid}
.pe-add.sm{min-height:38px}
/* 选择层 */
.pe-sheet{position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.28);padding:20px}
.pe-sheet-box{width:min(620px,100%);max-height:86vh;display:flex;flex-direction:column;background:var(--card);border-radius:18px;box-shadow:var(--shadow);overflow:hidden}
.pe-sheet-head{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--line)}
.pe-sheet-t{font-size:15px;font-weight:700}
.pe-sheet-sub{font-size:12.5px;color:var(--fg3)}
.pe-sheet-filters{padding:12px 18px 0;display:flex;flex-wrap:wrap;gap:6px}
.pe-filter{min-height:36px;padding:0 12px;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--fg2);font-size:12.5px;font-weight:700;font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.pe-filter.is-on{background:var(--blue);border-color:var(--blue);color:#fff}
.pe-search{margin:12px 18px 0;min-height:44px;border:1.5px solid var(--line);border-radius:10px;padding:0 12px;font-size:14px;font-family:inherit;color:var(--fg)}
.pe-search:focus{outline:none;border-color:var(--blue)}
.pe-lib{list-style:none;margin:12px 0 0;padding:0 12px 14px;overflow:auto}
.pe-lib-row{display:flex;align-items:center;gap:10px;width:100%;min-height:56px;padding:8px 10px;border:1px solid transparent;border-radius:12px;background:transparent;text-align:left;cursor:pointer;font-family:inherit;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.pe-lib-row:hover:not(:disabled){background:var(--soft);border-color:var(--blue)}
.pe-lib-row:disabled{cursor:not-allowed;opacity:.5}
.pe-lib-nm{font-size:14px;font-weight:700}
.pe-lib-tags{display:flex;flex-wrap:wrap;gap:4px;margin-left:auto}
.pe-lib-empty{padding:22px 18px;font-size:13px;color:var(--fg3);text-align:center}
/* 新建时间段选时段 */
.pe-slotpick{margin-top:10px;border:1px dashed var(--blue);border-radius:12px;padding:10px 12px;background:var(--soft);display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.pe-slotpick-t{font-size:12.5px;font-weight:700;color:var(--blue2)}
.pe-slotpick .pe-slot-set .pe-slot{min-height:40px}
/* 起止时间两格：跟动作参数同一套输入形状，窄屏自动换行（段头已是 flex-wrap）。 */
.pe-time{display:inline-flex;align-items:center;gap:4px}
.pe-time input{min-height:38px;border:1px solid var(--line);border-radius:8px;padding:0 6px;font-size:12.5px;font-family:inherit;color:var(--fg);background:var(--card);font-variant-numeric:tabular-nums}
.pe-time input:focus{outline:none;border-color:var(--blue);box-shadow:0 0 0 3px rgba(0,122,255,.12)}
.pe-time-to{font-size:12px;color:var(--fg3)}
/* 产物区 */
.pe-out{margin:18px 0 0}
.pe-out-t{font-size:13.5px;font-weight:700;margin:0 0 8px}
/* 窄屏 */
@media (max-width:820px){
.pe-setup{gap:8px;padding:12px 14px}
.pe-count{margin-left:0;width:100%}
.pe-week{padding:4px 14px 12px}
.pe-day{grid-template-columns:1fr;gap:6px}
.pe-dow{padding-top:0}
.pe-move{grid-template-columns:1fr;gap:8px}
.pe-move .pe-x{justify-self:end}
.pe-sheet{padding:0}
.pe-sheet-box{width:100%;max-height:100vh;height:100vh;border-radius:0}
}
`;
