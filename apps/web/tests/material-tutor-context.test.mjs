import { test } from "node:test";
import assert from "node:assert/strict";
import { createLearningFixture } from "./learning-fixture.mjs";

const classId = "10000000-0000-4000-8000-000000000001";
const materialId = "20000000-0000-4000-8000-000000000001";
function client() {
  const fixture = createLearningFixture();
  return (path, method = "GET", body = {}, user = { id: "test-student", role: "student" }) => {
    let response;
    fixture({ method }, new URL(path, "http://fixture"), body, user, (status, data) => { response = { status, data }; });
    return response;
  };
}

test("material tutoring keeps context and citations when history is reopened", () => {
  const request = client();
  const sent = request("/chat/message", "POST", { text: "Jelaskan pecahan", class_id: classId, material_id: materialId });
  assert.equal(sent.status, 200);
  assert.equal(sent.data.context?.material_id, materialId);
  assert.equal(sent.data.sources[0]?.class_id, classId);
  const detail = request(`/chat/sessions/${sent.data.session_id}`);
  assert.equal(detail.data.context?.material_title, "Memahami pecahan dalam keseharian");
  assert.equal(detail.data.turns[1].sources[0]?.material_id, materialId);
});

test("existing material sessions reject switching documents", () => {
  const request = client();
  const sent = request("/chat/message", "POST", { text: "Jelaskan pecahan", class_id: classId, material_id: materialId });
  const switched = request("/chat/message", "POST", { text: "Jelaskan bilangan bulat", session_id: sent.data.session_id, class_id: classId, material_id: "20000000-0000-4000-8000-000000000002" });
  assert.equal(switched.status, 409);
});

test("outsiders cannot start tutoring with another class material", () => {
  const request = client();
  assert.equal(request("/chat/message", "POST", { text: "Jelaskan pecahan", class_id: classId, material_id: materialId }, { id: "outsider", role: "student" }).status, 404);
});

test("a migrated published material can be indexed without editing its content", () => {
  const fixture = createLearningFixture({ legacyPending: true });
  const teacher = { id: "test-teacher", role: "teacher" };
  const path = `/classes/${classId}/materials/${materialId}`;
  const request = (method, suffix = "") => {
    let response;
    fixture({ method }, new URL(path + suffix, "http://fixture"), {}, teacher, (status, data) => { response = { status, data }; });
    return response;
  };
  const before = request("GET");
  assert.equal(before.data.rag_status, "pending");
  assert.equal(request("POST", "/index").status, 202);
  const after = request("GET");
  assert.equal(after.data.rag_status, "ready");
  assert.equal(after.data.indexed_version, after.data.content_version);
  assert.equal(after.data.content, before.data.content);
});
