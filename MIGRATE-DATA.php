<?php
// ============================================================
// ESSJT DATA MIGRATION v4 - BULK INSERT (no timeouts!)
// Loads PG user IDs into memory, then bulk inserts in batches
// Place at: C:\xampp\htdocs\essjt\MIGRATE-DATA.php
// ============================================================
set_time_limit(0);
ini_set('memory_limit', '512M');

$mysql_host = 'localhost';
$mysql_user = 'root';
$mysql_pass = '';
$mysql_db   = 'essjt_school_system';

$pg_host = 'db.lmabkqlqoowuhfsimpua.supabase.co';
$pg_port = '5432';
$pg_db   = 'postgres';
$pg_user = 'postgres';
$pg_pass = '-vida_de_la_rose';

$mysql = new mysqli($mysql_host, $mysql_user, $mysql_pass, $mysql_db);
if ($mysql->connect_error) die("<div style='color:red;padding:30px;font-family:sans-serif'>❌ MySQL failed: ".$mysql->connect_error."<br>Make sure XAMPP is running!</div>");
$mysql->set_charset('utf8mb4');

$pg = pg_connect("host=$pg_host port=$pg_port dbname=$pg_db user=$pg_user password=$pg_pass sslmode=require");
if (!$pg) die("<div style='color:red;padding:30px;font-family:sans-serif'>❌ Supabase connection failed! Check internet.</div>");

$step = (int)($_GET['step'] ?? 0);
$log  = [];

// ── HELPERS ──────────────────────────────────────────────
function mysql_table_exists($m,$t){ $r=$m->query("SHOW TABLES LIKE '$t'"); return $r&&$r->num_rows>0; }
function mysql_columns($m,$t){ $r=$m->query("SHOW COLUMNS FROM `$t`"); $c=[]; while($row=$r->fetch_assoc()) $c[]=$row['Field']; return $c; }
function pg_esc($pg,$v){ return $v===null?'NULL':"'".pg_escape_string($pg,$v)."'"; }

// Load ALL PG users into memory: username => id
function load_pg_users($pg) {
    $map = [];
    $r   = pg_query($pg, "SELECT id, username FROM users");
    while ($row = pg_fetch_assoc($r)) $map[$row['username']] = (int)$row['id'];
    return $map;
}

// Bulk insert helper - splits into chunks to avoid query size limits
function bulk_insert($pg, $table, $columns, $rows, &$log, $chunk = 200) {
    if (empty($rows)) { $log[] = "ℹ️ No rows to insert into $table"; return 0; }
    $ok = 0;
    foreach (array_chunk($rows, $chunk) as $batch) {
        $values = [];
        foreach ($batch as $row) $values[] = "(".implode(",",$row).")";
        $sql = "INSERT INTO $table (".implode(",",$columns).") VALUES ".implode(",",$values)." ON CONFLICT DO NOTHING";
        $r   = pg_query($pg, $sql);
        if ($r) $ok += count($batch);
        else    $log[] = "⚠️ Bulk insert error: ".substr(pg_last_error($pg),0,120);
    }
    return $ok;
}

