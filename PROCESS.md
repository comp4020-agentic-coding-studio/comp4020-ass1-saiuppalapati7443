# Process overview

## What I built

An interactive explainer of the phantom traffic jam, that stop-and-go wave that shows up on an open road with no crash, no merge, no bottleneck. It happens purely because there are enough cars that small, ordinary braking compounds as it ripples backward through the line. You control how many cars share a circular road, and can brake one car directly. At low counts, traffic stays smooth. Past a certain point, a wave of stopped and moving cars forms, travels, and dissolves entirely on its own. The point I wanted to land: people assume traffic jams need an external cause, but this one doesn't, it's just density and reaction time doing their thing.

## The moments that mattered

**1. Writing the spec test before building anything.**

The spec asks for the core interaction to be stated plainly enough to test. So instead of building first and describing it afterward, I wrote `spec/assignment-1.test.ts` against a page that had no simulation yet, then ran `pnpm check` to make sure it failed for the right reason, 4 new tests red, the 16 existing ones still green. That gave me a checkable definition of "done" before any code existed at all.
[`b023c83`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-saiuppalapati7443/commit/b023c83)

**2. A jam that looked convincing but wasn't the real thing.**

The first working version had every car red at high density, no green anywhere, that's just gridlock from cramming too many cars on, not the wave I was after. The easy move would've been to cap the slider lower and call it done. Instead I dug into what the model's constants were actually doing, and found the jam-forming density band wasn't monotonic, some counts settled back into smooth flow, only isolated counts destabilised, and the top end was near-total gridlock rather than a mixed wave. Retuning the safe-gap and reaction-time constants themselves (not just the slider) got me a clean progression: smooth flow to real mixed wave to gridlock. I checked this by watching multi-minute stretches at several densities instead of trusting one screenshot, since the wave is transient, it forms, travels, dissolves, reseeds, and a snapshot can't prove that cycle's real.
[`f9ec779`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-saiuppalapati7443/commit/f9ec779)

**3. Cars passing through each other, a numerical bug, not a design flaw.**

Watching a stopped cluster closely, I caught a moving car occasionally teleporting to the far side of a stopped car directly ahead of it, impossible on a single lane, and something the test suite would never catch, since it only checks that the interaction elements exist, not that the physics hold together. The cause was a per-frame position update that could overshoot the actual gap when velocity was high and the gap was small. Fixed it by constraining each car's position update so it can never exceed its current gap, a car can be forced to a hard stop, but it can never pass through. I confirmed it by watching individual clusters afterward and checking no car ever ended up on the far side of one it hadn't actually queued behind.
[`f9ec779`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-saiuppalapati7443/commit/f9ec779)

