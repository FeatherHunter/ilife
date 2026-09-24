// 皮肤层（skin）· 判据件。
//
// 断言对象是**消费方真走的那条出口**：`dist/blocks.js`（组件层对外路径；层规：组件层不进冻结面、不从根出口）。
// 五组：
//   ① 契约对账（每套皮肤的取值表与 token 名单逐名对上，不漏不多）
//   ② 对比地板（ink／ink-2／ink-3／accent-text 对 ground／surface 的 WCAG 比 ≥4.5）
//   ③ 读法（skinVar 产出兜底链；名单外的 token 报 BlocksError；皮肤类名可算）
//   ④ 样式纪律（三套类都在、零 `:root`、零 `!important`、不重定义那 11 个冻结 token 名）
//   ⑤ 加法式（不挂皮肤类时，皮肤段对产物零命中）
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { styleSources } from './_style-sources.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

import {
  BROADSHEET_VALUES,
  INK_VALUES,
  NEUTRAL_VALUES,
  PAPER_VALUES,
  SKIN_DEFAULT,
  SKIN_NAMES,
  SKINS,
  SKIN_TOKENS,
  SKIN_TOKEN_NAMES,
  skinClass,
  skinCss,
  skinTokenVar,
  skinVar,
} from '../dist/blocks.js';
import { CSS_VAR_TOKENS } from '../dist/spec/index.js';

/** 剥掉 CSS 注释再断规则（注释会**提到** token 名，拿裸串断会把"解释"当"规则"）。 */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** 肤色：`#rgb`／`#rrggbb` → 相对亮度（WCAG 2.1）。 */
const luminance = (hex) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const ch = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const lin = ch.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
};

/** WCAG 对比度（1..21）。 */
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

const VALUES = {
  paper: PAPER_VALUES,
  broadsheet: BROADSHEET_VALUES,
  neutral: NEUTRAL_VALUES,
  ink: INK_VALUES,
};

describe('皮肤 ① 契约对账', () => {
  it('皮肤都在注册表里，且与 SKIN_NAMES 逐名对上', () => {
    assert.deepEqual(Object.keys(SKINS), [...SKIN_NAMES]);
    assert.equal(SKIN_NAMES.includes(SKIN_DEFAULT), true, '缺省皮肤必须在闭集里');
  });

  for (const name of SKIN_NAMES) {
    it(name + '：取值表与 token 名单逐名对上（不漏不多）', () => {
      const keys = Object.keys(VALUES[name]);
      assert.deepEqual(keys.slice().sort(), SKIN_TOKEN_NAMES.slice().sort(),
        '取值表与名单走散：' + name);
      for (const k of keys) {
        assert.equal(typeof VALUES[name][k], 'string');
        assert.notEqual(VALUES[name][k].trim(), '', name + ' 的 ' + k + ' 是空值');
      }
    });
  }

  it('token 名单里每条都有兜底链，且以「冻结 token 或字面值」收尾', () => {
    for (const k of SKIN_TOKEN_NAMES) {
      const chain = SKIN_TOKENS[k].fallback;
      assert.ok(Array.isArray(chain) && chain.length >= 1, k + ' 缺兜底链');
      const tail = chain[chain.length - 1];
      assert.equal(typeof tail, 'string');
      assert.notEqual(tail.trim(), '', k + ' 的兜底尾巴是空的');
    }
  });
});

describe('皮肤 ② 对比地板（WCAG，算出来不靠眼看）', () => {
  const TEXT_TOKENS = ['ink', 'ink-2', 'ink-3', 'accent-text'];
  const GROUNDS = ['ground', 'surface', 'surface-2'];

  for (const name of SKIN_NAMES) {
    for (const t of TEXT_TOKENS) {
      for (const g of GROUNDS) {
        it(name + '：' + t + ' 在 ' + g + ' 上 ≥ 4.5:1', () => {
          const ratio = contrast(VALUES[name][t], VALUES[name][g]);
          assert.ok(ratio >= 4.5, name + ' 的 ' + t + '/' + g + ' 只有 ' + ratio.toFixed(2) + ':1');
        });
      }
    }
  }
});

