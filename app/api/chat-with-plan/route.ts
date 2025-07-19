import { NextRequest, NextResponse } from 'next/server';
import { CacheManager, CACHE_KEYS } from '@/lib/redis';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { applyPatch } from 'fast-json-patch';

/**
 * POST /api/chat-with-plan
 * Body: { planId: string, message: string, role?: 'user' | 'system' }
 *
 * Returns: { assistant: string, patchApplied: boolean, itinerary: any }
 */
export async function POST(req: NextRequest) {
  try {
    const { planId, message, role = 'user' } = await req.json();

    if (!planId || !message) {
      return NextResponse.json({ error: 'planId and message are required' }, { status: 400 });
    }

    // Retrieve the cached travel plan
    const planCacheKey = CACHE_KEYS.TRAVEL_PLAN(planId);
    const plan = await CacheManager.get<any>(planCacheKey);

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Build a prompt instructing Gemini to return an RFC‑6902 JSON Patch
    const prompt = `
You are an AI travel concierge helping a traveller refine an existing itinerary.\n\nTASKS:\n1. Inspect the current itinerary object provided below.\n2. Analyse the user's new message.\n3. Decide whether the message implies a modification to the itinerary (dates, activities, budget, etc.).\n4. If a change is needed, output ONLY a JSON Patch array (RFC‑6902) that transforms the itinerary.\n5. If no change is necessary, output an empty array [].\n6. Always include an \"assistant_response\" — a natural‑language reply to the user, acknowledging any changes or responding to questions.\n\nReturn JSON with exactly these keys:\n{\n  \"patch\": <RFC‑6902 array>,\n  \"assistant_response\": <string>\n}\n\n### Current Itinerary\n\n\u0060\u0060\u0060json\n${JSON.stringify(plan.itinerary, null, 2)}\n\u0060\u0060\u0060\n\n### User Message\n\n\"${message}\"`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Ask Gemini for a patch & assistant response
    const geminiRes = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const { text } = await geminiRes.response;
    const aiJson = JSON.parse(text());
    const patch = Array.isArray(aiJson.patch) ? aiJson.patch : [];

    // Apply the patch if needed
    let newItinerary = plan.itinerary;
    let patchApplied = false;
    if (patch.length > 0) {
      const patched = applyPatch({ ...plan.itinerary }, patch, true, false);
      newItinerary = patched.newDocument;
      patchApplied = true;

      // Persist the updated plan back to cache (TTL 24 h)
      plan.itinerary = newItinerary;
      await CacheManager.set(planCacheKey, plan, 24 * 60 * 60);
    }

    return NextResponse.json({
      assistant: aiJson.assistant_response || 'Okay!',
      patchApplied,
      itinerary: newItinerary
    });
  } catch (err: any) {
    console.error('[chat-with-plan] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
