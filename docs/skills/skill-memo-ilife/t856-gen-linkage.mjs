#!/usr/bin/env node
/** #856 · 链路总表生成器（一页静态表，按页族分节）。
 *
 * 形状照 `docs/skills/skill-calorie/t369-链路总表.mjs`（94 行骨架），只抄形状不抄路径：
 * 卡路里那份的路径写死在件内（读自己的 t369-验收＋scene-08-body.ts），直接跑会重出卡路里那张表，
 * 故备忘录自写一份。本件只读两处真源：
 *   ① 清单 `t856-manifest.json`（序号／页型／唤醒词／命令／产物名——链接只认它）；
 *   ② HELP 官方源 `src/help/scenes/*.ts`（prompt_template 全文＋editable_fields 参数名）。
 * 出批目录 `链路总表.html`（与产物同目录；链接走同目录相对路径、显示文本写绝对路径），
 * 末尾死链自检：缺链 exit 1，全通 exit 0。
 *
 * 七列：序／prompt 示例（带复制按钮）／唤醒词／命令／参数／页型／产物绝对路径（点直达）。
 * prompt 只出现唤醒词不出现命令（命令列另上——链路总表是技术导航页，与 HELP 不上命令的口径不冲突）。
 * 命令列的目标态标注：现状链路表里「路由不到／接不住」的 16 个场景appendix“（目标态）”，
 * 表示键已按 #837＋#850 定死、路由修复归路由票——本表不断言它们今天能跑通。
 *
 * 用法：
 *   node docs/skills/skill-memo-ilife/t856-gen-linkage.mjs <批目录>   # 出链路总表＋自检
 */
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');

const OUT = '链路总表.html';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const die = (code, msg) => { console.error(msg); process.exit(code); };

/** 现状为 NO_MATCH／接不住的场景（t822-现状链路表 §一＋§二）：命令列为目标态引用，路由修复不在本票。 */
const TARGET_ONLY = new Set([
  'memo_add_basic', 'memo_update_basic', 'memo_delete_basic',
  'memo_change_category_single', 'memo_batch_change_category',
  'memo_search_mood', 'memo_add_mood', 'memo_delete_mood', 'memo_update_mood',
  'memo_sync_feishu', 'memo_init_setup',
  'memo_search_by_date', 'memo_remind_existing', 'memo_completed_reminders',
  'memo_delete_wish', 'memo_delete_checkin',
]);

/** #837 定死的 4 处参数增量（HELP 字段照抄，增量另附注，不改 HELP 原文）。 */
const PARAM_NOTE = {
  memo_search_by_date: 'start＋end 双必填，按创建时间倒序（#837 Q⑤目标态；月份形退役）',
  memo_remind_existing: 'note_id 可选（给了校验存在，不给即独立提醒；#837 Q⑥目标态 memo.reminder）',
  memo_delete_basic: 'confirm:true（用户说删即确认；有关联／批量先出清单；#837 Q⑦）',
  memo_delete_wish: 'confirm:true（改指真删 memo.remove；#837 Q⑦）',
  memo_delete_checkin: 'confirm:true（改指真删 memo.remove；#837 Q⑦）',
  memo_delete_mood: 'confirm:true（改指真删 memo.remove；#837 Q⑦）',
  memo_init_setup: '输入为 AI 诊断 JSON（#837 Q④目标态 memo.init，只渲染不建库）',
};

function get(block, name) {
  const m = block.match(new RegExp('"' + name + '":\\s*"((?:[^"\\\\]|\\\\.)*)"'));
  return m ? JSON.parse('"' + m[1] + '"') : '';
}

