import { NextResponse } from "next/server";
import { AVAILABLE_MODELS } from "@/types";
import { llmAdapter } from "@/server/intelligence/instance";

export async function GET() {
  return NextResponse.json({
    models: AVAILABLE_MODELS,
    defaultFree: llmAdapter.getFreeModel(),
    defaultPaid: llmAdapter.getPaidModel(),
    provider: llmAdapter.getProvider() || "synthesizer",
    hasApiKey: llmAdapter.hasApiKey(),
  });
}
