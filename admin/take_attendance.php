<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'teacher') { header('Location: index.php'); exit(); }

$teacher_id = $_SESSION['user_id'];
$msg = '';

// SAVE ATTENDANCE
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'save_attendance') {
    $date    = $_POST['date'];
    $statuses= $_POST['status'] ?? [];
    $notes_a = $_POST['notes']  ?? [];
    $saved   = 0;

    foreach ($statuses as $student_id => $status) {
        $note = $notes_a[$student_id] ?? null;
        // Upsert
        $existing = db_query("SELECT id FROM attendance WHERE student_id=$1 AND date=$2", [$student_id, $date]);
        if (db_count($existing) > 0) {
            $row = db_fetch($existing);
            db_query("UPDATE attendance SET status=$1, notes=$2 WHERE id=$3", [$status, $note, $row['id']]);
        } else {
            db_query("INSERT INTO attendance (student_id, date, status, notes) VALUES ($1,$2,$3,$4)", [$student_id, $date, $status, $note]);
        }
        $saved++;
    }
    $msg = "✅ Attendance saved for $saved students on $date!";
}

// Get teacher's classes from schedule
$my_classes = db_fetch_all(db_query(
    "SELECT DISTINCT trade, level, section FROM school_schedule WHERE teacher_id=$1 ORDER BY trade, level, section",
    [$teacher_id]
));

// Selected class & date
$sel_trade   = trim($_GET['trade']   ?? ($my_classes[0]['trade']   ?? ''));
$sel_level   = trim($_GET['level']   ?? ($my_classes[0]['level']   ?? ''));
$sel_section = trim($_GET['section'] ?? ($my_classes[0]['section'] ?? ''));
$sel_date    = trim($_GET['date']    ?? date('Y-m-d'));

// Get students in selected class
$students = [];
$today_attendance = [];
if ($sel_trade && $sel_level && $sel_section) {
    $students = db_fetch_all(db_query(
        "SELECT u.id, u.full_name, u.username FROM users u
         JOIN students s ON u.id=s.user_id
         WHERE u.role='student' AND u.status='Active'
           AND s.trade=$1 AND s.level=$2 AND s.section=$3
         ORDER BY u.full_name",
        [$sel_trade, $sel_level, $sel_section]
    ));

    // Load existing attendance for this date
    foreach ($students as $stu) {
        $att = db_query("SELECT status, notes FROM attendance WHERE student_id=$1 AND date=$2", [$stu['id'], $sel_date]);
        if (db_count($att) > 0) {
            $row = db_fetch($att);
            $today_attendance[$stu['id']] = $row;
        }
    }
}

