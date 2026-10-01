// 票 #990 · 新桌面端 native-only 组合的换路兼容（旧 browse 路保留，只放宽拒绝判定）。
//
// 背景：`dsh 0.2.0-rc.2` 的组合只服务 native，`list()` 被拒时不再带
// 旧回执码，只有 message 里那句能力说明。旧判定只比码，换路走不到。
// 本件咬三件事：码命中仍算被拒；message 命中能力句式也算被拒；真 IO 失败不换路。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const contract = await import('../dist/directory-browser-contract.js');
const state = await import('../dist/directory-browser-state.js');

const { isCapabilityRefusal, browseFaceOf } = contract;
const { openRowBrowser } = state;

const REFUSAL = 'directory-picker/unavailable';
const NEW_MESSAGE = 'directoryPicker.list needs the browse capability; the composed picker serves "native"';
const OLD_MESSAGE = 'directoryPicker.pick needs the native capability; the composed picker serves "browse"';

describe('#990 拒绝判定兼容新旧宿主', () => {
  it('旧码命中＝被拒（回归）', () => {
    assert.equal(isCapabilityRefusal(REFUSAL, 'x', REFUSAL), true);
  });

  it('新形态：无码/换码但 message 命中 browse 句式＝被拒', () => {
    assert.equal(isCapabilityRefusal('browse-failed', NEW_MESSAGE, REFUSAL), true);
    assert.equal(isCapabilityRefusal(undefined, NEW_MESSAGE, REFUSAL), true);
    assert.equal(isCapabilityRefusal('', `浏览失败：${NEW_MESSAGE}`, REFUSAL), true);
  });

  it('旧 message 形态同样命中（native 句式）', () => {
    assert.equal(isCapabilityRefusal('browse-failed', OLD_MESSAGE, REFUSAL), true);
    assert.equal(
      isCapabilityRefusal(REFUSAL, 'the composition cannot serve pick', REFUSAL),
      true,
    );
  });

  it('真 IO 失败不算被拒（不换路）', () => {
    assert.equal(isCapabilityRefusal('directory-picker/unreadable', '这一层读不出来', REFUSAL), false);
    assert.equal(isCapabilityRefusal('browse-failed', '列举目录没有回执', REFUSAL), false);
    assert.equal(isCapabilityRefusal(undefined, '', REFUSAL), false);
  });
});

function wireNewNativeOnly() {
  const listing = (path) => ({
    path,
    home: 'C:\\Users\\me',
    crumbs: [{ name: 'C:\\', path: 'C:\\', hidden: false }],
    entries: [{ name: 'b', path: `${path}\\b`, hidden: false }],
    truncated: false,
  });
  return {
    async list(path) {
      // 新宿主形态：抛裸错或回无码信封，这里模拟“有 message、无旧码”
      return { ok: false, error: { code: 'browse-failed', message: NEW_MESSAGE } };
    },
    async createDirectory(path, name) {
      return { ok: false, error: { code: 'browse-failed', message: NEW_MESSAGE } };
    },
    async pick() {
      return { ok: true, value: 'D:\\选中的' };
    },
  };
}

function wireIoError() {
  return {
    async list() {
      return { ok: false, error: { code: 'directory-picker/unreadable', message: '这一层读不出来' } };
    },
    async createDirectory(path, name) {
      return { ok: false, error: { code: 'directory-picker/unreadable', message: '这一层读不出来' } };
    },
    async pick() {
      return { ok: true, value: 'D:\\选中的' };
    },
  };
}

describe('#990 openRowBrowser 新组合下换路', () => {
  it('list 新形态被拒 ⇒ refused 并收起图（调用方据此换 pick）', async () => {
    const rows = [];
    const opened = openRowBrowser({
      picker: wireNewNativeOnly(),
      initialPath: '',
      onChange: () => {},
      onRow: (next) => rows.push(next),
      refusalCode: REFUSAL,
    });
    assert.equal(await opened, 'refused');
    assert.equal(rows.length, 2);
    assert.notEqual(rows[0], null);
    assert.equal(rows[1], null);
  });

  it('真 IO 失败 ⇒ open（不换路，图上报那一层读不出来）', async () => {
    const rows = [];
    const opened = openRowBrowser({
      picker: wireIoError(),
      initialPath: '',
      onChange: () => {},
      onRow: (next) => rows.push(next),
      refusalCode: REFUSAL,
    });
    assert.equal(await opened, 'open');
    assert.equal(rows.length, 1);
    assert.notEqual(rows[0], null);
    assert.equal(rows[0].state().phase, 'failed');
  });

  it('旧路保留：browseFaceOf 仍拆得出正常列举', async () => {
    const face = browseFaceOf(wireNewNativeOnly());
    // 有两格原语即有取数面（能不能用要真调一次才知道，见 openRowBrowser）
    assert.ok(face !== null);
  });
});
