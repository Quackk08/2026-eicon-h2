# ReNew Product Guardrails

These rules are implementation invariants. Feature code, AI prompts, analytics, admin tools, and external integrations must preserve them.

## Product Meaning

- ReNew is a Lifestyle Architecture product, not a diagnosis or treatment product.
- A Check-In is input for adjusting today's action, not a clinical assessment.
- A Mission is a step toward the user's Life Vision, not random wellness content.
- A Place is an execution environment for an action, not an advertising slot.
- Community is structured around small shared actions, not an open social network.
- Support is an optional user-controlled connection path.

## Recommendation Rules

- Generate candidates only from reviewed ActionTemplate data.
- Run deterministic safety and constraint filters before any AI request.
- Treat missing values as `null`; never convert them to zero.
- Use a user's own baseline and recent history, never another user's score or rank.
- Preserve the long-term goal while adapting action size, time, place, cost, distance, and social load.
- Always allow the user to modify, reject, pause, or skip a recommendation.
- When data is insufficient, state that clearly instead of estimating a pattern.
- A Partner Place benefit must never outweigh user fit and safety.

## AI Rules

- Gemini is called only from the backend.
- AI receives the minimum data needed for the current task.
- Names, phone numbers, exact addresses, and raw sensitive notes are excluded from AI input.
- AI may rank reviewed candidates and write explanations.
- AI may not invent an unreviewed action, make a diagnosis, suggest medication or treatment, calculate a risk probability, or decide that contact is required.
- AI output must pass a shared schema and candidate-ID check.
- Invalid or unavailable AI output falls back to the rule engine.

## Privacy and Logging Rules

- Do not log raw Check-In values, sensitive notes, trusted contact details, or precise location.
- Do not expose personal Check-In data to community members or place partners.
- Do not use state data for advertising targeting.
- Keep exact location only as long and as precisely as the selected feature requires.
- Provide user-controlled export and deletion paths before production launch.

## Community Rules

- No private direct messages in the MVP.
- No random one-to-one matching between minors and adults.
- No exact real-time location sharing.
- Offline activities use reviewed public locations.
- Provide join cancellation, reporting, and blocking paths.
- Separate crisis and formal support from community participation.

## Support Rules

- Show the recipient, channel, full message, included data, and excluded data before handoff.
- Require explicit user approval for every message or call action.
- Never send an SMS, place a call, report a user, or share a location automatically.
- Do not include diagnosis language, full Check-In history, trigger details, or exact location by default.

## Offline Rules

- The daily core loop must remain usable when AI or the network is unavailable.
- Check-In and Reflection are written locally before synchronization.
- Every mutation uses a stable local ID and idempotency key.
- Route conflicts must remain recoverable and visible to the user.

## Mobile and Responsive Rules

- Mobile browsers are a first-class MVP environment, not a reduced feature set.
- Do not hide core functionality on small screens; adapt layout and interaction instead.
- Support layouts from 320px wide without horizontal page scrolling.
- Keep primary touch targets at least 44x44px.
- Do not make any required action depend on hover.
- Account for device safe areas in fixed headers, navigation, sheets, and action bars.
- Verify core flows on iOS Safari and Android Chrome in portrait and landscape.
- Keep Check-In, Mission access, and Reflection usable on slow or unavailable networks.
