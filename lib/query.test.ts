import assert from "node:assert/strict";
import { test } from "node:test";

import { pageHref, parseQuery, sourceFromText } from "@/lib/query";

test("reads a place, coordinates and a zone name from one search box", () => {
  assert.deepEqual(sourceFromText("London"), { kind: "place", text: "London" });
  assert.deepEqual(sourceFromText("Paris, France"), { kind: "place", text: "Paris, France" });
  assert.deepEqual(sourceFromText("40.71, -74.01"), { kind: "coords", lat: 40.71, lon: -74.01 });
  assert.deepEqual(sourceFromText("America/New_York"), { kind: "zone", zone: "America/New_York" });
  assert.deepEqual(sourceFromText("America/Argentina/Buenos_Aires"), { kind: "zone", zone: "America/Argentina/Buenos_Aires" });
  assert.deepEqual(sourceFromText("UTC"), { kind: "zone", zone: "UTC" });
});

test("defaults to the visitor and the 12-hour clock", () => {
  assert.deepEqual(parseQuery({}), { source: { kind: "visitor" }, job: null, clock: "12", problems: [] });
});

test("reads the job time and reports bad input", () => {
  assert.equal(parseQuery({ job: "02:30" }).job, 150);
  assert.equal(parseQuery({ job: "2:30" }).job, 150);
  assert.equal(parseQuery({ job: "25:00" }).job, null);
  assert.equal(parseQuery({ job: "25:00" }).problems.length, 1);
  assert.equal(parseQuery({ tz: "not a zone" }).problems.length, 1);
  assert.equal(parseQuery({ lat: "95", lon: "0" }).problems.length, 1);
});

test("builds links that keep the rest of the state", () => {
  const query = parseQuery({ tz: "Europe/London", job: "01:30", clock: "24" });

  assert.equal(pageHref(query, {}), "/?tz=Europe%2FLondon&job=01%3A30&clock=24");
  assert.equal(pageHref(query, { place: "Sydney" }), "/?place=Sydney&job=01%3A30&clock=24");
  assert.equal(pageHref(query, { job: null, clock: null }), "/?tz=Europe%2FLondon");
  assert.equal(pageHref(parseQuery({}), {}), "/");
});
