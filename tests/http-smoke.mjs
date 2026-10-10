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
  const gm = await prisma.user.create({ data: { email: `${prefix}-gm@test.local`, name: "Smoke GM", role: "GM", passwordHash: hash } });
  users.push(gm.id);
  const outsider = await prisma.user.create({ data: { email: `${prefix}-outsider@test.local`, name: "Smoke Outsider", role: "GM", passwordHash: hash } });
  users.push(outsider.id);
  const archetype = await prisma.archetype.create({ data: { name: prefix, mainAttribute: "logic", mainSkill: "learning" } });
  content.archetype = archetype.id;
  const character = await prisma.character.create({ data: {
    userId: player.id, archetypeId: archetype.id, name: prefix, ageGroup: "YOUNG", motivation: "Truth", trauma: "Sight",
    darkSecret: `${prefix}-private-secret`, notes: `${prefix}-private-notes`,
  } });
  await prisma.archetype.update({ where: { id: archetype.id }, data: { archivedAt: new Date(), revision: { increment: 1 } } });
  const party = await prisma.party.create({ data: {
    name: prefix, gmId: gm.id, notes: '<p onclick="evil()">Safe shared notes<script>evil()</script></p>',
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
  for (const route of ["/", "/characters", `/characters/${character.id}`, "/parties", "/compendium", "/admin"]) {
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
  assert.ok(!compendium.includes(archetype.id), "Compendium included an archived archetype");
  const wizard = await (await playerRequest("/characters/create")).text();
  assert.ok(!wizard.includes(archetype.id), "Wizard included an archived archetype");
  const sheet = await playerRequest(`/characters/${character.id}`);
  assert.equal(sheet.status, 200);
  const sheetText = await sheet.text();
  assert.ok(sheetText.includes("Archived template"), "Existing character did not retain its archived template");
  for (const tab of ["play", "equipment", "background", "notes"]) assert.ok(sheetText.includes(`id="sheet-panel-${tab}"`), `Sheet missing ${tab} panel`);
  assert.ok(sheetText.includes('aria-label="Prepared skill check"'));
  assert.ok(sheetText.includes('aria-label="About Learning"'));
  assert.ok(sheetText.includes(`${prefix}-private-notes`));
  const gmRequest = client();
  assert.equal((await signIn(gmRequest, gm.email)).status, 200);
  const gmSheet = await gmRequest(`/characters/${character.id}`);
  assert.equal(gmSheet.status, 200);
  assert.ok((await gmSheet.text()).includes('aria-label="Prepared skill check"'), "Party GM could not view the sheet");
  const outsiderRequest = client();
  assert.equal((await signIn(outsiderRequest, outsider.email)).status, 200);
  const outsiderSheet = await outsiderRequest(`/characters/${character.id}`);
  const deniedSheetText = await outsiderSheet.text();
  assert.ok(!deniedSheetText.includes(`${prefix}-private-notes`));
  assert.ok(!deniedSheetText.includes('id="sheet-panel-play"'), "Unrelated GM received sheet data");
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
  assert.ok((await (await adminRequest(`/characters/${character.id}`)).text()).includes('id="sheet-panel-play"'), "Admin could not view sheet");
  assert.ok(!userPage.includes("passwordHash"));
  assert.ok(!userPage.includes(hash));
  const activeTemplates = await (await adminRequest("/admin/archetypes")).text();
  assert.ok(!activeTemplates.includes(archetype.id));
  const archivedTemplates = await (await adminRequest(`/admin/archetypes?view=archived&q=${prefix}`)).text();
  assert.ok(archivedTemplates.includes(archetype.id));
  assert.ok(archivedTemplates.includes("Restore"));
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

  await prisma.character.update({ where: { id: character.id }, data: { archivedAt: new Date(), archiveVersion: { increment: 1 } } });
  assert.ok(!(await (await playerRequest("/")).text()).includes(character.id), "Home included archived character");
  assert.ok(!(await (await playerRequest("/characters")).text()).includes(character.id), "Active ledger included archived character");
  const archivedCharacters = await (await playerRequest("/characters?view=archived")).text();
  assert.ok(archivedCharacters.includes(character.id));
  assert.ok(archivedCharacters.includes("Restore Character"));
  assert.ok(!archivedCharacters.includes("All Archived (Admin)"));
  const archivedSheet = await (await playerRequest(`/characters/${character.id}`)).text();
  assert.ok(archivedSheet.includes("Archived Character"));
  assert.ok(!archivedSheet.includes("Spend XP"));
  assert.ok((await (await adminRequest("/characters?view=archived&scope=all")).text()).includes(character.id));
  assert.ok(!(await (await adminRequest(`/parties/${party.id}/management`)).text()).includes(character.id), "Active party roster included archived character");
  await prisma.character.update({ where: { id: character.id }, data: { archivedAt: null, archiveVersion: { increment: 1 } } });
  assert.ok((await (await playerRequest("/characters")).text()).includes(character.id));
  assert.ok((await (await playerRequest(`/parties/${party.id}/management`)).text()).includes(character.id));

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
  console.log("HTTP smoke checks passed: auth, role gates, redaction, sheet panels and owner/GM/admin access, archetype filtering, character archive/recovery lists and roster filtering, note sanitization, and session revocation.");
} finally {
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  if (content.archetype) await prisma.archetype.delete({ where: { id: content.archetype } });
  await prisma.$disconnect();
}
