import { test } from "node:test";
import assert from "node:assert/strict";
import * as materialFlow from "../src/lib/material-flow.mjs";
import { chatMessagePayload, materialTutorStatus, validateMaterialFile, parseMaterialPageRange } from "../src/lib/material-flow.mjs";

const classId = "10000000-0000-4000-8000-000000000001";
const materialId = "20000000-0000-4000-8000-000000000001";
test("chat payload forwards scoped context and drops untrusted fields", () => {
  assert.deepEqual(chatMessagePayload({ text: "  Jelaskan pecahan  ", class_id: classId, material_id: materialId, role: "admin", student_id: "other" }), { text: "Jelaskan pecahan", class_id: classId, material_id: materialId });
});
test("material readiness offers recovery for migrated or stopped jobs and hides draft indexing", () => {
  assert.equal(materialTutorStatus({ published: true, rag_status: "pending", indexed_version: 0, content_version: 1, n_chunks: 0 }).actionLabel, "Siapkan untuk Tutor");
  assert.equal(materialTutorStatus({ published: true, rag_status: "processing" }).actionLabel, "Siapkan ulang jika terhenti");
  assert.equal(materialTutorStatus({ published: false, rag_status: "pending" }).actionLabel, null);
  assert.equal(materialTutorStatus({ published: true, rag_status: "ready", indexed_version: 1, content_version: 1, n_chunks: 2 }).actionLabel, null);
  assert.equal(materialTutorStatus({ published: true, rag_status: "ready", indexed_version: 1, content_version: 2, n_chunks: 2 }).actionLabel, "Siapkan untuk Tutor");
});
test("chat payload rejects incomplete and malformed material context", () => {
  assert.throws(() => chatMessagePayload({ text: "Halo", material_id: materialId }), /kelas dan materi/i);
  assert.throws(() => chatMessagePayload({ text: "Halo", class_id: "../other", material_id: materialId }), /tidak valid/i);
  assert.throws(() => chatMessagePayload({ text: "   " }), /1 sampai 4.000/);
});
test("material import accepts supported documents and rejects empty or oversized files", () => {
  for (const name of ["Materi.PDF", "materi.docx", "materi.md", "materi.txt"]) assert.equal(validateMaterialFile({ name, size: 1024 }), null);
  assert.match(validateMaterialFile({ name: "macro.docm", size: 1024 }), /PDF, DOCX, Markdown, atau TXT/);
  assert.match(validateMaterialFile({ name: "materi.pdf", size: 25 * 1024 * 1024 + 1 }), /25 MB/);
  assert.match(validateMaterialFile({ name: "materi.pdf", size: 0 }), /kosong/);
});

test("book selections forward a bounded integer range and reject partial or malformed fields", () => {
  assert.equal(parseMaterialPageRange(null, null), null);
  assert.deepEqual(parseMaterialPageRange("12", "23"), { first: 12, last: 23 });
  for (const [first, last] of [[null, "23"], ["1", null], ["0", "3"], ["3", "1"],
    ["1", "151"], ["500", "501"], ["1e2", "120"], [new Blob(["2"]), "3"]])
    assert.throws(() => parseMaterialPageRange(first, last));
});

test("an imported source keeps its target class fixed until the import is discarded", () => {
  assert.equal(materialFlow.canChangeMaterialTarget?.({ importing: false, hasBook: false, sourceImportId: "import-1" }), false);
  assert.equal(materialFlow.canChangeMaterialTarget?.({ importing: false, hasBook: true, sourceImportId: "" }), false);
  assert.equal(materialFlow.canChangeMaterialTarget?.({ importing: true, hasBook: false, sourceImportId: "" }), false);
  assert.equal(materialFlow.canChangeMaterialTarget?.({ importing: false, hasBook: false, sourceImportId: "" }), true);
});
