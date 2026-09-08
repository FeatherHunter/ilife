# 视觉标杆 Design Specification — extraction for the TypeScript HELP page

**Sources (read in full, 858 + 1058 lines):**

| # | File | Bytes | Lines |
|---|---|---|---|
| B1 | `D:\2Study\StudyNotes\SKILLS\卡路里\templates\临时样例\统一主面板_视觉标杆.html` | 23,444 | 858 |
| B2 | `D:\2Study\StudyNotes\SKILLS\卡路里\templates\临时样例\沉浸主面板_视觉标杆v2.html` | 29,644 | 1058 |
| C1 | `D:\2Study\StudyNotes\SKILLS\卡路里\templates\设计审查报告.html` | 40,574 | 713 |

Short names used below: **B1** = 统一主面板, **B2** = 沉浸主面板v2, **C1** = 设计审查报告.

The directory `D:\2Study\StudyNotes\SKILLS\卡路里\.个人笔记不允许参考` was never read, listed, globbed, grepped or enumerated; every command was scoped to explicit file paths outside it. The OLD tree was treated read-only; the only write was `D:\ilife\.scratch\research\benchmark-visual-spec.md`.

---

## 0. The decisive context fact

C1 explicitly names **B1 as the canonical unified target**, not B2:

- `设计审查报告.html:655-657` — "十、视觉标杆(统一后的最好看版本) … `templates/临时样例/统一主面板_视觉标杆.html`"
- `设计审查报告.html:660-662` — B1's skeleton is `home_dashboard`'s 4-段式 (hero + KPI + todo + logs + actions); its 56px hero-number + SVG trend comes from `weight_log_receipt`; its copy animation + iOS Toast from `help_center`.
- `设计审查报告.html:666-673` — the checklist B1 claims to satisfy (A-system token, gradient-free hero, A-system input, single bottom copy button, no emoji-in-title / no gradient text / no tri-color gradient / no gold-silver-bronze / no pulse, carded tables + 12px th + `--lineS` separators, ring + dual-line SVG trend, 400px breakpoint + Toast safe-area).

**B2 appears nowhere in C1.** B2 is a later, unratified exploration.

---

## 1. Design tokens

### 1.1 Colour tokens — B1 (`统一主面板_视觉标杆.html:17-43`)

| Token | Value | Role | Line |
|---|---|---|---|
| `--bg` | `#ffffff` | declared, **never referenced** (dead token) | 18 |
| `--bg-soft` | `#f5f5f7` | inset surfaces: `.trend-stat`, `.todo-row .check`, `.priority.low`, input background, `.cmd-row` background, ring track | 19 |
| `--bg-section` | `#fafafa` | page background on `body` | 20 |
| `--card` | `#ffffff` | card surface: `.hero-number`, `.kpi`, `.section`, input `:focus`, `.empty` | 21 |
| `--ink` | `#1d1d1d` | primary text, `.copy-all` bg, `.toast` bg | 22 |
| `--ink2` | `#3c3c43` | secondary text (input text, `.cmd-row` text, `.copy-mini` text) | 23 |
| `--ink3` | `#8e8e93` | tertiary/hint text, units, meta | 24 |
| `--line` | `rgba(60,60,67,.12)` | hard borders: `.check` ring, `.copy-mini` border, `#backTop` border | 25 |
| `--lineS` | `rgba(60,60,67,.06)` | soft borders: card outline, row separators, gridlines | 26 |
| `--accent` | `#007aff` | iOS System Blue — the **only** primary colour | 27 |
| `--accent-soft` | `rgba(0,122,255,.08)` | input focus ring, `.badge.ok`, trend area fill, focus halo | 28 |
| `--green` | `#34c759` | success: `good` badge, done check, burn calories, `.copy-all.copied` | 29 |
| `--green-soft` | `rgba(52,199,89,.10)` | success surface | 30 |
| `--orange` | `#ff9500` | warning text | 31 |
| `--orange-soft` | `rgba(255,149,0,.10)` | warning surface | 32 |
| `--red` | `#ff3b30` | danger text | 33 |
| `--red-soft` | `rgba(255,59,48,.10)` | danger surface | 34 |

No gradient tokens, no `--purple`, no dark tokens.

### 1.2 Colour tokens — B2 (`沉浸主面板_视觉标杆v2.html:16-56`)

**Dark-region tokens (B2 only):**

| Token | Value | Role | Line |
|---|---|---|---|
| `--dark` | `#000000` | immersive hero background; `.field-dark :focus` background | 18 |
| `--dark-2` | `#1c1c1e` | `.input-block` background, `.toast` background | 19 |
| `--dark-3` | `#2c2c2e` | `.field-dark input/select` background | 20 |
| `--dark-ink` | `#ffffff` | text on dark | 21 |
| `--dark-ink2` | `rgba(235,235,245,.6)` | secondary text on dark (`.date`, `.ib-sub`, `.status-chip`) | 22 |
| `--dark-ink3` | `rgba(235,235,245,.3)` | tertiary text on dark (`.lbl`, `.sub`, `.unit`) | 23 |
| `--dark-line` | `rgba(255,255,255,.08)` | borders on dark (`.status-chip`, `.field-dark`, `.toast`) | 24 |
| `--dark-lineS` | `rgba(255,255,255,.04)` | declared, **never referenced** (dead token) | 25 |