// ── STEP 1: USERS (bulk) ─────────────────────────────────
if ($step === 1) {
    // Get existing usernames in PG
    $existing = [];
    $er = pg_query($pg, "SELECT username FROM users");
    while ($row = pg_fetch_assoc($er)) $existing[$row['username']] = true;

    $res  = $mysql->query("SELECT * FROM users ORDER BY id");
    $rows = [];
    while ($r = $res->fetch_assoc()) {
        if (isset($existing[$r['username']])) continue;
        $rows[] = [
            pg_esc($pg, $r['username']),
            pg_esc($pg, $r['full_name']  ?? $r['name']   ?? 'Unknown'),
            pg_esc($pg, $r['email']      ?? $r['username'].'@essjt.rw'),
            pg_esc($pg, $r['phone']      ?? null),
            pg_esc($pg, $r['password']),
            pg_esc($pg, $r['role']       ?? 'student'),
            pg_esc($pg, $r['status']     ?? 'Active'),
            pg_esc($pg, $r['created_at'] ?? date('Y-m-d H:i:s')),
        ];
    }
    $ok = bulk_insert($pg, 'users', ['username','full_name','email','phone','password','role','status','created_at'], $rows, $log);
    $log[] = "✅ Users: $ok inserted, ".count($existing)." already existed";

    // Also merge from separate teachers table if it exists
    if (mysql_table_exists($mysql,'teachers')) {
        $tcols = mysql_columns($mysql,'teachers');
        $tres  = $mysql->query("SELECT * FROM teachers ORDER BY id");
        $trows = []; $texist = 0;
        while ($r = $tres->fetch_assoc()) {
            $uname = $r['username'] ?? $r['teacher_id'] ?? $r['staff_id'] ?? ('TEA'.str_pad($r['id'],3,'0',STR_PAD_LEFT));
            if (isset($existing[$uname])) { $texist++; continue; }
            $fname = $r['full_name'] ?? $r['name'] ?? trim(($r['first_name']??'').' '.($r['last_name']??''));
            $email = $r['email'] ?? $uname.'@essjt.rw';
            $pass  = $r['password'] ?? password_hash('teacher123',PASSWORD_DEFAULT);
            $trows[] = [pg_esc($pg,$uname),pg_esc($pg,$fname),pg_esc($pg,$email),pg_esc($pg,$r['phone']??null),pg_esc($pg,$pass),"'teacher'",pg_esc($pg,$r['status']??'Active'),"NOW()"];
        }
        $tok = bulk_insert($pg,'users',['username','full_name','email','phone','password','role','status','created_at'],$trows,$log);
        $log[] = "✅ Teachers table: $tok new, $texist already existed";
    }
}

// ── STEP 2: STUDENTS (bulk - no per-row PG queries!) ─────
if ($step === 2) {
    pg_query($pg, "ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_name  VARCHAR(200)");
    pg_query($pg, "ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(50)");
    pg_query($pg, "ALTER TABLE students ADD COLUMN IF NOT EXISTS address      TEXT");

    // Load ALL PG users into memory once
    $pg_users = load_pg_users($pg);
    $log[] = "ℹ️ Loaded ".count($pg_users)." PG user IDs into memory";

    // Load already-migrated student user_ids
    $existing_students = [];
    $er = pg_query($pg, "SELECT user_id FROM students");
    while ($row = pg_fetch_assoc($er)) $existing_students[(int)$row['user_id']] = true;
    $log[] = "ℹ️ ".count($existing_students)." students already in Supabase";

    $res   = $mysql->query("SELECT s.*, u.username FROM students s JOIN users u ON s.user_id=u.id ORDER BY s.id");
    $rows  = []; $skip = 0; $notfound = 0;

    while ($r = $res->fetch_assoc()) {
        $uid = $pg_users[$r['username']] ?? null;
        if (!$uid) { $notfound++; continue; }
        if (isset($existing_students[$uid])) { $skip++; continue; }

        $dob = $r['dob'] ?? $r['date_of_birth'] ?? $r['birth_date'] ?? null;
        if ($dob === '0000-00-00' || $dob === '' || $dob === null) $dob = null;

        $pname  = $r['parent_name']  ?? $r['guardian_name']  ?? $r['father_name'] ?? null;
        $pphone = $r['parent_phone'] ?? $r['guardian_phone'] ?? $r['father_phone']?? null;
        $addr   = $r['address']      ?? $r['home_address']   ?? null;

        $rows[] = [
            $uid,
            pg_esc($pg, $r['trade']   ?? $r['program']      ?? $r['course']        ?? 'General'),
            pg_esc($pg, $r['level']   ?? $r['class_level']  ?? $r['year']          ?? 'L1'),
            pg_esc($pg, $r['section'] ?? $r['class_section']?? $r['group']         ?? 'A'),
            $dob ? pg_esc($pg,$dob) : 'NULL',
            pg_esc($pg, $r['gender']  ?? $r['sex'] ?? null),
            pg_esc($pg, $pname),
            pg_esc($pg, $pphone),
            pg_esc($pg, $addr),
        ];
        $existing_students[$uid] = true; // prevent duplicates within batch
    }

    $ok = bulk_insert($pg,'students',['user_id','trade','level','section','dob','gender','parent_name','parent_phone','address'],$rows,$log);
    $log[] = "✅ Students: $ok inserted, $skip already existed, $notfound users not found";
}

