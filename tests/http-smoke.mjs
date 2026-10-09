import assert from "node:assert/strict";
import { createPrismaClient } from "../prisma/client.js";
import bcrypt from "bcryptjs";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error("HTTP smoke tests require a separate TEST_DATABASE_URL ending in _test");
}
const base = process.env.SMOKE_BASE_URL || "http://localhost:3001";
const prisma = createPrismaClient(databaseUrl);
const prefix = `smoke-${crypto.randomUUID()}`;
const password = `test-password-${crypto.randomUUID()}`;
const users = [];
const content = {};

function client() {
  const jar = new Map();
  return async (path, options = {}) => {
    const response = await fetch(`${base}${path}`, {
      ...options, redirect: "manual", headers: { cookie: [...jar].map(([key, value]) => `${key}=${value}`).join("; "), ...options.headers },
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";", 1)[0];
      const separator = pair.indexOf("=");
      jar.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    return response;
  };
}

async function signIn(request, email, suppliedPassword = password) {
  const csrf = await (await request("/api/auth/csrf")).json();
  return request("/api/auth/callback/credentials", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email, password: suppliedPassword, csrfToken: csrf.csrfToken, json: "true" }),
  });
}

try {
  const hash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({ data: { email: `${prefix}-admin@test.local`, name: "Smoke Admin", role: "ADMIN", passwordHash: hash } });
  users.push(admin.id);
  const player = await prisma.user.create({ data: { email: `${prefix}-player@test.local`, name: "Smoke Player", role: "PLAYER", passwordHash: hash } });
  users.push(player.id);
  const archetype = await prisma.archetype.create({ data: { name: prefix, mainAttribute: "logic", mainSkill: "learning" } });
  content.archetype = archetype.id;
  const character = await prisma.character.create({ data: {
    userId: player.id, archetypeId: archetype.id, name: prefix, ageGroup: "YOUNG", motivation: "Truth", trauma: "Sight",
    darkSecret: `${prefix}-private-secret`, notes: `${prefix}-private-notes`,
  } });
  const party = await prisma.party.create({ data: {
    name: prefix, gmId: admin.id, notes: '<p onclick="evil()">Safe shared notes<script>evil()</script></p>',
    members: { create: { characterId: character.id } },
    headquarters: { create: {
      name: prefix, history: "Test", threats: [{ description: `${prefix}-private-threat` }],
      castleThreats: { create: { title: `${prefix}-private-threat`, description: 'Hidden castle countdown', countdown: ['Private stage'] } },
      castleUpgrades: { create: { key: 'recruit', name: 'Recruit', category: 'personnel', personName: 'Shared recruit', personDescription: 'A new Society member', motivation: `${prefix}-recruit-motivation`, darkSecret: `${prefix}-recruit-secret`, relationships: 'Trusted by the party' } },
      discoveries: { create: { key: 'occult-archive', hint: `${prefix}-shared-discovery` } },
    } },
    mysteries: { create: [
      { title: `${prefix}-private-mystery`, summary: "Private", status: "PREP" },
      { title: `${prefix}-published-mystery`, summary: "Shared", status: "ACTIVE", isPublished: true,
        clues: { create: [{ content: `${prefix}-private-clue` }, { content: `${prefix}-revealed-clue`, isRevealed: true }] } },
    ] },
  } });
  const anonymous = client();
  for (const route of ["/", "/characters", "/parties", "/compendium", "/admin"]) {
    const response = await anonymous(route);
    const location = new URL(response.headers.get("location") || "", base);
    assert.equal(location.origin, new URL(process.env.NEXTAUTH_URL || base).origin, `Wrong public redirect origin for ${route}`);
    assert.equal(location.pathname, "/login");
    assert.equal(location.searchParams.get("callbackUrl"), route);
  }
  assert.equal((await signIn(anonymous, player.email, "wrong-password")).status, 401);

  const playerRequest = client();
  assert.equal((await signIn(playerRequest, player.email.toUpperCase())).status, 200);
  const signedInLogin = await playerRequest("/login");
  const loginLocation = signedInLogin.headers.get("location");
  if (loginLocation) {
    const destination = new URL(loginLocation, base);
    assert.equal(destination.origin, new URL(process.env.NEXTAUTH_URL || base).origin);
    assert.equal(destination.pathname, "/");
  } else {
    // Next.js can stream a page before redirecting via a relative refresh tag.
    assert.equal(signedInLogin.status, 200);
    assert.match(await signedInLogin.text(), /<meta[^>]+http-equiv="refresh"[^>]+content="\d+;url=\/"/);
  }
  const management = await (await playerRequest(`/parties/${party.id}/management`)).text();
  assert.ok(management.includes(prefix));
  for (const secret of ["passwordHash", hash, `${prefix}-private-secret`, `${prefix}-private-notes`]) assert.ok(!management.includes(secret), `Management leaked ${secret}`);
  const home = await (await playerRequest("/")).text();
  assert.ok(!home.includes(`${prefix}-private-mystery`));
  const mysteries = await (await playerRequest(`/parties/${party.id}/mysteries`)).text();
  assert.ok(mysteries.includes(`${prefix}-published-mystery`));
  assert.ok(mysteries.includes(`${prefix}-revealed-clue`));
  assert.ok(!mysteries.includes(`${prefix}-private-mystery`));
  assert.ok(!mysteries.includes(`${prefix}-private-clue`));
  const hq = await (await playerRequest(`/parties/${party.id}/hq`)).text();
  assert.ok(!hq.includes(`${prefix}-private-threat`));
  assert.ok(!hq.includes(`${prefix}-recruit-secret`));
  assert.ok(!hq.includes(`${prefix}-recruit-motivation`));
  assert.ok(!hq.includes('Occult Archive'));
  assert.ok(hq.includes(`${prefix}-shared-discovery`));
  const notes = await (await playerRequest(`/parties/${party.id}/notes`)).text();
  assert.ok(!notes.includes("onclick=\\\"evil()"));
  assert.ok(!notes.includes("Save Notes"));
  assert.ok(!notes.includes("evil()"));
  const compendium = await (await playerRequest("/compendium")).text();
  assert.ok(compendium.includes('"npcs":[]') || compendium.includes('\\"npcs\\":[]'));
  assert.ok(compendium.includes('"vaesen":[]') || compendium.includes('\\"vaesen\\":[]'));
  const deniedAdmin = await playerRequest("/admin/users");
  assert.ok(deniedAdmin.status >= 300 && deniedAdmin.status < 400);
  const deniedSkills = await playerRequest("/admin/skills");
  assert.ok(deniedSkills.status >= 300 && deniedSkills.status < 400);
  assert.equal((await playerRequest("/compendium?tab=skills")).status,200);

  const adminRequest = client();
  assert.equal((await signIn(adminRequest, admin.email)).status, 200);
  const userPage = await (await adminRequest("/admin/users")).text();
  assert.ok(!userPage.includes("passwordHash"));
  assert.ok(!userPage.includes(hash));
  const skillEditor = await adminRequest("/admin/skills?key=medicine");
  assert.equal(skillEditor.status,200);
  assert.ok((await skillEditor.text()).includes('Save Reference'));
  const adminHQ = await (await adminRequest(`/parties/${party.id}/hq`)).text();
  assert.ok(adminHQ.includes(`${prefix}-private-threat`));
  assert.ok(adminHQ.includes(`${prefix}-recruit-secret`));
  assert.ok(adminHQ.includes('Occult Archive'));
  const gmMysteries = await (await adminRequest(`/parties/${party.id}/mysteries`)).text();
  assert.ok(gmMysteries.includes(`${prefix}-private-clue`));
  assert.ok(gmMysteries.includes(`${prefix}-private-mystery`));

  const logoutRequest = client();
  assert.equal((await signIn(logoutRequest, player.email)).status, 200);
  const logoutCsrf = await (await logoutRequest("/api/auth/csrf")).json();
  const logout = await logoutRequest("/api/auth/signout", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken: logoutCsrf.csrfToken, callbackUrl: `${base}/login`, json: "true" }),
  });
  assert.equal(logout.status, 200);
  assert.equal((await logout.json()).url, `${base}/login`);
  assert.ok(!(await (await logoutRequest("/api/auth/session")).json()).user?.id);
  const signedOutHome = await logoutRequest("/");
  const signedOutTarget = new URL(signedOutHome.headers.get("location") || "", base);
  assert.equal(signedOutTarget.origin, new URL(process.env.NEXTAUTH_URL || base).origin);
  assert.equal(signedOutTarget.pathname, "/login");

  await prisma.user.update({ where: { id: player.id }, data: { sessionVersion: { increment: 1 } } });
  const revoked = await (await playerRequest("/api/auth/session")).json();
  assert.ok(!revoked.user?.id);
  await prisma.user.update({ where: { id: admin.id }, data: { role: "PLAYER", sessionVersion: { increment: 1 } } });
  const demoted = await (await adminRequest("/api/auth/session")).json();
  assert.ok(!demoted.user?.id);
  console.log("HTTP smoke checks passed: login redirects, logout, invalid credentials, role gates, data redaction, note sanitization, and session revocation.");
} finally {
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  if (content.archetype) await prisma.archetype.delete({ where: { id: content.archetype } });
  await prisma.$disconnect();
}