**Light-region tokens — byte-identical to B1** (`沉浸主面板_视觉标杆v2.html:27-35`): `--bg` `#ffffff` (27, dead), `--bg-soft` `#f5f5f7` (28), `--bg-section` `#fafafa` (29), `--card` `#ffffff` (30, **never referenced** — B2's editorial KPI grid has no card surfaces), `--ink` `#1d1d1d` (31), `--ink2` `#3c3c43` (32), `--ink3` `#8e8e93` (33), `--line` `rgba(60,60,67,.12)` (34), `--lineS` `rgba(60,60,67,.06)` (35).

**Semantic colours — B2 re-values them to iOS *dark-mode* values and adds pink:**

| Token | B1 | B2 | B2 line |
|---|---|---|---|
| `--accent` | `#007aff` | **`#0a84ff`** | 37 |
| `--accent-soft` | `rgba(0,122,255,.08)` | **`rgba(10,132,255,.15)`** | 38 |
| `--green` | `#34c759` | **`#30d158`** | 39 |
| `--green-soft` | `rgba(52,199,89,.10)` | **`rgba(48,209,88,.15)`** | 40 |
| `--orange` | `#ff9500` | **`#ff9f0a`** | 41 |
| `--orange-soft` | `rgba(255,149,0,.10)` | **`rgba(255,159,10,.15)`** | 42 |
| `--red` | `#ff3b30` | **`#ff453a`** | 43 |
| `--red-soft` | `rgba(255,59,48,.10)` | **`rgba(255,69,58,.15)`** | 44 |
| `--pink` | — | `#ff375f` (Move ring + legend dot only) | 45 |
| `--pink-soft` | — | `rgba(255,55,95,.15)` — declared, **never referenced** | 46 |

> **Conflict to resolve before the rewrite:** B2's `#0a84ff` contradicts the ratified A-system `#007aff` (C1:398, C1:604-605, C1:666). Adopt `#007aff`.

### 1.3 Gradients (complete inventory — 3 total, all in B2)

| Value | Where | Line |
|---|---|---|
| `radial-gradient(circle,rgba(10,132,255,.18),transparent 55%)` | `.hero-dark::before` glow, 600×600px at `top:-40%;right:-20%` | 85 |
| `linear-gradient(90deg,transparent,var(--line),transparent)` | `.transition-band`, height 1px | 652 |
| inline `background:var(--accent)` / `var(--green)` / `var(--ink3)` on `.trend-legend .swatch` | legend swatches (flat, not gradients) | 843-845 |

**B1 contains zero gradients** — the only fills are flat tokens. This is why B1 is the "no dirty gradient" reference.

### 1.4 Type scale

**Font-family stacks (verbatim):**

| Role | Value | Where | Line |
|---|---|---|---|
| Body (B1) | `-apple-system,BlinkMacSystemFont,"SF Pro Display","PingFang SC","Microsoft YaHei",sans-serif` | `body` | B1:47 |
| Body (B2) | `-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","PingFang SC","Microsoft YaHei",sans-serif` | `body` | B2:60 |
| Mono | `"SF Mono",monospace` | `.log-row .time` (B1:382), `.cmd-row` (B1:449), `.tl-time` (B2:400), `.cmd-text` (B2:576) | — |
| Body (C1, for comparison) | same as B1 stack | `body` | C1:42 |

B2 adds `"SF Pro Text"`; B1 omits it. Both set `font-feature-settings:"tnum","ss01"` on `body` (B1:53, B2:66) and `"tnum"` on every numeric element.

**B1 scale (px):**

| Element | size | weight | letter-spacing | line-height | Line |
|---|---|---|---|---|---|
| `.hero .eyebrow` | 13 | 600 | `.5px` (uppercase) | inherit 1.5 | 63-67 |
| `.hero h1` | 32 | 700 | `-.4px` | 1.2 | 71-74 |
| `.hero .sub` | 15 | 400 | — | — | 79-81 |
| `.hero .status-pill` | 13 | 600 | — | — | 91-92 |
| `.hero-number .label` | 13 | 600 | `.4px` (uppercase) | — | 120-124 |
| `.hero-number .big` | **56** | 700 | `-1.2px` | 1 | 128-131 |
| `.hero-number .big .unit` | 20 | 500 | — | — | 136-138 |
| `.hero-number .meta` | 13 | — | — | — | 142-144 |
| `.hero-number .ring .pct` | 15 | 700 | — | — | 157-159 |
| `.kpi .label` | 13 | 500 | — | — | 182-184 |
| `.kpi .icon` | 13 | — | — | — | 194 |
| `.kpi .value` | **28** | 700 | `-.7px` | 1 | 202-207 |
| `.kpi .unit` | 14 | 500 | — | — | 210-212 |
| `.kpi .detail` | 12 | — | — | — | 215-217 |
| `.kpi .badge` | 11 | 600 | — | — | 221-224 |
| `.section-title h2` | **17** | 600 | `-.2px` | — | 248-250 |
| `.section-title .hint` | 12 | — | — | — | 254-255 |
| `.trend-stat .label` | 11 | — | `.4px` (uppercase) | — | 276-280 |
| `.trend-stat .value` | 18 | 700 | — | — | 283-285 |
| `.todo-row .label` | 14 | 500 | — | — | 324-326 |
| `.todo-row .meta` | 11.5 | — | — | — | 333-335 |
| `.todo-row .priority` | 10.5 | 600 | — | — | 338-341 |
| `.log-row .name` | 15 | 500 | — | — | 369-371 |
| `.log-row .name-nutri` | 11.5 | — | — | — | 374-376 |
| `.log-row .time` | 13 (mono) | — | — | — | 379-382 |
| `.log-row .cal` | 13 | 500 | — | — | 385-387 |
| `.log-section-title` | 13 | 600 | `.3px` (uppercase) | — | 401-405 |
| `.field label` | 13 | 500 | — | — | 417-419 |
| `.field input/select/textarea` | 15 | — | — | — | 426 |
| `.cmd-row` | 12.5 (mono) | — | — | — | 450 |
| `.cmd-row .label` | 14 | 600 | — | — | 461-463 |
| `.copy-mini` | 11 | — | — | — | 478 |
| `.copy-all` | 13 | 600 | — | — | 508-509 |
| `.toast` | 13 | 500 | — | — | 530-531 |
| `.empty .icon` | 40 | — | — | — | 551 |
| `.empty h3` | 17 | 600 | — | — | 552 |
| `.empty p` | 13 | — | — | — | 553 |
| `footer` | 12 | — | — | — | 558 |
| Mobile `.hero h1` ≤640px | 26 | 700 | — | — | 587 |
| Mobile `.hero-number .big` ≤640px | 44 | 700 | — | — | 589 |

**B2 scale (px) — adds editorial extremes:**

| Element | size | weight | letter-spacing | line-height | Line |
|---|---|---|---|---|---|
| `.hero-dark .eyebrow` | 12 | 600 | `1.2px` (uppercase) | — | 89-91 |
| `.hero-dark h1` | **40** | 700 | `-.6px` | 1.1 | 104-107 |
| `.hero-dark .date` | 15 | 400 | — | — | 112-114 |
| `.rings-center .big` | 42 | 700 | `-1px` | 1 | 142-145 |
| `.rings-center .lbl` | 11 | — | `.5px` (uppercase) | — | 149-152 |
| `.ring-item .name` | 14 | 600 | — | — | 173-175 |
| `.ring-item .sub` | 12 | — | — | — | 178-179 |
| `.ring-item .val` | 18 | 700 | — | — | 182-184 |
| `.ring-item .val .unit` | 11 | 400 | — | — | 189-191 |
| `.status-chip` | 12.5 | 500 | — | — | 211-213 |
| `.edit-title h2` | **24** | 700 | `-.4px` | — | 250-252 |
| `.edit-title .num` | 13 | 600 | `.5px` | — | 256-259 |
| `.lead-stat .lead-num` | **80** | 700 | `-2.5px` | **.9** | 274-277 |
| `.lead-stat .lead-num .unit` | 24 | 500 | `0` | — | 282-286 |
| `.lead-stat .lead-label` | 12 | 600 | `.6px` (uppercase) | — | 295-299 |
| `.lead-stat .lead-desc` | 14 | — | — | 1.55 | 303-305 |
| `.kpi .label` | 11 | 600 | `.5px` (uppercase) | — | 322-326 |
| `.kpi .value` | **30** | 700 | `-.8px` | 1 | 330-335 |
| `.kpi .value .unit` | 13 | 500 | — | — | 338-340 |
| `.kpi .delta` | 12 | 600 | — | — | 344-347 |
| `.trend-caption` | 11 | — | `.4px` (uppercase) | — | 366-368 |
| `.tl-time` | 13 (mono) | 600 | — | — | 396-400 |
| `.tl-time .ampm` | 10 | 500 | `.3px` | — | 403-407 |
| `.tl-body .tl-title` | 15 | 600 | — | — | 410-412 |
| `.tl-body .tl-desc` | 13 | — | — | 1.5 | 416-417 |
| `.tl-tag` | 10.5 | 500 | — | — | 424-428 |
| `.tl-val` | 16 | 700 | — | — | 433-435 |
| `.todo-item .todo-no` | 13 | 700 | — | — | 458-460 |
| `.todo-item .todo-text` | 15 | 500 | — | — | 474-475 |
| `.todo-item .todo-meta` | 12 | — | — | — | 483-484 |
| `.todo-item .pri` | 10.5 | 700 | `.3px` | — | 488-492 |
| `.input-block .ib-title` | 18 | 600 | — | — | 506-507 |
| `.input-block .ib-sub` | 13 | — | — | — | 511-512 |
| `.field-dark label` | 12 | 600 | `.4px` (uppercase) | — | 519-521 |
| `.field-dark input/select` | 15 | — | — | — | 528 |
| `.cmd-item .cmd-no` | 11 | 700 | — | — | 558-560 |
| `.cmd-item .cmd-label` | 13 | 600 | — | — | 568-569 |
| `.cmd-item .cmd-text` | 13 (mono) | — | — | — | 574-576 |
| `.copy-mini` | 11 | 600 | — | — | 586 |
| `.copy-all` | 13 | 600 | — | — | 617 |
| Mobile `.hero-dark h1` ≤640px | 30 | — | — | — | 686 |
| Mobile `.lead-num` ≤640px | 60 | — | — | — | 692 |

**Hierarchy rule (the binding one, from C1:349):** `56px hero-number > 28px KPI value > 17px section h2 > 15px body > 13px hint`; **each step ≥4px, weight step ≥100.** B1 obeys this exactly. B2 keeps the same *kind* of ladder but at editorial magnitudes (`80 > 30 > 24 > 15 > 13`) and its KPI label drops to 11px (B2:322) — below B1's 13px floor.

### 1.5 Spacing

**There is no spacing-token scale.** No `--space-*`, `--gap-*` or `--pad-*` custom properties exist in either file. All spacing is literal. Observed literal values (this *is* the de-facto scale — 2px granularity, heavy reuse of 6/8/10/12/14/16/20/24/28/32):

| Value | Representative uses | Line |
|---|---|---|
| 2px | `.kpi .badge` padding-y | B1:223 |
| 3px | `.kpi .main` gap; `.copy-mini` padding-y | B1:199, B1:477 |
| 4px | `.tl-tag` radius pad-y; `.kpi .value .unit` margin-left | B2:425, B2:341 |
| 5px | `.kpi .label` gap | B1:188 |
| 6px | `.field` gap; `.status-pill`/`.status-chip`/`.copy-all` gap; `.tl-tags` gap | B1:413, B1:86, B1:503; B2:516, B2:421 |
| 8px | `.kpi .detail` margin-top; `.cmd-list` gap; `.hero-status` gap; `.copy-all` margin-top | B1:217, B1:441, B1:512; B2:198, B2:621 |
| 10px | `.log-row` gap; `.cmd-row` gap | B1:358, B1:444 |
| 11px | `.todo-row` padding-y; `.field input` padding-y | B1:300, B1:425 |
| 12px | `.kpi-grid` gap; `.trend-stats` gap; `.status-pill` padding-x; `.field-dark input` padding-y | B1:166, B1:267, B1:87; B2:527 |
| 14px | `.todo-row` gap; `.cmd-row` padding-x; `.rings-legend` gap; `.todo-item` padding-y | B1:299, B1:446; B2:158, B2:452 |
| 16px | `.section` margin-bottom; `.section-title` margin-bottom; `.todo-item`/`.cmd-item` gap; `.copy-all` margin-top | B1:237, B1:245; B2:451, B2:551, B2:621 |
| 18px | `.kpi` padding-x | B1:172; B2:316 |
| 20px | `.kpi` padding-y; `.hero` margin-bottom; `.todo-empty` padding; `.tl-row` gap; `.edit-title` margin-bottom | B1:172, B1:60, B1:348; B2:389, B2:245 |
| 24px | `.hero-number` gap; `.section` padding-y; `.toast` inset; `.edit-title` border pad | B1:116, B1:236, B1:524; B2:246 |
| 28px | `.hero-number` padding-y; `.hero` padding-x; `.input-block` padding-y | B1:110, B1:59; B2:502 |
| 32px | `.wrap` padding-top; `.hero` padding-top; `.hero-number` padding-x; `.rings` gap; `.lead-stat` gap | B1:55, B1:59, B1:110; B2:123, B2:267 |
| 36px | `.rings` gap | B2:123 |
| 40px | `.hero-dark` padding-x; `.editorial` padding-x | B2:76, B2:236 |
| 48px | `.hero-dark` padding-top; `.edit-section` margin-bottom; `.input-block` margin-bottom; `footer` margin-top | B2:76, B2:240, B2:503, B2:660 |
| 56px | `.hero-dark` padding-bottom | B2:76 |
| 80px | `.wrap` padding-bottom | B1:55; B2:68 |

Canonical page padding per C1:645 — **`32px 20px 80px`** (B1:55 and C1:49 both match; B2:68 uses `0 0 80px` because its hero is full-bleed inside the wrapper).

### 1.6 Border radius

| Token | Value | Where used | Line |
|---|---|---|---|
| `--r-sm` | `8px` | `.field input/select/textarea`, `.cmd-row`, `.field-dark input` | B1:38, used 424, 448; B2:50, used 526 |
| `--r` | `14px` | `.kpi` | B1:39, used 171 |
| `--r-lg` | `20px` | `.hero-number`, `.section`, `.empty`, `.input-block` | B1:40, used 109, 235, 548; B2:52, used 501 |
| `--r-xl` | `28px` | **B2 only, declared, never referenced (dead)** | B2:53 |
| `999px` | pill | `.status-pill`, `.priority`, `.status-chip`, `.copy-all`, `.toast` | B1:88, 341, 506, 529; B2:208, 615, 638 |
| `10px` | literal | `.trend-stat` | B1:273 |
| `6px` | literal | `.kpi .badge`, `.copy-mini` | B1:224, 476; B2:584 |
| `4px` | literal | `.tl-tag`, `.todo-item .pri` | B2:426, 491 |
| `50%` | circle | `.check`, `.ring-dot`, `#backTop`, status dots | B1:102, 306, 568; B2:167, 228, 669 |

Note the two files disagree on tag radius: B1 uses `6px` for `.badge`, B2 uses `4px` for `.tl-tag`/`.pri` — a small divergence to normalise.

### 1.7 Shadows

| Token | Value | Where | Line |
|---|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,.04)` | `.kpi`, `.section` | B1:35, used 173, 238 |
| `--shadow` | `0 1px 3px rgba(0,0,0,.04),0 8px 24px rgba(0,0,0,.04)` | `.hero-number`, `.kpi:hover`, `.copy-all:hover`, `#backTop` | B1:36, used 112, 179, 515, 577 |
| `--shadow-lg` | `0 2px 8px rgba(0,0,0,.06),0 16px 40px rgba(0,0,0,.06)` | `.toast` | B1:37, used 532 |
| `--shadow-sm` | identical value | **B2 declares it but never uses it** | B2:47 |
| `--shadow` | identical value | B2 `.copy-all:hover`, `#backTop` | B2:48, used 624, 678 |
| `--shadow-lg` | identical value | B2 `.toast` | B2:49, used 641 |
| glow | `box-shadow:0 0 12px var(--pink)` / `var(--green)` / `var(--accent)` | B2 `.ring-dot` — the only coloured shadow in either file | B2:169-171 |

