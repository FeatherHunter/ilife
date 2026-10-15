// 票 1282 · 缺席页签安装按钮（上游 0.18.0 安装控件）：pluginId 与 prefix 取更新目标表同源。
//
// 先构建再跑：node node_modules/typescript/bin/tsc -b packages/plugin-manager
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mountLifeInstallButton } from '../dist/update-dialog.js';

const BILL_TAB = { skill: 'bill', slotId: 'ilife:cookie', order: 70, title: '饼干记账', plugin: 'dsh-bill-ilife', channel: '/ilife-bill-ilife' };

function okSnapshot() {
  return {
    ok: true,
    snapshot: {
      runningVersion: '0.0.0', installed: false, installedVersion: null,
      latestVersion: '0.3.56', canInstall: true, blockedReason: null, job: null,
    },
    manual: null,
  };
}

describe('1282 缺席页签安装按钮（单包电话）', () => {
  it('首查即 ilife-bill.updateStatus（单包电话，非批量）', async () => {
    const seen = [];
    const container = { innerHTML: '' };
    const button = mountLifeInstallButton(container, async (name) => {
      seen.push(name);
      return okSnapshot();
    }, BILL_TAB);
    assert.ok(button !== null);
    try {
      await button.refresh();
      assert.ok(seen.includes('ilife-bill.updateStatus'));
      assert.ok(!seen.some((name) => name.startsWith('life.batch')), '安装按钮只调单包电话，不碰批量电话');
    } finally {
      button.unmount();
    }
  });
  it('目标表外回 null（不渲染挂载位）', () => {
    const button = mountLifeInstallButton(
      { innerHTML: '' },
      async () => ({ ok: false }),
      { skill: 'x', slotId: 's', order: 0, title: 't', plugin: 'dsh-not-installed', channel: '/c' },
    );
    assert.equal(button, null);
  });
});
