import { test, expect } from "bun:test";
import { enrollmentTarget } from "./enrollment-target";

test("manual ebook registration targets ebook access, not course enrollment or paid orders", () => {
  expect(enrollmentTarget("ebook")).toEqual({ table: "ebook_enrollments", column: "ebook_id" });
});

test("course enrollment keeps course-specific access", () => {
  expect(enrollmentTarget("course")).toEqual({ table: "enrollments", column: "course_id" });
});

test("event registration keeps event-specific access", () => {
  expect(enrollmentTarget("event")).toEqual({ table: "event_registrations", column: "event_id" });
});