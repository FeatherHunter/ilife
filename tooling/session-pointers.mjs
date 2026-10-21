#!/usr/bin/env node
/**
 * tooling/session-pointers.mjs —— 会话指针工具（#1299 其一）。
 *
 * 用途：把「用户原话」变成能在 DSH 会话存储里**复算命中**的指针：
 *   （会话 `<会话 id>` seq <序号>，<YYYY-MM-DD HH:mm:ss>，转录）
 * 证据里的 ②／④ 格按 `docs/agents/编排纪律.md` 必须带这种指针；手抄指针容易抄错 seq 或时刻，
 * 本件从转录里直接取，不猜。
 *
 * 存储形状（事实，见编排纪律 L79）：
 *   %USERPROFILE%\.dsh\sessions\<工作区目录>\session-<会话 id>\session.v4.jsonl.zstd
 *   —— zstd **多帧容器**（帧魔数 28 b5 2f fd），逐帧解压后是 JSONL；用户消息形如
 *   `{"type":"user/message","seq":10,"time":<epoch ms>,"data":{"content":[{"type":"text","text":"…"}]}}`。
 *   末帧可能正在写入而解压失败：本件容忍末帧断帧，中间断帧记数但不静默。
 *
 * 用法：
 *   node tooling/session-pointers.mjs --session <会话 id> --keyword <原话片段> [--limit 5]
 *   node tooling/session-pointers.mjs --session <会话 id> --seq <序号>
 *   node tooling/session-pointers.mjs --list
 *   node tooling/session-pointers.mjs --sessions <目录> --session <id> --keyword <片段> --json
 * 选项：
 *   --sessions <目录>     会话根（缺省 %USERPROFILE%\.dsh\sessions）；也可以直接给某个工作区目录
 *   --wait-ms <毫秒>      会话文件未出现时最多等多久（缺省 3000；只做有界轮询，不盲等）
 *   --offset-hours <时区> 指针时刻时区（缺省 8，即 +0800）
 *   --json                机器可读输出（一行一个 JSON 对象）
 *   --help
 * 退出码：0 命中；1 未命中；2 用法／存储读不到。
 *
 * 机器摘要行（冻结）：`POINTER （会话 <id> seq <n>，<时刻>，转录）`，随后一行 `TEXT=<原话单行>`。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);
const TRANSCRIPT_FILE = 'session.v4.jsonl.zstd';

/** 缺省会話根：%USERPROFILE%\.dsh\sessions。 */
export function defaultSessionsRoot() {
  return path.join(os.homedir(), '.dsh', 'sessions');
}

/**
 * 解 zstd 多帧容器。末帧允许断（正在写入），中间断帧计入 broken。
 * 返回 { text, frames, broken }；text 为空说明一帧都没解出来。
 */
export function decodeSessionBuffer(buf) {
  const offsets = [];
  let at = 0;
  while ((at = buf.indexOf(ZSTD_MAGIC, at)) !== -1) {
    offsets.push(at);
    at += ZSTD_MAGIC.length;
  }
  const parts = [];
  let broken = 0;
  for (let i = 0; i < offsets.length; i++) {
    const end = i + 1 < offsets.length ? offsets[i + 1] : buf.length;
    try {
      parts.push(zlib.zstdDecompressSync(buf.subarray(offsets[i], end)).toString('utf8'));
    } catch {
      if (i === offsets.length - 1) continue; // 末帧可能正写到一半
      broken += 1;
    }
  }
  return { text: parts.join(''), frames: offsets.length, broken };
}

/** 解析 JSONL 文本；末尾半行（正在写）容忍，中间坏行记数。 */
export function parseSessionText(text) {
  const records = [];
  let bad = 0;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;
    try {
      records.push(JSON.parse(line));
    } catch {
      if (i === lines.length - 1) continue; // 末行可能正写到一半
      bad += 1;
    }
  }
  return { records, bad };
}

/** 用户消息的正文：data.content 里 type=text 的部分按序拼接。 */
export function messageText(record) {
  const content = record?.data?.content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((part) => part && part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n')
    .trim();
}

/** 从记录集里取可解析的用户消息[{ seq, time, text }]，按 seq 升序。 */
export function userMessages(records) {
  return records
    .filter((record) => record && record.type === 'user/message')
    .map((record) => ({ seq: Number(record.seq), time: Number(record.time), text: messageText(record) }))
    .filter((message) => message.text !== '')
    .sort((a, b) => a.seq - b.seq);
}

/** epoch 毫秒 → 指定时区的 `YYYY-MM-DD HH:mm:ss`（缺省 +0800）。 */
export function localTime(ms, offsetHours = 8) {
  return new Date(ms + offsetHours * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);
}

/** 指针的规范写法（证据里逐字可用）。 */
export function formatPointer(message, sessionId, offsetHours = 8) {
  return '（会话 `' + sessionId + '` seq ' + message.seq + '，' + localTime(message.time, offsetHours) + '，转录）';
}

/** 在会话根下按 id 找 `session-<id>` 目录；id 可带 `session-` 前缀。 */
export function resolveSessionDir(root, sessionId) {
  const wanted = sessionId.startsWith('session-') ? sessionId : 'session-' + sessionId;
  const bare = wanted.slice('session-'.length);
  const roots = [root];
  // 允许 --sessions 直接指向某个工作区目录（以 -- 开头）
  if (path.basename(path.resolve(root)).startsWith('--')) return checkDir(root, wanted, bare);
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory()) roots.push(path.join(root, entry.name));
  }
  for (const candidateRoot of roots) {
    const found = checkDir(candidateRoot, wanted, bare);
    if (found) return found;
  }
  return null;
}

