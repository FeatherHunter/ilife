// #725 文档骨架件守卫测试（node:test；随包门 `node --test packages/base-render/test/*.test.mjs` 跑）。
//
// 它守什么：骨架件这一族（`*Shell.ts` ＝某类文档的壳）的**外观与口径**，逐条对票面判据：
//   ① 骨架逐字：`<!doctype html>` 起、`</html>` 止；head 的 charset→viewport→title 序；
//      head 样式槽 → 正文槽 → shared helpers 槽 的位次（判据 3：删掉本件，调用方就得各自再写这一圈）；
//   ② 资产口径：`buildStyleSheet().css + '\n' + blocksCss()` 起头，`extraCss` 接在后头（空串不多出段）；
//   ③ 两位：`charts`（多一个资源位＋资产）与 `pageUi`（viewport 串＋版面根类），不给＝与不启用逐字节同；
//   ④ 判据 4「公共层零领域词」的机器形态：件里不出现任何技能名——**清单从 `packages/` 派生，不手写**
//      （手写清单会过期；派生清单随目录增减自动跟上）；
//   ⑤ 铁律五：一个文件对外只一个名字；子路径出口已登记（主入口不动）。
//
// 纪律（与 blocks.test.mjs 同口径）：断言只读冻结常量，不硬编码第二份值。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { PAGE_UI_CLASS, PAGE_UI_VIEWPORT, buildChartsHelpersJs, buildStyleSheet } from '../dist/index.js';
import { blocksCss } from '../dist/blocks.js';
import { renderDocShell } from '../dist/docShell.js';

const DOC_TITLE = '文本标题';
const BODY = '<section class="ilife-block ilife-block-page-shell"><h1>标题</h1></section>';
const BASE = { docTitle: DOC_TITLE, bodyHtml: BODY, extraCss: '' };

/** 槽位标记：填充后都必须消失（它们是位，不是产物）。 */
const SLOT_MARKERS = ['<!--SHARED-CSS-->', '<!--CONTENT-->', '<!--SHARED-HELPERS-->', '<!--CHARTS-HELPERS-->'];

describe('#725 文档骨架件：骨架逐字与槽位序', () => {
  const html = renderDocShell({ ...BASE, extraCss: '.probe-patch{}' });

  it('起于 doctype、止于 </html>，且槽位标记一个不剩', () => {
    assert.equal(html.slice(0, '<!doctype html>'.length), '<!doctype html>', '首字节必须是 doctype');
    assert.ok(html.includes('<html lang="zh-CN">'), '缺 html lang');
    assert.ok(html.endsWith('\n</body>\n</html>'), '必须以 </body></html> 收尾：' + JSON.stringify(html.slice(-40)));
    for (const m of SLOT_MARKERS) assert.ok(!html.includes(m), '槽位标记漏在产物里：' + m);
  });

  it('head 三件序：charset → viewport → title → 样式槽；body 形如「版面根包正文，正文之后接 helpers」', () => {
    const iCharset = html.indexOf('<meta charset="utf-8">');
    const iViewport = html.indexOf('<meta name="viewport"');
    const iTitle = html.indexOf('<title>' + DOC_TITLE + '</title>');
    assert.ok(iCharset >= 0 && iViewport > iCharset && iTitle > iViewport, 'head 三件序走散');
    assert.ok(html.indexOf('<style>') > iTitle, '样式槽必须在 title 之后');
    assert.ok(html.includes('\n<body>\n<div class="wrap ilife-page">\n' + BODY + '\n</div>\n<script>'),
      'body 形必须是「版面根包正文，正文之后接 shared helpers」');
  });
});

describe('#725 文档骨架件：资产口径', () => {
  it('共享样式起头、extraCss 接在后头', () => {
    const html = renderDocShell({ ...BASE, extraCss: '.probe-patch{}' });
    assert.ok(html.includes(buildStyleSheet().css + '\n' + blocksCss() + '\n' + '.probe-patch{}'),
      '资产拼接口径必须逐字节是 style + \\n + blocksCss + \\n + extraCss');
  });

  it('空 extraCss＝不多出空段（样式槽恰好在 blocksCss 之后收尾）', () => {
    const html = renderDocShell({ ...BASE });
    assert.ok(html.includes(buildStyleSheet().css + '\n' + blocksCss() + '</style>'),
      '空 extraCss 不得多出一个换行段');
  });
});

