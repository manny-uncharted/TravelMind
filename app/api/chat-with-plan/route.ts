// app/api/chat-with-plan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CacheManager, CACHE_KEYS, CacheKeyHelpers } from '@/lib/redis';
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
    // Support both old format (planId) and new location-based keys
    let planKey: string;
    
    if (planId.startsWith('travel_plan:')) {
      // New format: already a complete cache key
      planKey = planId;
    } else if (planId === 'current' || planId.length < 20) {
      // Old format: fallback to generic key (for backward compatibility)
      planKey = CACHE_KEYS.TRAVEL_PLAN(planId);
    } else {
      // Assume it's a location-based key
      planKey = planId;
    }
    
    console.log(`[chat-with-plan] Using cache key: ${planKey}`);
    
    let plan = await CacheManager.get<any>(planKey);

    if (!plan && currentPlan) {
      // Ensure the plan structure is correct for caching
      const normalizedPlan = {
        itinerary: currentPlan.itinerary || null,
        recommendations: currentPlan.recommendations || [],
        workflow_data: currentPlan.workflow_data || {},
        orchestration: currentPlan.orchestration || {}
      };
      
      await CacheManager.set(planKey, normalizedPlan, 86_400); // 24 h
      plan = normalizedPlan;
      console.log(`[chat-with-plan] seeded cache for ${planId}`);
    }

    // If currentPlan is provided and differs from cached plan, update the cache
    if (currentPlan && plan) {
      const hasItinerary = !!currentPlan.itinerary;
      const cachedHasItinerary = !!plan.itinerary;
      
      // If currentPlan has itinerary but cached doesn't, update cache
      if (hasItinerary && !cachedHasItinerary) {
        console.log(`[chat-with-plan] Updating cache with fresh itinerary data for ${planId}`);
        const normalizedPlan = {
          itinerary: currentPlan.itinerary || null,
          recommendations: currentPlan.recommendations || [],
          workflow_data: currentPlan.workflow_data || {},
          orchestration: currentPlan.orchestration || {}
        };
        
        await CacheManager.set(planKey, normalizedPlan, 86_400);
        plan = normalizedPlan;
      }
    }

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Debug: Log the structure of the cached plan
    console.log('[chat-with-plan] Plan structure:', {
      hasItinerary: !!plan.itinerary,
      planKeys: Object.keys(plan),
      itineraryKeys: plan.itinerary ? Object.keys(plan.itinerary) : null,
      scheduleLength: plan.itinerary?.schedule?.length,
      localInsightsLength: plan.itinerary?.localInsights?.length,
      budgetAmount: plan.itinerary?.budget?.amount
    });

    // ── 2. Build Gemini prompt for Q&A and modifications ──────────────────────────
    const prompt = `
You are an AI travel concierge helping a traveller with their existing itinerary. You can both answer questions and make modifications.

CAPABILITIES:
1. **Answer Questions**: Provide detailed information about the itinerary (activities, costs, locations, timing, etc.)
2. **Make Modifications**: Apply changes to the itinerary when explicitly requested

TASKS:
1. Inspect the current itinerary object provided below.
2. Analyze the user's message to determine if it's:
   - A QUESTION about the itinerary (asking for information, clarification, details)
   - A MODIFICATION REQUEST (asking to change, add, remove, or adjust something)
3. For QUESTIONS: Provide detailed, helpful answers based on the itinerary data
4. For MODIFICATIONS: Generate JSON Patch operations (RFC-6902) to transform the itinerary
5. Always provide a natural-language response

RESPONSE FORMAT:
{
  "interaction_type": "question" | "modification",
  "patch": <RFC‑6902 array - only for modifications, empty array for questions>,
  "assistant_response": <detailed response to user>,
  "suggestions": <string[] - relevant follow-up questions or actions>
}

EXAMPLES:
- "What activities are planned for day 2?" → interaction_type: "question", patch: []
- "How much will the hotel cost?" → interaction_type: "question", patch: []
- "What time does the museum tour start?" → interaction_type: "question", patch: []
- "Tell me about the restaurants recommended" → interaction_type: "question", patch: []
- "Add a food tour to day 3" → interaction_type: "modification", patch: [...]
- "Remove the museum visit" → interaction_type: "modification", patch: [...]
- "Change the hotel to something cheaper" → interaction_type: "modification", patch: [...]
- "Increase the budget for meals" → interaction_type: "modification", patch: [...]

For QUESTIONS: Provide detailed, informative answers with specific details from the itinerary.
For MODIFICATIONS: Generate appropriate JSON patch operations and explain what will be changed.

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

    const interactionType = aiJson.interaction_type || 'question';
    const patch: any[] = Array.isArray(aiJson.patch) ? aiJson.patch : [];
    const assistantResponse: string = aiJson.assistant_response || 'I understand your request.';
    const suggestions: string[] = Array.isArray(aiJson.suggestions) ? aiJson.suggestions : [];

    console.log(`[chat-with-plan] Interaction type: ${interactionType}, patches: ${patch.length}`);

    // ── 3. Apply patch if needed ──────────────────────────────────────────────────
    let patchApplied = false;
    if (patch.length > 0) {
      console.log(`[chat-with-plan] Applying ${patch.length} patch operations:`, patch);
      const patched = applyPatch({ ...plan.itinerary }, patch, true, false);
      plan.itinerary = patched.newDocument;
      patchApplied = true;
      await CacheManager.set(planKey, plan, 86_400);
      console.log(`[chat-with-plan] Plan updated and cached for ${planId}`);
    } else {
      console.log(`[chat-with-plan] No patches to apply for ${planId}`);
    }

    // ── 4. Return to client ───────────────────────────────────────────────────────
    return NextResponse.json({
      response: assistantResponse,
      suggestions,
      interactionType,
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