Both files share byte-identical shadow values with B1 (and with C1:31-32). C1:404 characterises the A-system shadow as "双层极轻".

### 1.8 Transitions / easing / animation

| Token | Value | Line |
|---|---|---|
| `--ease` | `cubic-bezier(.4,0,.2,1)` | B1:41; B2:54 |
| `--ease-spring` | `cubic-bezier(.34,1.56,.64,1)` | B1:42; B2:55 |

| Transition | Duration / easing | Element | Line |
|---|---|---|---|
| `transform .2s var(--ease),box-shadow .2s var(--ease)` | 200ms | `.kpi:hover` lift | B1:175 |
| `all .2s var(--ease)` | 200ms | `.field` inputs, `.copy-mini`, `.copy-all`, `#backTop` opacity, `.check` | B1:429, 482, 513, 580, 314 |
| `all .15s var(--ease)` | 150ms | `.cmd-row:hover` | B1:453 |
| `transform .35s var(--ease-spring)` | 350ms spring | `.toast` slide-in | B1:534; B2:643 |
| `animation:copySuccess .45s var(--ease-spring)` | 450ms spring | `.copy-mini.copied`, `.copy-all.copied` | B1:493, 518; B2:602, 627 |
| `opacity .2s var(--ease)` | 200ms | `#backTop` | B1:580; B2:680 |

**Keyframes (one, shared verbatim except the peak scale):**

```css
@keyframes copySuccess{0%{transform:scale(1)}40%{transform:scale(1.12)}100%{transform:scale(1)}}   /* B1:495-499 */
@keyframes copySuccess{0%{transform:scale(1)}40%{transform:scale(1.15)}100%{transform:scale(1)}}   /* B2:604-608 */
```

B1 also uses `transform:scale(1.05)` on `.todo-row.done .check` (B1:320). No `pulse`, no infinite animation, no `transition` on colour-only hover except the above. **`prefers-reduced-motion` is absent from both files.**

---

## 2. Layout system

### 2.1 Page shell

Both files: `body` → single `.wrap` → (header/sections) → `<footer>`; `#backTop` and `.toast` are siblings of `.wrap` at the end of `body`.

```
B1: body > .wrap > header.hero, div.hero-number, div.kpi-grid,
            section.section ×5, footer
    body > a#backTop, div.toast#toast                       (B1:603-816)
B2: body > .wrap > header.hero-dark, div.transition-band,
            div.editorial > section.edit-section ×5, footer
    body > a#backTop, div.toast#toast                       (B2:710-1016)
```

| Property | B1 | B2 |
|---|---|---|
| `.wrap` max-width | **960px** (B1:55) | **1040px** (B2:68) |
| `.wrap` padding | `32px 20px 80px` (B1:55) | `0 0 80px` + `overflow:hidden` (B2:68) |
| Background | `body` = `var(--bg-section)` `#fafafa` (B1:48) | same (B2:61) |
| Horizontal gutters | `.wrap` 20px (B1:55) | `.hero-dark` 40px (B2:76) + `.editorial` 40px (B2:236); mobile 20px (B2:685, 690) |
| `.wrap` `overflow` | none | `hidden` (B2:68) — clips the hero glow |

C1:49 uses `max-width:1040px;padding:32px 20px 80px`; C1:645 mandates `body padding:32px 20px 80px` library-wide.

### 2.2 Grid / flex definitions (every one, verbatim)

**B1:**

| Selector | Definition | Line |
|---|---|---|
| `.hero-number` | `display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center` | 114-117 |
| `.kpi-grid` | `display:grid;grid-template-columns:repeat(4,1fr);gap:12px` | 164-166 |
| `.kpi .main` | `display:flex;align-items:baseline;gap:3px` | 196-200 |
| `.kpi .label` | `display:flex;align-items:center;gap:5px` | 185-188 |
| `.trend-stats` | `display:grid;grid-template-columns:repeat(3,1fr);gap:12px` | 265-267 |
| `.todo-list` | `display:flex;flex-direction:column;gap:0` | 291-295 |
| `.todo-row` | `display:flex;align-items:center;gap:14px` | 296-301 |
| `.log-list` | `display:flex;flex-direction:column` | 354 |
| `.log-row` | `display:grid;grid-template-columns:44px 1fr auto;gap:10px;align-items:center` | 355-362 |
| `.field` | `display:flex;flex-direction:column;gap:6px` | 410-415 |
| `.cmd-list` | `display:flex;flex-direction:column;gap:8px` | 441 |
| `.cmd-row` | `display:flex;align-items:center;gap:10px` | 442-454 |
| `.section-title` | `display:flex;align-items:baseline;justify-content:space-between` | 241-246 |
| `.hero .status-pill` | `display:inline-flex;align-items:center;gap:6px` | 84-88 |
| `.copy-all` | `display:inline-flex;align-items:center;gap:6px` | 501-506 |

**B2:**

| Selector | Definition | Line |
|---|---|---|
| `.rings` | `display:grid;grid-template-columns:auto 1fr;gap:36px;align-items:center` | 121-124 |
| `.ring-item` | `display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center` | 161-165 |
| `.rings-legend` | `display:flex;flex-direction:column;gap:14px` | 155-159 |
| `.hero-status` | `display:flex;gap:8px;flex-wrap:wrap` | 196-202 |
| `.edit-title` | `display:flex;align-items:baseline;justify-content:space-between` | 241-248 |
| `.lead-stat` | `display:grid;grid-template-columns:1.2fr 1fr;gap:32px;align-items:end` | 264-272 |
| `.kpi-grid` | `display:grid;grid-template-columns:repeat(4,1fr);gap:0` | 309-314 |
| `.trend-caption` | `display:flex;justify-content:space-between` | 362-370 |
| `.trend-legend` | `display:flex;gap:16px` | 371-373 |
| `.timeline` | `display:flex;flex-direction:column` | 382-385 |
| `.tl-row` | `display:grid;grid-template-columns:72px 1fr auto;gap:20px;align-items:start` | 386-393 |
| `.tl-body .tl-tags` | `display:flex;gap:6px;flex-wrap:wrap` | 420-422 |
| `.todo-edit` | `display:flex;flex-direction:column;counter-reset:todo` | 443-447 |
| `.todo-item` | `display:grid;grid-template-columns:32px 1fr auto;gap:16px;align-items:center` | 448-455 |
| `.field-dark` | `display:flex;flex-direction:column;gap:6px` | 515-517 |
| `.cmd-edit` | `display:flex;flex-direction:column;counter-reset:cmd` | 543-547 |
| `.cmd-item` | `display:grid;grid-template-columns:40px 1fr auto;gap:16px;align-items:center` | 548-555 |
| `.copy-all` | `display:inline-flex;align-items:center;gap:6px` | 610-615 |

### 2.3 Breakpoints — what changes at each

**B1 — `@media (max-width:640px)` (B1:584-594):**

| Change | Value | Line |
|---|---|---|
| `.wrap` padding | `20px 16px 60px` | 585 |
| `.hero` padding | `24px 20px 20px` | 586 |
| `.hero h1` | 26px | 587 |
| `.hero-number` | `grid-template-columns:1fr` (ring stacks under text), padding `22px 20px` | 588 |
| `.hero-number .big` | 44px | 589 |
| `.hero-number .ring` | 72×72px, `margin:0 auto` | 590 |
| `.kpi-grid` | `repeat(2,1fr)` | 591 |
| `.section` padding | `18px 20px` | 592 |
| `.trend-stats` | `1fr` (stacks) | 593 |

**B1 — `@media (max-width:400px)` (B1:595-599):**

| Change | Value | Line |
|---|---|---|
| `.kpi-grid` | `1fr` (single column) | 596 |
| `.toast` | `left:12px;right:12px;transform:translateY(120%);max-width:none`; `.show` → `translateY(0)` (drops the centring transform) | 597-598 |

**B2 — `@media (max-width:640px)` (B2:684-699):**

| Change | Value | Line |
|---|---|---|
| `.hero-dark` padding | `32px 20px 40px` | 685 |
| `.hero-dark h1` | 30px | 686 |
| `.rings` | `grid-template-columns:1fr;gap:24px;justify-items:center;text-align:center` | 687 |
| `.rings-svg` | 180×180px | 688 |
| `.rings-legend` | `width:100%` | 689 |
| `.editorial` padding | `32px 20px 0` | 690 |
| `.lead-stat` | `grid-template-columns:1fr;gap:16px` | 691 |
| `.lead-stat .lead-num` | 60px | 692 |
| `.kpi-grid` | `repeat(2,1fr);gap:0` | 693 |
| `.kpi` | `border-left:none;padding-left:0;padding-top:16px;border-top:1px solid var(--lineS)` — dividers flip from vertical to horizontal | 694 |
| `.kpi:first-child`, `.kpi:nth-child(2)` | `border-top:none;padding-top:0` | 695-696 |
| `.tl-row` | `grid-template-columns:56px 1fr auto;gap:12px` | 697 |
| `.input-block` padding | `20px` | 698 |

**B2 — `@media (max-width:400px)` (B2:700-706):**

| Change | Value | Line |
|---|---|---|
| `.kpi-grid` | `1fr` | 701 |
| `.kpi` | `border-top:1px solid var(--lineS)!important;padding-top:14px!important` | 702 |
| `.kpi:first-child` | `border-top:none!important` | 703 |
| `.toast` | `left:12px;right:12px;transform:translateY(120%)`; `.show` → `translateY(0)` | 704-705 |

Both breakpoints are the **same two values (640 / 400)**; C1:673 calls the 400px breakpoint part of the benchmark contract. No intermediate tablet breakpoint exists in either file.

### 2.4 Sticky / fixed elements

| Element | Position | Spec | Line |
|---|---|---|---|
| `.toast` | `position:fixed;bottom:24px;left:50%` | translateX(-50%) translateY(120%) → `.show` translateY(0); `z-index:9999`; `pointer-events:none` | B1:522-541; B2:631-647 |
| `#backTop` | `position:fixed;bottom:24px;right:24px` | 42×42px circle, `border-radius:50%`, `background:rgba(255,255,255,.85)`, `backdrop-filter:saturate(180%) blur(20px)` (+ `-webkit-`), `border:1px solid var(--line)`, 18px/600 `↑`, `opacity:0;pointer-events:none` → `.show` `opacity:1` | B1:564-582; B2:665-682 |

