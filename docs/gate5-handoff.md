# Sonolumina — Gate 5 · Daily Bread (handoff for other agents)

File: `gates/sonolumina_gate5.html` — one self-contained page, no network, built on Gate 4 · Sound & Light. Date: 2026-10-24.
Playable build: the same Claude artifact link as Gates 3–4 (private until shared).

## Principle (unchanged)
Scripture alone, KJV in the file, all 42 verse texts checked word for word against `data/kjv`. No letter-number or frequency meanings; music follows the meaning of the words.

## What Gate 5 adds
- **Meals, shared.** Every morning (06:30–09:30) and evening (18:00–20:30) both people gather food and eat *together*. They pick fruit from the six fruit trees, or gather herbs if no fruit is ready (Genesis 1:29). Before the house is finished they eat on a cloth between the resting places. After it is finished they eat at the table inside, and the Home scale shows them seated. One waits for the other, about an in-game hour, before eating alone.
- **Nourishment, gently.** Each person's `fed` falls over the day (more slowly at night). Labels show "· hungry" when it's low, and a hungry person simply finds something to eat. Nobody is harmed and nothing is scored.
- **Tending.** In daylight they carry water from the river to the fruit trees. A watered tree gets +3 fruit by morning, an unwatered one +1 (max 4). There is no tending on the seventh day.
- **The deer.** It now moves on its own: grazing, going to the river to drink, resting at night. Once a day each person looks in on it, and its trust rises by 0.2 each time. At trust 0.5 or above it sleeps near the home; at 0.6 or above it sometimes follows the selected person. Tap the deer to send the selected person to it. On the seventh day they still eat and still care for the deer.
- **Day book** (new "Day" button): each person's nourishment and meals today, fruit ready and trees watered, the deer's trust, and two switches: *Tending the trees* and *Caring for the deer* (both on by default).
- **Scripture & sound:** 11 new verses — Gen 1:29, 1:30; Ps 104:14, 145:15–16, 133:1 (eating together), 42:1 (deer drinking); Eccl 3:13; 1 Cor 3:6 (watering); Isa 58:11 (all trees watered); Prov 12:10 (caring for the deer); Matt 6:26. Two new themes, each with a voice and a light colour: *nourish* (warm, round, wooden notes moving through the chord) and *creature* (a soft breathy line that wanders and pauses). Event verses now show for about 12 seconds.

## Code notes
- `FOUNDATION.allowedActions` + eat, tend, care.
- New constants: `CARRY`, `FRUIT_TREES` [0,1,3,4,6,11], `FRUIT_MAX`, `MEAL_SPOTS`, `DEER_REST`, `MEALS`, `freshLife()`.
- Person fields: `fed`, `mealAm`, `mealPm`, `careDay`, `target` (+ unsaved `mealWait`, `eating`, `eatTogether`, `picked`). New tasks: pick, meal, fetch-water, water-tree, deer. Carrying: fruit, water.
- Behaviour: `decide()` order is finish meal → night rest → meal due → hunger snack → building → set down a load → water → tend → deer → wander. Then `mealStep`, `startEating`, `finishMeal`, `snackStep`, `tendStep`, `waterStep`, `deerStep`, `careForDeer`, `deerDecide`, `simulateDeer`, `newMorning`. Aimless walks end when a meal is due.
- Drawing: `paintDeer()` (depth-sorted, walks, grazes and drinks with its head down, shows a heart when cared for), fruit on trees, damp rings under watered trees, the meal cloth, people seated at the table.
- **Save v4** `sonolumina.first-garden.v4` adds `life` {tending, caring, trees, deer} and the person fields. v3 and v2 saves are migrated automatically and left untouched.
- `SonoLumina.snapshot().life` for debugging.

## Tested (Playwright, 412×900)
Four in-game days at 3×: shared meals, tending, regrowth, deer trust reaching 1.0, resting at home, the table at Home scale, the rest day (no tending, meals and deer care kept), and v3 → v4 migration. No console errors.

## Ideas for Gate 6
Seasons and planting (sowing seed, Genesis 8:22); the people speaking or singing a verse at meals; more creatures to name and care for.
