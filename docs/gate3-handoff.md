# Sonolumina — Gate 3 · The Dwelling (handoff for other agents)

Playable build (Claude artifact, private until shared):
[<u>https://claude.ai/artifact/36UL85hVfzDmS34Zt4QtZi</u>](https://claude.ai/artifact/36UL85hVfzDmS34Zt4QtZi)
Source file: sonolumina_gate3.html (single self-contained page, no
network, browser-local save). Built on Gate 2 · The Naming. Date:
2026-10-24.

## What Gate 3 adds

- Work loop: both people gather fallen branches (under trees) and loose
  river stones (west bank), carry them to the pile at the site, and
  build. Living trees and named stones are never taken.

- Five stages: Foundation stones (8 stone) → Timber frame (8 wood) →
  Walls (6 wood + 6 stone) → Roof (8 wood) → Door & hearth (2 wood + 4
  stone).

- Rest kept (from FOUNDATION): work only 07:00–18:00; rest every night
  (inside the house once finished); day 7 (day % FOUNDATION.restDay
  === 0) is a rest day, no work.

- Player control: new "Home · n/5" button opens the dwelling book (stage
  list, "Begin the work together" / "Set the work aside", "Show the
  home"). Tapping the house also opens it. Work is off until the player
  begins it.

- Scales: Building = exterior house. Home = inside view (dashed floor
  plan before it's built; furnished room, hearth fire, people asleep on
  mats at night once finished).

- Walls block walking from stage 3 onward; anyone inside the footprint
  is moved to the door and routes are recalculated.

## Code notes

- FOUNDATION.allowedActions now: walk, observe, name, gather, build,
  rest.

- New constants: HOUSE, DOOR, DELIVER, REST_SPOTS, PILES, STAGES,
  STONE_BANKS, work/night times.

- New person fields: task (null \| gather-wood \| gather-stone \|
  deliver \| rest), carrying (null \| wood \| stone), inside.

- Behaviour: decide() → workStep() / rest / wander(); arrive() handles
  path ends; deposit() advances stages; stageRaised() handles walls
  appearing.

- Drawing: paintHouseGround() (foundation, floor, interior) and
  paintHouse() (frame, walls, roof, chimney) depth-sorted with trees and
  people.

- Save: key sonolumina.first-garden.v3 (adds dwelling + person work
  fields). A Gate 2 save (...v2) is migrated automatically and left
  untouched.

- Debug: window.SonoLumina.snapshot() now includes dwelling and each
  person's task, carrying, inside, activity.

## Tested (Playwright, 412×900)

Full build from stage 0 to finished house (~4 in-game days at 3×), night
rest inside, day-7 rest, walls-raised re-routing, Gate 2 save migration.
No console errors.

## Suggested next: Gate 4

Recommended: the sound-and-light layer (Scripture-driven live
music/light — the heart of Sonolumina). Alternative: daily life (eating,
tending the garden, caring for the deer).

## Not yet published

GitHub: the live repo is seabasskrahn/sonolumina (logos-theta is
retired). Gate 3 still needs to be committed there.

## Names

The two people are named **Sono** (person one) and **Lumina** (person two). These are the default names; the player can still rename them, and older saves with no name for a person load as Sono / Lumina.