// Attendance stats for this class
$stats = [];
if ($sel_trade) {
    $total   = count($students);
    $present = 0; $absent = 0; $late = 0;
    foreach ($today_attendance as $att) {
        if ($att['status'] === 'Present') $present++;
        elseif ($att['status'] === 'Absent') $absent++;
        else $late++;
    }
    $stats = compact('total','present','absent','late');
}
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Take Attendance - ESSJT</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f5f5}
.header{background:linear-gradient(135deg,#1a73e8,#42a5f5);color:white;padding:15px 30px;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:1.4em}.back-btn{background:white;color:#1a73e8;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600}
.container{max-width:1100px;margin:25px auto;padding:0 20px}
.msg{padding:12px 18px;border-radius:8px;margin-bottom:16px;font-weight:600;background:#e8f5e9;color:#2e7d32;border-left:4px solid #4caf50}
.card{background:white;border-radius:12px;padding:22px;margin-bottom:20px;box-shadow:0 4px 15px rgba(0,0,0,.08)}
h2{font-size:1.05em;color:#444;margin-bottom:14px}
.class-picker{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}
.class-picker>div{flex:1;min-width:130px}
label{display:block;font-weight:600;color:#555;margin-bottom:5px;font-size:.88em}
input,select{width:100%;padding:10px 12px;border:2px solid #e0e0e0;border-radius:8px;font-size:.92em}
input:focus,select:focus{outline:none;border-color:#1a73e8}
.btn{padding:10px 22px;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:.92em;text-decoration:none;display:inline-block}
.btn-blue{background:#1a73e8;color:white}.btn-green{background:#4caf50;color:white}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}
.stat{background:white;border-radius:10px;padding:14px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.07)}
.stat-n{font-size:2em;font-weight:800}.stat-l{font-size:.82em;color:#888;margin-top:3px}
.att-row{display:flex;align-items:center;padding:12px 0;border-bottom:1px solid #f0f0f0;gap:15px}
.att-row:last-child{border:none}
.student-name{flex:1;font-weight:600}
.student-id{color:#667eea;font-size:.85em;margin-left:6px}
.status-btns{display:flex;gap:6px}
.status-btn{padding:7px 14px;border:2px solid #e0e0e0;border-radius:8px;cursor:pointer;font-weight:700;font-size:.85em;background:white;transition:.2s}
.status-btn.active-Present{background:#4caf50;color:white;border-color:#4caf50}
.status-btn.active-Absent{background:#e53935;color:white;border-color:#e53935}
.status-btn.active-Late{background:#ff9800;color:white;border-color:#ff9800}
.note-input{width:150px;padding:6px 10px;border:1.5px solid #e0e0e0;border-radius:6px;font-size:.82em}
.mark-all{display:flex;gap:8px;margin-bottom:14px;padding:12px;background:#f8f9fa;border-radius:8px}
.no-class{text-align:center;padding:40px;color:#999}
.no-students{text-align:center;padding:30px;color:#999}
</style>
</head><body>
<div class="header">
    <div style="display:flex;align-items:center;gap:15px">
        <img src="../assets/essjt-logo.png" style="width:45px;height:45px;object-fit:contain" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <h1>📋 Take Attendance</h1>
    </div>
    <a href="dashboard.php" class="back-btn">← Dashboard</a>
</div>
<div class="container">
<?php if ($msg): ?><div class="msg"><?php echo $msg; ?></div><?php endif; ?>

<!-- CLASS & DATE SELECTOR -->
<div class="card">
    <h2>📌 Select Class & Date</h2>
    <form method="GET" class="class-picker">
        <div>
            <label>Class</label>
            <select name="trade" onchange="this.form.submit()">
                <?php if (empty($my_classes)): ?>
                <option value="">No classes assigned</option>
                <?php else: foreach ($my_classes as $c): ?>
                <option value="<?php echo $c['trade']; ?>" data-level="<?php echo $c['level']; ?>" data-section="<?php echo $c['section']; ?>"
                    <?php echo ($c['trade']===$sel_trade&&$c['level']===$sel_level&&$c['section']===$sel_section)?'selected':''; ?>>
                    <?php echo $c['trade']; ?> <?php echo $c['level']; ?><?php echo $c['section']; ?>
                </option>
                <?php endforeach; endif; ?>
            </select>
        </div>
        <input type="hidden" name="level"   value="<?php echo htmlspecialchars($sel_level); ?>">
        <input type="hidden" name="section" value="<?php echo htmlspecialchars($sel_section); ?>">
        <div>
            <label>Date</label>
            <input type="date" name="date" value="<?php echo $sel_date; ?>" onchange="this.form.submit()">
        </div>
        <div style="display:flex;align-items:flex-end">
            <button type="submit" class="btn btn-blue">🔍 Load</button>
        </div>
    </form>
</div>

<?php if (empty($my_classes)): ?>
<div class="card"><div class="no-class">
    📭 You have no classes assigned yet.<br>
    <a href="report_schedule.php" style="color:#1a73e8">→ Report your schedule first</a>
</div></div>
<?php elseif (empty($students)): ?>
<div class="card"><div class="no-students">
    👥 No students found in <strong><?php echo $sel_trade; ?> <?php echo $sel_level; ?><?php echo $sel_section; ?></strong>
</div></div>
<?php else: ?>

<!-- STATS -->
<div class="stats">
    <div class="stat"><div class="stat-n" style="color:#1a73e8"><?php echo $stats['total']; ?></div><div class="stat-l">Total</div></div>
    <div class="stat"><div class="stat-n" style="color:#4caf50"><?php echo $stats['present']; ?></div><div class="stat-l">Present</div></div>
    <div class="stat"><div class="stat-n" style="color:#e53935"><?php echo $stats['absent']; ?></div><div class="stat-l">Absent</div></div>
    <div class="stat"><div class="stat-n" style="color:#ff9800"><?php echo $stats['late']; ?></div><div class="stat-l">Late</div></div>
</div>

<!-- ATTENDANCE FORM -->
<div class="card">
    <h2>✅ <?php echo $sel_trade; ?> <?php echo $sel_level; ?><?php echo $sel_section; ?> — <?php echo date('l, d F Y', strtotime($sel_date)); ?></h2>

    <div class="mark-all">
        <span style="font-weight:600;color:#555">Mark All:</span>
        <button type="button" class="btn" style="background:#4caf50;color:white;padding:7px 16px;font-size:.85em" onclick="markAll('Present')">✅ All Present</button>
        <button type="button" class="btn" style="background:#e53935;color:white;padding:7px 16px;font-size:.85em" onclick="markAll('Absent')">❌ All Absent</button>
        <button type="button" class="btn" style="background:#ff9800;color:white;padding:7px 16px;font-size:.85em" onclick="markAll('Late')">⏰ All Late</button>
    </div>

    <form method="POST">
        <input type="hidden" name="action" value="save_attendance">
        <input type="hidden" name="date" value="<?php echo $sel_date; ?>">
        <input type="hidden" name="trade" value="<?php echo htmlspecialchars($sel_trade); ?>">
        <input type="hidden" name="level" value="<?php echo htmlspecialchars($sel_level); ?>">
        <input type="hidden" name="section" value="<?php echo htmlspecialchars($sel_section); ?>">

        <?php foreach ($students as $i => $stu):
            $att     = $today_attendance[$stu['id']] ?? null;
            $current = $att ? $att['status'] : 'Present';
            $note    = $att ? ($att['notes'] ?? '') : '';
        ?>
        <div class="att-row">
            <div style="width:30px;color:#888;font-weight:700"><?php echo $i+1; ?></div>
            <div class="student-name">
                <?php echo htmlspecialchars($stu['full_name']); ?>
                <span class="student-id">(<?php echo $stu['username']; ?>)</span>
            </div>
            <div class="status-btns" id="btns_<?php echo $stu['id']; ?>">
                <input type="hidden" name="status[<?php echo $stu['id']; ?>]" id="status_<?php echo $stu['id']; ?>" value="<?php echo $current; ?>">
                <?php foreach (['Present','Absent','Late'] as $s): ?>
                <button type="button" class="status-btn <?php echo $current===$s?'active-'.$s:''; ?>"
                    onclick="setStatus(<?php echo $stu['id']; ?>,'<?php echo $s; ?>')"><?php
                    echo $s==='Present'?'✅ Present':($s==='Absent'?'❌ Absent':'⏰ Late');
                ?></button>
                <?php endforeach; ?>
            </div>
            <input type="text" class="note-input" name="notes[<?php echo $stu['id']; ?>]" value="<?php echo htmlspecialchars($note); ?>" placeholder="Note...">
        </div>
        <?php endforeach; ?>

        <div style="margin-top:18px">
            <button type="submit" class="btn btn-green" style="font-size:1em;padding:13px 30px">💾 Save Attendance for <?php echo count($students); ?> Students</button>
        </div>
    </form>
</div>
<?php endif; ?>
</div>

<script>
function setStatus(student_id, status) {
    document.getElementById('status_'+student_id).value = status;
    const btns = document.querySelectorAll('#btns_'+student_id+' .status-btn');
    btns.forEach(b => {
        b.className = 'status-btn';
        if (b.textContent.includes(status)) b.classList.add('active-'+status);
    });
}
function markAll(status) {
    document.querySelectorAll('[id^="status_"]').forEach(inp => {
        const id = inp.id.replace('status_','');
        setStatus(id, status);
    });
}
// Auto-submit when class changes
document.querySelector('select[name="trade"]')?.addEventListener('change', function() {
    const opt = this.options[this.selectedIndex];
    document.querySelector('input[name="level"]').value   = opt.dataset.level   || '';
    document.querySelector('input[name="section"]').value = opt.dataset.section || '';
    this.form.submit();
});
</script>
</body></html>