function checkDir(candidateRoot, wanted, bare) {
  const dir = path.join(candidateRoot, wanted);
  const file = path.join(dir, TRANSCRIPT_FILE);
  if (fs.existsSync(file)) return { dir, file, sessionId: bare };
  return null;
}

/** 有界轮询等文件出现；不盲等，超时即 false。 */
export async function waitForFile(file, waitMs = 3000, intervalMs = 150) {
  const started = Date.now();
  for (;;) {
    try {
      if (fs.statSync(file).size > 0) return true;
    } catch {
      // 还不存在：继续等
    }
    const elapsed = Date.now() - started;
    if (elapsed >= waitMs) return false;
    await new Promise((resolve) => setTimeout(resolve, Math.min(intervalMs, Math.max(1, waitMs - elapsed))));
  }
}

/** 读一个会话目录的转录记录（带断帧／坏行读数）。 */
export function readSessionDir(dir) {
  const file = path.join(dir, TRANSCRIPT_FILE);
  const decoded = decodeSessionBuffer(fs.readFileSync(file));
  if (decoded.text === '') throw new Error('会话转录解不出任何记录：' + file);
  const parsed = parseSessionText(decoded.text);
  return { file, frames: decoded.frames, broken: decoded.broken, badLines: parsed.bad, records: parsed.records };
}

/**
 * 载入会话：找目录 → 有界等文件 → 解帧 → 解析。
 * 供 CLI 与 check-evidence 共用；找不到即抛错（不静默返回空）。
 */