**No `position:sticky` anywhere.** No sticky header, no sticky table header, no sticky section nav. Both files' `#backTop` appears when `window.scrollY > 400` (B1:852, B2:1052).

### 2.5 Card composition

**B1 (card-based):** every content block is a bordered + shadowed white card.

- `.hero-number` — `background:var(--card)`, `border-radius:var(--r-lg)` 20px, `padding:28px 32px`, `box-shadow:var(--shadow)`, `border:1px solid var(--lineS)` (B1:107-118)
- `.section` — `background:var(--card)`, radius 20px, `padding:24px 28px`, `margin-bottom:16px`, `box-shadow:var(--shadow-sm)`, `border:1px solid var(--lineS)` (B1:233-240)
- `.kpi` — `background:var(--card)`, radius 14px, `padding:20px 18px`, `box-shadow:var(--shadow-sm)`, `border:1px solid var(--lineS)`, hover `translateY(-2px)` + `var(--shadow)` (B1:169-180)
- `.empty` — card + 20px radius + `--lineS` border, no shadow (B1:544-550)
- `.hero` — **no background, no border, no shadow** (B1:58-61). This is C1:613's mandated "无背景 hero".

**B2 (editorial, mostly card-less):** only two surfaces exist.

- `.input-block` — `background:var(--dark-2)`, radius 20px, `padding:28px 32px`, `margin-bottom:48px` (B2:498-504)
- `.kpi` — **no card**: `padding:20px 18px 20px 0;padding-left:20px;border-left:1px solid var(--lineS)`, `:first-child` removes the border and left padding (B2:315-320). Separation is by hairline + whitespace, per B2:308's comment "无卡片边框,靠留白分隔".
- `.edit-title` — the section header is a rule, not a card: `border-bottom:2px solid var(--ink)`, `padding-bottom:12px`, `margin-bottom:20px` (B2:241-248).

---

## 3. Component shapes

Legend: all class names are verbatim; `×N` = repetition.

### 3.1 KPI card — B1

```html
<div class="kpi">
  <div class="label"><span class="icon">🔥</span>摄入<span class="badge warn">82%</span></div>
  <div class="main"><span class="value">1,640</span><span class="unit">卡</span></div>
  <div class="detail">目标 2,000 · 合规 6/7 天</div>
</div>
```
(B1:632-636; four instances 632-651.)

- Container: grid `repeat(4,1fr)`, gap 12px (B1:164-166); card = white, radius 14px, `padding:20px 18px`, `--shadow-sm`, 1px `--lineS` border (B1:169-175); hover `translateY(-2px)` + `--shadow` (B1:177-180).
- `.label`: flex row, gap 5px, 13px/500, `--ink3`, `margin-bottom:8px` (B1:181-189). `.icon` 18×18 inline-flex, 13px (B1:190-195) — **emoji live here, never in `h1`** (C1:687-688).
- `.badge`: `margin-left:auto`, 11px/600, `padding:2px 8px`, radius 6px; variants `.good` green-soft, `.ok` accent-soft, `.warn` orange-soft, `.bad` red-soft (B1:219-230).
- `.main`: flex baseline, gap 3px (B1:196-200). `.value`: 28px/700, ls `-.7px`, `line-height:1`, `tnum` (B1:201-208). `.unit`: 14px/500 `--ink3` (B1:209-213).
- `.detail`: 12px `--ink3`, `margin-top:8px` (B1:214-218).

### 3.2 KPI tile — B2 (card-less)

```html
<div class="kpi">
  <div class="label">摄入</div>
  <div class="value">1,640<span class="unit">卡</span></div>
  <div class="delta down">↓ 12% vs 昨日</div>
</div>
```
(B2:798-802; four instances 798-817.)

- Same 4-col grid but `gap:0` (B2:309-314); each cell `padding:20px 18px 20px 0;padding-left:20px;border-left:1px solid var(--lineS)` (B2:315-319); first cell loses border + left padding (B2:320).
- `.label` 11px/600 uppercase ls `.5px` `--ink3` (B2:321-328) — **smaller than B1's 13px**.
- `.value` 30px/700 ls `-.8px` lh 1 `tnum`; `.unit` 13px/500 `--ink3` margin-left 3px (B2:329-342).
- `.delta` 12px/600 `tnum`, `margin-top:8px`; `.up`→`--green`, `.down`→`--red`, `.flat`→`--ink3` (B2:343-351).
  - ⚠️ **Semantic caveat:** `.down` is *red* yet is used for "↓ 12% vs 昨日" on 摄入 (B2:801) and `.up` is *green* for "↓ 1.3 kg / 周" (B2:816). The classes encode direction, not goodness; a HELP page must decide one convention.

### 3.3 Progress ring — B1 (single, 82%)

```html
<div class="ring">
  <svg width="88" height="88" viewBox="0 0 88 88">
    <circle cx="44" cy="44" r="38" fill="none" stroke="var(--bg-soft)" stroke-width="8"/>
    <circle cx="44" cy="44" r="38" fill="none" stroke="var(--accent)" stroke-width="8"
      stroke-dasharray="238.76" stroke-dashoffset="43" stroke-linecap="round"/>
  </svg>
  <div class="pct">82%</div>
</div>
```
(B1:620-627.)

- Wrapper 88×88, `position:relative` (B1:146-149); `svg{transform:rotate(-90deg)}` (B1:150); track stroke `--bg-soft` width 8; value stroke `--accent` width 8, `linecap:round`.
- Geometry: `r=38`, circumference `2πr = 238.76` = `stroke-dasharray`; `stroke-dashoffset:43` ⇒ filled `1 − 43/238.76 = 82.0%`.
- Centre label `.pct` absolutely inset, flex-centred, 15px/700 `--ink` (B1:151-160).
- Mobile: 72×72 centred (B1:590).

### 3.4 Progress rings — B2 (triple, Apple-Fitness)

```html
<div class="rings">
  <div class="rings-svg">
    <svg width="200" height="200" viewBox="0 0 200 200">
      <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(255,55,95,.2)" stroke-width="16"/>
      <circle cx="100" cy="100" r="85" fill="none" stroke="var(--pink)" stroke-width="16"
        stroke-dasharray="534.07" stroke-dashoffset="96" stroke-linecap="round"/>
      … r="65" green, dasharray 408.41, dashoffset 61 …
      … r="45" accent, dasharray 282.74, dashoffset 113 …
    </svg>
    <div class="rings-center"><div class="big">82%</div><div class="lbl">达成</div></div>
  </div>
  <div class="rings-legend"> …3 × .ring-item… </div>
</div>
```
(B2:719-766.)

- Wrapper 200×200 (B2:127-130), `svg{transform:rotate(-90deg)}` (B2:131); three concentric rings, `stroke-width:16` all, tracks are 20%-alpha tints of each hue (`rgba(255,55,95,.2)`, `rgba(48,209,88,.2)`, `rgba(10,132,255,.2)` — B2:723, 727, 731).
- Geometry: outer r=85 → 534.07 / offset 96 → **82%**; middle r=65 → 408.41 / offset 61 → **85%**; inner r=45 → 282.74 / offset 113 → **60%**.
- `.rings-center` absolutely inset, column flex centred; `.big` 42px/700 ls `-1px` lh 1 `tnum`; `.lbl` 11px uppercase ls `.5px` `--dark-ink3` (B2:132-154).
- `.ring-item` = grid `auto 1fr auto` gap 12 (B2:161-165). `.ring-dot` 10×10 circle + coloured glow (B2:166-171): `.move`→`--pink`, `.exercise`→`--green`, `.stand`→`--accent`. `.name` 14px/600, `.sub` 12px `--dark-ink3`, `.val` 18px/700 `tnum` right-aligned, `.unit` 11px/400 (B2:172-193).
- ⚠️ **Semantic inconsistency in the sample data:** the centre reads `82%` (outer ring only) while the inner ring is 60% and the middle is 85% (B2:736 vs 733/729). Do not copy this as a data contract.

### 3.5 Trend chart container

**B1** (B1:654-678):

```html
<section class="section">
  <div class="section-title"><h2>近 7 天热量趋势</h2><span class="hint">蓝 = 摄入 · 绿 = 运动</span></div>
  <svg class="trend-svg" viewBox="0 0 800 180" preserveAspectRatio="none"> … </svg>
  <div class="trend-stats">
    <div class="trend-stat"><div class="label">日均摄入</div><div class="value">1,720</div></div>
    <div class="trend-stat"><div class="label">日均运动</div><div class="value good">385</div></div>
    <div class="trend-stat"><div class="label">缺口</div><div class="value warn">−780</div></div>
  </div>
</section>
```

- `.trend-svg{width:100%;height:180px;display:block}` (B1:259-263); `viewBox="0 0 800 180"` with `preserveAspectRatio="none"` (B1:660) — **the chart stretches, so stroke width visually distorts with aspect ratio**.
- Gridlines: 3 horizontal `--lineS` lines at y=45/90/135, `stroke-width:1` (B1:661-663).
- Intake series: `<polyline>` stroke `--accent` width 2.5, `linecap:round`, `linejoin:round` (B1:664-665) + `<polygon>` area fill `--accent-soft` closed to y=180 (B1:666-667).
- Burn series: `<polyline>` stroke `--green` width 2.5, **`stroke-dasharray="4 4"`** (B1:668-669).
- Latest-point marker: `r=5` filled `--accent` + `r=9` `--accent` at `opacity:.2` halo (B1:670-671).
- `.trend-stats` grid `repeat(3,1fr)` gap 12, `margin-top:16px` (B1:264-269); `.trend-stat` = `--bg-soft` chip, radius 10px, `padding:12px 14px` (B1:270-274); `.label` 11px uppercase ls `.4px` `--ink3`; `.value` 18px/700 `tnum` with `.good`/`.warn` colour variants (B1:275-288).

**B2** (B2:821-849):

- `.trend-svg{height:220px}` (B2:357-361), `viewBox="0 0 1000 220" preserveAspectRatio="none"` (B2:822); gridlines at y=55/110/165 (B2:824-826).
- Area `<polygon>` fill `--accent-soft` (B2:828-829); intake polyline `--accent` 2.5 (B2:830-831); burn polyline `--green` 2.5 with **`stroke-dasharray="5 5"`** (B2:833-834).
- **Adds a target line** absent from B1: `<line … stroke="var(--ink3)" stroke-width="1" stroke-dasharray="2 4" opacity=".5"/>` (B2:836).
- Marker `r=5` + `r=10` halo `opacity:.2` (B2:838-839).
- `.trend-caption` flex space-between, 11px uppercase ls `.4px` `--ink3`, `margin-top:12px` (B2:362-370); `.trend-legend` flex gap 16, each `<span>` = inline-flex gap 5 with `.swatch` 10×2px radius 1px coloured inline (B2:371-379, 841-848).

