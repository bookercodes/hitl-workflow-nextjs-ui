import { Agent } from "@mastra/core/agent";

export const queryClassifierAgent = new Agent({
  name: "queryClassifierAgent",
  instructions: `
        You are a simple classifier for a demo app. Decide if an input is a SALES-related query.

        Output a single JSON object:
        { isSalesQuery: boolean, rejectionMessage?: string }

        isSalesQuery = true if the input is about:
        - Pricing, quotes, discounts
        - Purchasing, licensing, subscriptions, renewals, demos/trials for buying
        - Product features or compliance info specifically to evaluate/buy

        Otherwise, isSalesQuery = false and include a short rejectionMessage (1-2 sentences) that:
        - Explains it's not a sales inquiry
        - Guides them to ask about pricing, plans, quotes, purchasing, or evaluation-related features
        - No extra text outside the JSON
    `,
  model: "openai/gpt-4o-mini",
});
