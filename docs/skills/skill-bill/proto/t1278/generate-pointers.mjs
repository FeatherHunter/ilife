import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import os from 'node:os';

const base = path.join(os.homedir(), '.dsh', 'sessions', '--D-ilife--');
const magic = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);
const re = /\{"type":"user\/message","seq":(\d+),"time":(\d+),"data":\{"content":\[(.*?)\],"source"/gs;
const local = (ms) => new Date(ms + 8 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);

function textOf(file) {
  const buf = fs.readFileSync(file);
  const offs = [];
  let i = 0;
  while ((i = buf.indexOf(magic, i)) !== -1) { offs.push(i); i += 4; }
  const parts = [];
  for (let k = 0; k < offs.length; k++) {
    const end = k + 1 < offs.length ? offs[k + 1] : buf.length;
    try { parts.push(zlib.zstdDecompressSync(buf.subarray(offs[k], end)).toString('utf8')); } catch {}
  }
  return parts.join('\n');
}

const users = [];
for (const d of fs.readdirSync(base).filter((x) => x.startsWith('session-'))) {
  const f = path.join(base, d, 'session.v4.jsonl.zstd');
  if (!fs.existsSync(f)) continue;
  let txt = '';
  try { txt = textOf(f); } catch { continue; }
  let m;
  while ((m = re.exec(txt))) {
    const texts = [...m[3].matchAll(/"text":"((?:[^"\\]|\\.)*)"/g)]
      .map((x) => { try { return JSON.parse(`"${x[1]}"`); } catch { return x[1]; } });
    const text = texts.join('\n').trim();
    if (text) users.push({ sid: d.slice('session-'.length), seq: +m[1], time: +m[2], t: local(+m[2]), text });
  }
}
const uniq = new Map();
for (const u of users) uniq.set(`${u.sid}|${u.seq}`, u);
const all = [...uniq.values()].sort((a, b) => a.time - b.time);

// 1) 逐字等于「认可。」的用户消息
const exact = all.filter((u) => u.text === '认可。');
console.log('exact_renke_rows=', exact.length);
for (const u of exact.slice(0, 5)) console.log('  ', u.t, u.sid.slice(0, 8), 'seq=' + u.seq);

// 2) 目标引文 -> 指针
const want = [
  ['#1274 ②', '条目15 认可', '3fc7cf89'],
  ['#1270 ②', '条目10的需要做成从已有里面选', '3fc7cf89'],
  ['#1275 ②', '谁说过不合并', '8de81acb'],
  ['#1276 ④', '非常好，给你点赞', '3fc7cf89'],
  ['#1278 ②（收尾授权）', 'close 1278', '566ffc7d'],
  ['#1278 ④（④ 补法裁定）', '不要过度发散', '566ffc7d'],
];
const lines = [];
lines.push('# t1278 会话指针表（④ 补法的可解析证据）', '');
lines.push('来历：`#1278` 收尾时按用户裁定（会话 `566ffc7d…` seq 894）选定的 ④ 补法——**转录必须带会话指针，且指针要能在 DSH 会话存储里复算命中**。本表由脚本 `D:\\ilife\\.scratch\\t1278\\generate-pointers.mjs` 扫 `%USERPROFILE%\\.dsh\\sessions\\--D-ilife--\\<会话 id>\\session.v4.jsonl.zstd` 生成，时间一律 +0800。', '');
lines.push('| 票·格 | 用户逐字（节选） | 会话 id | seq | 本地时刻 | 复算结果 |');
lines.push('|---|---|---|---|---|---|');
for (const [cell, needle, prefer] of want) {
  const hit = all.find((u) => u.text.includes(needle) && u.sid.startsWith(prefer)) || all.find((u) => u.text.includes(needle));
  if (!hit) { lines.push(`| ${cell} | ${needle} | — | — | — | **未命中** |`); continue; }
  const quote = hit.text.replace(/\s+/g, ' ').slice(0, 60);
  lines.push(`| ${cell} | 「${quote}」 | \`${hit.sid}\` | ${hit.seq} | ${hit.t} | 命中 ✅ |`);
}
lines.push('');
lines.push('## 不可解析的转录（判缺，不补）', '');
lines.push('| 票·格 | 票面引文 | 复核结果 |');
lines.push('|---|---|---|');
const near = all.filter((u) => u.text.startsWith('认可') && u.t >= '2026-10-13 00:30' && u.t <= '2026-10-13 00:45');
lines.push(`| #1272 ④ | 票面写「用户『认可。』」（转录于 2026-10-13 00:43:19） | **不可解析**：全库 ${all.length} 条用户消息里逐字等于「认可。」的有 ${exact.length} 条，没有一条落在 00:43 前后；最接近的两条是 \`b49a35b5…\` seq 2641（00:38:53，「认可。commit 和 push 当前工作区的所有内容…」）与 \`3fc7cf89…\` seq 794（00:39:58，「…你认可我就认可。我要的就是 我的那些条目所要的最终用户使用时的效果完全符合我的预期即可。」）——两者都带别的内容，不能当 #1272 交付物的确认 ⇒ 该格仍判 **缺** |`);
lines.push(`| #1273 ① ② ④ | 无用户逐字 | 该票建票至今无任何用户发言涉及 ⇒ 缺 |`);
lines.push('');
lines.push('## 复算方法（任何人可重跑）', '');
lines.push('```powershell');
lines.push('# 1) 找到本会话/相关会话的转录文件（zstd 多帧容器，逐帧解压）');
lines.push('Get-ChildItem "$env:USERPROFILE\\.dsh\\sessions\\--D-ilife--" -Directory | Select-Object Name');
lines.push('# 2) 逐帧解压并搜用户消息：见 .scratch\\t1278\\generate-pointers.mjs（node 直接跑）');
lines.push('node D:\\ilife\\.scratch\\t1278\\generate-pointers.mjs');
lines.push('```');
lines.push('');
lines.push(`统计：扫描到去重用户消息 **${all.length}** 条（横跨 ${new Set(all.map((u) => u.sid)).size} 个会话）。`);
const out = lines.join('\n');
fs.writeFileSync('D:/ilife/docs/skills/skill-bill/t1278-会话指针表.md', out, 'utf8');
console.log('written_chars=', out.length);