### 3.6 Badge / pill

| Component | Class | Spec | Line |
|---|---|---|---|
| Status pill (B1) | `.status-pill` (+`.pending`) | inline-flex gap 6, `padding:5px 12px`, radius 999px, green-soft/green 13px/600, `margin-top:12px`; `.pending` → orange-soft/orange; `::before` 6×6 circle `currentColor` | B1:83-104 |
| KPI badge (B1) | `.kpi .badge` (+`.good/.ok/.warn/.bad`) | `margin-left:auto`, 11px/600, `padding:2px 8px`, radius 6px | B1:219-230 |
| Priority pill (B1) | `.todo-row .priority` (+`.high/.medium/.low`) | 10.5px/600, `padding:3px 8px`, radius 999px; high=red, medium=orange, low=bg-soft/ink3 | B1:337-345 |
| Status chip (B2) | `.status-chip` (+`.warn/.good`) | inline-flex gap 6, `padding:7px 14px`, radius 999px, `background:rgba(255,255,255,.08)`, `border:1px solid var(--dark-line)`, 12.5px/500 `--dark-ink2`; `.warn`/`.good` get tinted bg + 30%-alpha border; `::before` 5×5 dot | B2:203-230 |
| Tag (B2) | `.tl-tag` (+`.pro`) | 10.5px/500, `padding:2px 8px`, radius 4px, `--bg-soft`/`--ink2`; `.pro` green | B2:423-431 |
| Priority (B2) | `.todo-item .pri` (+`.high/.med`) | 10.5px/700, `padding:3px 8px`, radius 4px, ls `.3px`; high=red, med=orange | B2:487-495 |

### 3.7 List row

**B1 `.todo-row`** (B1:296-345, DOM at 687-718):

```html
<div class="todo-row done">
  <span class="check">✓</span>
  <div class="body"><div class="label">记录饮食</div><div class="meta">已记录 4 条</div></div>
  <span class="state"></span>          <!-- stray, no CSS rule -->
</div>
```

flex row, gap 14, `padding:11px 14px`, `border-top:1px solid var(--lineS)`, first-child borderless (B1:296-303). `.check` 20×20 circle, `border:1.5px solid var(--line)`, `background:var(--bg-soft)`, `color:transparent`, `font-size:13px`, `flex-shrink:0` (B1:304-315); `.done .check` → `background:var(--green)`, `border-color:var(--green)`, `color:#fff`, `transform:scale(1.05)` (B1:316-321). `.label` 14px/500; `.done .label` → `--ink3` + `line-through` (B1:323-331). `.meta` 11.5px `--ink3` `margin-top:2px` (B1:332-336).
⚠️ B1:693 and B1:709 emit `<span class="state"></span>` that no CSS rule targets — dead markup, drop it in the rewrite.

**B1 `.log-row`** (B1:355-397, DOM at 731-750):

```html
<div class="log-row">
  <div class="time">08:30</div>
  <div class="name">燕麦牛奶<span class="name-nutri">蛋白 12g</span></div>
  <div class="cal cal-intake">+320 卡</div>
</div>
```

grid `44px 1fr auto`, gap 10, `padding:12px 0`, `border-top:1px solid var(--lineS)`, first-child borderless (B1:355-363). `.name` 15px/500 with `min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap` (B1:364-372); `.name-nutri` 11.5px `--ink3` `margin-left:6px` (B1:373-377); `.time` 13px `"SF Mono",monospace` `tnum` (B1:378-383); `.cal` 13px/500 `tnum` `nowrap` with `.cal-intake`→`--accent`, `.cal-burn`→`--green` (B1:384-391). Sub-groups: `.log-section{margin-bottom:16px}` + `.log-section-title` 13px/600 uppercase ls `.3px` `--ink3`, `margin:0 0 4px 4px` (B1:398-407).

**B2 `.tl-row`** (B2:386-440, DOM at 859-903):

```html
<div class="tl-row">
  <div class="tl-time">07:00<span class="ampm">AM</span></div>
  <div class="tl-body">
    <div class="tl-title">慢跑 30 分钟</div>
    <div class="tl-desc">有氧运动 · 心率均值 142 bpm</div>
    <div class="tl-tags"><span class="tl-tag pro">蛋白 +0g</span><span class="tl-tag">30 min</span></div>
  </div>
  <div class="tl-val burn">−420 卡</div>
</div>
```

grid `72px 1fr auto` gap 20, `padding:16px 0`, `border-top:1px solid var(--lineS)`, `align-items:start` (B2:386-394). `.tl-time` 13px/600 mono `tnum`, `.ampm` block 10px/500 `--ink3` ls `.3px` (B2:395-408). `.tl-title` 15px/600; `.tl-desc` 13px `--ink3` lh 1.5; `.tl-tags` flex gap 6 wrap `margin-top:6px` (B2:409-422). `.tl-val` 16px/700 `tnum` right-aligned nowrap; `.intake`→`--accent`, `.burn`→`--green` (B2:432-440).

**B2 `.todo-item` (CSS-counter numbered)** (B2:443-495, DOM at 913-944):

```html
<div class="todo-item done">
  <div class="todo-no"></div>
  <div><div class="todo-text">记录饮食</div><div class="todo-meta">已记录 4 条 · 08:30 / 12:15 / 15:00 / 18:45</div></div>
</div>
```

`.todo-edit{counter-reset:todo}`; `.todo-no{counter-increment:todo}` with `::before{content:counter(todo,decimal-leading-zero)}` ⇒ `01 02 03 04`; `.done .todo-no` → `--green` and `::before{content:'✓ '}` (B2:457-472). grid `32px 1fr auto` gap 16 `padding:14px 0` `align-items:center` (B2:448-456). `.todo-text` 15px/500; `.done` → `--ink3` + `line-through`; `.todo-meta` 12px `--ink3` (B2:473-486). **Note:** the `.todo-no` elements are deliberately empty in the DOM (B2:915, 922, 930, 939) — all content comes from CSS counters.

**B2 `.cmd-item` (counter-numbered command list)** (B2:543-580, DOM at 973-1006):

```html
<div class="cmd-item">
  <div class="cmd-no"></div>
  <div><div class="cmd-label">记吃了</div><div class="cmd-text">记吃了 鸡胸肉沙拉 300克</div></div>
  <button class="copy-mini" onclick="copyCmd(this,'记吃了 鸡胸肉沙拉 300克')">复制</button>
</div>
```

`.cmd-edit{counter-reset:cmd}`; `.cmd-no::before{content:'/' counter(cmd,decimal-leading-zero)}` ⇒ `/01 … /04` (B2:557-566). grid `40px 1fr auto` gap 16 `padding:14px 0` (B2:548-556). `.cmd-label` 13px/600; `.cmd-text` 13px mono `--ink3` with ellipsis truncation (B2:567-580).

### 3.8 Command row / copy button — B1

```html
<div class="cmd-row">
  <span class="label">记吃了</span>
  <span class="cmd">记吃了 鸡胸肉沙拉 300克</span>
  <button class="copy-mini" onclick="copyCmd(this,'记吃了 鸡胸肉沙拉 300克')">复制</button>
</div>
```
(B1:788-792; four instances 788-807, then `<button class="copy-all" id="copyAllBtn" onclick="copyAll()">复制所有命令</button>` at 809.)

- `.cmd-list` flex column gap 8 (B1:441). `.cmd-row` flex gap 10, `padding:10px 14px`, `background:var(--bg-soft)`, radius 8px, `"SF Mono",monospace` 12.5px `--ink2`, `border:1px solid transparent`, `transition:all .15s var(--ease)`; hover → `border-color:var(--line);background:var(--card)` (B1:442-458).
- `.cmd-row .label` resets to `font-family:inherit`, 14px/600 `--ink`, `min-width:84px`, `flex-shrink:0` (B1:459-466). `.cmd` `flex:1` + ellipsis truncation (B1:467-472).
- `.copy-mini`: transparent bg, `border:1px solid var(--line)`, radius 6px, `padding:3px 10px`, 11px `--ink2`, `cursor:pointer`, `font-family:inherit`; hover → `--accent` bg + white; `.copied` → `--green` bg + `copySuccess` animation (B1:473-499).
- `.copy-all`: inline-flex gap 6, `background:var(--ink)`, white, radius 999px, `padding:8px 16px`, 13px/600, `border:none`, `margin-top:8px`; hover `translateY(-1px)`+`--shadow`; `.copied` → `--green` + animation (B1:500-519).
- ⚠️ The command string is duplicated: once as `.cmd` text and once as the `onclick` literal (B1:790-791). Must become a single injected value.
- ⚠️ `id="cmdList"` (B1:787) is never referenced by the JS — dead hook.

**B2 `.copy-mini` / `.copy-all` differences:** `.copy-mini` `padding:4px 12px`, adds `font-weight:600`, hover is `background:var(--ink)` instead of accent (B2:581-597); `.copy-all` `padding:10px 20px`, `margin-top:16px` (B2:609-623). Same `copySuccess` animation (B2:604-608).

### 3.9 Section header

**B1 `.section-title`** (B1:241-256): flex, `align-items:baseline`, `justify-content:space-between`, `margin-bottom:16px`; `h2` 17px/600 ls `-.2px` `--ink`; `.hint` 12px `--ink3`. No rule/underline.

**B2 `.edit-title`** (B2:241-261): flex baseline space-between, `margin-bottom:20px`, `padding-bottom:12px`, **`border-bottom:2px solid var(--ink)`**; `h2` 24px/700 ls `-.4px`; `.num` 13px/600 `--ink3` `tnum` ls `.5px`, rendered as `01 / 06` … `05 / 06` (B2:786, 856, 911, 951, 971) — a section index that B1 lacks.

### 3.10 Empty state

**B1 only — three variants, none used in the sample DOM:**

```html
<div class="empty"><div class="icon">…</div><h3>…</h3><p>…</p></div>
```
`.empty`: centred, `padding:48px 20px`, white card, radius 20px, 1px `--lineS` border, **no shadow**; `.icon` 40px `--ink3` `opacity:.5` `margin-bottom:12px`; `h3` 17px/600 `margin-bottom:6px`; `p` 13px `--ink3` (B1:544-553).

Lightweight variants: `.todo-empty{text-align:center;padding:20px;color:var(--ink3);font-size:14px}` (B1:346-351) and `.log-empty{…padding:20px;color:var(--ink3);font-size:13px}` (B1:392-397).

**B2 defines no empty state at all** (grep for `empty` in B2: zero matches).

### 3.11 Input / form field

**B1 — A-system rule ("灰底无边框 → focus 变白加边框"):**

```html
<div class="field"><label>刚吃了什么</label>
  <input type="text" placeholder="例:一杯拿铁 + 两个鸡蛋"></div>
```
(B1:771-778.)