export async function loadSession({ sessionsRoot, sessionId, waitMs = 3000, offsetHours = 8 }) {
  const started = Date.now();
  let located = null;
  for (;;) {
    located = resolveSessionDir(sessionsRoot, sessionId);
    if (located || Date.now() - started >= waitMs) break;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  if (!located) {
    throw new Error('找不到会话 `' + sessionId + '`（根：' + sessionsRoot + '，已等 ' + waitMs + 'ms）；可用 --sessions 指定');
  }
  const ok = await waitForFile(located.file, waitMs);
  if (!ok) throw new Error('会话文件没有内容（已等 ' + waitMs + 'ms）：' + located.file);
  const session = readSessionDir(located.dir);
  return { ...session, sessionId: located.sessionId, dir: located.dir, offsetHours };
}

/** 指针复算：seq 必须存在、必须是用户消息、时刻必须与指针逐字相同。 */
export function verifyPointer(session, seq, expectedTimeText) {
  const record = session.records.find((item) => Number(item?.seq) === Number(seq));
  if (!record) return { hit: false, reason: 'seq ' + seq + ' 在会话里不存在' };
  if (record.type !== 'user/message') return { hit: false, reason: 'seq ' + seq + ' 不是用户消息（type=' + record.type + '）' };
  const text = messageText(record);
  if (text === '') return { hit: false, reason: 'seq ' + seq + ' 的用户消息没有文本' };
  const actual = localTime(Number(record.time), session.offsetHours ?? 8);
  if (expectedTimeText && actual !== expectedTimeText) {
    return { hit: false, reason: '时刻对不上：指针 ' + expectedTimeText + '，存储 ' + actual };
  }
  return { hit: true, time: actual, text };
}

/** 列出会话根下每个会话的末条用户消息。 */
export function listSessions(sessionsRoot) {
  const rows = [];
  const rootIsWorkspace = path.basename(path.resolve(sessionsRoot)).startsWith('--');
  const workspaceDirs = rootIsWorkspace
    ? [path.resolve(sessionsRoot)]
    : fs.readdirSync(sessionsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(sessionsRoot, entry.name));
  for (const workspaceDir of workspaceDirs) {
    let entries = [];
    try {
      entries = fs.readdirSync(workspaceDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith('session-')) continue;
      const dir = path.join(workspaceDir, entry.name);
      const file = path.join(dir, TRANSCRIPT_FILE);
      if (!fs.existsSync(file)) continue;
      const sessionId = entry.name.slice('session-'.length);
      let last = null;
      let frames = 0;
      try {
        const session = readSessionDir(dir);
        frames = session.frames;
        const messages = userMessages(session.records);
        last = messages.length > 0 ? messages[messages.length - 1] : null;
      } catch {
        // 读不了的会话不列末条，但仍列出路径，方便排查
      }
      rows.push({ sessionId, dir, file, frames, last });
    }
  }
  return rows.sort((a, b) => (b.last?.time ?? 0) - (a.last?.time ?? 0));
}

const USAGE = [
  '会话指针工具（#1299）：从 DSH 会话转录取可复算的用户原话指针。',
  '',
  '用法：',
  '  node tooling/session-pointers.mjs --session <会话 id> --keyword <原话片段> [--limit 5]',
  '  node tooling/session-pointers.mjs --session <会话 id> --seq <序号>',
  '  node tooling/session-pointers.mjs --list',
  '选项：--sessions <目录>｜--wait-ms <毫秒>｜--offset-hours <时区>｜--json｜--help',
  '',
  '示例：',
  '  node tooling/session-pointers.mjs --session 52b9ed47-a497-4051-926f-4516a83ca64b --keyword 每完成一张实施 issue',
  '  → POINTER （会话 `52b9ed47-…` seq 10，2026-10-21 22:27:48，转录）',
].join('\n');

function parseArgs(argv) {
  const opts = {
    sessionsRoot: defaultSessionsRoot(),
    sessionId: '',
    keyword: '',
    seq: null,
    limit: 5,
    waitMs: 3000,
    offsetHours: 8,
    json: false,
    list: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const need = () => {
      const value = argv[++i];
      if (value === undefined) throw new Error(arg + ' 缺少值');
      return value;
    };
    switch (arg) {
      case '--sessions': opts.sessionsRoot = need(); break;
      case '--session': opts.sessionId = need(); break;
      case '--keyword': opts.keyword = need(); break;
      case '--seq': opts.seq = Number(need()); break;
      case '--limit': opts.limit = Number(need()); break;
      case '--wait-ms': opts.waitMs = Number(need()); break;
      case '--offset-hours': opts.offsetHours = Number(need()); break;
      case '--json': opts.json = true; break;
      case '--list': opts.list = true; break;
      case '--help': case '-h': opts.help = true; break;
      default: throw new Error('未知参数：' + arg);
    }
  }
  if (!opts.help && !opts.list && opts.sessionId === '') throw new Error('必须给 --session <会话 id>（或 --list）');
  return opts;
}

async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.help) {
    console.log(USAGE);
    return 0;
  }
  if (opts.list) {
    const rows = listSessions(opts.sessionsRoot);
    for (const row of rows) {
      const last = row.last
        ? 'last_user_seq=' + row.last.seq + ' last_user_time=' + localTime(row.last.time, opts.offsetHours)
        : 'last_user_seq=- last_user_time=-';
      console.log('SESSION id=' + row.sessionId + ' frames=' + row.frames + ' ' + last + ' dir=' + row.dir);
    }
    console.log('RESULT: ' + (rows.length > 0 ? 'PASS' : 'FAIL') + ' sessions=' + rows.length);
    return rows.length > 0 ? 0 : 1;
  }
  const session = await loadSession({
    sessionsRoot: opts.sessionsRoot,
    sessionId: opts.sessionId,
    waitMs: opts.waitMs,
    offsetHours: opts.offsetHours,
  });
  const messages = userMessages(session.records);
  if (opts.seq !== null) {
    const verified = verifyPointer(session, opts.seq, '');
    if (!verified.hit) {
      console.log('FAIL ' + verified.reason);
      return 1;
    }
    console.log('SEQ ' + opts.seq + ' time=' + verified.time);
    console.log('TEXT=' + verified.text.replace(/\s+/g, ' '));
    return 0;
  }
  const keyword = opts.keyword;
  if (keyword === '') throw new Error('必须给 --keyword <原话片段> 或 --seq <序号>');
  const needle = keyword.toLowerCase();
  const hits = messages.filter((message) => message.text.toLowerCase().includes(needle)).slice(0, opts.limit);
  for (const message of hits) {
    if (opts.json) {
      console.log(JSON.stringify({
        sessionId: session.sessionId,
        seq: message.seq,
        time: localTime(message.time, opts.offsetHours),
        pointer: formatPointer(message, session.sessionId, opts.offsetHours),
        text: message.text,
      }));
    } else {
      console.log('POINTER ' + formatPointer(message, session.sessionId, opts.offsetHours));
      console.log('TEXT=' + message.text.replace(/\s+/g, ' '));
    }
  }
  console.log('RESULT: ' + (hits.length > 0 ? 'PASS' : 'FAIL') + ' hits=' + hits.length + ' user_messages=' + messages.length);
  return hits.length > 0 ? 0 : 1;
}

const invokedDirectly = process.argv[1] !== undefined
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  try {
    process.exitCode = await main();
  } catch (err) {
    console.error('FAIL: ' + (err?.message ?? err));
    process.exitCode = 2;
  }
}
