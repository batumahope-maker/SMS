# Transport & Library — Full Build Migration Plan

Status: **APPROVED IN PRINCIPLE (2026-11-16) with 7 user amendments — staging build COMPLETE
(64/64 tests PASS on 2026-11-16). Live installation SQL is NOT prepared and requires separate
user approval.**

Target: MariaDB 10.4.32-MariaDB (XAMPP), database `essjt_school_system`.
Companion project: registration/approval/password installation (separately pending).

---

## Phase 0 — Sequencing gate (MANDATORY)

No statement in this plan may run against `essjt_school_system` (live) until the
registration/approval/password installation has been **separately approved and
installed**. Transport/library live work is a second, independent migration with
its own approval chain: fresh backup → preflight → installation → verification.

Staging work (`essjt_school_system_staging`) is authorised and has begun.

---

## Phase 1 — Schema design (live-DB conventions)

Conventions match the authoritative live schema: `int(11)` auto-increment PKs,
snake_case names, `created_at timestamp NOT NULL DEFAULT current_timestamp()`,
`ENGINE=InnoDB`, `CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`, FKs to
`users(id)` (the pattern attendance, marks and payments already use).

### New tables (5)

**`vehicles`**
- `vehicle_number` varchar(20) NOT NULL — UNIQUE
- `vehicle_type` varchar(50) NULL (Bus, Van, …)
- `capacity` int(11) NOT NULL (must be > 0; enforced in procedures)
- `driver_name` varchar(100) NOT NULL
- `driver_phone` varchar(20) NULL

**`transport_routes`**
- `vehicle_id` int(11) NOT NULL — FK → vehicles.id **ON DELETE CASCADE**
- `name` varchar(100) NOT NULL
- `stops` text NULL (JSON array of stop names; display-only)
- `morning_time` time NULL; `evening_time` time NULL
- `fare` decimal(10,2) NULL DEFAULT 0.00

**`transport_assignments`**
- `student_id` int(11) NOT NULL — **UNIQUE** (one route per student) — FK → users(id) ON DELETE CASCADE
- `route_id` int(11) NOT NULL — FK → transport_routes.id **ON DELETE RESTRICT**
- `pickup_point` varchar(100) NULL

**`books`**
- `title` varchar(200) NOT NULL; `author` varchar(200) NULL
- `isbn` varchar(20) NULL — UNIQUE (nullable; multiple NULLs allowed)
- `category` varchar(100) NULL; `publisher` varchar(100) NULL
- `published_year` int(11) NULL
- `quantity` int(11) NOT NULL DEFAULT 0; `available` int(11) NOT NULL DEFAULT 0
- `location` varchar(100) NULL (shelf/section)

**`book_issues`**
- `book_id` int(11) NOT NULL — FK → books.id **ON DELETE RESTRICT** (issue history is never destroyed)
- `student_id` int(11) NOT NULL — FK → users(id) ON DELETE CASCADE
- `issued_at` date NOT NULL; `due_date` date NOT NULL; `returned_at` date NULL
- `fine` decimal(10,2) NOT NULL DEFAULT 0.00; `fine_paid` tinyint(1) NOT NULL DEFAULT 0

### One additive change to an existing table: `payments`

```sql
ALTER TABLE payments ADD COLUMN purpose ENUM('school_fees','transport','library_fine') NULL DEFAULT NULL;
ALTER TABLE payments ADD UNIQUE KEY uq_payment_dedup (student_id, purpose, reference);
```

**AMENDMENT 1 (user-approved):** existing payments are kept **unchanged and
uninterpreted**. Rows with `purpose = NULL` are displayed everywhere as
**"Legacy / Unclassified"** — the application must NEVER treat NULL as
"confirmed school fees". The unique key cannot conflict with legacy rows
because MariaDB treats NULL-containing index entries as distinct.

**AMENDMENT 2 (user-approved):** duplicate-payment protection. The unique key
`(student_id, purpose, reference)` is the concurrency-safe guard:
- transport fee reference format: `transport:<YYYY-MM>` (one posting per student per month)
- library fine reference format: `library-fine:<issue_id>` (one posting per issue)
Procedures convert a unique-key violation (MariaDB 1062) into the friendly
signal `DUPLICATE_PAYMENT` (via `GET DIAGNOSTICS` in the EXIT handler), so
simultaneous duplicate postings cannot both succeed — the second transaction's
INSERT fails inside its own transaction and rolls back atomically.

### Transport payment policy (USER-CONFIRMED, 2026-11)