// ── STEP 3: MARKS (bulk) ──────────────────────────────────
if ($step === 3) {
    if (!mysql_table_exists($mysql,'marks')) { $log[] = "ℹ️ No marks table — skipped"; }
    else {
        $pg_users = load_pg_users($pg);
        // Get existing marks as "uid|subject|term|year" keys
        $existing = [];
        $er = pg_query($pg,"SELECT student_id,subject,term,year FROM marks");
        while ($row=pg_fetch_assoc($er)) $existing[$row['student_id'].'|'.$row['subject'].'|'.$row['term'].'|'.$row['year']]=true;

        $res=$mysql->query("SELECT m.*, u.username FROM marks m JOIN users u ON m.student_id=u.id ORDER BY m.id");
        $rows=[]; $skip=0;
        while ($r=$res->fetch_assoc()) {
            $uid = $pg_users[$r['username']] ?? null;
            if (!$uid) { $skip++; continue; }
            $sub=$r['subject']??$r['subject_name']??$r['course']??'Unknown';
            $trm=$r['term']??$r['semester']??'Term 1';
            $yr =$r['year']??$r['academic_year']??date('Y');
            $key="$uid|$sub|$trm|$yr";
            if (isset($existing[$key])) { $skip++; continue; }
            $rows[]=[$uid, pg_esc($pg,$sub), pg_esc($pg,$trm), pg_esc($pg,$yr),
                     (float)($r['marks']??$r['score']??$r['mark']??0),
                     (float)($r['max_marks']??$r['total']??$r['out_of']??100)];
            $existing[$key]=true;
        }
        $ok=bulk_insert($pg,'marks',['student_id','subject','term','year','marks','max_marks'],$rows,$log);
        $log[]="✅ Marks: $ok inserted, $skip skipped";
    }
}

// ── STEP 4: ATTENDANCE (bulk) ─────────────────────────────
if ($step === 4) {
    if (!mysql_table_exists($mysql,'attendance')) { $log[]="ℹ️ No attendance — skipped"; }
    else {
        $pg_users = load_pg_users($pg);
        $existing = [];
        $er = pg_query($pg,"SELECT student_id, date::text FROM attendance");
        while ($row=pg_fetch_assoc($er)) $existing[$row['student_id'].'|'.$row['date']]=true;

        $res=$mysql->query("SELECT a.*, u.username FROM attendance a JOIN users u ON a.student_id=u.id ORDER BY a.id");
        $rows=[]; $skip=0;
        while ($r=$res->fetch_assoc()) {
            $uid=$pg_users[$r['username']]??null;
            if (!$uid) { $skip++; continue; }
            $date=$r['date']??$r['attendance_date']??$r['day']??null;
            if (!$date||$date==='0000-00-00') { $skip++; continue; }
            $key="$uid|$date";
            if (isset($existing[$key])) { $skip++; continue; }
            $rows[]=[$uid, pg_esc($pg,$date), pg_esc($pg,$r['status']??'Present'), pg_esc($pg,$r['notes']??$r['remarks']??null)];
            $existing[$key]=true;
        }
        $ok=bulk_insert($pg,'attendance',['student_id','date','status','notes'],$rows,$log);
        $log[]="✅ Attendance: $ok inserted, $skip skipped";
    }
}

// ── STEP 5: PAYMENTS (bulk) ───────────────────────────────
if ($step === 5) {
    $pay_table = mysql_table_exists($mysql,'fee_payments')?'fee_payments':(mysql_table_exists($mysql,'payments')?'payments':null);
    if (!$pay_table) { $log[]="ℹ️ No payments table found — skipped"; }
    else {
        $pg_users = load_pg_users($pg);
        $pcols    = mysql_columns($mysql,$pay_table);
        $sid_col  = in_array('student_id',$pcols)?'student_id':(in_array('user_id',$pcols)?'user_id':'id');
        $log[]    = "ℹ️ Using: $pay_table (student column: $sid_col)";

        $res=$mysql->query("SELECT p.*, u.username FROM `$pay_table` p JOIN users u ON p.$sid_col=u.id ORDER BY p.id");
        $rows=[]; $skip=0;
        while ($r=$res->fetch_assoc()) {
            $uid=$pg_users[$r['username']]??null;
            if (!$uid) { $skip++; continue; }
            $date=$r['payment_date']??$r['date']??$r['paid_date']??$r['created_at']??date('Y-m-d');
            if (!$date||$date==='0000-00-00') $date=date('Y-m-d');
            $rows[]=[$uid,
                (float)($r['amount']??$r['paid_amount']??$r['fee_amount']??0),
                pg_esc($pg,$r['payment_type']??$r['fee_type']??$r['type']??'Tuition'),
                pg_esc($pg,$r['payment_method']??$r['method']??$r['mode']??'Cash'),
                pg_esc($pg,$r['term']??$r['semester']??'Term 1'),
                pg_esc($pg,$r['year']??$r['academic_year']??date('Y')),
                pg_esc($pg,$r['receipt_number']??$r['receipt_no']??$r['receipt']??null),
                pg_esc($pg,$r['notes']??$r['description']??null),
                pg_esc($pg,$date)];
        }
        $ok=bulk_insert($pg,'payments',['student_id','amount','payment_type','payment_method','term','year','receipt_number','notes','payment_date'],$rows,$log);
        $log[]="✅ Payments from $pay_table: $ok inserted, $skip skipped";
    }
}

