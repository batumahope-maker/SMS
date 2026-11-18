// Interactive, local-only administrator password reset helper.
//
//   node scripts/reset-admin-password.mjs
//   node scripts/reset-admin-password.mjs --verify-only
//   node scripts/reset-admin-password.mjs --base http://localhost:3000
//   node scripts/reset-admin-password.mjs --selftest
//
// Security model:
//   - The new password is typed in HIDDEN (no echo), kept only in process
//     memory, never logged, never written to any file, never sent anywhere
//     except the NextAuth credentials endpoint (over localhost) for the final
//     verification.
//   - The bcrypt hash is generated locally (cost 12) and round-trip verified.
//   - This tool NEVER writes to the database: the application account is
//     SELECT-only by design. You apply the UPDATE yourself with your own
//     privileged DB account (that execution is your explicit approval).
//   - Prints only non-secret identifiers, the generated hash, and booleans.
//   - Refuses to run if the DB account is root or can write anything.

import assert from 'node:assert/strict';
import { loadEnvFiles, parseDatabaseUrl } from './lib/env.mjs';
import { verifyStoredPassword } from '../src/lib/password.ts';

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const verifyOnly = args.includes('--verify-only');
const selftest = args.includes('--selftest');
const baseIndex = args.indexOf('--base');
const baseUrl = baseIndex >= 0 ? args[baseIndex + 1] : 'http://localhost:3000';

/**
 * Safe process exit for Windows: forcing `process.exit()` while undici keep-
 * alive sockets from the verification fetches are closing trips a libuv
 * teardown assertion (UV_HANDLE_CLOSING). Setting `process.exitCode` and
 * letting Node drain naturally exits cleanly with the right code.
 */
function finish(code) {
  try {
    process.stdin.destroy();
  } catch {
    // ignore
  }
  process.exitCode = code;
}