- `.field` flex column gap 6, `margin-bottom:14px`; `label` 13px/500 `--ink2` (B1:410-420).
- `input/select/textarea`: `background:var(--bg-soft)`, **`border:1px solid transparent`**, radius 8px, `padding:11px 14px`, 15px `--ink`, `font-family:inherit`, `transition:all .2s var(--ease)`, `width:100%` (B1:421-431).
- `:focus`: `outline:none;background:var(--card);border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)` (B1:432-437). `::placeholder` → `--ink3` (B1:438).

**B2 `.field-dark` (inverted):** `background:var(--dark-3)`, `border:1px solid var(--dark-line)`, radius 8px, `padding:12px 16px`, 15px `--dark-ink`; `:focus` → `border-color:var(--accent)`, `box-shadow:0 0 0 3px var(--accent-soft)`, `background:var(--dark)`; label 12px/600 uppercase ls `.4px` `--dark-ink2`; placeholder `--dark-ink3` (B2:515-540). Container `.input-block` on `--dark-2` with `.ib-title` 18px/600 + `.ib-sub` 13px `--dark-ink2` (B2:498-514).

### 3.12 Button

Only two button shapes exist: `.copy-mini` (ghost → solid on hover) and `.copy-all` (solid ink pill). There is **no** generic `.btn`, no `.btn-primary`/`.btn-secondary`, no icon-button, no disabled state, no `:focus-visible` style. `#backTop` is an `<a href="#">` styled as a circular frosted button (B1:815, B1:564-582).

### 3.13 Toast

```html
<div class="toast" id="toast">已复制</div>
```
(B1:816, B2:1016.) `position:fixed;bottom:24px;left:50%`, `transform:translateX(-50%) translateY(120%)`, radius 999px, `padding:12px 20px`, 13px/500, `--shadow-lg`, `z-index:9999`, `transition:transform .35s var(--ease-spring)`, `pointer-events:none`; B1 adds `background:var(--ink)` + `white-space:nowrap;max-width:90vw;overflow:hidden;text-overflow:ellipsis` (B1:522-541) while B2 uses `background:var(--dark-2)` + `border:1px solid var(--dark-line)` and omits the max-width/ellipsis (B2:631-647). `.show` → `translateY(0)`. Auto-hides after 1800ms (B1:824, B2:1024).

### 3.14 Footer

B1: centred, `--ink3`, 12px, `margin-top:32px`, `padding-top:20px`, `border-top:1px solid var(--lineS)` (B1:555-562), text "卡路里 Skill · 统一设计系统 v1.0 · 视觉标杆 · 2026-07-29" (B1:812).
B2: same but `margin-top:48px`, `padding:24px 40px 0` (B2:656-663), text at B2:1012.

### 3.15 Components a HELP page needs that **neither benchmark defines**

Verified absent by grep in both files: **table / `th` / `td` / `thead`**, **nav / tab / `.tab`**, **`<pre>` / `<code>` / syntax highlighting**, **`<details>` / `<summary>` accordion**, **search / filter input**, **breadcrumb**, **`position:sticky` anything**, **`aria-*` / `role=`**, **`:focus-visible`**, **`prefers-reduced-motion`**, **`prefers-color-scheme`**, **`@media print`**, **`safe-area-inset-*`**, **`--r-xl` usage (B2 declares it, never uses it)**.

The **A-system table spec** therefore has to come from C1 (`设计审查报告.html:124-143`), which is itself an A-system document:

| Element | Spec | Line |
|---|---|---|
| `table` | `width:100%;border-collapse:collapse;margin:12px 0;font-size:13px` | C1:124-127 |
| `th` | `text-align:left;padding:10px 12px;font-size:11.5px;font-weight:600;color:var(--ink3);text-transform:uppercase;letter-spacing:.4px;border-bottom:1px solid var(--line);background:transparent` | C1:128-134 |
| `td` | `padding:12px;border-bottom:1px solid var(--lineS);color:var(--ink2);vertical-align:top` | C1:135-138 |
| `tr:last-child td` | `border-bottom:none` | C1:139 |
| `td b` | `color:var(--ink);font-weight:600` | C1:140 |
| `td .ok/.no/.warn` | green/red/orange, `font-weight:600` | C1:141-143 |

⚠️ C1:637 recommends `th` 12px (up from 11px) and `td` padding 14px (up from 9px), and C1:671 requires "表格卡片化 + 12px th + `var(--lineS)` 轻分隔". C1's own table (11.5px th / 12px td) is a *partial* application of its own P2 item — for the HELP page, prefer **th 12px / td padding 12-14px / `--lineS` separators / no header background** and wrap tables in a `.section` card (C1:637, C1:671).

Also useful from C1: `code` inline styling exists there as `.section p code, .section li code, td code` (C1:116) — read C1:116-122 if the HELP page wants the exact inline-code chip spec; B1/B2 have no `code` styling at all (they render commands as `.cmd`/`.cmd-text` spans in `"SF Mono"`).

### 3.16 Components absent from both benchmarks but present in the old tree

Three components a HELP console needs are **not** in B1/B2 but **are** implemented in the Python-era templates. Use these as the starting spec, then re-tokenise to the A system.

**Verbatim command block — the only `<pre>` in the whole tree** (`health_dashboard.html:125-131`):

```css
.copy-section pre{
  background:#1d1d1f;color:#f5f5f7;
  padding:12px 16px;border-radius:10px;
  font-size:11.5px;line-height:1.55;
  overflow-x:auto;margin:6px 0 10px;
  font-family:"SF Mono",monospace;white-space:pre-wrap;
}
```
Container `.copy-section{background:var(--card);border-radius:14px;padding:16px 20px;margin-top:20px;box-shadow:var(--shadow)}` (`health_dashboard.html:119-123`), heading `.copy-section h3{font-size:13px;font-weight:600;margin-bottom:8px;color:var(--fg2)}` (`:124`). **Fix on adoption:** radius `10px` → `var(--r-sm)` 8px; `--fg2` → `var(--ink2)`; the dark `#1d1d1f` surface is A-system-compatible (`= var(--ink)`) and reads well as a command slab, but a `--bg-soft` variant is more consistent with B1's light aesthetic — pick one and document it.

**Generic button** — two competing old specs, neither A-system-clean:
- `health_dashboard.html:132-140` — `.btn{display:inline-flex;align-items:center;gap:6px;background:var(--accent);color:#fff;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600;border:none;cursor:pointer}`, `.btn:hover{opacity:.85}`, `.btn.copied{background:var(--green)}`.
- `home_dashboard.html:547-553` — `.copy-actions .btn{min-height:44px;padding:0 22px;border:none;border-radius:12px;cursor:pointer;background:var(--bg);border:1px solid var(--line);color:var(--ink);font-size:14px;font-weight:600;transition:transform .15s}`, `.btn:active{transform:scale(.97)}`.
  ⚠️ `min-height:44px` is the iOS 44pt touch target — worth keeping. Radius `12px` violates the `{8,14,20}` set; use `var(--r-sm)` or `999px`.

**Progress bar** (the compact alternative to the ring; absent from B1/B2) — `home_dashboard.html:542-546`:
```css
.kpi .bar{height:4px;border-radius:2px;background:var(--lineS);margin-top:6px;overflow:hidden}
.kpi .bar i{display:block;height:100%;border-radius:2px;background:var(--accent)}
.kpi .bar i.good{background:var(--green)}
.kpi .bar i.warn{background:var(--orange)}
.kpi .bar i.bad{background:var(--red)}
```
A 6px/radius-3px variant exists at `home_dashboard.html:562-566` (`.mini-card .bar`). Note `border-radius:2px`/`3px` are outside the `{8,14,20}` radius set — C1 does not forbid small radii, but a HELP page should pick one bar height and stick to it.

---

## 4. Difference between the two benchmarks

### 4.1 What B1 (统一主面板) establishes that B2 does not

| # | B1 property | Evidence |
|---|---|---|
| 1 | **A-system single accent `#007aff`** — the ratified iOS System Blue | B1:27; C1:398, C1:604-605, C1:666 |
| 2 | **Gradient-free throughout** — zero `linear-gradient`/`radial-gradient` | grep: 0 matches in B1 |
| 3 | **Card-based composition** — every block is a white bordered+shadowed card, so any content type can be dropped in without restyling | B1:107-118, 169-180, 233-240 |
| 4 | **Three empty states** (`.empty`, `.todo-empty`, `.log-empty`) | B1:346-351, 392-397, 544-553 |
| 5 | **A-system input contract** (grey fill → white + accent border + 3px halo on focus) | B1:409-438 |
| 6 | **Full KPI vocabulary**: label + icon + badge + value + unit + detail | B1:181-230 |
| 7 | **Canonical page gutter/padding** `32px 20px 80px` | B1:55 (= C1:49, C1:645) |
| 8 | **Explanatory `.hint` on every section header** (blue = intake, green = burn, "最近 5 条") | B1:658, 684, 726, 769, 785 |
| 9 | **Explicitly named as the acceptance target by the design review** | C1:655-674 |
| 10 | 960px measure — tighter, more readable line lengths for text-heavy help content | B1:55 |

### 4.2 What B2 (沉浸主面板v2) establishes that B1 does not

| # | B2 property | Evidence |
|---|---|---|
| 1 | **Dark immersive hero** (`#000000`) with a radial accent glow | B2:73-87 |
| 2 | **Triple concentric progress rings** (Apple-Fitness vocabulary) + per-ring legend rows | B2:719-766 |
| 3 | **Dark/light two-zone page architecture** with an explicit `1px` transition band | B2:232-237, 649-654, 777 |
| 4 | **Editorial scale** — 80px lead number, 24px section heads, hairline-divided card-less KPI grid | B2:264-351 |
| 5 | **Numbered section index** `01 / 06` … `05 / 06` | B2:255-261, 786 |
| 6 | **CSS-counter numbered lists** for todos and commands (`01`, `/01`) — auto-renumbering, no JS | B2:443-472, 543-566 |
| 7 | **Timeline row** with date/time anchor column + tag chips + signed value | B2:386-440 |
| 8 | **Target line + legend swatch row on the trend chart** | B2:836, 841-848 |
| 9 | **Inverted (dark) form block** | B2:497-540 |
| 10 | **1040px measure** + `overflow:hidden` full-bleed hero | B2:68 |
| 11 | Pink as a fourth semantic hue (`--pink #ff375f`) + coloured dot glows | B2:45, 166-171 |
| 12 | Larger trend canvas (220px vs 180px) | B2:359 |

### 4.3 Which is the better template for a HELP / cheat-sheet console

**Recommendation: B1 as the structural and token base, with three specific grafts from B2.**

Reasons:

