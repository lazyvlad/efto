# Checks for the Dire Maul experiment (public/experiments/claude-dire-maul)

Plain Node scripts, no PHPUnit: run each with `node <file>` from this folder.

- `test-hunt.mjs`, `test-abilities.mjs`, `test-floors.mjs`, `test-danger.mjs`: engine checks
  (leash and search, Feign Death and the pet, the two floors, horns, inspection, the finale).
- `planner.mjs`: plays every upstairs/downstairs plan, moving only when no ogre would notice;
  `node planner.mjs up/up/down` plays one. Its best time is `RUN.best` in level-data.js.
- `test-route.mjs`: the best route still clears the level unseen within `RUN`. Takes a few minutes.
- `naive.mjs`: running or sneaking straight through must fail.

After changing level-data.js or engine.js, keep the `?v=` query on the imports in the
experiment and in planner.mjs / test-route.mjs the same, or they load separate copies.