// ── STEP 6: SALARIES (bulk) ───────────────────────────────
if ($step === 6) {
    $sal_table=mysql_table_exists($mysql,'salary_records')?'salary_records':(mysql_table_exists($mysql,'teacher_salaries')?'teacher_salaries':null);
    if (!$sal_table) { $log[]="ℹ️ No salary table found — skipped"; }
    else {
        $pg_users = load_pg_users($pg);
        $scols    = mysql_columns($mysql,$sal_table);
        $tid_col  = in_array('teacher_id',$scols)?'teacher_id':(in_array('user_id',$scols)?'user_id':'id');
        $log[]    = "ℹ️ Using: $sal_table";

        $res=$mysql->query("SELECT s.*, u.username FROM `$sal_table` s JOIN users u ON s.$tid_col=u.id ORDER BY s.id");
        $rows=[];
        while ($r=$res->fetch_assoc()) {
            $uid=$pg_users[$r['username']]??null;
            if (!$uid) continue;
            $base=(float)($r['base_salary']??$r['basic_salary']??$r['salary']??0);
            $bon =(float)($r['bonuses']??$r['bonus']??0);
            $ded =(float)($r['deductions']??$r['deduction']??0);
            $net =(float)($r['net_salary']??$r['net_pay']??($base+$bon-$ded));
            $pd  =$r['payment_date']??$r['paid_date']??null;
            if ($pd==='0000-00-00') $pd=null;
            $rows[]=[$uid,pg_esc($pg,$r['month']??'January'),pg_esc($pg,$r['year']??date('Y')),$base,$bon,$ded,$net,pg_esc($pg,$r['payment_status']??$r['status']??'Paid'),pg_esc($pg,$pd)];
        }
        $ok=bulk_insert($pg,'teacher_salaries',['teacher_id','month','year','base_salary','bonuses','deductions','net_salary','payment_status','payment_date'],$rows,$log);
        $log[]="✅ Salaries from $sal_table: $ok inserted";
    }
}