1. **Ratification.** C1:655-674 designates B1 the unified target and never mentions B2. Matching B1 is literally the acceptance criterion.
2. **Token compliance.** B2 re-values every semantic colour to iOS *dark-mode* hexes (`#0a84ff`, `#30d158`, `#ff9f0a`, `#ff453a`) which contradict the A-system values C1:398/604/666 mandates, and it introduces a fifth hue (`--pink`) where C1:353 demands "主色只能有一个值".
3. **Card composition is what a help console needs.** A HELP page is heterogeneous: prose, tables, command blocks, FAQ accordions, parameter lists, worked examples. B1's `.section` card is a generic container that accepts any of these; B2's editorial model deliberately removes the card and relies on hairlines + 48px whitespace (B2:240, 308) — which works for a fixed 5-section narrative but degrades when sections must be reordered, collapsed, or added.
4. **B1 is gradient-free and has real empty states** — the two things a reference/console page hits hardest (no data, no results).
5. **B1's 960px measure reads better** for text-heavy help content than B2's 1040px editorial measure.
6. **B1's `.hint` slot** is the natural home for "what this command does / when to use it" annotations.

**Grafts worth taking from B2:**

- **G2-1 — CSS-counter numbered lists** (B2:443-472, 543-566) for command and FAQ lists: auto-renumbering with zero JS, and the `/01` prefix (B2:565) is a clean, non-emoji index.
- **G2-2 — Tag chips `.tl-tag`** (B2:423-431) for per-row metadata (parameter types, required/optional flags, examples) — more compact than B1's `.name-nutri` inline span (B1:373-377).
- **G2-3 — `.trend-caption` + legend swatches** (B2:362-379, 841-848) if the HELP page charts anything; and B2's target-line idiom (B2:836).

