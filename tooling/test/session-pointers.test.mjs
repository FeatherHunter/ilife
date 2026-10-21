import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { describe, it } from 'node:test';
import {
  decodeSessionBuffer,
  formatPointer,
  localTime,
  parseSessionText,
  userMessages,
  verifyPointer,
  waitForFile,
} from '../session-pointers.mjs';

const SESSION_ID = '52b9ed47-a497-4051-926f-4516a83ca64b';
const MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);

function record(type, seq, ms, text) {
  return JSON.stringify({
    type,
    seq,
    time: ms,
    data: { content: [{ type: 'text', text }], role: 'user', id: 'm' + seq },
  });
}

/** 造一个 zstd 多帧容器：每帧一段 JSONL；末尾可追加半截帧（模拟正在写入）。 */
function zstdFrames(lines, { appendPartial = false } = {}) {
  const frames = lines.map((line) => zlib.zstdCompressSync(Buffer.from(line + '\n', 'utf8')));
  let buf = Buffer.concat(frames);
  if (appendPartial) {
    const more = zlib.zstdCompressSync(Buffer.from(record('tool/result', 99, 1, 'x') + '\n', 'utf8'));
    buf = Buffer.concat([buf, more.subarray(0, Math.max(MAGIC.length + 8, more.length - 6))]);
  }
  return buf;
}

describe('session-pointers 解码', () => {
  it('多帧 zstd 逐帧解压后拼回 JSONL；末帧半截被容忍', () => {
    const ms = Date.parse('2026-10-21T22:27:48+08:00');
    const buf = zstdFrames([
      record('session', 1, ms, ''),
      record('user/message', 10, ms, '按 /implement-spec 技能把这张规格实现完。'),
      record('assistant/message', 11, ms, '开工。'),
    ], { appendPartial: true });
    const decoded = decodeSessionBuffer(buf);
    assert.equal(decoded.frames, 4);
    assert.equal(decoded.broken, 0, '末帧半截不算中间断帧');
    assert.match(decoded.text, /按 \/implement-spec 技能把这张规格实现完。/);
    const parsed = parseSessionText(decoded.text);
    assert.equal(parsed.bad, 0);
    assert.equal(parsed.records.length, 3);
  });

  it('坏行只在末尾容忍：中间坏行记数', () => {
    const decoded = decodeSessionBuffer(zstdFrames([record('user/message', 1, 1, 'a'), '{"broken":', record('user/message', 2, 2, 'b')]));
    const parsed = parseSessionText(decoded.text);
    assert.equal(parsed.records.length, 2);
    assert.equal(parsed.bad, 1);
  });

  it('只取文本部件：图片等非 text 部件不进原话', () => {
    const line = JSON.stringify({
      type: 'user/message',
      seq: 3,
      time: 1,
      data: { content: [{ type: 'image', data: 'xx' }, { type: 'text', text: '原话' }] },
    });
    const parsed = parseSessionText(line + '\n');
    assert.deepEqual(userMessages(parsed.records), [{ seq: 3, time: 1, text: '原话' }]);
  });
});

describe('session-pointers 指针', () => {
  const ms = Date.parse('2026-10-21T22:27:48+08:00');

  it('时刻按 +0800 格式化，指针逐字可复制', () => {
    assert.equal(localTime(ms), '2026-10-21 22:27:48');
    assert.equal(formatPointer({ seq: 10, time: ms }, SESSION_ID), '（会话 `' + SESSION_ID + '` seq 10，2026-10-21 22:27:48，转录）');
  });

  it('复算命中：seq 存在、是用户消息、时刻逐字相同', () => {
    const session = {
      offsetHours: 8,
      records: [{ type: 'user/message', seq: 10, time: ms, data: { content: [{ type: 'text', text: '原话' }] } }],
    };
    assert.equal(verifyPointer(session, 10, '2026-10-21 22:27:48').hit, true);
  });

  it('复算不命中：seq 不存在／不是用户消息／时刻对不上，各自点名', () => {
    const session = {
      offsetHours: 8,
      records: [
        { type: 'user/message', seq: 10, time: ms, data: { content: [{ type: 'text', text: '原话' }] } },
        { type: 'assistant/message', seq: 11, time: ms, data: { content: [] } },
      ],
    };
    assert.match(verifyPointer(session, 99, '').reason, /不存在/);
    assert.match(verifyPointer(session, 11, '').reason, /不是用户消息/);
    assert.match(verifyPointer(session, 10, '2026-10-21 22:27:49').reason, /时刻对不上/);
  });
});

describe('session-pointers 有界等待', () => {
  it('文件迟到：在有界窗口内等到就返回 true，不盲等', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'session-pointers-'));
    try {
      const file = path.join(dir, 'late.txt');
      setTimeout(() => fs.writeFileSync(file, 'x'), 40);
      assert.equal(await waitForFile(file, 900, 40), true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('文件始终不来：到点返回 false（窗口约等于 waitMs，不无限等）', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'session-pointers-'));
    try {
      const started = Date.now();
      assert.equal(await waitForFile(path.join(dir, 'never.txt'), 120, 20), false);
      assert.ok(Date.now() - started >= 100, '至少等满窗口才判失败');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