// ── STEP 7: ANNOUNCEMENTS ─────────────────────────────────
if ($step === 7) {
    if (!mysql_table_exists($mysql,'announcements')) { $log[]="ℹ️ No announcements — skipped"; }
    else {
        // Check Supabase columns
        $cr     = pg_query($pg,"SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='announcements'");
        $pgcols = array_column(pg_fetch_all($cr)?:[],'column_name');
        $log[]  = "ℹ️ Supabase announcements columns: ".implode(', ',$pgcols);

        // Get admin id once — used for any NOT NULL user-reference column
        $admin_r  = pg_query($pg, "SELECT id FROM users WHERE role='admin' LIMIT 1");
        $admin_id = ($admin_r && pg_num_rows($admin_r) > 0) ? (int)pg_fetch_assoc($admin_r)['id'] : 1;

        // Detect allowed priority values from Supabase check constraint
        $con_r = pg_query($pg, "SELECT pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conname LIKE '%priority%' AND conrelid='announcements'::regclass");
        $allowed_priorities = ['Normal','High','Low']; // safe defaults
        if ($con_r && pg_num_rows($con_r) > 0) {
            $def = pg_fetch_assoc($con_r)['def'];
            $log[] = "ℹ️ Priority constraint: $def";
            // Extract values from constraint like: CHECK (priority = ANY (ARRAY['Low','Normal','High']))
            preg_match_all("/'([^']+)'/", $def, $matches);
            if (!empty($matches[1])) $allowed_priorities = $matches[1];
        }
        $log[] = "ℹ️ Allowed priorities: ".implode(', ', $allowed_priorities);
        $default_priority = in_array('Normal', $allowed_priorities) ? 'Normal' : $allowed_priorities[0];

        $has_author     = in_array('author',         $pgcols);
        $has_author_id  = in_array('author_id',      $pgcols);
        $has_created_by = in_array('created_by',     $pgcols);
        $has_pub_date   = in_array('published_date', $pgcols);
        $has_status_col = in_array('status',         $pgcols);

        $res  = $mysql->query("SELECT * FROM announcements ORDER BY id");
        $cols = ['title','content','target_audience','priority','created_at'];
        if ($has_author)     $cols[] = 'author';
        if ($has_author_id)  $cols[] = 'author_id';
        if ($has_created_by) $cols[] = 'created_by';
        if ($has_pub_date)   $cols[] = 'published_date';
        if ($has_status_col) $cols[] = 'status';

        $rows=[]; $ok=0;
        while ($r=$res->fetch_assoc()) {
            $created = $r['created_at'] ?? date('Y-m-d H:i:s');
            // Normalize priority to match Supabase allowed values
            $raw_priority = trim($r['priority'] ?? '');
            // First try exact match
            if (in_array($raw_priority, $allowed_priorities)) {
                $priority = $raw_priority;
            } else {
                // Try case-insensitive match
                $matched = false;
                foreach ($allowed_priorities as $ap) {
                    if (strcasecmp($raw_priority, $ap) === 0) { $priority = $ap; $matched = true; break; }
                }
                if (!$matched) {
                    // Map common synonyms
                    $lp = strtolower($raw_priority);
                    if (in_array($lp, ['high','urgent','critical','important'])) {
                        $priority = in_array('High',$allowed_priorities) ? 'High' : $default_priority;
                    } elseif (in_array($lp, ['low','minor','info'])) {
                        $priority = in_array('Low',$allowed_priorities) ? 'Low' : $default_priority;
                    } else {
                        // medium, normal, moderate, empty → use default
                        $priority = $default_priority;
                    }
                }
            }

            $row = [
                pg_esc($pg, $r['title']           ?? $r['subject'] ?? 'Announcement'),
                pg_esc($pg, $r['content']         ?? $r['message'] ?? $r['body'] ?? ''),
                pg_esc($pg, $r['target_audience'] ?? $r['audience'] ?? 'All'),
                pg_esc($pg, $priority),
                pg_esc($pg, $created),
            ];
            if ($has_author)     $row[] = pg_esc($pg, $r['author'] ?? $r['posted_by'] ?? 'admin');
            if ($has_author_id)  $row[] = $admin_id;
            if ($has_created_by) $row[] = $admin_id;   // NOT NULL — always use admin id
            if ($has_pub_date)   $row[] = pg_esc($pg, $r['published_date'] ?? $r['publish_date'] ?? $created);
            if ($has_status_col) $row[] = pg_esc($pg, $r['status'] ?? 'Published');
            $rows[] = $row;
        }
        $ok = bulk_insert($pg, 'announcements', $cols, $rows, $log);
        $log[] = "✅ Announcements: $ok inserted";
    }
}