**Do NOT take from B2:** the dark hero (a help page's h1 must be scannable, and C1:613 mandates the gradient-free no-background hero), the `#0a84ff` accent, `--pink`, the card-less KPI grid, the `overflow:hidden` wrapper (it breaks sticky/anchor scrolling), or the 80px lead number.

**Must be added (in neither benchmark):** a table component (spec in §3.15 from C1:124-143), a `<pre>`/`code` block for verbatim commands, a nav/TOC, `<details>` accordions for FAQ, a sticky TOC or sticky section header, `:focus-visible`, `prefers-reduced-motion`, `safe-area-inset` on the toast (C1:673 requires it), and `aria-*`/`role=` semantics.

---

## 5. Acceptance checklist

A reviewer ticks these by rendering the new HELP page and inspecting. Every threshold is cited.

**Tokens & colour**

1. **One primary colour only.** Computed `--accent` is exactly `#007aff`; no second blue, no purple, no pink anywhere (B1:27; C1:353, C1:398, C1:604). Grep the built CSS for `#0a84ff`, `#af52de`, `#ff375f` — all must be absent.
2. **Grey ramp is exactly three steps** `#1d1d1d` / `#3c3c43` / `#8e8e93` (B1:22-24; C1:400), **borders use the alpha tokens** `rgba(60,60,67,.12)` / `rgba(60,60,67,.06)` and never a solid hex (B1:25-26; C1:401, C1:671), and **`--ink3` never carries body prose** — it must clear WCAG AA 4.5:1, so help text uses `--ink` or `--ink2` (C1:432).
3. **Page background is `#fafafa`, card surface is `#ffffff`** — a card must be distinguishable from the page without relying on its border (B1:20-21, B1:48).
4. **Zero gradients.** No `linear-gradient` / `radial-gradient` in the final stylesheet (B1 has none; C1:345, C1:613, C1:690-691).

**Type**

5. **The hierarchy ladder is observable**: the page's largest number is ≥48px/700, section `h2` is 17px/600, body is 15px, hints are 12-13px; adjacent levels differ by ≥4px and ≥100 weight (B1:128-131, 248-250, 426, 254; C1:349).
6. **Body font stack is verbatim** `-apple-system,BlinkMacSystemFont,"SF Pro Display","PingFang SC","Microsoft YaHei",sans-serif` (B1:47) and monospace content uses `"SF Mono",monospace` (B1:382, 449).
7. **Every number is `font-feature-settings:"tnum"`** — check a column of figures; digits align vertically (B1:53 + per-element 133/206/285/381/387; C1:359, C1:696-697).
8. **No emoji in any `h1`/`h2`.** Emoji may appear only in a `.eyebrow` or a KPI `.icon` slot (B1:607-608 vs B1:633; C1:554-555, C1:670).

**Layout**

9. **`.wrap` max-width is 960px and page padding is `32px 20px 80px`** (B1:55; C1:645) — at a 1440px viewport the content column is centred with visible side margins.
10. **Shape tokens are used, not invented**: radius only from `{8, 14, 20, 999, 50%}` (B1:38-40); resting cards `0 1px 2px rgba(0,0,0,.04)`, elevated `0 1px 3px rgba(0,0,0,.04),0 8px 24px rgba(0,0,0,.04)` — no dark or heavy shadow (B1:35-37; C1:404).
11. **Row separators are 1px `--lineS` with the first row borderless** in every list (B1:301-303, 361-363; C1:359).
12. **Both breakpoints behave**: at ≤640px the KPI grid becomes 2 columns, the ring/number block stacks to one column and `.wrap` padding drops to `20px 16px 60px`; at ≤400px the KPI grid becomes 1 column and the toast spans `left:12px;right:12px` (B1:584-591, 595-598; C1:673).

**Components**

13. **KPI card anatomy is complete**: label row (optional icon + right-aligned badge), value + unit on a shared baseline, detail line — all four slots present (B1:632-636, 181-218).
14. **Progress ring**: SVG `transform:rotate(-90deg)`, a muted track stroke plus a coloured value stroke of equal width with `stroke-linecap:round`, dash geometry consistent with `2πr`, and a centred percentage label (B1:620-627).
15. **Verbatim commands are in a `<pre>` slab**, not inline prose: mono 11.5-12px, `line-height:1.55`, `white-space:pre-wrap`, `overflow-x:auto`, radius 8px, on a dark or `--bg-soft` surface (spec from `health_dashboard.html:125-131`, re-tokenised to the A system).
16. **Copy affordance is single and predictable, with double feedback**: one `.copy-mini` per row at the row's right edge plus exactly one `.copy-all` pill at the section bottom (never in a summary layer, C1:363, C1:621, C1:669); success shows both a `已复制` + green `.copied` button with the 450ms `copySuccess` spring *and* a bottom-centred pill toast for 1800ms (B1:788-809, 819-848, 493-499, 522-541; C1:367, C1:662).
17. **Table follows the A-system spec**: `<th>` uppercase 11.5-12px/600 `--ink3` with **transparent background** and a 1px `--line` bottom border; `<td>` `padding:12-14px`, 1px `--lineS` bottom border, `--ink2` text, last row borderless; the table sits inside a `.section` card (C1:124-143, C1:637, C1:671).
18. **Empty state exists and is styled**: centred card, `padding:48px 20px`, 40px `.icon` at `opacity:.5`, 17px/600 `h3`, 13px `--ink3` `p` (B1:544-553).
19. **`#backTop` appears only after `scrollY > 400`**, is a 42px frosted circle at `bottom:24px;right:24px`, and scrolls smoothly to top (B1:564-582, 850-855).
20. **Focus is visible on every interactive control and motion is optional**: a `:focus-visible` ring exists (B1:432-437 only *removes* the default outline — a WCAG risk), and `prefers-reduced-motion` disables the `copySuccess` scale and the toast slide (both **absent** from B1/B2; add deliberately).

---

## 6. Rebuild notes

### 6.1 Self-containment — yes, fully

Both benchmarks are **single-file, zero-dependency, offline-safe**. Verified by grep over `templates\临时样例\*.html` for `https?://`, `@import`, `cdn`, `fonts.`, `src=`, `rel="stylesheet"`, `integrity=`, `fetch(`, `XMLHttpRequest`:

- **0 matches** in either file.

Concretely: no `<link>`, no `<script src>`, no `@import`, no webfont request, no CDN, no network call of any kind. All styling is one inline `<style>` block (B1:7-600; B2:7-707). All graphics are **inline SVG** with `fill`/`stroke` bound to CSS custom properties (B1:621-671; B2:721-839), so they theme with the tokens. Icons are Unicode characters/emoji (`↑` B1:815, `✓` B1:688/320, `🔥🏃⚖️📉` B1:633-648) — no icon font, no sprite, no image file. Type relies on the OS font stack (B1:47; B2:60), so `"SF Mono"` and `"SF Pro Display"` degrade gracefully to `monospace` / `sans-serif` off Apple platforms.

**Implication for the TS rewrite:** the HELP page can be a single self-contained HTML artifact with no build-time asset pipeline, and it will render identically offline. Keep tokens as CSS custom properties so a future theme swap needs no markup change.

**Contrast with the Python-era templates it replaces** — they are *not* self-contained as shipped, and this is the seam the TS rewrite must own:

| Mechanism | Where | Meaning |
|---|---|---|
| `<style><!--SHARED-CSS--></style>` | `home_dashboard.html:4`, `health_dashboard.html:4` | shared stylesheet is string-injected at build time |
| `<script id="payload" type="application/json"><!--INJECT-DATA--></script>` | `home_dashboard.html:702`, `health_dashboard.html:196` | the entire page data arrives as injected JSON |
| `<!--SHARED-HELPERS-->`, `<!--CHARTS-HELPERS-->` | `home_dashboard.html:702`, `health_dashboard.html:196` | injected JS helper bundles |
| `window.__P__` → `DATA` | parsed at `home_dashboard.html:705-708`, `health_dashboard.html:199-202` | the runtime data contract |
| runtime globals | `window.errorReceipt` / `emptyState` / `copyText` / `actionBar` / `charts.line` (`home_dashboard.html:860, 1008, 1022, 1036, 1045, 917`; `health_dashboard.html:211, 222, 331`) | helpers expected to exist before the page script runs |

So: B1/B2 are **static demos with no data contract**; the old templates have **a data contract but no self-contained assets**. The new HELP page should be both — self-contained CSS/SVG *and* an explicit typed payload. Note also that `<meta charset>` sits *after* the first `<style>` in both old templates (`home_dashboard.html:4-5`, `health_dashboard.html:4-5`) — fix the head order.

### 6.2 JS present

Both files ship the **same ~38-line vanilla script**, no framework, no build step (B1:818-856; B2:1018-1056):

| Function | Behaviour | Line |
|---|---|---|
| `showToast(msg)` | sets `#toast` text, adds `.show`, auto-removes after **1800ms** via a single shared `window.__toastT` timer (re-entry safe) | B1:819-825 |
| `copyCmd(btn,text)` | `navigator.clipboard.writeText(text)`, then `.copied` + `已复制`, toast `已复制: <text>`, reverts after **1500ms** | B1:826-836 |
| `copyAll()` | writes a **hard-coded array** joined with `\n`, button → `✓ 已复制全部` + `.copied`, toast `已复制 4 条命令`, reverts after **2000ms** | B1:837-849 |
| `#backTop` scroll handler | toggles `.show` at `window.scrollY > 400`; click → `preventDefault()` + `window.scrollTo({top:0,behavior:'smooth'})` | B1:850-855 |

No `DOMContentLoaded` wrapper (script sits at end of `<body>`, so the elements exist). No error handling on `navigator.clipboard` — a rejected promise (insecure context, permission denied) silently does nothing, and there is **no `document.execCommand` fallback**. Inline `onclick` handlers carry the payload as a JS string literal (B1:791, 796, 801, 806), so a command containing a single quote or backslash would break the markup — **a TS rewrite should attach listeners programmatically and read the text from `data-*` or the DOM**.

### 6.3 Responsive / mobile-safe

**Responsive: yes, deliberately.** Both define exactly two breakpoints — `max-width:640px` and `max-width:400px` — and C1:673 names the 400px breakpoint part of the contract. Details in §2.3. Everything else is fluid: `width:100%` SVGs with `preserveAspectRatio="none"`, `repeat(4,1fr)` → `repeat(2,1fr)` → `1fr`, `flex-wrap:wrap` on `.hero-status` (B2:201), `min-width:0` + `text-overflow:ellipsis` on truncating cells (B1:365-372), `flex-shrink:0` on fixed-width chips (B1:310, 465).

**Mobile-safe: partly.** Gaps to fix in the rewrite:

1. **No `env(safe-area-inset-bottom)`** on `.toast` or `#backTop` (both pinned `bottom:24px`, B1:524, 566) — on iPhone with a home indicator these can collide with the gesture bar. C1:673 explicitly requires "Toast 安全区适配", so this is a *regression* relative to the praised `help_center` baseline (C1:685).
2. **`backdrop-filter`** on `#backTop` (B1:570-571, B2:671-672) is unsupported in older Firefox; the fallback is the `rgba(255,255,255,.85)` background, which is acceptable but not opaque.
3. **`preserveAspectRatio="none"`** (B1:660, B2:822) means chart strokes and the `r=5`/`r=9` markers **stretch non-uniformly** as the viewport narrows — markers become ellipses. If pixel fidelity matters, switch to `preserveAspectRatio="xMidYMid meet"` or draw markers with `vector-effect:non-scaling-stroke`.
4. **No `prefers-reduced-motion`** guard on the spring animations (absent, verified by grep).
5. **`.wrap{overflow:hidden}`** in B2 (B2:68) would clip any sticky/anchor UI; B1 avoids this — another reason to base on B1.
6. **400px `.kpi` uses `!important`** in B2 (B2:702-703) to win the cascade — a smell to avoid; B1's 400px rule is clean (B1:595-599).

### 6.4 Hard-coded data that must become injected

**B1 (all values literal in the DOM):**

| Data | Location | Notes |
|---|---|---|
| Hero: eyebrow `卡路里`, h1 `今日概况`, sub `2026-07-29 · 健康指标 · 待办与最近记录`, pill `2 项待办` | B1:607-610 | 4 strings |
| Hero number: `1,640` / `2,000`, `还可吃 360 卡 · 距目标 82%`, `82%`, ring `dashoffset="43"` | B1:617-626 | value, target, delta text, percent, and the **offset must be computed** from percent (`offset = 238.76 × (1 − pct)`) |
| 4 × KPI: label, emoji, badge text+class, value, unit, detail | B1:632-651 | 6 fields × 4 |
| Trend SVG: 3 gridline y-values, intake `points`, area `points`, burn `points`, marker coords | B1:661-671 | hard-coded polyline coordinates — must be generated from the series |
| 3 × trend stat: label, value, class | B1:674-676 | |
| Section headers + hints | B1:657-658, 683-684, 725-726, 768-769, 784-785 | |
| 4 × todo: done flag, label, meta, priority text+class | B1:687-718 | |
| Log groups: `饮食` / `运动` + 5 rows (time, name, nutri, cal, cal-class) | B1:729-761 | |
| 2 × input: label, placeholder | B1:771-778 | |
| 4 × command: label, cmd text, **and the same text duplicated in `onclick`** | B1:788-807 | de-duplicate into one source |
| `copyAll()`'s `cmds` array (4 strings) | B1:838 | must derive from the rendered list, not be a second copy |
| Footer string | B1:812 | |

**B2 (same pattern, plus):**

| Data | Location | Notes |
|---|---|---|
| Hero: eyebrow, h1 date, `.date` weekday string | B2:714-716 | date must be formatted, not literal |
| 3 ring values (`dashoffset` 96/61/113, `stroke-dasharray` 534.07/408.41/282.74), centre `82%` | B2:723-733, 736 | offsets computed from percentages; **centre value inconsistent with inner ring (60%)** |
| 3 × `.ring-item`: name, sub (with target), value, unit | B2:741-764 | |
| 4 × `.status-chip`: text + variant class | B2:770-773 | |
| Section index `01 / 06` … `05 / 06` and the `· N 条` suffix | B2:786, 856, 911, 951, 971 | must be generated so renumbering survives section edits |
| Lead number `−780` + `卡 / 日`, label, description prose | B2:789-792 | |
| 4 × `.kpi`: label, value, unit, delta text+class | B2:798-817 | |
| Trend SVG: gridlines, area, both polylines, target line, marker | B2:824-839 | |
| Legend + caption range `近 7 天 · 07.23 – 07.29` | B2:843-847 | |
| 5 × `.tl-row`: time, ampm, title, desc, tags[], value, value-class | B2:859-903 | |
| 4 × `.todo-item`: done flag, text, meta, priority | B2:913-944 | `.todo-no` is intentionally empty — numbering is CSS-only |
| 2 × dark input: label, placeholder | B2:956-963 | |
| 4 × command: label, text, duplicated in `onclick` | B2:974-1005 | |
| `copyAll()`'s `cmds` array | B2:1038 | |
| Footer string | B2:1012 | |

**Nothing in either file reads from a data source.** There is no `JSON.parse`, no `<script type="application/json">`, no template literal, no `data-*` attribute carrying values. For a TS rewrite, the cleanest seam is: a typed view-model → one render function per component → `data-*` attributes (e.g. `data-copy="…"`) + delegated event listeners, with all SVG path/offset math derived from the series. Also fix the two sample-data bugs before treating the markup as a contract: the stray `<span class="state">` (B1:693, 709) and the B2 ring-centre mismatch (B2:736 vs 733).

**The old tree already has a data contract** — reuse its shape rather than inventing one: `DATA` parsed from the injected `window.__P__` payload (`home_dashboard.html:705-708`, `health_dashboard.html:199-202`), with the section list `['kpiGrid','trendChart','deficitFormula','todoSection','recentSection']` (`home_dashboard.html:745`), a view→section `targets` map (`:750-754`), `allKeys=['food','water','exercise','weight']` (`:974`) and `labels` (`:975`). Thresholds that must stay data-driven: `barClass` 90/60 (`:726-731`), `getBadge` default `[0.9,1.1]` (`health_dashboard.html:214`), deficit range `[0.6,1.4]` + divisor 500 (`:251-252`), rule thresholds 1.1/0.7/50/7/700 (`:294-300`). The `actions` array (`health_dashboard.html:293-301`) is the closest existing thing to a **help-command registry** — label + emoji + rule + copy text — and is the natural model for the HELP page's command list.

### 6.5 Token drift in the old tree — what the rewrite must converge

C1:604 mandates one token set (A system). Neither old dashboard complies, so **the HELP page must not be diffed against them for token values** — B1 is the reference:

| Token | A system / B1 | `home_dashboard.html` | `health_dashboard.html` |
|---|---|---|---|
| accent | `#007aff` (B1:27) | `#007aff` ✅ (`:26`) | `#0071e3` ❌ (`:12`) |
| ink | `#1d1d1d` (B1:22) | `#1d1d1f` ❌ (`:21`) | `#1d1d1f` ❌ (`:10`) |
| ink3 | `#8e8e93` (B1:24) | `#86868b` ❌ (`:23`) | — |
| line | `rgba(60,60,67,.12)` (B1:25) | `#d2d2d7` ❌ (`:24`) | — |
| bg-soft | `#f5f5f7` (B1:19) | `#f5f5f7` ✅ (`:18-19`) | `#f5f5f7` reused as `--accent-soft` ❌ (`:12`) |
| radius tokens | `--r-sm/--r/--r-lg` = 8/14/20 (B1:38-40) | 8/14/**16** ❌ (`:37-39`) + hard-coded 24/12/6/3/2px | **none declared**; hard-coded 20/16/14/10/8/6/4/2px (`:31,55,91,159,120,127,135,64,109,76,101`) |
| shadows | `0 1px 3px .04,0 8px 24px .04` (B1:36) | 3 variants, all different ❌ (`:34-36`) | single `0 1px 3px .04,0 4px 16px .06` ❌ (`:16`) |
| font stack | includes `"SF Pro Display"` (B1:47) | ✅ (`:44`) | ❌ missing `"SF Pro Display"` (`:21`) |
| soft colours | `rgba(...)` tints (B1:28-34) | — | Material hexes `#E8F5E9/#FFF3E0/#FFEBEE` ❌ (`:13-15`) |

Also worth noting for the rewrite: C1 contains **no mention of TypeScript, a language migration, or a rewrite** anywhere — its roadmap (C1:601-648) is CSS-only (`_tokens.css` + `@import`). So the TS acceptance target has to be derived from B1 + the C1 §十 checklist, not from an existing written TS spec.

### 6.6 Other binding rules from C1 that a HELP page must satisfy

- **One primary colour value**, one input interaction, one copy-button position (C1:353, C1:424).
- **Contrast:** WCAG AA **4.5:1** for body text (C1:432) — the `--ink3 #8e8e93` tertiary grey is only safe on white for ≥14px/non-body use; do not use it for help prose.
- **AI-smell blacklist** (C1:537-566): gradient text (`:542-543`), radial glow (`:546-547`), tri-colour id-card gradient (`:550-551`), emoji in `<h1>` — "Apple HIG 标题是纯文字,emoji 在标题里是『AI 生成』的强烈信号" (`:554-555`), gold/silver/bronze gradients (`:558-559`), pulse (`:562-563`).
- **`home_dashboard.html` is named the A-system 基准** (C1:303) — so where B1 and the old tree disagree, B1 wins, and where the old tree is right (44px touch targets, `pre` slab) it is still worth porting.