describe('皮肤 ②b：强调软底不许是"空转"（＝选中面在那套皮肤下没有底）', () => {
  /** 两色的最大通道差（0..255）：判"是不是同一个面"用，比对比度更贴近"看得出区别"。 */
  const chanDiff = (a, b) => {
    const ch = (h) => {
      const s = h.replace('#', '');
      const f = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
      return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
    };
    return Math.max(...ch(a).map((v, i) => Math.abs(v - ch(b)[i])));
  };

  for (const name of SKIN_NAMES) {
    it(name + '：`accent-soft` 与 `surface-2` 分得开（否则选中面落在软底容器里没有底）', () => {
      const soft = VALUES[name]['accent-soft'];
      const s2 = VALUES[name]['surface-2'];
      assert.notEqual(soft, s2, name + ' 的 `accent-soft` 与 `surface-2` 逐字节同色 ⇒ 那个 token 在那套皮肤里是空转');
      assert.ok(chanDiff(soft, s2) >= 12,
        name + ' 的 `accent-soft` 与 `surface-2` 只差 ' + chanDiff(soft, s2) + ' 个通道 ⇒ 视觉上分不开'
        + '（选中片落在 `-seg`／表头这类 `surface-2` 底的容器里等于没有底）');
    });

    it(name + '：`danger` 与 `accent` 分得开（否则"超目标／危险"与"正常强调"在纸上一个样）', () => {
      const r = contrast(VALUES[name]['danger'], VALUES[name]['accent']);
      assert.ok(r >= 1.2,
        name + ' 的 danger/accent 只有 ' + r.toFixed(2) + ':1 ⇒ 语义档与强调档在观感上撞在一起'
        + '（`scale-bar` 的"有数"与"超目标"就是这两支，撞了就分不出超没超）');
    });

    it(name + '：`accent-ink` on `accent` ≥ 3:1（图形地板；**这一档只许放图形与大字，不许放正文**）', () => {
      const r = contrast(VALUES[name]['accent-ink'], VALUES[name]['accent']);
      assert.ok(r >= 3, name + ' 的 accent-ink/accent 只有 ' + r.toFixed(2) + ':1');
    });

    it(name + '：弱字 `ink-3` 压在 `accent-soft` 上也 ≥ 4.5:1（软底是选中面，弱字会压上去）', () => {
      const r = contrast(VALUES[name]['ink-3'], VALUES[name]['accent-soft']);
      assert.ok(r >= 4.5,
        name + ' 的 ink-3/accent-soft 只有 ' + r.toFixed(2) + ':1 —— 软底现在是全层选中面的底，'
        + '件里的脚注／口径行压上去就踩地板（修法：压深 `ink-3`，别改 `accent-soft`——它的地板更多）');
    });

    it(name + '：`accent-text` on `accent-soft` ≥ 4.5:1 且 `accent` on `accent-soft` ≥ 3:1', () => {
      const soft = VALUES[name]['accent-soft'];
      const t = contrast(VALUES[name]['accent-text'], soft);
      const g = contrast(VALUES[name]['accent'], soft);
      assert.ok(t >= 4.5, name + ' 的 accent-text/accent-soft 只有 ' + t.toFixed(2) + ':1');
      assert.ok(g >= 3, name + ' 的 accent/accent-soft 只有 ' + g.toFixed(2) + ':1（图形地板）');
    });
  }
});

describe('皮肤 ②c 语义色当字（WCAG，算出来不靠眼看）', () => {
  /* 为什么单钉这一组：契约的对比地板表只列了 `ink`／`ink-2`／`ink-3`／`accent-text`，
     **没有一条管「语义色自己当字」**；而法则表点名「达标」走 `ok`／`ok-soft`、「提醒」走 `warn`／`warn-soft`、
     「超目标／危险」走 `danger`／`danger-soft`（`docs/base/base-render/选中态与皮肤语言.md` 第三节）
     ⇒ 这三支就是语义档的字，它们得自己过文本地板：对卡面 `surface`、页底 `ground`、
     以及它自己的软底（语义档的底）三档底都 ≥4.5:1。
     另一条同口径的：三支语义色互相也要分得开（两两 ≥1.2:1），否则「达标／提醒／超目标」在纸上一个样
     ——与既有的 `danger` vs `accent` ≥1.2:1 是同一条道理（语义档撞色＝那一档白设）。 */
  const SEMANTIC = ['ok', 'warn', 'danger'];
  const SEMANTIC_PAIRS = [['ok', 'danger'], ['warn', 'ok'], ['warn', 'danger']];

  for (const name of SKIN_NAMES) {
    for (const t of SEMANTIC) {
      it(name + '：`' + t + '` 当字，对 surface／ground／`' + t + '-soft` 三档底都 ≥ 4.5:1', () => {
        // 一次报**全部**不达标的底：逐条断言会在第一处停下，剩下几条要重跑才看得见。
        const bad = [];
        for (const g of ['surface', 'ground', t + '-soft']) {
          const ratio = contrast(VALUES[name][t], VALUES[name][g]);
          if (ratio < 4.5) bad.push(t + ' on ' + g + ' 只有 ' + ratio.toFixed(2) + ':1');
        }
        assert.deepEqual(bad, [], name + ' 的语义色当字过不了文本地板：' + bad.join('；')
          + ' —— 语义色当字落在正文里，就得过 4.5（修法：压深／调亮 token 自己，色相不动）');
      });
    }

    it(name + '：三支语义色互相分得开（`ok`／`warn`／`danger` 两两 ≥ 1.2:1）', () => {
      const bad = [];
      for (const [a, b] of SEMANTIC_PAIRS) {
        const r = contrast(VALUES[name][a], VALUES[name][b]);
        if (r < 1.2) bad.push(a + '/' + b + ' 只有 ' + r.toFixed(2) + ':1');
      }
      assert.deepEqual(bad, [], name + ' 的两支语义档在观感上撞在一起：' + bad.join('；')
        + ' ⇒ "达标"与"超目标"分不出（与 `danger` vs `accent` 同一条地板）');
    });
  }
});

