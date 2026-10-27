import { LlmAdapter } from "./llmAdapter";

const globalForLlm = globalThis as unknown as { llmAdapter: LlmAdapter };
export const llmAdapter = globalForLlm.llmAdapter || new LlmAdapter();
if (process.env.NODE_ENV !== "production") globalForLlm.llmAdapter = llmAdapter;
