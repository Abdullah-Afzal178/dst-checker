import assert from "node:assert/strict";
import { test } from "node:test";

import { nameFor } from "@/lib/names";

test("keeps the API's city when it matches the search, else what was typed", () => {
  assert.equal(nameFor("Phoenix, Arizona", "Phoenix"), "Phoenix");
  assert.equal(nameFor("sao paulo", "São Paulo"), "São Paulo");
  assert.equal(nameFor("Casablanca", "arrondissement de Sidi Belyout"), "Casablanca");
});