describe('#725 文档骨架件：两个位（charts／pageUi）', () => {
  it('charts：不给＝无图表资产；给＝资产在 shared helpers 之后、</body> 之前', () => {
    const off = renderDocShell({ ...BASE });
    const on = renderDocShell({ ...BASE, charts: true });
    const sig = buildChartsHelpersJs().slice(0, 60);
    assert.ok(!off.includes(sig), '不给 charts 却带了图表资产');
    assert.ok(on.includes(sig), '给了 charts 却没带图表资产');
    const at = on.indexOf(sig);
    assert.ok(at > on.indexOf('</div>') && at < on.indexOf('</body>'), '图表资源位必须落在 helpers 槽之后、</body> 之前');
  });

  it('pageUi：viewport 串与版面根类两处一起换；不给＝基础串与基础类', () => {
    const off = renderDocShell({ ...BASE });
    assert.ok(off.includes('<meta name="viewport" content="width=device-width,initial-scale=1">'), '缺基础 viewport 串');
    assert.ok(off.includes('<div class="wrap ilife-page">\n'), '缺基础版面根类');

    const on = renderDocShell({ ...BASE, pageUi: true });
    assert.ok(on.includes('<meta name="viewport" content="' + PAGE_UI_VIEWPORT + '">'), 'pageUi 未换 viewport 串');
    assert.ok(on.includes('<div class="wrap ilife-page ' + PAGE_UI_CLASS + '">\n'), 'pageUi 未加版面根类');
    assert.ok(!on.includes('content="width=device-width,initial-scale=1">'), '两串不得同时出现');
  });

  it('两位都只认真真值：不给／给假 → 与不启用逐字节相同', () => {
    const plain = renderDocShell({ ...BASE });
    assert.equal(renderDocShell({ ...BASE, charts: false, pageUi: false }), plain);
    assert.equal(renderDocShell({ ...BASE, charts: undefined, pageUi: undefined }), plain);
  });
});

describe('#725 文档骨架件：文档版本声明的大小写（doctype）', () => {
  it('缺省＝小写；给 upper 只差那几个字符，其余逐字节相同', () => {
    const lower = renderDocShell({ ...BASE });
    assert.ok(lower.startsWith('<!doctype html>\n<html lang="zh-CN">'), '缺省必须是小写写法');
    const upper = renderDocShell({ ...BASE, doctypeCase: 'upper' });
    assert.ok(upper.startsWith('<!DOCTYPE html>\n<html lang="zh-CN">'), 'upper 必须是大写写法');
    assert.equal(upper.replace('<!DOCTYPE html>', '<!doctype html>'), lower, '除大小写外必须逐字节相同');
    assert.equal(renderDocShell({ ...BASE, doctypeCase: 'lower' }), lower);
    assert.equal(renderDocShell({ ...BASE, doctypeCase: undefined }), lower);
  });

  it('只认 upper：给别的值一律按缺省小写（不新开第三种写法）', () => {
    const lower = renderDocShell({ ...BASE });
    assert.equal(renderDocShell({ ...BASE, doctypeCase: 'UPPER' }), lower);
    assert.equal(renderDocShell({ ...BASE, doctypeCase: 'bogus' }), lower);
  });
});

describe('#725 文档骨架件：件自己（判据 4 与铁律五）', () => {
  it('判据 4：件里不出现任何技能名（清单从 packages/ 派生，不手写）', () => {
    const src = readFileSync(fileURLToPath(new URL('../src/docShell.ts', import.meta.url)), 'utf8');
    const pkgsRoot = fileURLToPath(new URL('../../../packages/', import.meta.url));
    const names = readdirSync(pkgsRoot)
      .filter((d) => d.startsWith('skill-') || d.startsWith('plugin-'))
      .map((d) => d.replace(/^(skill|plugin)-/, ''));
    assert.ok(names.length >= 5, '技能目录清单必须非空（缩面＝放宽）：' + names.join('、'));
    const hits = names.filter((n) => src.includes(n));
    assert.deepEqual(hits, [], '公共层件里出现了技能名：' + hits.join('、'));
  });

  it('铁律五：对外只一个运行时名字；类型面出口也在此点名（改动即在此变红）', async () => {
    const mod = await import('../dist/docShell.js');
    assert.deepEqual(Object.keys(mod).sort(), ['renderDocShell'], '一个文件对外只许一个名字');
    // 类型面（`.d.ts`）的出口：规格 §一 那句话是「对外只这一个名字」的**运行时**口径；
    // 类型面按铁律五数字（≤5）另算，这里把它逐字点名——加类型出口就得先改这一行（免得悄悄长胖）。
    const dts = readFileSync(fileURLToPath(new URL('../dist/docShell.d.ts', import.meta.url)), 'utf8');
    const types = [...dts.matchAll(/^export (?:type|interface) (\w+)/gm)].map((m) => m[1]).sort();
    assert.deepEqual(types, ['DocShellDoctypeCase', 'DocShellInput'], '类型面出口＝这两个');
    const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'));
    assert.equal(pkg.exports['./docShell'], './dist/docShell.js', '子路径导出');
    assert.equal(pkg.exports['.'], './dist/index.js', '主入口不动');
  });
});
