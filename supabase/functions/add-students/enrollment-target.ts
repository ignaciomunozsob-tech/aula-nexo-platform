export function enrollmentTarget(productType: "course" | "ebook" | "event") {
  if (productType === "ebook") return { table: "ebook_enrollments", column: "ebook_id" };
  if (productType === "event") return { table: "event_registrations", column: "event_id" };
  return { table: "enrollments", column: "course_id" };
}