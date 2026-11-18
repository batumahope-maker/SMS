// TEMP checker (check 3 staging-internal half): compares every DEPLOYED staging
// routine (information_schema.ROUTINES) against the setup-script template body.
// Read-only. Run from scripts/staging so @prisma/client resolves, then delete.
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

const SETUP = './setup-staging-transport-library.mjs';
const STAGING_DB = 'essjt_school_system_staging';
const setupSrc = readFileSync(new URL(SETUP, import.meta.url), 'utf8');

const out = {};
let m;
const re = /(?:const\s+(\w+)|(\w+)\.(\w+))\s*=\s*`([\s\S]*?)`[;,]/gm;
while ((m = re.exec(setupSrc)) !== null) {
  const n = m[1] || m[3];
  if (out[n] !== undefined) continue;
  out[n] = m[4];
}
const re2 = /(?:^|\n)\s{2}(\w+):\s*`([\s\S]*?)`[,}]/g;
while ((m = re2.exec(setupSrc)) !== null) out[m[1]] = m[2];
const subst = (t) => t
  .replace(/\$\{STAGING_DB\}/g, STAGING_DB)
  .replace(/\$\{HANDLER\}/g, out.HANDLER || '')
  .replace(/\$\{PAYMENT_HANDLER\}/g, out.PAYMENT_HANDLER || '')
  .replace(/\$\{ASSIGN_HANDLER\}/g, out.ASSIGN_HANDLER || '');
const procNames = Object.keys(out).filter((k) => /^sp_/.test(k) && out[k].trim().startsWith('CREATE DEFINER'));

const norm = (s) => s.replace(/--[^\n]*/g, '').replace(/\s+/g, ' ').trim();
const bodyOf = (tpl) => {
  const i = tpl.search(/\bBEGIN\b/);
  return tpl.slice(i);
};

const db = new PrismaClient({ datasources: { db: { url: 'mysql://root@127.0.0.1:3306/' } } });
let fails = 0;
const check = (name, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails++; };
try {
  const rows = await db.$queryRawUnsafe(
    'SELECT ROUTINE_NAME, ROUTINE_DEFINITION, SECURITY_TYPE, DEFINER, SQL_MODE, DATA_TYPE FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ?', STAGING_DB);
  const deployed = new Map(rows.map((r) => [String(r.ROUTINE_NAME), r]));
  check('all 15 procedures deployed in staging', procNames.every((p) => deployed.has(p)),
    `missing: ${procNames.filter((p) => !deployed.has(p)).join(',') || 'none'}`);
  const mism = [];
  for (const p of procNames) {
    const d = deployed.get(p);
    const a = norm(bodyOf(subst(out[p])));
    const b = norm(String(d.ROUTINE_DEFINITION));
    if (a !== b) mism.push(p);
  }
  check('deployed body == script template body (normalized: comments stripped, whitespace collapsed) for all 15',
    mism.length === 0, mism.join(',') || '15/15 identical');
  const secBad = procNames.filter((p) => String(deployed.get(p).SECURITY_TYPE) !== 'DEFINER' || String(deployed.get(p).DEFINER) !== 'essjt_definer@localhost');
  check('SECURITY_TYPE=DEFINER + DEFINER=essjt_definer@localhost for all 15', secBad.length === 0, secBad.join(',') || 'all');
  const modeBad = procNames.filter((p) => !String(deployed.get(p).SQL_MODE).includes('STRICT_TRANS_TABLES'));
  check('captured sql_mode strict for all 15', modeBad.length === 0, modeBad.join(',') || 'all');
  // lock-order + correction markers on DEPLOYED definitions
  const mark = (p, reM) => { const d = deployed.get(p); return reM.test(norm(String(d.ROUTINE_DEFINITION))); };
  const lockProcs = ['sp_assign_student', 'sp_update_vehicle', 'sp_delete_vehicle', 'sp_update_route', 'sp_delete_route'];
  const lockBad = [];
  for (const p of lockProcs) {
    const d = String(deployed.get(p).ROUTINE_DEFINITION);
    const v = d.search(/FROM\s+vehicles[^\n]*FOR UPDATE/);
    const r = d.search(/FROM\s+transport_routes[^\n]*FOR UPDATE/);
    if (v < 0 || (r >= 0 && r < v)) lockBad.push(p);
  }
  check('deployed lock order vehicle -> route -> assignment (all 5 rewritten routines)', lockBad.length === 0, lockBad.join(',') || 'all 5');
  check('deployed sp_update_route has LEAST/GREATEST dual-lock + destination-load sum',
    mark('sp_update_route', /LEAST\(v_old_vehicle,\s*p_vehicle_id\)/) && mark('sp_update_route', /v_dest_load\s*\+\s*v_route_load\s*>\s*v_capacity/), 'markers present');
  check('deployed sp_assign_student has 1062 -> ALREADY_ASSIGNED handler',
    mark('sp_assign_student', /MYSQL_ERRNO/) && mark('sp_assign_student', /'ALREADY_ASSIGNED'/), 'handler present');
  check('deployed payment procedures have DUPLICATE_PAYMENT 1062 handlers',
    mark('sp_post_transport_fee', /'DUPLICATE_PAYMENT'/) && mark('sp_post_library_fine', /GET DIAGNOSTICS/), 'handlers present');
  check('deployed definitions contain no DDL (DROP/ALTER/CREATE TABLE)',
    procNames.every((p) => !/DROP\b|ALTER\b|CREATE TABLE/i.test(norm(String(deployed.get(p).ROUTINE_DEFINITION)))), 'none');
} finally {
  await db.$disconnect().catch(() => {});
}
console.log(fails === 0 ? '\nCHECK 3 (staging-internal half): ALL PASS' : `\nCHECK 3 (staging-internal half): ${fails} FAIL`);
process.exitCode = fails === 0 ? 0 : 2;
