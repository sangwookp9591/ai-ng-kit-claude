export declare function norchSessionStart(sessionId?: string): void;
export declare function norchSessionEnd(sessionId?: string): void;
export declare function norchAgentSpawn(sessionId: string, agentKey: string, message?: string): void;
export declare function norchAgentDone(sessionId: string, agentKey: string, message?: string): void;
export declare function norchToolUse(sessionId: string, toolName: string, target: string, agentKey?: string): void;
export declare function norchError(sessionId: string, agentKey: string, message: string): void;
export declare function norchPdcaChange(sessionId: string, phase: string, step: string): void;
//# sourceMappingURL=norch-bridge.d.ts.map