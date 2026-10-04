// Local UI contract fixture only. Never import this file into the application.
// Run: node apps/web/tests/api-fixture.mjs
import { createServer } from "node:http";
import { createLearningFixture } from "./learning-fixture.mjs";
const quizFailureQueue = [];
const quizRequests = [];
const learning = createLearningFixture({ quizFailureQueue, quizRequests });
const users = [
  {
    id: "test-admin",
    username: "admin.test",
    full_name: "Administrator Uji",
    role: "admin",
    is_active: true,
  },
  {
    id: "test-teacher",
    username: "guru.test",
    full_name: "Ratna Dewi",
    role: "teacher",
    is_active: true,
  },
  {
    id: "test-student",
    username: "siswa.test",
    full_name: "Ahmad Ramadhan",
    role: "student",
    is_active: true,
  },
].map((u) => ({
  ...u,
  created_at: "2026-09-15T00:00:00Z",
  last_login_at: null,
}));
const invites = [];
let serial = 1;
const server = createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  const send = (status, body) => {
    res.writeHead(status);
    res.end(body === undefined ? undefined : JSON.stringify(body));
  };
  const url = new URL(req.url, "http://127.0.0.1:8109");
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  let body = {};
  try {
    if (req.headers["content-type"]?.startsWith("multipart/form-data")) {
      const data = await new Request("http://fixture", { method: "POST", headers: { "Content-Type": req.headers["content-type"] }, body: Buffer.concat(chunks) }).formData();
      const file = data.get("file");
      body = { file: file instanceof File ? { name: file.name, size: file.size, content: /\.(txt|md)$/i.test(file.name) ? await file.text() : "" } : null };
    } else body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
  } catch {
    return send(400, {});
  }
  // Browser acceptance controls exist only in this disposable loopback fixture.
  if (url.pathname === "/__fixture/quiz") {
    if (req.method === "POST") {
      quizFailureQueue.splice(0, quizFailureQueue.length, ...(body.failures || []));
      quizRequests.splice(0);
    }
    return send(200, { requests: quizRequests, failures: quizFailureQueue });
  }
  if (url.pathname === "/auth/login") {
    const user = users.find((u) => u.username === body.username);
    if (!user || body.password !== "fixture-only-123") return send(401, {});
    if (!user.is_active) return send(403, {});
    return send(200, {
      access_token: `fixture-${user.id}`,
      expires_in: 3600,
      user,
    });
  }
  if (url.pathname === "/auth/register") {
    const invite = invites.find(
      (i) =>
        i.code === body.invitation_code &&
        i.used_count < i.max_uses &&
        new Date(i.expires_at) > new Date(),
    );
    if (!invite) return send(400, {});
    if (!["student", "teacher"].includes(body.role)) return send(422, {});
    if (users.some((u) => u.username === body.username)) return send(409, {});
    const item = {
      id: `test-${serial++}`,
      username: body.username,
      full_name: body.full_name,
      role: body.role,
      is_active: true,
      created_at: new Date().toISOString(),
      last_login_at: null,
    };
    users.push(item);
    invite.used_count++;
    return send(201, {
      access_token: `fixture-${item.id}`,
      expires_in: 3600,
      user: item,
    });
  }
  const user = users.find(
    (u) => `Bearer fixture-${u.id}` === req.headers.authorization,
  );
  if (!user?.is_active) return send(401, {});
  if (url.pathname === "/auth/me") return send(200, user);
  if (learning(req, url, body, user, send)) return;
  if (user.role !== "admin") return send(403, {});
  if (url.pathname === "/admin/users" && req.method === "GET") {
    return send(
      200,
      users
        .filter(
          (u) =>
            (!url.searchParams.get("role") ||
              u.role === url.searchParams.get("role")) &&
            `${u.full_name} ${u.username}`
              .toLowerCase()
              .includes((url.searchParams.get("q") || "").toLowerCase()),
        )
        .toReversed(),
    );
  }
  if (url.pathname === "/admin/users" && req.method === "POST") {
    if (users.some((u) => u.username === body.username)) return send(409, {});
    const item = {
      id: `test-${serial++}`,
      username: body.username,
      full_name: body.full_name,
      role: body.role,
      is_active: true,
      created_at: new Date().toISOString(),
      last_login_at: null,
    };
    users.push(item);
    return send(201, item);
  }
  if (url.pathname.startsWith("/admin/users/") && req.method === "PATCH") {
    const item = users.find((u) => u.id === url.pathname.split("/").at(-1));
    if (!item) return send(404, {});
    if (
      item.id === user.id &&
      (body.is_active === false || (body.role && body.role !== "admin"))
    )
      return send(400, {});
    Object.assign(item, body);
    return send(200, item);
  }
  if (url.pathname === "/admin/invitations" && req.method === "GET")
    return send(200, invites);
  if (url.pathname === "/admin/invitations" && req.method === "POST") {
    const item = {
      id: `invite-${serial++}`,
      code: `TEST-${serial}`,
      label: body.label,
      max_uses: body.max_uses,
      used_count: 0,
      is_active: true,
      expires_at: new Date(
        Date.now() + body.expires_in_days * 86400000,
      ).toISOString(),
      created_at: new Date().toISOString(),
    };
    invites.unshift(item);
    return send(201, item);
  }
  if (
    url.pathname.startsWith("/admin/invitations/") &&
    req.method === "DELETE"
  ) {
    const index = invites.findIndex(
      (i) => i.id === url.pathname.split("/").at(-1),
    );
    if (index < 0) return send(404, {});
    invites.splice(index, 1);
    return send(204);
  }
  send(404, {});
});
const fixturePort = Number(process.env.FIXTURE_PORT || 8109);
server.listen(fixturePort, "127.0.0.1", () =>
  console.log(`Test-only fixture: http://127.0.0.1:${fixturePort}`),
);
