/** t407 · 生成「手机墙」：把写入域 32 张页各塞进一个 390 宽的 `<iframe>`，按族分组铺开。
 *  两个用处：① 我一眼扫完全部 32 张在手机宽度下的版式（一轮截图代替 32 次点开）；
 *  ② 负责人验收时一页看全。
 *  为什么用 iframe 而不是缩略图：iframe 里跑的是真 HTML——页内 820／640／400 三条断点
 *  按 390 宽生效，量的是真页面，不是缩略图。
 *  三条已知限制：
 *   ① 不用 `loading="lazy"`：靠后的格子会不加载（见下 `FRAME` 常量）。
 *   ② 截图工具只栅格化靠前的行，靠后的 iframe 在截图里是空白——那是截图的事，
 *      真浏览器里滚动就画出来；所以这面墙是给人看的，别拿它当自动化扫描的输入。
 *   ③ 视觉模型说「这格空白」时先自己看图：它可能编出产物里根本没有的页名。
 *  一条版面约束（别改回去）：390 宽下单列，卡片 350 宽，框仍 390 宽 ⇒ 靠卡片自带的横向滚动看全框。
 *  末条媒体查询必须是 `minmax(0,1fr)`、`figure` 必须是 `overflow-x:auto`；写回 `1fr`／`overflow:hidden`
 *  就会把每个框的右边 42 像素裁掉且滚不出来（判据：390 视口下 `documentElement.scrollWidth` 仍 390）。
 *  用法：node t407-手机墙.mjs [产物目录=本目录] [输出名=t407-手机墙.html]
 *  自检：凡写进 href／iframe src 的目标逐个 existsSync 断言，缺一个即以非 0 退出并点名。
 */
import { writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(process.argv[2] ?? HERE);
const OUT = process.argv[3] ?? 't407-手机墙.html';

/** 16 条唤醒词的页类型：全部「两者」，即缺字段出采集页、落库后出回执页。 */
const PAIRS = ['记收入', '记报销', '拍账单', '批量录入', '记退款', '报销到账',
  '记借出', '记借入', '记收回', '记偿还', '记分期', '记一笔', '改记录', '撤销', '恢复'];

/** 三族。每族的成员按唤醒词列，`代表` 族的成员在文件名里写「代表」。 */
const FAMILIES = [
  {
    name: '记账族', note: '日常收支的入口：缺字段出采集页，落库后出回执页',
    members: [
      { wake: '记支出', rep: true, what: '一笔支出的采集页，与其余 15 条共用同一套页面块' },
      { wake: '记收入', what: '一笔收入的采集页，金额取正数，分类三级与心法必填' },
      { wake: '记报销', what: '垫付后打 #待报销 标，打标提示与来源提示各占一块' },
      { wake: '拍账单', what: '只收金额／分类／时间三要素，识别在本仓之外办' },
      { wake: '记一笔', what: '参数齐就直接落库出回执，按金额符号判支出还是收入' }
    ]
  },
  {
    name: '特殊收支族', note: '要选原记录的六条走流程三段式，记分期走参数确认',
    members: [
      { wake: '记退款', what: '选原记录、填金额、确认复制，超支警示条写明可继续' },
      { wake: '报销到账', what: '选一条待报销记录，靠标签流转销掉 #待报销' },
      { wake: '记借出', what: '填借给谁与期限，打 #借贷 标' },
      { wake: '记借入', what: '填向谁借与期限，打 #借贷 标' },
      { wake: '记收回', what: '选一笔借出记录，金额与消标都要用户确认' },
      { wake: '记偿还', what: '选一笔借入记录，消掉借入标' },
      { wake: '记分期', what: '期数、总额、首期日缺一不许写库，分摊预览表列各期' }
    ]
  },
  {
    name: '批量与修正族', note: '一次多行与事后改正：批量现单笔化，撤销／恢复走软删打标',
    members: [
      { wake: '批量录入', what: '逐行可编辑表加合计行，缺金额不出复制指令' },
      { wake: '改记录', what: '缺 id 先列候选，选定后出字段／原值／新值三列 diff 表' },
      { wake: '撤销', what: '缺 id 先列候选记录，软删打标 G7，不物理删' },
      { wake: '恢复', what: '缺 id 先列已打标记录，选中后把标记置回 NULL' }
    ]
  }
];

/** 组装 32 格：代表一条两页，其余 15 条各两页。 */
const cells = [];
for (const fam of FAMILIES) {
  for (const m of fam.members) {
    const pre = m.rep ? 't407-代表-' : 't407-页-';
    for (const kind of ['采集页', '回执页']) {
      cells.push({
        family: fam.name,
        wake: m.wake,
        kind,
        role: kind === '采集页' ? '过程型采集页' : '结果型回执页',
        file: pre + m.wake + '-' + kind + '.html',
        what: m.what
      });
    }
  }
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** 链接自检：凡写进 href／iframe src 的目标逐个落盘断言，缺一个就点名并非 0 退出。 */
const targets = [...new Set(cells.map((c) => c.file))];
const missing = targets.filter((t) => !existsSync(join(SRC, t)));
if (missing.length > 0) {
  console.error('链接自检失败：' + missing.length + ' 个目标缺失');
  for (const m of missing) console.error('  缺 ' + m);
  process.exit(1);
}

/** 固定宽 390；高度 980 让长页先露一段。**不加 `loading` 属性**——加了靠后的格子不加载。 */
const FRAME = '    <iframe src="%SRC%" width="390" height="980" title="%TITLE%"></iframe>';

const grid = FAMILIES.map((fam) => {
  const rows = cells.filter((c) => c.family === fam.name);
  const figs = rows.map((c) => '  <figure>\n'
    + '    <figcaption><a href="' + esc(c.file) + '" target="_blank">'
    + esc(c.wake) + ' · ' + esc(c.role) + '</a>'
    + '<code>' + esc(c.file) + '</code></figcaption>\n'
    + FRAME.replace('%SRC%', esc(c.file)).replace('%TITLE%', esc(c.wake + c.role)) + '\n'
    + '  </figure>').join('\n');
  return '  <h2>' + esc(fam.name) + '<span>' + rows.length + ' 格 · ' + esc(fam.note) + '</span></h2>\n'
    + '  <div class="grid">\n' + figs + '\n  </div>';
}).join('\n');

const page = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>饼干记账 t407 写入域 · 手机墙（${cells.length} 格 × 390 宽）</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f7;color:#1d1d1f}
.wrap{padding:24px 20px 60px}
h1{font-size:22px;font-weight:600;margin-bottom:8px}
.lead{color:#3a3a3c;font-size:13.5px;line-height:1.75;max-width:1100px;margin-bottom:8px}
.lead b{font-weight:600}
.counts{color:#6e6e73;font-size:12.5px;margin-bottom:22px}
h2{font-size:15px;font-weight:600;margin:24px 0 10px;display:flex;flex-wrap:wrap;align-items:baseline;gap:10px}
h2 span{font-size:12px;font-weight:400;color:#86868b}
.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}
figure{background:#fff;border:1px solid #d2d2d7;border-radius:12px;overflow-x:auto}
figcaption{padding:8px 10px;font-size:12.5px;font-weight:600;border-bottom:1px solid #e8e8ed}
figcaption a{color:#007aff;text-decoration:none}
figcaption code{display:block;margin-top:3px;font-size:11px;font-weight:400;color:#86868b;word-break:break-all}
iframe{display:block;width:390px;height:980px;border:0;background:#fff}
@media(max-width:1720px){.grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:1300px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:900px){.grid{grid-template-columns:minmax(0,1fr)}}
</style>
</head>
<body>
<div class="wrap">
  <h1>手机墙 · 写入域 ${cells.length} 格 × 390 宽</h1>
  <p class="lead">这面墙把 t407 写入域的 <b>${cells.length} 张页</b>各塞进一个宽 <b>390</b> 的框里，
  按三族分组铺开：记账族、特殊收支族、批量与修正族。每格上方一条格头，写<b>唤醒词 · 页类型 · 文件名</b>；
  点格头的文件名就打开那一张真页（新标签）。</p>
  <p class="lead">390 是手机口径：框里跑的是真 HTML，页内 820／640／400 三条断点按 390 宽生效，
  所以看到的是这一张页在手机宽度下的真实版式，不是缩略图。滚动一遍看完，不用点 ${cells.length} 次。</p>
  <p class="counts">格 ${cells.length} · 框 ${cells.length} · 目标 ${targets.length} 个，全部落盘</p>
${grid}
</div>
</body>
</html>
`;
writeFileSync(join(SRC, OUT), page, 'utf8');

const hrefCount = (page.match(/<a href="/g) ?? []).length;
const frameCount = (page.match(/<iframe src="/g) ?? []).length;
const lazy = (page.match(/<iframe loading/g) ?? []).length;
const ext = (page.match(/https?:\/\//g) ?? []).length;
console.log('手机墙 ' + OUT + '：格 ' + cells.length + ' · iframe ' + frameCount
  + ' · href ' + hrefCount + ' · 目标 ' + targets.length + ' 个，缺失 ' + missing.length
  + ' · loading="lazy" 命中 ' + lazy + ' · 外部 http 引用 ' + ext);