// ── STEP 8: EVENTS ────────────────────────────────────────
if ($step === 8) {
    if (!mysql_table_exists($mysql,'events')) { $log[]="ℹ️ No events table — skipped"; }
    else {
        // Get admin id for created_by NOT NULL column
        $admin_r  = pg_query($pg, "SELECT id FROM users WHERE role='admin' LIMIT 1");
        $admin_id = ($admin_r && pg_num_rows($admin_r) > 0) ? (int)pg_fetch_assoc($admin_r)['id'] : 1;

        // Check which columns school_events has in Supabase
        $ecols_r   = pg_query($pg, "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='school_events'");
        $ecols     = array_column(pg_fetch_all($ecols_r) ?: [], 'column_name');
        $log[]     = "ℹ️ school_events columns: ".implode(', ', $ecols);
        $has_cb    = in_array('created_by', $ecols);
        $has_ia    = in_array('is_active',  $ecols);

        $base_cols = ['title','description','event_date','event_time','location','event_type','target_audience'];
        if ($has_ia) $base_cols[] = 'is_active';
        if ($has_cb) $base_cols[] = 'created_by';

        $res=$mysql->query("SELECT * FROM events ORDER BY id");
        $rows=[];
        while ($r=$res->fetch_assoc()) {
            $edate=$r['event_date']??$r['date']??$r['start_date']??date('Y-m-d');
            if (!$edate || $edate==='0000-00-00') $edate=date('Y-m-d');
            $row = [
                pg_esc($pg, $r['title']           ?? $r['name']    ?? 'Event'),
                pg_esc($pg, $r['description']     ?? $r['details'] ?? ''),
                pg_esc($pg, $edate),
                pg_esc($pg, $r['event_time']      ?? $r['time']    ?? null),
                pg_esc($pg, $r['location']        ?? $r['venue']   ?? 'School'),
                pg_esc($pg, $r['event_type']      ?? $r['type']    ?? 'Academic'),
                pg_esc($pg, $r['target_audience'] ?? 'All'),
            ];
            if ($has_ia) $row[] = 'true';
            if ($has_cb) $row[] = $admin_id;
            $rows[] = $row;
        }
        $ok=bulk_insert($pg,'school_events',$base_cols,$rows,$log);
        $log[]="✅ Events: $ok inserted";
    }
}

// ── COUNTS ────────────────────────────────────────────────
function mc($m,$t){ if(!$m->query("SHOW TABLES LIKE '$t'")->num_rows) return null; $r=$m->query("SELECT COUNT(*) c FROM `$t`"); return $r?(int)$r->fetch_assoc()['c']:0; }
function pc($p,$t){ $r=@pg_query($p,"SELECT COUNT(*) c FROM $t"); return $r?(int)pg_fetch_assoc($r)['c']:0; }