> 1. **Transport fees** are posted per student per calendar month with
>    reference `transport:YYYY-MM`. **Exactly one full payment per student per
>    calendar month**; a repeat posting — sequential or concurrent — is
>    rejected with `DUPLICATE_PAYMENT`. **No instalments or partial payments in
>    Version 1**: a second posting for the same month cannot exist. Supporting
>    instalments later requires a reference-scheme amendment (e.g.
>    `transport:YYYY-MM:<n>`), which is out of scope.
> 2. Fee posting is **decoupled from route assignment**: an Active student may
>    be posted a transport fee whether or not they hold an assignment.
> 3. **Library fines**: the amount is the system-recorded `book_issues.fine`
>    (set at return time). It cannot be overridden, split, or re-posted; one
>    payment per issue (`library-fine:<issue_id>`), `fine_paid` guards a
>    repeat.
> 4. **Legacy payments** (`purpose = NULL`) are displayed as
>    "Legacy / Unclassified" and are never interpreted as school fees, never
>    counted with transport/library totals, and never modified by this
>    feature.
> 5. No refund, cancellation, or reversal procedure exists in v1; `payments`
>    rows are append-only financial records.
> 6. No gateway/online payment: postings are manual admin records of money
>    received (cash/bank), consistent with the existing read-only payments
>    design.

**Known limitation (disclosed, not hidden):** the database defines **no
authoritative monthly transport fee source** — `transport_routes.fare` is
advisory and the amount is caller-supplied to `sp_post_transport_fee`. Because
"the full monthly amount" cannot be computed authoritatively, **partial-payment
validation is NOT implemented in v1**; the one-posting-per-month dedup above is
the complete protection. If an authoritative fee table is added later, a
further amendment can enforce amount validation without schema change.

---

## Phase 2 — Write architecture (proven registration pattern)

All writes go through stored procedures: `SQL SECURITY DEFINER`, strict
captured `sql_mode` (`STRICT_TRANS_TABLES,STRICT_ALL_TABLES,NO_ZERO_IN_DATE,
NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION`), `EXIT HANDLER FOR SQLEXCEPTION →
ROLLBACK; RESIGNAL;`, friendly `SIGNAL SQLSTATE '45000'` business errors.
Reads use guarded `$queryRaw` with explicit column lists and graceful fallback
when tables are absent (pre-install the pages degrade to today's honest
empty-states). `schema.live-mirror.prisma` stays untouched.

### Procedures (15, staging-qualified; live versions prepared only after separate approval)

