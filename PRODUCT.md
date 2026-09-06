# Butterfly — Product Brief

## What this is

Butterfly is a live demonstration of genuinely concurrent, event-driven multi-agent simulation,
built on `@mozaik-ai/core` for the JigJoy "Build with Mozaik" hackathon. One scenario — a heist,
four roles with competing goals — exists to make one idea visible and undeniable: **several AI
agents can observe the same event and independently decide, at the same moment, how to react to
it, and those reactions cascade into further events with no central script choosing who acts
next.**

The product is not a game to be balanced, monetized, or expanded into a franchise. It is a
demonstration vehicle. Every decision below optimizes for one thing: a judge watching a 60–90
second recording understanding, without narration, that concurrency is real here.

## Mode: Experience / Operate, not marketing

This is not a landing page selling a product. There is no pricing, no signup, no testimonial,
no "why choose us." The interface is the thing itself — a control room a human sits down at,
watches, and occasionally reaches into. Every screen either shows the simulation running or lets
the human intervene in it. Nothing else earns space on screen.

## Who it's for, right now

Primarily: hackathon judges, in one sitting, deciding in under two minutes whether this is a real
multi-agent system or a chatbot wearing a costume. Secondarily: the builder, rehearsing the demo
take. There is no other audience for v1 — no returning user, no onboarding flow, no settings
panel beyond what's needed to run the scenario reliably (reset, model name shown, connection
status).

## The core interaction loop

1. The scenario is running: four agents are (or may be) idle, thinking, or mid-action at any
   moment, entirely on their own initiative in reaction to each other.
2. The human picks one of a small, fixed set of interventions — not a chat box. A chat box invites
   the judge to type something ambiguous and get an unpredictable non-demo result; a short menu of
   sharp, legible actions ("Police arrive ten minutes early") guarantees the one moment the whole
   recording depends on actually lands the same way every take.
3. The intervention becomes one more event in the same event bus every agent already listens to.
   Nothing about how it's handled is special-cased for "this came from a human."
4. The screen visibly reorganizes: multiple agents start thinking at once, world meters move, new
   events appear and connect visually back to what caused them.
5. The scenario reaches a resolution (heist succeeds, crew arrested, job aborted, or someone flips)
   or the human resets to run it again.

## What must be visible on screen, always

- **That more than one agent is thinking right now, at the same time.** This is the single most
  important property of the interface. If a judge has to read a caption to understand this, the
  design has failed regardless of how it looks.
- **What caused what.** An event that triggers a reaction should read as connected to it — not
  just "many things happened," but "this happened because of that."
- **The state of the world**, in a handful of numbers that the simulation actually uses (heat,
  chaos, public attention, crew trust, heist progress) — not decorative gauges.
- **Each agent's goal and current status**, briefly — enough that a judge unfamiliar with the
  scenario can tell Mastermind from Detective from Insider from Driver at a glance.

## What this must never become

- A dashboard. No stat tiles that exist to look busy; every number shown is a number an agent's
  tool call actually reads or writes.
- A chatbot UI. No message bubbles, no "type your message" input directed at an agent.
- A generic SaaS marketing surface — no hero section, no feature grid, no pricing, no testimonials,
  no "trusted by" logos, because there is no product being sold here.
- A 3D or open-world game. The world is implied, not modeled; the visual language is a case board
  and a command room, not a rendered city.
- A system that fakes concurrency for effect. If two agents appear to act at once, they did.

## Positioning, one line

"One decision. A world of agents. Watch the consequences unfold." — the tagline is the pitch;
the interface's only job is to make that sentence obviously, visibly true.