$rows_display=[
    ['users','users'],['students','students'],['marks','marks'],
    ['attendance','attendance'],['fee_payments','payments'],
    ['salary_records','teacher_salaries'],['announcements','announcements'],['events','school_events'],
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ESSJT Migration v4</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',sans-serif;background:#f0f4f8;padding:30px;max-width:940px;margin:0 auto}
h1{color:#333;margin-bottom:4px}.sub{color:#999;font-size:.88em;margin-bottom:22px}
.card{background:white;border-radius:12px;padding:24px;margin-bottom:18px;box-shadow:0 4px 15px rgba(0,0,0,.08)}
h2{font-size:1em;color:#444;margin-bottom:13px}
.log{padding:8px 13px;border-radius:7px;margin:4px 0;font-size:.85em;word-break:break-word}
.ok{background:#e8f5e9;color:#2e7d32}.inf{background:#e3f2fd;color:#1565c0}.wrn{background:#ffebee;color:#c62828}
table{width:100%;border-collapse:collapse}
th{background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:10px;text-align:left;font-size:.85em}
td{padding:9px 10px;border-bottom:1px solid #f0f0f0;font-size:.85em}
.syn{color:#2e7d32;font-weight:700}.pen{color:#e53935;font-weight:700}.dif{color:#f57c00;font-weight:700}.na{color:#aaa}
.steps{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px}
.stp{background:#f8f9fa;border:2px solid #e0e0e0;border-radius:10px;padding:13px;text-align:center}
.stp:hover{border-color:#667eea}
.sn{font-size:1.6em;font-weight:700;color:#667eea;line-height:1}
.st{font-weight:700;font-size:.85em;color:#333;margin:5px 0 3px}
.sd{font-size:.73em;color:#888;margin-bottom:9px}
.btn{display:inline-block;padding:7px 14px;border-radius:7px;text-decoration:none;font-weight:700;font-size:.82em;color:white}
.b1{background:#1a73e8}.b2{background:#4caf50}.b3{background:#9c27b0}
.b4{background:#f57c00}.b5{background:#00897b}.b6{background:#e53935}
.b7{background:#0097a7}.b8{background:#e91e63}
.ball{display:block;width:100%;padding:13px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border:none;border-radius:10px;font-size:1em;font-weight:700;text-align:center;text-decoration:none;margin-top:10px}
.big-ok{background:linear-gradient(135deg,#4caf50,#66bb6a);color:white;padding:14px;border-radius:10px;font-weight:700;font-size:1.05em;text-align:center;margin-bottom:15px}
.warn{background:#fff3cd;border-left:4px solid #ffc107;padding:12px;border-radius:8px;margin-top:14px;font-size:.84em;color:#555}
</style>
</head>
<body>
<h1>📦 ESSJT Migration <span style="color:#667eea">v4</span> — Bulk Mode</h1>
<p class="sub">Builds user ID map in memory, then bulk inserts — no timeouts even with 1,200+ records!</p>

<?php if ($step>0 && !empty($log)): ?>
<div class="big-ok">✅ Step <?php echo $step; ?> completed!</div>
<div class="card">
    <h2>📋 Results</h2>
    <?php foreach($log as $l):
        $cls=str_starts_with($l,'✅')?'ok':(str_starts_with($l,'ℹ️')?'inf':'wrn');
    ?><div class="log <?php echo $cls; ?>"><?php echo htmlspecialchars($l); ?></div><?php endforeach; ?>
    <?php if($step<8): ?>
    <a href="?step=<?php echo $step+1; ?>" class="ball">▶ Continue → Step <?php echo $step+1; ?></a>
    <?php else: ?>
    <a href="?" class="ball">✅ All done! View Summary</a>
    <?php endif; ?>
</div>
<?php endif; ?>

<div class="card">
    <h2>📊 MySQL vs Supabase</h2>
    <table>
        <tr><th>MySQL Table</th><th>→ Supabase</th><th>MySQL</th><th>Supabase</th><th>Status</th></tr>
        <?php foreach($rows_display as [$mt,$pt]):
            $mv=mc($mysql,$mt); $pv=pc($pg,$pt);
        ?><tr>
            <td><code><?php echo $mt; ?></code></td>
            <td><code><?php echo $pt; ?></code></td>
            <td><?php echo $mv===null?'<span class="na">no table</span>':number_format($mv).' records'; ?></td>
            <td><?php echo number_format($pv); ?> records</td>
            <td><?php
                if($mv===null) echo '<span class="na">N/A</span>';
                elseif($mv===$pv || ($mv===0&&$pv===0)) echo '<span class="syn">✅ Synced</span>';
                elseif($pv===0) echo '<span class="pen">⚠️ Needs migration</span>';
                else echo '<span class="dif">⚠️ '.$pv.' / '.$mv.'</span>';
            ?></td>
        </tr><?php endforeach; ?>
    </table>
</div>

<div class="card">
    <h2>🚀 Migration Steps</h2>
    <div class="steps">
        <div class="stp"><div class="sn">1</div><div class="st">👥 Users</div><div class="sd">All accounts</div><a href="?step=1" class="btn b1">▶ Run</a></div>
        <div class="stp"><div class="sn">2</div><div class="st">🎓 Students</div><div class="sd">Details</div><a href="?step=2" class="btn b2">▶ Run</a></div>
        <div class="stp"><div class="sn">3</div><div class="st">📊 Marks</div><div class="sd">Grades</div><a href="?step=3" class="btn b3">▶ Run</a></div>
        <div class="stp"><div class="sn">4</div><div class="st">📋 Attendance</div><div class="sd">Records</div><a href="?step=4" class="btn b4">▶ Run</a></div>
        <div class="stp"><div class="sn">5</div><div class="st">💳 Payments</div><div class="sd">fee_payments</div><a href="?step=5" class="btn b5">▶ Run</a></div>
        <div class="stp"><div class="sn">6</div><div class="st">💰 Salaries</div><div class="sd">salary_records</div><a href="?step=6" class="btn b6">▶ Run</a></div>
        <div class="stp"><div class="sn">7</div><div class="st">📢 Announcements</div><div class="sd">Notices</div><a href="?step=7" class="btn b7">▶ Run</a></div>
        <div class="stp"><div class="sn">8</div><div class="st">🎉 Events</div><div class="sd">School events</div><a href="?step=8" class="btn b8">▶ Run</a></div>
    </div>
    <a href="?step=1" class="ball">⚡ Start from Step 1</a>
</div>

<div class="warn">⚠️ After all ✅ Synced, delete <code>MIGRATE-DATA.php</code> from your essjt folder!</div>
</body>
</html>