describe('皮肤 ③ 读法', () => {
  it('skinVar 产出「皮肤 → 冻结 token → 字面值」的兜底链', () => {
    const s = skinVar('surface');
    assert.equal(s, 'var(--ilife-surface, var(--card, #ffffff))');
    const d = skinVar('danger');
    assert.equal(d, 'var(--ilife-danger, #a83228)');
  });

  it('每一条 token 都读得出，且都带 --ilife- 前缀', () => {
    for (const k of SKIN_TOKEN_NAMES) {
      const s = skinVar(k);
      assert.equal(s.startsWith('var(--ilife-' + k + ', '), true, k + ' 读法不对：' + s);
      assert.equal(s.endsWith(')'), true);
    }
  });

  it('名单外的 token 当场报 BlocksError（不许静默兜底）', () => {
    assert.throws(() => skinVar('nope'), (e) => e.name === 'BlocksError');
    assert.throws(() => skinClass('nope'), (e) => e.name === 'BlocksError');
  });

  it('皮肤类名可算，且带前缀', () => {
    assert.equal(skinClass('paper'), 'ilife-skin-paper');
    assert.equal(skinClass('paper', 'acme-'), 'acme-skin-paper');
  });
});

describe('皮肤 ④ 样式纪律', () => {
  const css = stripComments(skinCss());

  it('段非空，三套类都在，每套都出全部 token', () => {
    assert.ok(css.length > 0);
    for (const name of SKIN_NAMES) {
      assert.equal(css.includes('.ilife-skin-' + name + ' {'), true, '缺 ' + name + ' 段');
    }
    // 只数「定义行」（缩进两空格开头的 `--ilife-名:`），别把旧名映射里的 var(--ilife-*) 引用也数进去。
    const defs = [...css.matchAll(/^ {2}--ilife-[a-z0-9-]+:/gm)];
    assert.equal(defs.length, SKIN_TOKEN_NAMES.length * SKIN_NAMES.length,
      'token 定义条数不对：' + defs.length);
    for (const name of SKIN_NAMES) {
      assert.equal((css.match(new RegExp('--ilife-', 'g')) || []).length > 0, true);
    }
  });

  it('零 :root、零 !important、零禁入 token', () => {
    assert.equal(css.includes(':root'), false, '不许写 :root');
    assert.equal(css.includes('!important'), false, '不许写 !important');
    for (const bad of ['--r-xl', '--pink']) assert.equal(css.includes(bad), false, '禁入 token：' + bad);
  });

  it('11 个旧 token 名在皮肤类作用域内逐名给出映射（值走 var(--ilife-*)）', () => {
    // 为什么必须给：老页面与既有件读旧名、新件读 `--ilife-*`；皮肤里不给旧名映射，挂上皮肤就会
    // 「新件跟皮肤、老件不跟」——同一张卡里两种色（部分换皮）。给了映射，「挂皮肤＝整页一种语言」对两者同时成立。
    for (const frozen of Object.keys(CSS_VAR_TOKENS)) {
      const mapped = css.includes(frozen + ': var(--ilife-');
      assert.equal(mapped, true, '皮肤段缺旧名映射：' + frozen);
    }
  });

  it('旧名映射只出现在皮肤类作用域内，且绝不出现在 :root', () => {
    // 页面级契约不动：没挂皮肤类的页照旧走默认 token 表。
    assert.equal(css.includes(':root'), false);
    const lines = css.split('\n').filter((l) => /^\s*--(fg|fg2|fg3|bg|card|line|blue|blue2|soft|ok|shadow):/.test(l));
    assert.equal(lines.length, Object.keys(CSS_VAR_TOKENS).length * SKIN_NAMES.length,
      '旧名映射条数不对：' + lines.length);
    for (const l of lines) assert.equal(/var\(--ilife-/.test(l), true, '旧名映射的值必须走 var(--ilife-*)：' + l.trim());
  });

  it('只出点名的皮肤（skins 参数生效）', () => {
    const one = stripComments(skinCss({ skins: ['neutral'] }));
    assert.equal(one.includes('.ilife-skin-neutral {'), true);
    assert.equal(one.includes('.ilife-skin-paper {'), false);
  });

  it('前缀可换', () => {
    const acme = stripComments(skinCss({ prefix: 'acme-' }));
    assert.equal(acme.includes('.acme-skin-paper {'), true);
    assert.equal(acme.includes('.ilife-skin-paper {'), false);
  });
});

describe('皮肤 ⑤ 加法式（不挂皮肤＝零命中）', () => {
  it('皮肤段里的选择器全部以皮肤类开头（不会误伤别的页）', () => {
    const selectors = [...stripComments(skinCss()).matchAll(/(?:^|\n)([^@\n{}]+)\{/g)]
      .map((m) => m[1].trim()).filter(Boolean);
    assert.ok(selectors.length >= SKIN_NAMES.length, '选择器数量不对');
    for (const sel of selectors) {
      assert.equal(/^\.ilife-skin-[a-z]+$/.test(sel), true, '不是皮肤类作用域：' + sel);
    }
  });

  it('token 名一律带 --ilife- 前缀（不与冻结 token 抢名字）', () => {
    for (const k of SKIN_TOKEN_NAMES) {
      assert.equal(skinTokenVar(k), '--ilife-' + k);
      assert.equal(Object.keys(CSS_VAR_TOKENS).includes(skinTokenVar(k)), false);
    }
  });
});

describe('皮肤 ⑥ 源码级纪律（组件只经 skinVar 读，不许手写 var(--ilife-…)）', () => {
  const COMPONENTS = join(HERE, '..', 'src', 'components');
  const SELF = new Set(['skin', 'shared']);

  /** 组件层的每份样式段（排除皮肤层自己）：一件的**全部** `style*.ts`——拆出去的那半也算本件的样式段
   *  （拆件先例 `scatter-fit/style-forms.ts`、`date-range/style-calendar.ts`、`cash-waterline/style-forms.ts`；
   *  只读 `<件>/style.ts` 会让按规矩拆件压行数的件少扫一半）。 */
  const styleFiles = () => {
    const out = [];
    for (const dir of readdirSync(COMPONENTS, { withFileTypes: true })) {
      if (!dir.isDirectory() || SELF.has(dir.name)) continue;
      for (const { file, src } of styleSources(dir.name)) out.push({ name: dir.name + '／' + file, src });
    }
    return out;
  };

  it('至少扫到了一件（防判据空转）', () => {
    assert.ok(styleFiles().length >= 1, '一件都没扫到，判据等于没跑');
  });

  it('组件样式里不出现手写的 var(--ilife-…)（兜底链只许住在 skin/contract.ts）', () => {
    const bad = [];
    for (const f of styleFiles()) {
      const src = stripComments(f.src);
      const hits = [...src.matchAll(/var\(\s*--ilife-/g)];
      if (hits.length > 0) bad.push(f.name + '（' + hits.length + ' 处）');
    }
    assert.deepEqual(bad, [], '这些件手写了 var(--ilife-…)，请改走 skinVar()：' + bad.join('、'));
  });

  it('组件样式里用到的 --ilife-* 名都在名单里（拼错的 token 会被静默兜底）', () => {
    const known = new Set(SKIN_TOKEN_NAMES.map((k) => skinTokenVar(k)));
    const bad = [];
    for (const f of styleFiles()) {
      const src = stripComments(f.src);
      const used = new Set([...src.matchAll(/'--ilife-([a-z0-9-]+)'/g)].map((m) => '--ilife-' + m[1]));
      const unknown = [...used].filter((n) => !known.has(n));
      if (unknown.length > 0) bad.push(f.name + '：' + unknown.join('、'));
    }
    assert.deepEqual(bad, [], '名单外的 token：' + bad.join('；'));
  });
});