/** 读 HELP 场景：sceneId → {prompt, fields}（源码文本正则，不编译 TS）。 */
function readHelpScenes(repo) {
  const dir = join(repo, 'packages', 'skill-memo-ilife', 'src', 'help', 'scenes');
  const out = new Map();
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.ts')) continue;
    const src = readFileSync(join(dir, f), 'utf8');
    for (const b of src.split(/id:\s*"/).slice(1)) {
      const idm = b.match(/^([a-z0-9_]+)"/);
      if (!idm || !idm[1].startsWith('memo_')) continue;
      const prompt = get(b, 'prompt_template');
      const fields = [...b.matchAll(/\{\s*name:\s*"([^"]+)"/g)].map((m) => m[1]);
      if (prompt) out.set(idm[1], { prompt, fields });
    }
  }
  return out;
}

function main() {
  const dirArg = process.argv[2];
  if (!dirArg) die(2, '用法：node t856-gen-linkage.mjs <批目录>（与产物同目录）');
  const dir = resolve(dirArg);
  const repo = REPO;
  const mfPath = join(dir, 'manifest.json');
  if (!existsSync(mfPath)) die(2, `没有清单：${mfPath}（先跑 --stage 铺批目录）`);
  const mf = JSON.parse(readFileSync(mfPath, 'utf8'));
  const rows = mf.rows;
  const help = readHelpScenes(repo);
  // booklet sceneId 需要从清单反查：清单行无 sceneId，按 (wake,file) 回 booklet 取 sceneId。
  const bookletSrc = readFileSync(join(repo, 'packages', 'skill-memo-ilife', 'src', 'help', 'booklet.ts'), 'utf8');
  const stemToScene = new Map();
  for (const m of bookletSrc.matchAll(/sceneId:\s*'([^']+)',\s*wake:\s*'([^']+)',\s*file:\s*'([^']+)'/g)) {
    stemToScene.set(m[3], m[1]);
  }
  const families = [...new Set(rows.map((r) => r.family || '未分组'))];
  const sections = families.map((fam) => {
    const mine = rows.filter((r) => (r.family || '未分组') === fam);
    const trs = mine.map((r) => {
      const sceneId = stemToScene.get(r.title) || '';
      const h = help.get(sceneId) || { prompt: '', fields: [] };
      const firstLine = (h.prompt.split('\n')[0] || '').slice(0, 60);
      const targetMark = TARGET_ONLY.has(sceneId) ? '（目标态）' : '';
      const paramBase = h.fields.length ? h.fields.join('、') : '—';
      const note = PARAM_NOTE[sceneId] ? `<br><span class="dim">${esc(PARAM_NOTE[sceneId])}</span>` : '';
      return `<tr>
<td>${r.seq}</td>
<td>${esc(firstLine)}<br><button class="cp" data-i="p${r.seq}">复制</button><pre id="p${r.seq}">${esc(h.prompt)}</pre></td>
<td><b>${esc(r.wake)}</b></td>
<td><code>${esc(r.key || '')}</code>${targetMark ? `<br><span class="dim">${esc(targetMark)}</span>` : ''}</td>
<td><code>${esc(paramBase)}</code>${note}</td>
<td>${esc(r.kind)}</td>
<td><a href="${esc(r.file)}" target="_blank" rel="noopener">${esc(join(dir, r.file))}</a></td>
</tr>`;
    }).join('\n');
    return `  <h2>${esc(fam)}（${mine.length} 件）</h2>
  <table><thead><tr><th>序</th><th>prompt 示例（带复制按钮）</th><th>唤醒词</th><th>命令</th><th>参数</th><th>页型</th><th>产物绝对路径（点直达）</th></tr></thead>
  <tbody>
${trs}
  </tbody></table>`;
  }).join('\n');

  const page = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>备忘录链路总表：唤醒词 → 命令 → HTML（${rows.length} 行）</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f7;color:#1d1d1f;padding:24px 20px 60px}
h1{font-size:22px;margin-bottom:6px}
.sub{color:#6e6e73;font-size:13.5px;margin-bottom:16px;line-height:1.7}
h2{font-size:15px;margin:22px 0 10px}
table{border-collapse:collapse;width:100%;background:#fff;font-size:13px;margin-bottom:8px}
th,td{border:1px solid #d2d2d7;padding:8px 10px;vertical-align:top;text-align:left}
th{background:#f5f5f7}
td code{font-size:12px;word-break:break-all}
td a{color:#007aff;word-break:break-all}
.dim{color:#86868b;font-size:12px}
button.cp{margin:6px 0;font-size:12px;padding:2px 10px;cursor:pointer}
pre{white-space:pre-wrap;font-size:12px;background:#f5f5f7;padding:8px;border-radius:8px;margin-top:6px;max-height:220px;overflow:auto}
</style></head><body>
<h1>备忘录链路总表：唤醒词 → 命令 → HTML</h1>
<div class="sub">${rows.length} 行按页族分节。点 <b>产物绝对路径</b> 即在新标签打开那份产物（与本页同目录，链接走相对路径、显示写绝对路径）。标「目标态」的命令列按 #837＋#850 定死、路由修复归路由票，本表不断言今天能跑通。产物目录：<code>${esc(dir)}</code></div>
${sections}
<script>document.querySelectorAll('.cp').forEach(function(b){b.onclick=function(){var el=document.getElementById(b.dataset.i);if(el&&navigator.clipboard)navigator.clipboard.writeText(el.innerText);}});</script>
</body></html>
`;
  const out = join(dir, OUT);
  writeFileSync(out, page, 'utf8');
  const refs = [...page.matchAll(/(?:src|href)="([^"#]+\.html)"/g)].map((m) => m[1]);
  const dead = refs.filter((r) => !existsSync(join(dir, decodeURIComponent(r))));
  console.log(`链路总表：${rows.length} 行；链接 ${refs.length} 条；` + (dead.length === 0 ? '缺失 0 -> 可发' : `缺 ${dead.length} 件 -> ${dead.join('、')}`));
  if (dead.length) for (const d of dead) console.error(`  页上引用却落不到：${d}`);
  process.exit(dead.length === 0 ? 0 : 1);
}

main();
