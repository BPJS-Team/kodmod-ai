// Start api-fixture.mjs and Next.js on port 3110 with API_ORIGIN=http://127.0.0.1:8109.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
const origin = 'http://127.0.0.1:3110';
before(async () => {
  const response = await fetch('http://127.0.0.1:8109/auth/me', { headers: { Authorization: 'Bearer fixture-test-admin' } });
  assert.equal((await response.json()).username, 'admin.test', 'This suite requires the isolated fixture.');
});
const request = (path, token) => fetch(origin + path, { redirect: 'manual', headers: token ? { Cookie: `kodmod_session=${token}` } : {} });
for (const path of ['/admin', '/admin/pengguna', '/admin/undangan', '/admin/pengguna/baru']) {
  test(`anonymous user cannot read ${path}`, async () => {
    const response = await request(path);
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), '/masuk');
  });
}
test('invalid session returns to login', async () => {
  const response = await request('/admin', 'invalid-session');
  assert.equal(response.headers.get('location'), '/masuk');
});
test('student cannot read admin user directory', async () => {
  const response = await request('/admin/pengguna', 'fixture-test-student');
  assert.equal(response.headers.get('location'), '/siswa');
});
test('teacher cannot read admin invitations', async () => {
  const response = await request('/admin/undangan', 'fixture-test-teacher');
  assert.equal(response.headers.get('location'), '/guru');
});
test('admin data renders without exposing the access token', async () => {
  const response = await request('/admin/pengguna', 'fixture-test-admin');
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes('admin.test'));
  assert.ok(!html.includes('fixture-test-admin'));
  // next dev intentionally emits no-cache,must-revalidate; production uses private/no-store.
  assert.match(response.headers.get('cache-control'), /no-store|private|no-cache/);
});
