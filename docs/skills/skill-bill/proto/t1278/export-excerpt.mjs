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

const want = [
  ['#1274 ②', '条目15 认可'],
  ['#1270 ② ＋ #1276 ④', '非常好，给你点赞'],
  ['#1275 ②', '谁说过不合并'],
  ['#1278 ② 收尾授权', 'close 1278'],
  ['#1278 ④ 裁决', '不要过度发散'],
];

const out = [
  '# t1278 会话摘录（④ 证据的逐字全文，会话关闭后仍可复读）',
  '',
  '用途：`#1278` 的 ④ 补法＝**可解析转录**（会话 id ＋ seq ＋ 本地时刻）。指针的第一手载体是 DSH 会话存储 `%USERPROFILE%\\.dsh\\sessions\\--D-ilife--\\<会话 id>\\session.v4.jsonl.zstd`；本文件把被引用的用户消息**逐字全文**另存一份，使证据不依赖会话存档的存续。',
  '',
  '生成：`docs/skills/skill-bill/proto/t1278/export-excerpt.mjs`（工作副本 `.scratch\\t1278\\`），时间一律 +0800。',
  '',
  '---',
  '',
];
let n = 0;
const seen = new Set();
for (const d of fs.readdirSync(base).filter((x) => x.startsWith('session-'))) {
  const f = path.join(base, d, 'session.v4.jsonl.zstd');
  if (!fs.existsSync(f)) continue;
  const txt = textOf(f);
  let m;
  while ((m = re.exec(txt))) {
    const texts = [...m[3].matchAll(/"text":"((?:[^"\\]|\\.)*)"/g)]
      .map((x) => { try { return JSON.parse(`"${x[1]}"`); } catch { return x[1]; } });
    const text = texts.join('\n').trim();
    for (const [cell, needle] of want) {
      const key = `${cell}|${d}|${m[1]}`;
      if (!text.includes(needle) || seen.has(key)) continue;
      seen.add(key); n++;
      out.push(`## ${cell}`, '', `- 会话：\`${d.slice('session-'.length)}\``, `- seq：\`${m[1]}\`　时刻：${local(+m[2])}`, '- 用户逐字全文：', '', '```text', text, '```', '');
    }
  }
}
out.push('---', '', `共 ${n} 条（同一句被多张票引用时按票·格分别列出）。`);
const dst = 'D:/ilife/docs/skills/skill-bill/t1278-会话摘录.md';
fs.writeFileSync(dst, out.join('\n'), 'utf8');
console.log('excerpt_rows=', n, 'chars=', out.join('\n').length);
