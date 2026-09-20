// #739 六家设置页的文字表：字号与字族不许各写各的（跟随宿主，而不是每家一份 px 表）。
//
// 背景（实测读数见 issue 正文）：六家 client.ts 的样式表分成两条血统——
// {记账／卡路里／备忘录} 写死 `font: '12px/1.5 ui-monospace,Consolas,monospace'`，
// {大厨／居家／作息} 写死 `fontSize: 12` 但字族继承；`label`／`hint`／`btn` 同样对不上。
// 宿主侧没有「界面控件」的字号 token（主题包的 token 全是颜色／背景／描边），
// 所以正解是：**不写字族**（交给宿主的继承链）＋ **字号一律相对单位（em）**。
//
// 本文件是防再分叉的锁：
//   ① 六家零 `font:` 简写、零 `fontFamily`；
//   ② 六家都该有的相对字号项，值必须逐字相同；只有部分家有的项（`version`）按「有则同值」；
//   ③ 该继承字号的项不许出现 fontSize；基准字号不许钉在 `card` 上。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');

/** 六家单品插件包目录名（与 #671 那张图的六个页签一一对应）。 */
const PACKAGES = [
  'plugin-bill-ilife',
  'plugin-calorie',
  'plugin-chef',
  'plugin-home-ilife',
  'plugin-memo-ilife',
  'plugin-schedule-ilife',
];

/** 六家都该有的相对字号项 → 期望值。 */
const RELATIVE_REQUIRED = {
  title: '1.08em',
  muted: '0.92em',
  info: '0.92em',
  hint: '0.92em',
  okText: '0.96em',
  error: '1em',
};

/** 有的家有、有的家没有（实测：{大厨／居家／作息} 的页脚走 `muted`，没有 `version` 这一格）。 */
const RELATIVE_OPTIONAL = { version: '0.92em' };

/** 该让宿主决定字号的样式项（不许出现 fontSize）。`total` 是单个显示数字，本单不动，故不入列。 */
const INHERIT_FONT_SIZE = ['card', 'label', 'input', 'btn', 'btnPrimary', 'btnPick', 'summary', 'advSummary'];

const readClient = (pkg) => readFileSync(join(REPO, 'packages', pkg, 'src', 'client.ts'), 'utf8');

/** 取出某个样式项的条目正文（`name: { … }` 里的 `…`；条目是平铺对象，无嵌套花括号）。 */
function entryBody(source, name) {
  const m = new RegExp('(?:^|\\n)\\s*' + name + ':\\s*\\{([\\s\\S]*?)\\}', 'm').exec(source);
  return m === null ? null : m[1];
}

/** 取该条目里的 fontSize 值（无则 null）。 */
function fontSizeOf(source, name) {
  const body = entryBody(source, name);
  if (body === null) return null;
  const m = /fontSize:\s*([^,}\n]+)/.exec(body);
  return m === null ? null : m[1].trim();
}

describe('#739 六家设置页文字表：字号相对、字族交给宿主', () => {
  it('六家 src/client.ts 里零 `font:` 简写、零 fontFamily（字族一律继承）', () => {
    for (const pkg of PACKAGES) {
      const src = readClient(pkg);
      assert.doesNotMatch(src, /\bfontFamily\s*:/, pkg + ' 写了 fontFamily（应交给宿主继承链）');
      assert.doesNotMatch(src, /\bfont\s*:\s*['"]/, pkg + ' 写了 font 简写（会连字族一起钉死）');
    }
  });

  it('六家都该有的相对项：都写成 em，且六家逐字相同', () => {
    for (const [name, expected] of Object.entries(RELATIVE_REQUIRED)) {
      const seen = new Map();
      for (const pkg of PACKAGES) {
        const value = fontSizeOf(readClient(pkg), name);
        assert.ok(value !== null, `${pkg} 少了样式项 ${name} 或它的字号`);
        assert.match(value, /^'[\d.]+em'$/, `${pkg} 的 ${name} 字号不是相对单位：${value}`);
        assert.equal(value, `'${expected}'`, `${pkg} 的 ${name} 字号应为 ${expected}`);
        seen.set(pkg, value);
      }
      assert.equal(new Set(seen.values()).size, 1, `${name} 在六家之间不一致：` + JSON.stringify([...seen]));
    }
  });

  it('只有部分家有的相对项（version）：凡有它的家都必须同值', () => {
    for (const [name, expected] of Object.entries(RELATIVE_OPTIONAL)) {
      const seen = new Map();
      for (const pkg of PACKAGES) {
        const value = fontSizeOf(readClient(pkg), name);
        if (value === null) continue;
        assert.equal(value, `'${expected}'`, `${pkg} 的 ${name} 字号应为 ${expected}`);
        seen.set(pkg, value);
      }
      assert.equal(new Set(seen.values()).size, 1, `${name} 各家不一致：` + JSON.stringify([...seen]));
    }
  });

  it('该继承的八项：出现的每一项都不写 fontSize（字号跟着宿主走）', () => {
    for (const name of INHERIT_FONT_SIZE) {
      for (const pkg of PACKAGES) {
        const body = entryBody(readClient(pkg), name);
        if (body === null) continue; // 各家没有的项（如 summary）跳过
        assert.doesNotMatch(body, /fontSize/, `${pkg} 的 ${name} 写死了字号（应继承宿主）`);
      }
    }
  });

  it('基准字号不再钉在卡片上（把 13px 那类绝对量拿掉）', () => {
    for (const pkg of PACKAGES) {
      const card = entryBody(readClient(pkg), 'card');
      assert.ok(card !== null, pkg + ' 少了样式项 card');
      assert.doesNotMatch(card, /fontSize/, pkg + ' 的 card 仍钉着基准字号：' + card.trim());
    }
  });
});