| # | Procedure | Safeguards inside |
|---|---|---|
| 1 | `sp_add_vehicle(number, type, capacity, driver_name, driver_phone)` | duplicate number → `DUPLICATE_VEHICLE_NUMBER`; capacity > 0 → else `INVALID_CAPACITY` |
| 2 | `sp_update_vehicle(id, type, capacity, driver_name, driver_phone)` | `VEHICLE_NOT_FOUND`; new capacity ≥ assigned count → else `CAPACITY_BELOW_ASSIGNMENTS` (**AMENDMENT 3**); vehicle row locked `FOR UPDATE` inside a transaction (NULL-guarded) so the floor always sees every committed assignment (**LOCK-ORDER REVISION**) |
| 3 | `sp_delete_vehicle(id)` | `VEHICLE_NOT_FOUND`; pre-check assignments across its routes → `VEHICLE_HAS_ACTIVE_ASSIGNMENTS` (**AMENDMENT 5 interaction**); FK RESTRICT chain is the backstop; vehicle row locked `FOR UPDATE` inside a transaction, CASCADE route locks acquired while the parent lock is held (order-compliant) (**LOCK-ORDER REVISION**) |
| 4 | `sp_add_route(vehicle_id, name, stops, morning_time, evening_time, fare)` | `VEHICLE_NOT_FOUND` |
| 5 | `sp_update_route(id, vehicle_id, …)` | `ROUTE_NOT_FOUND`; `VEHICLE_NOT_FOUND`; BOTH vehicles locked in ascending-id order → route row → revalidation; a move is rejected when the destination vehicle's CURRENT load plus the moved route's own assignments exceed its capacity (**AMENDMENT 3 + LOCK-ORDER REVISION**) |
| 6 | `sp_delete_route(id)` | `ROUTE_NOT_FOUND`; pre-check → `ROUTE_HAS_ASSIGNMENTS` (**AMENDMENT 5**); FK backstop; vehicle row locked first, then the route row, linkage revalidated (**LOCK-ORDER REVISION**) |
| 7 | `sp_assign_student(student_id, route_id, pickup_point)` | `STUDENT_NOT_FOUND` / `NOT_A_STUDENT` / `STUDENT_NOT_ACTIVE`; `ROUTE_NOT_FOUND` (incl. mid-flight route move/delete, caller may retry); already assigned → `ALREADY_ASSIGNED`; **vehicle row locked FIRST, then the route row, linkage revalidated, capacity check under the row locks → `VEHICLE_AT_CAPACITY` — simultaneous requests serialise and the loser rolls back; a concurrent duplicate INSERT surfaces 1062, converted to `ALREADY_ASSIGNED` via `GET DIAGNOSTICS` (**AMENDMENT 3, concurrency-safe + LOCK-ORDER REVISION**) |
| 8 | `sp_unassign_student(student_id)` | `NOT_ASSIGNED` |
| 9 | `sp_add_book(title, author, isbn, category, publisher, published_year, quantity, location)` | duplicate isbn → `DUPLICATE_ISBN`; quantity ≥ 0 → else `INVALID_QUANTITY`; `available` initialised = quantity |
| 10 | `sp_update_book(id, …)` | `BOOK_NOT_FOUND`; duplicate isbn (other row) → `DUPLICATE_ISBN`; new quantity < active issues → `QUANTITY_BELOW_ACTIVE_ISSUES`; `available` adjusted by the delta, clamped to [0, quantity] (transaction, book row locked) |
| 11 | `sp_delete_book(id)` | any issue history → `BOOK_HAS_ISSUE_HISTORY` (FK RESTRICT backstop) |
| 12 | `sp_issue_book(book_id, student_id, due_date)` | **transactional** (**AMENDMENT 4**): book row locked `FOR UPDATE`; `available ≤ 0` → `NO_COPIES_AVAILABLE`; same student still holding the book unreturned → `ALREADY_ISSUED_TO_STUDENT`; `due_date < CURDATE()` → `INVALID_DUE_DATE`; INSERT + `available = available - 1` commit atomically |
| 13 | `sp_return_book(issue_id, fine)` | **transactional**: issue row locked `FOR UPDATE`; already returned → `ALREADY_RETURNED` (**AMENDMENT 4 duplicate-return protection**); fine < 0 → `INVALID_FINE`; inventory guard `available < quantity` before increment → `INVENTORY_CORRUPTION` if violated; return + inventory increment commit atomically |
| 14 | `sp_post_transport_fee(student_id, period 'YYYY-MM', amount, payment_method)` | `NOT_A_STUDENT` / `STUDENT_NOT_ACTIVE`; period regex `^[0-9]{4}-(0[1-9]|1[0-2])$` → `INVALID_PERIOD`; amount > 0 → `INVALID_AMOUNT`; INSERT payments (purpose='transport', reference='transport:YYYY-MM'); unique key → `DUPLICATE_PAYMENT` (**AMENDMENT 2**) |
| 15 | `sp_post_library_fine(issue_id, payment_method)` | `ISSUE_NOT_FOUND`; must be returned → `ISSUE_NOT_RETURNED`; fine > 0 → `NO_FINE_DUE`; `fine_paid = 1` → `FINE_ALREADY_POSTED`; INSERT payments (amount = the issue's recorded fine, purpose='library_fine', reference='library-fine:<issue_id>') + `fine_paid = 1` atomically; unique key → `DUPLICATE_PAYMENT` (**AMENDMENT 2**) |

### Canonical lock order (LOCK-ORDER REVISION, user-approved)

`vehicle → route → assignment`

- Every multi-lock transport procedure acquires locks **parent-to-child only**;
  when TWO vehicles are needed (`sp_update_route`), they are locked
  individually in **ascending vehicle id** order (`LEAST` then `GREATEST`).
- Uniform pattern: **lock-free pre-read → START TRANSACTION → ordered
  `FOR UPDATE` locks → revalidation of every pre-read value → mutation →
  COMMIT.** Any revalidation mismatch is a friendly reject the caller may
  retry (`ROUTE_NOT_FOUND`); vanished parent rows are NULL-guarded
  (`VEHICLE_NOT_FOUND`).
- Applied to: `sp_assign_student`, `sp_update_route`, `sp_update_vehicle`,
  `sp_delete_vehicle`, `sp_delete_route`. This kills the concrete deadlock the
  earlier `route → vehicle` order produced (assign held route R and wanted
  vehicle V while delete_vehicle held V and wanted R via CASCADE).
- `sp_unassign_student` (child-row DELETE only; InnoDB takes no parent locks on
  a child DELETE) and the library procedures are analysed cycle-free and left
  as staging-proven: `sp_return_book` locks issue→book, and no other procedure
  takes a book lock before reaching child rows (`sp_delete_book` aborts on
  issue history before its DELETE; `sp_update_book` takes no child locks).
- Residual edges, disclosed: direct root-level SQL writes outside the
  procedures are not covered by this ordering; InnoDB deadlock detection and
  `innodb_lock_wait_timeout` remain backstops — any unforeseen 1213/1205
  surfaces through the `EXIT HANDLER` as a clean rollback + retryable error.
- Staging concurrency proof: tests C1–C6 (below) plus the re-run last-seat
  race C7, each asserting the **absence** of deadlock/lock-wait errors and
  inspecting final database state.

### Privileges — AMENDMENT 6 (EXECUTE-only-writer principle preserved)

- **Writer** (`essjt_live_writer` on live / `essjt_writer` in staging): gains
  EXECUTE on the new procedures ONLY. Zero table, database or column
  privileges of any kind — the principle is unchanged.
- **Definer**: column-scoped SELECT/INSERT/UPDATE on exactly the columns the
  procedures touch, plus **table-level DELETE** on the four deletable new
  tables only (`vehicles`, `transport_routes`, `transport_assignments`,
  `books`) — MySQL cannot scope DELETE to columns; `book_issues` and
  `payments` receive **no DELETE** (history and financial rows are never
  erased). No INSERT/SELECT/UPDATE on `payments` beyond the six columns the
  posting procedures write (`student_id, purpose, amount, payment_date,
  payment_method, reference`).
- **Documented additive grant (staging-build finding):** the procedures check
  `users.status = 'Active'`, but the registration-era definer grant on `users`
  covers only `id, username, email, password, role, must_change_password,
  registration_status`. An additive column grant `SELECT (status)` on
  `users` is therefore required. This widens the definer's read set by ONE
  column; it is not a privilege-model change and the writer remains
  EXECUTE-only.
- **No new accounts.** Documented as amendment #3 to the privilege register.

### Staging-only note

Staging has no `payments` table (the live one is off-limits and is NOT
mirrored from live data). The staging build creates a **staging-only mirror**
of the live shape (`id, student_id FK→users.id, amount, payment_date,
payment_method, reference, created_at` — all nullable except id/created_at,
index on student_id, no ON DELETE action) plus the additive `purpose` column
and the dedup unique key, so the posting procedures are tested against the
same shape they will meet on live.

---

## Phase 3 — Application build

- Real API routes replace the 501 stubs; admin CRUD pages for transport and
  library; student/parent read-only views ("my route", "my borrowed books");
  fees page shows transport/library lines by `purpose`.
- **AMENDMENT 1 in the UI/API:** payments with `purpose = NULL` are rendered
  as "Legacy / Unclassified" and never counted as school fees.
- Authorization server-side: admin = write; student/parent = own records only.
- Dead code removed: orphaned `TransportClient.tsx` (POSTs to the non-existent
  `/api/transport/vehicles`) and `LibraryClient.tsx`.

## Phase 4 — Staging verification (authorised)

- Extend staging schema: the 5 new tables, a staging `payments` mirror (with
  `purpose` + dedup key — staging only; the live table is NOT touched), all
  15 procedures, definer column/table grants, 30 EXECUTE grants
  (15 definer + 15 writer) on the existing staging accounts.
- Expanded test suite (**AMENDMENT 7 + LOCK-ORDER REVISION**) covering every
  safeguard: duplicate payment (sequential AND concurrent), capacity
  (sequential AND concurrent), duplicate return, inventory guards, quantity
  floors, deletion guards and the CASCADE/RESTRICT interaction chain, writer
  privilege denial, legacy-NULL payment behaviour, one-payment-per-month
  policy incl. different-month acceptance, and the canonical-lock-order
  concurrency suite **C1–C7** (each asserting absence of deadlock/lock-wait
  errors plus final DB-state inspection):
  - **C1** assignment vs vehicle deletion; **C2** concurrent route swaps
    A→B / B→A (sufficient capacity for both to succeed); **C3** route movement
    vs assignment to that route; **C4** assignment vs vehicle capacity update
    (`capacity ≥ load` invariant); **C5** route deletion vs assignment;
    **C6** 4-client assignment storm across 2 vehicles / 3 routes (exactly
    3 wins, 1 `VEHICLE_AT_CAPACITY`); **C7** the original last-seat race
    re-run under the vehicle-first order.

## Phase 5 — Live rollout (NOT prepared; requires separate approval)

After registration installation completes AND this plan's staging suite is
green: fresh backup → preflight (incl. payments-row snapshot) → installation
(5 CREATE TABLEs + 2 additive payments ALTERs + grants + procedures; zero
destructive statements) → verification vs snapshot. The live SQL files will be
drafted only after the user's separate approval.
