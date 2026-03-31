import type { CommandCategory } from './types.js';
export interface CommandDef {
    name: string;
    category: CommandCategory;
    description: string;
    args: string;
    examples?: string[];
}
export declare const COMMANDS: Map<string, CommandDef>;
export declare function getCommand(name: string): CommandDef | undefined;
export declare function isReadCommand(name: string): boolean;
export declare function isWriteCommand(name: string): boolean;
//# sourceMappingURL=commands.d.ts.map