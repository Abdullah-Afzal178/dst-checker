import assert from "node:assert/strict";
import { test } from "node:test";

import { changeFromApi, jobOnChange, pickChanges, sleepEffect, whenFromToday } from "@/lib/dst";
import { changesBetween } from "@/lib/zones";

// Captured from /v3/timezone on 2026-11-02.
const NEW_YORK = {
  dst_start: { utc_time: "2027-03-14 TIME 07:00", duration: "+1.00H", gap: true, date_time_after: "2027-03-14 TIME 03:00", date_time_before: "2027-03-14 TIME 02:00", overlap: false },
  dst_end: { utc_time: "2027-11-07 TIME 06:00", duration: "-1.00H", gap: false, date_time_after: "2027-11-07 TIME 01:00", date_time_before: "2027-11-07 TIME 02:00", overlap: true },
};
const SYDNEY = {
  dst_start: { utc_time: "2026-10-03 TIME 16:00", duration: "+1.00H", gap: true, date_time_after: "2026-10-04 TIME 03:00", date_time_before: "2026-10-04 TIME 02:00", overlap: false },
  dst_end: { utc_time: "2027-04-03 TIME 16:00", duration: "-1.00H", gap: false, date_time_after: "2027-04-04 TIME 02:00", date_time_before: "2027-04-04 TIME 03:00", overlap: true },
};
const LORD_HOWE_END = { utc_time: "2027-04-03 TIME 15:00", duration: "-0.50H", gap: false, date_time_after: "2027-04-04 TIME 01:30", date_time_before: "2027-04-04 TIME 02:00", overlap: true };
const NOW = Date.UTC(2026, 10, 2, 19);

test("reads the API's spring-forward transition", () => {
  const change = changeFromApi(NEW_YORK.dst_start);

  assert.ok(change);
  assert.equal(change.at, Date.UTC(2027, 2, 14, 7));
  assert.equal(change.shift, 60);
  assert.equal(change.offsetBefore, -300);
  assert.equal(change.offsetAfter, -240);
  assert.deepEqual(change.from, { date: "2027-03-14", minutes: 120 });
  assert.deepEqual(change.to, { date: "2027-03-14", minutes: 180 });
});

test("reads a southern-hemisphere change dated the next local day", () => {
  const change = changeFromApi(SYDNEY.dst_start);

  assert.ok(change);
  assert.equal(change.offsetBefore, 600);
  assert.equal(change.from.date, "2026-10-04");
});

test("reads half-hour shifts", () => {
  const change = changeFromApi(LORD_HOWE_END);

  assert.ok(change);
  assert.equal(change.shift, -30);
  assert.equal(change.offsetBefore, 660);
  assert.equal(sleepEffect(change), "You gain an extra half hour");
});

test("agrees with the time zone database", () => {
  const api = changeFromApi(NEW_YORK.dst_end);
  const [local] = changesBetween("America/New_York", Date.UTC(2027, 10, 1), Date.UTC(2027, 10, 30));

  assert.deepEqual(api, local);
});

test("refuses empty and inconsistent transitions", () => {
  assert.equal(changeFromApi({}), null);
  assert.equal(changeFromApi(null), null);
  assert.equal(changeFromApi({ ...NEW_YORK.dst_start, date_time_after: "2027-03-14 TIME 04:00" }), null);
});

test("picks the next and last change", () => {
  const ny = pickChanges([changeFromApi(NEW_YORK.dst_start), changeFromApi(NEW_YORK.dst_end)], NOW);

  assert.equal(ny.next?.from.date, "2027-03-14");
  assert.equal(ny.last, null);

  const sydney = pickChanges([changeFromApi(SYDNEY.dst_start), changeFromApi(SYDNEY.dst_end)], NOW);

  assert.equal(sydney.next?.from.date, "2027-04-04");
  assert.equal(sydney.last?.from.date, "2026-10-04");
});

test("says how far off a change is", () => {
  assert.equal(whenFromToday("2026-11-02", "2026-11-02"), "today");
  assert.equal(whenFromToday("2026-11-02", "2026-11-03"), "tomorrow");
  assert.equal(whenFromToday("2026-11-02", "2026-11-01"), "yesterday");
  assert.equal(whenFromToday("2026-11-02", "2026-10-30"), "3 days ago");
  assert.equal(whenFromToday("2026-11-02", "2026-11-06"), "in 4 days");
  assert.equal(whenFromToday("2026-11-02", "2026-11-16"), "in 2 weeks");
  assert.equal(whenFromToday("2026-11-02", "2026-11-19"), "in 2 weeks and 3 days");
  assert.equal(whenFromToday("2026-11-02", "2027-03-14"), "in 132 days");
});

test("says whether you gain or lose sleep", () => {
  assert.equal(sleepEffect(changeFromApi(NEW_YORK.dst_start)!), "You lose an hour of sleep");
  assert.equal(sleepEffect(changeFromApi(NEW_YORK.dst_end)!), "You gain an extra hour");
});

test("a job in the spring gap is skipped, one in the autumn overlap runs twice", () => {
  const spring = changeFromApi(NEW_YORK.dst_start)!;
  const autumn = changeFromApi(NEW_YORK.dst_end)!;

  assert.equal(jobOnChange(150, spring).kind, "skipped");
  assert.equal(jobOnChange(120, spring).kind, "skipped");
  assert.equal(jobOnChange(180, spring).kind, "normal");
  assert.equal(jobOnChange(119, spring).kind, "normal");
  assert.equal(jobOnChange(90, autumn).kind, "twice");
  assert.equal(jobOnChange(60, autumn).kind, "twice");
  assert.equal(jobOnChange(120, autumn).kind, "normal");
  assert.equal(jobOnChange(59, autumn).kind, "normal");
});

test("a change at midnight repeats the previous evening", () => {
  // Chile goes back from Sunday 00:00 to Saturday 23:00.
  const [santiago] = changesBetween("America/Santiago", Date.UTC(2027, 3, 1), Date.UTC(2027, 3, 10));

  assert.equal(santiago.from.date, "2027-04-04");
  assert.equal(santiago.to.date, "2027-04-03");
  assert.deepEqual(jobOnChange(23 * 60 + 30, santiago), { kind: "twice", date: "2027-04-03" });
  assert.equal(jobOnChange(30, santiago).kind, "normal");
});
