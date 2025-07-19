// app/api/chat-with-plan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CacheManager, CACHE_KEYS } from '@/lib/redis';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { applyPatch } from 'fast-json-patch';

export async function POST(req: NextRequest) {
  try {
    const {
      planId,
      message,
      role = 'user',
      currentPlan,
    } = await req.json();

    if (!planId || !message) {
      return NextResponse.json(
        { error: 'planId and message are required' },
        { status: 400 },
      );
    }

    // ── 1. Fetch (or seed) cached plan ────────────────────────────────────────────
    const planKey = CACHE_KEYS.TRAVEL_PLAN(planId);
    let plan = await CacheManager.get<any>(planKey);

    if (!plan && currentPlan) {
      await CacheManager.set(planKey, currentPlan, 86_400); // 24 h
      plan = currentPlan;
      console.log(`[chat-with-plan] seeded cache for ${planId}`);
    }

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // ── 2. Build Gemini prompt asking for RFC‑6902 patch ──────────────────────────
    const prompt = `
You are an AI travel concierge helping a traveller refine an existing itinerary.

TASKS:
1. Inspect the current itinerary object provided below.
2. Analyse the user's new message.
3. Decide whether the message implies a modification to the itinerary (dates, activities, budget, etc.).
4. If a change is needed, output ONLY a JSON Patch array (RFC‑6902) that transforms the itinerary.
5. If no change is necessary, output an empty array [].
6. Always include an "assistant_response" — a natural‑language reply to the user, acknowledging any changes or responding to questions.

Return JSON with exactly these keys:
{
  "patch": <RFC‑6902 array>,
  "assistant_response": <string>,
  "suggestions": <string[] | optional quick replies>
}

### Current Itinerary
\`\`\`json
${JSON.stringify(plan.itinerary, null, 2)}
\`\`\`

### User Message
"${message}"
`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const geminiRes = await model.generateContent({
      contents: [{ role, parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const { text } = await geminiRes.response;
    const aiJson = JSON.parse(text());

    const patch: any[] = Array.isArray(aiJson.patch) ? aiJson.patch : [];
    const assistantResponse: string =
      aiJson.assistant_response || 'Okay!';
    const suggestions: string[] = Array.isArray(aiJson.suggestions)
      ? aiJson.suggestions
      : [];

    // ── 3. Apply patch if needed ──────────────────────────────────────────────────
    let patchApplied = false;
    if (patch.length > 0) {
      const patched = applyPatch({ ...plan.itinerary }, patch, true, false);
      plan.itinerary = patched.newDocument;
      patchApplied = true;
      await CacheManager.set(planKey, plan, 86_400);
    }

    // ── 4. Return to client ───────────────────────────────────────────────────────
    return NextResponse.json({
      response: assistantResponse,
      suggestions,
      updatedPlan: patchApplied ? plan : null,
    });
  } catch (err) {
    console.error('[chat-with-plan] error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
