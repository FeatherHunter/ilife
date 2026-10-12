import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import os from 'node:os';

const base = path.join(os.homedir(), '.dsh', 'sessions', '--D-ilife--');
const magic = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);
const targets = ['非常好，给你点赞', '条目15 认可', '认可。', '条目10的需要做成从已有里面选', '不要过度发散', 'close 1278', '谁说过不合并', '需要提供原图绝对地址'];

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

const local = (ms) => new Date(ms + 8 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);
const re = /\{"type":"user\/message","seq":(\d+),"time":(\d+),"data":\{"content":\[(.*?)\],"source"/gs;
const rows = [];
for (const d of fs.readdirSync(base).filter((x) => x.startsWith('session-'))) {
  const f = path.join(base, d, 'session.v4.jsonl.zstd');
  if (!fs.existsSync(f) || fs.statSync(f).size < 40_000) continue;
  const txt = textOf(f);
  let m;
  while ((m = re.exec(txt))) {
    const texts = [...m[3].matchAll(/"text":"((?:[^"\\]|\\.)*)"/g)]
      .map((x) => { try { return JSON.parse(`"${x[1]}"`); } catch { return x[1]; } });
    const text = texts.join('\n');
    if (!text) continue;
    for (const t of targets) {
      if (text.includes(t)) rows.push({ sid: d.slice(8, 16), seq: +m[1], t: local(+m[2]), target: t, text: text.replace(/\s+/g, ' ').slice(0, 72) });
    }
  }
}
rows.sort((a, b) => a.t.localeCompare(b.t));
const seen = new Set();
for (const r of rows) {
  const k = `${r.sid}|${r.seq}|${r.target}`;
  if (seen.has(k)) continue;
  seen.add(k);
  console.log(`${r.t} | ${r.sid} | seq=${r.seq} | ${r.text}`);
}
console.log('rows=', seen.size);
