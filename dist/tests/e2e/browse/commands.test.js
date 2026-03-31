import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
describe('Browse Commands', () => {
    it('should export all expected navigation commands', async () => {
        const { COMMANDS } = await import('../../../browse/dist/commands.js');
        const commandNames = [...COMMANDS.keys()];
        // Navigation
        assert.ok(commandNames.includes('goto'));
        assert.ok(commandNames.includes('back'));
        assert.ok(commandNames.includes('forward'));
        assert.ok(commandNames.includes('reload'));
        assert.ok(commandNames.includes('url'));
    });
    it('should export all expected reading commands', async () => {
        const { COMMANDS } = await import('../../../browse/dist/commands.js');
        const commandNames = [...COMMANDS.keys()];
        assert.ok(commandNames.includes('text'));
        assert.ok(commandNames.includes('html'));
        assert.ok(commandNames.includes('links'));
        assert.ok(commandNames.includes('forms'));
        assert.ok(commandNames.includes('accessibility'));
        assert.ok(commandNames.includes('js'));
        assert.ok(commandNames.includes('css'));
        assert.ok(commandNames.includes('attrs'));
        assert.ok(commandNames.includes('console'));
        assert.ok(commandNames.includes('network'));
        assert.ok(commandNames.includes('cookies'));
        assert.ok(commandNames.includes('storage'));
        assert.ok(commandNames.includes('perf'));
        assert.ok(commandNames.includes('is'));
        assert.ok(commandNames.includes('dialog'));
        assert.ok(commandNames.includes('eval'));
    });
    it('should export all expected interaction commands', async () => {
        const { COMMANDS } = await import('../../../browse/dist/commands.js');
        const commandNames = [...COMMANDS.keys()];
        assert.ok(commandNames.includes('click'));
        assert.ok(commandNames.includes('fill'));
        assert.ok(commandNames.includes('select'));
        assert.ok(commandNames.includes('hover'));
        assert.ok(commandNames.includes('type'));
        assert.ok(commandNames.includes('press'));
        assert.ok(commandNames.includes('scroll'));
        assert.ok(commandNames.includes('wait'));
        assert.ok(commandNames.includes('upload'));
        assert.ok(commandNames.includes('viewport'));
        assert.ok(commandNames.includes('cookie'));
        assert.ok(commandNames.includes('header'));
        assert.ok(commandNames.includes('dialog-accept'));
        assert.ok(commandNames.includes('dialog-dismiss'));
        assert.ok(commandNames.includes('useragent'));
        assert.ok(commandNames.includes('cookie-import'));
        assert.ok(commandNames.includes('frame'));
    });
    it('should export all expected visual commands', async () => {
        const { COMMANDS } = await import('../../../browse/dist/commands.js');
        const commandNames = [...COMMANDS.keys()];
        assert.ok(commandNames.includes('screenshot'));
        assert.ok(commandNames.includes('pdf'));
        assert.ok(commandNames.includes('responsive'));
        assert.ok(commandNames.includes('diff'));
        assert.ok(commandNames.includes('snapshot'));
    });
    it('should export all expected tab commands', async () => {
        const { COMMANDS } = await import('../../../browse/dist/commands.js');
        const commandNames = [...COMMANDS.keys()];
        assert.ok(commandNames.includes('tabs'));
        assert.ok(commandNames.includes('tab'));
        assert.ok(commandNames.includes('newtab'));
        assert.ok(commandNames.includes('closetab'));
    });
    it('should export all expected meta commands', async () => {
        const { COMMANDS } = await import('../../../browse/dist/commands.js');
        const commandNames = [...COMMANDS.keys()];
        assert.ok(commandNames.includes('chain'));
        assert.ok(commandNames.includes('status'));
        assert.ok(commandNames.includes('stop'));
        assert.ok(commandNames.includes('state'));
        assert.ok(commandNames.includes('watch'));
        assert.ok(commandNames.includes('restart'));
        assert.ok(commandNames.includes('handoff'));
        assert.ok(commandNames.includes('resume'));
        assert.ok(commandNames.includes('inbox'));
    });
    it('should categorize read commands correctly', async () => {
        const { isReadCommand } = await import('../../../browse/dist/commands.js');
        assert.ok(isReadCommand('text'));
        assert.ok(isReadCommand('html'));
        assert.ok(isReadCommand('links'));
        assert.ok(isReadCommand('forms'));
        assert.ok(isReadCommand('accessibility'));
        assert.ok(isReadCommand('js'));
        assert.ok(isReadCommand('css'));
        assert.ok(isReadCommand('attrs'));
        assert.ok(isReadCommand('console'));
        assert.ok(isReadCommand('network'));
        assert.ok(isReadCommand('cookies'));
        assert.ok(isReadCommand('storage'));
        assert.ok(isReadCommand('perf'));
        assert.ok(isReadCommand('is'));
        assert.ok(isReadCommand('dialog'));
        assert.ok(isReadCommand('eval'));
        assert.ok(isReadCommand('url'));
    });
    it('should categorize write commands correctly', async () => {
        const { isWriteCommand } = await import('../../../browse/dist/commands.js');
        assert.ok(isWriteCommand('goto'));
        assert.ok(isWriteCommand('back'));
        assert.ok(isWriteCommand('forward'));
        assert.ok(isWriteCommand('reload'));
        assert.ok(isWriteCommand('click'));
        assert.ok(isWriteCommand('fill'));
        assert.ok(isWriteCommand('select'));
        assert.ok(isWriteCommand('hover'));
        assert.ok(isWriteCommand('type'));
        assert.ok(isWriteCommand('press'));
        assert.ok(isWriteCommand('scroll'));
        assert.ok(isWriteCommand('wait'));
        assert.ok(isWriteCommand('upload'));
        assert.ok(isWriteCommand('viewport'));
        assert.ok(isWriteCommand('cookie'));
        assert.ok(isWriteCommand('header'));
        assert.ok(isWriteCommand('dialog-accept'));
        assert.ok(isWriteCommand('dialog-dismiss'));
        assert.ok(isWriteCommand('useragent'));
        assert.ok(isWriteCommand('cookie-import'));
        assert.ok(isWriteCommand('frame'));
    });
    it('should categorize meta commands correctly', async () => {
        const { COMMANDS } = await import('../../../browse/dist/commands.js');
        const metaCommands = ['screenshot', 'pdf', 'responsive', 'diff', 'snapshot',
            'tabs', 'tab', 'newtab', 'closetab', 'chain', 'status', 'stop',
            'state', 'watch', 'restart', 'handoff', 'resume', 'inbox'];
        for (const cmd of metaCommands) {
            const def = COMMANDS.get(cmd);
            assert.ok(def, `Command "${cmd}" should exist`);
            assert.equal(def.category, 'meta', `Command "${cmd}" should be meta category`);
        }
    });
    it('should not classify meta commands as read or write', async () => {
        const { isReadCommand, isWriteCommand } = await import('../../../browse/dist/commands.js');
        assert.ok(!isReadCommand('screenshot'));
        assert.ok(!isWriteCommand('screenshot'));
        assert.ok(!isReadCommand('snapshot'));
        assert.ok(!isWriteCommand('snapshot'));
        assert.ok(!isReadCommand('chain'));
        assert.ok(!isWriteCommand('chain'));
    });
    it('should have minimum command count of 40', async () => {
        const { COMMANDS } = await import('../../../browse/dist/commands.js');
        assert.ok(COMMANDS.size >= 40, `Expected at least 40 commands, got ${COMMANDS.size}`);
    });
    it('should return undefined for unknown commands via getCommand', async () => {
        const { getCommand } = await import('../../../browse/dist/commands.js');
        assert.equal(getCommand('nonexistent'), undefined);
        assert.equal(getCommand(''), undefined);
    });
    it('should return correct CommandDef via getCommand', async () => {
        const { getCommand } = await import('../../../browse/dist/commands.js');
        const gotoDef = getCommand('goto');
        assert.ok(gotoDef);
        assert.equal(gotoDef.name, 'goto');
        assert.equal(gotoDef.category, 'write');
        assert.equal(gotoDef.args, '<url>');
    });
    it('should have consistent name field matching map key', async () => {
        const { COMMANDS } = await import('../../../browse/dist/commands.js');
        for (const [key, def] of COMMANDS) {
            assert.equal(key, def.name, `Map key "${key}" should match def.name "${def.name}"`);
        }
    });
    it('should have non-empty description for every command', async () => {
        const { COMMANDS } = await import('../../../browse/dist/commands.js');
        for (const [key, def] of COMMANDS) {
            assert.ok(def.description.length > 0, `Command "${key}" should have a description`);
        }
    });
});
//# sourceMappingURL=commands.test.js.map