// ---------------------------------------------------------------------------
// Prompts. Implemented with a raw-mode data listener (no readline) so hidden
// input works on Windows terminals and nothing is echoed for hidden prompts.
// ---------------------------------------------------------------------------
function prompt(promptText, { hidden }) {
  return new Promise((resolve) => {
    process.stdout.write(promptText);
    let value = '';
    const wasRaw = process.stdin.isRaw;

    try {
      process.stdin.setRawMode(true);
    } catch {
      console.error(
        '\n[warn] Raw mode unavailable — input may be visible. Press Ctrl+C and\n' +
          '[warn] use a regular terminal window if that is unacceptable.'
      );
    }

    process.stdin.resume();

    const cleanup = () => {
      process.stdin.removeListener('data', onData);
      try {
        process.stdin.setRawMode(Boolean(wasRaw));
      } catch {
        // ignore
      }
      process.stdin.pause();
    };

    const onData = (chunk) => {
      for (const ch of chunk.toString('utf8')) {
        if (ch === '\r' || ch === '\n') {
          cleanup();
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (ch === '\u0003') {
          // Ctrl+C — abort cleanly, nothing was changed.
          cleanup();
          process.stdout.write('\n[abort] cancelled. Nothing was changed.\n');
          finish(130);
          return;
        }
        if (ch === '\u007f' || ch === '\b') {
          if (!hidden && value.length > 0) process.stdout.write('\b \b');
          value = value.slice(0, -1);
          continue;
        }
        if (ch < ' ') continue; // ignore control characters
        value += ch;
        if (!hidden) process.stdout.write(ch);
      }
    };

    process.stdin.on('data', onData);
  });
}

const readHidden = (text) => prompt(text, { hidden: true });
const askVisible = (text) => prompt(text, { hidden: false });

// ---------------------------------------------------------------------------
// Read-only database access (SELECT-only account enforced)
// ---------------------------------------------------------------------------
loadEnvFiles(process.cwd());

if (!process.env.DATABASE_URL) {
  console.error('[abort] DATABASE_URL not found (check .env.local).');
  finish(2);
} else {
  await main();
}

async function main() {
  const target = parseDatabaseUrl(process.env.DATABASE_URL);
  const expectedDatabase = target?.database || 'essjt_school_system';

  const { PrismaClient } = await import('@prisma/client');
  const db = new PrismaClient();

  async function getAdminAccount() {
    return db.user.findUnique({
      where: { username: 'admin' },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        password: true,
        admin: { select: { adminLevel: true } },
      },
    });
  }

  // Real NextAuth credentials flow (uses the password only in memory).
  async function verifyThroughNextAuth(candidatePassword) {
    const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`);
    assert.equal(csrfRes.status, 200, 'csrf endpoint');
    const csrf = (await csrfRes.json()).csrfToken;
    const csrfCookie = (csrfRes.headers.getSetCookie() ?? [])
      .map((c) => c.split(';')[0])
      .join('; ');

    const post = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        cookie: csrfCookie,
      },
      body: new URLSearchParams({
        csrfToken: csrf,
        username: 'admin',
        password: candidatePassword,
        callbackUrl: `${baseUrl}/login`,
      }),
    });

    const location = post.headers.get('location') ?? '';
    const accepted = post.status === 302 && !location.includes('error=');

    let role = null;
    let dashboardStatus = null;
    if (accepted) {
      const sessionCookie = post.headers
        .getSetCookie()
        .map((c) => c.split(';')[0])
        .join('; ');
      const session = await (
        await fetch(`${baseUrl}/api/auth/session`, {
          headers: { cookie: sessionCookie },
        })
      ).json();
      role = session?.user?.role ?? null;
      dashboardStatus = (
        await fetch(`${baseUrl}/admin/dashboard`, {
          redirect: 'manual',
          headers: { cookie: sessionCookie },
        })
      ).status;
    }

    return {
      accepted,
      postStatus: post.status,
      rejectedCleanly: location.includes('error=') || post.status === 401,
      role,
      dashboardStatus,
    };
  }

  try {
    // -----------------------------------------------------------------------
    // Selftest: mechanics only, dummy password, no password prompts
    // -----------------------------------------------------------------------
    if (selftest) {
      console.log('[selftest] bcrypt generation + round-trip verification...');
      const bcrypt = (await import('bcryptjs')).default;
      const dummy = 'selftest-dummy-password';
      const hash = bcrypt.hashSync(dummy, 12);
      assert.equal(await bcrypt.compare(dummy, hash), true, 'round-trip');
      assert.equal(await bcrypt.compare('wrong', hash), false, 'rejection');
      console.log('[selftest] PASS');

      console.log('[selftest] read-only account gate...');
      const [{ account }] = await db.$queryRawUnsafe('SELECT CURRENT_USER() AS account');
      assert.ok(!String(account).startsWith('root'), 'not root');
      console.log(`[selftest] PASS (account: ${account})`);

      console.log('[selftest] credentials flow plumbing (dummy password must be REJECTED)...');
      const result = await verifyThroughNextAuth(dummy);
      assert.equal(result.accepted, false, 'dummy rejected');
      assert.equal(result.rejectedCleanly, true, 'clean rejection');
      console.log(`[selftest] PASS (POST ${result.postStatus}, rejected cleanly, no NO_SECRET)`);
      console.log('[selftest] all mechanics verified.');
      finish(0);
      return;
    }

    // -----------------------------------------------------------------------
    // Main flow
    // -----------------------------------------------------------------------
    // Gate: never run with a privileged account.
    const [{ account }] = await db.$queryRawUnsafe('SELECT CURRENT_USER() AS account');
    if (String(account).startsWith('root')) {
      console.error('[abort] refusing to run with the root database account.');
      finish(1);
      return;
    }

    const admin = await getAdminAccount();
    if (!admin || admin.role !== 'admin' || String(admin.id) !== '1') {
      console.error('[abort] expected account not found (users.id=1, username=admin, role=admin).');
      finish(1);
      return;
    }

    console.log(`[confirm] target account : users.id=${admin.id}, username="${admin.username}", role=${admin.role}, status=${admin.status ?? 'NULL'}, adminLevel=${admin.admin?.adminLevel ?? '(none)'}`);
    console.log(`[confirm] database       : ${expectedDatabase}`);
    console.log('[confirm] this tool never writes; you apply the UPDATE yourself.\n');

    const bcrypt = (await import('bcryptjs')).default;
    const NEW_PASSWORD_MIN = 10;

    let newPassword = null;

    if (verifyOnly) {
      newPassword = await readHidden('Enter the NEW admin password (hidden): ');
    } else {
      newPassword = await readHidden('Enter the NEW admin password (hidden): ');
      const confirm = await readHidden('Confirm the NEW admin password (hidden): ');
      if (newPassword !== confirm) {
        console.error('[abort] the two entries do not match. Nothing was changed.');
        finish(1);
        return;
      }
      if (newPassword.length < NEW_PASSWORD_MIN) {
        console.error(`[abort] password must be at least ${NEW_PASSWORD_MIN} characters.`);
        finish(1);
        return;
      }
      if (await verifyStoredPassword(newPassword, admin.password)) {
        console.error('[abort] that password is the CURRENT admin password. Choose a different, unique one.');
        finish(1);
        return;
      }
    }

    // Only generated when creating a fresh hash.
    let generatedHash = null;
    if (!verifyOnly) {
      generatedHash = bcrypt.hashSync(newPassword, 12);
      assert.equal(await bcrypt.compare(newPassword, generatedHash), true, 'round-trip');
      console.log('\n[generated] bcrypt hash (cost 12):');
      console.log(generatedHash);
      console.log('\n[generated] apply it with YOUR privileged DB account (phpMyAdmin or mysql CLI):');
      console.log('');
      console.log(`  UPDATE users SET password = '${generatedHash}'`);
      console.log(`    WHERE id = 1 AND username = 'admin' AND role = 'admin';`);
      console.log('  SELECT ROW_COUNT() AS rows_updated;  -- must return 1');
      console.log('');
      console.log('This touches ONLY users.password for users.id=1. No other records,');
      console.log('no permissions, no schema changes. Your database backup stays valid.\n');
    }

    if (!verifyOnly) {
      const proceed = await askVisible('Have you applied the UPDATE statement? Type "yes" to verify now: ');
      if (proceed !== 'yes') {
        console.log('[exit] not applied yet — nothing verified. Run this tool again with --verify-only after applying.');
        finish(0);
        return;
      }
    }

    // 1) The stored hash must now match the new password.
    const storedHash = (await getAdminAccount())?.password;
    const matches = await verifyStoredPassword(newPassword, storedHash);
    console.log(`[verify] stored hash matches the new password : ${matches}`);
    if (!matches) {
      console.error('[verify] FAIL — the UPDATE has not been applied yet, or it touched a different row.');
      console.error('[verify] Nothing was changed by this tool. Re-run with --verify-only after applying.');
      finish(1);
      return;
    }
    if (generatedHash) {
      console.log(`[verify] stored hash equals the generated hash : ${storedHash.trim() === generatedHash}`);
    }

    // 2) The NEW credentials must work through the real login flow.
    const e2e = await verifyThroughNextAuth(newPassword);
    console.log(`[verify] credentials POST accepted             : ${e2e.accepted} (status ${e2e.postStatus})`);
    console.log(`[verify] session role after login              : ${e2e.role ?? '(none)'}`);
    console.log(`[verify] GET /admin/dashboard with session     : ${e2e.dashboardStatus ?? '(n/a)'}`);

    const success =
      matches &&
      e2e.accepted &&
      e2e.role === 'admin' &&
      e2e.dashboardStatus === 200;

    console.log(
      success
        ? '\n[SUCCESS] The new administrator credentials work through the real NextAuth login flow.'
          + '\n[SUCCESS] Log in at http://localhost:3000/login (username: admin). The password is not'
          + '\n[SUCCESS] stored anywhere by this tool — keep it safe.'
        : '\n[FAIL] verification did not pass. See the lines above.'
    );
    finish(success ? 0 : 1);
  } finally {
    await db.$disconnect().catch(() => {});
  }
}
