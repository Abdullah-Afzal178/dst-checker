import assert from "node:assert/strict";
import { test } from "node:test";

import { changesInYears, isKnownZone, lastChange, nextChange, offsetAt, standardOffset, zoneCity } from "@/lib/zones";
import { board } from "@/lib/world";

const NOW = Date.UTC(2026, 10, 3, 12);

test("reads offsets, including half and quarter hours", () => {
  assert.equal(offsetAt("America/New_York", Date.UTC(2026, 0, 15)), -300);
  assert.equal(offsetAt("America/New_York", Date.UTC(2026, 6, 15)), -240);
  assert.equal(offsetAt("Asia/Kolkata", NOW), 330);
  assert.equal(offsetAt("Asia/Kathmandu", NOW), 345);
  assert.equal(offsetAt("UTC", NOW), 0);
});

test("finds the US rules: second Sunday of March, first Sunday of November, at 2 AM", () => {
  const changes = changesInYears("America/New_York", 2026, 2028);

  assert.deepEqual(
    changes.map((change) => `${change.from.date} ${change.from.minutes}>${change.to.minutes}`),
    ["2026-03-08 120>180", "2026-11-01 120>60", "2027-03-14 120>180", "2027-11-07 120>60", "2028-03-12 120>180", "2028-11-05 120>60"],
  );
});

test("finds the EU rule: last Sunday of March and October, at 1 AM UTC", () => {
  const changes = changesInYears("Europe/Paris", 2027, 2027);

  assert.deepEqual(
    changes.map((change) => [change.from.date, new Date(change.at).toISOString().slice(11, 16)]),
    [
      ["2027-03-28", "01:00"],
      ["2027-10-31", "01:00"],
    ],
  );
});

test("finds the next change and the last one", () => {
  assert.equal(nextChange("America/New_York", NOW)?.from.date, "2027-03-14");
  assert.equal(lastChange("America/New_York", NOW)?.from.date, "2026-11-01");
  assert.equal(nextChange("Australia/Lord_Howe", NOW)?.shift, -30);
});

test("knows where clocks have stopped changing", () => {
  assert.equal(nextChange("America/Phoenix", NOW), null);
  assert.equal(nextChange("America/Mexico_City", NOW), null);
  assert.equal(lastChange("America/Mexico_City", NOW)?.from.date, "2022-10-30");
  assert.equal(lastChange("America/Sao_Paulo", NOW)?.from.date.slice(0, 4), "2019");
  assert.equal(lastChange("Asia/Tokyo", NOW), null);
});

test("standard time is the lower offset", () => {
  assert.equal(standardOffset("America/New_York", 2027), -300);
  assert.equal(standardOffset("Australia/Sydney", 2027), 600);
});

test("zone names", () => {
  assert.ok(isKnownZone("America/New_York"));
  assert.ok(!isKnownZone("Not/AZone"));
  assert.equal(zoneCity("Australia/Lord_Howe"), "Lord Howe");
});

test("the board lists the soonest changes first and the steady places last", () => {
  const rows = board(NOW);
  const firstSteady = rows.findIndex((row) => row.next === null);

  assert.ok(firstSteady > 0);
  assert.ok(rows.slice(firstSteady).every((row) => row.next === null));
  assert.equal(rows.find((row) => row.city === "Mexico City")?.stoppedIn, 2022);
  assert.equal(rows.find((row) => row.city === "Tokyo")?.stoppedIn, null);

  for (let i = 1; i < firstSteady; i++) {
    assert.ok(rows[i - 1].next!.at <= rows[i].next!.at);
  }
});

test("Morocco's Ramadan change counts as its standard time", () => {
  assert.equal(standardOffset("Africa/Casablanca", 2027), 0);
});
