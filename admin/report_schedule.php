<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'teacher') { header('Location: index.php'); exit(); }

$teacher_id = $_SESSION['user_id'];
$msg = ''; $err = '';

// Get teacher info
$teacher = db_fetch(db_query("SELECT u.*, s.trade as dept FROM users u LEFT JOIN school_schedule s ON u.id=s.teacher_id WHERE u.id=$1 LIMIT 1", [$teacher_id]));

// SUBMIT SCHEDULE REPORT
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'submit_schedule') {
        $class_trade   = trim($_POST['class_trade']);
        $class_level   = trim($_POST['class_level']);
        $class_section = trim($_POST['class_section']);
        $subject       = trim($_POST['subject']);
        $day_of_week   = trim($_POST['day_of_week']);
        $start_time    = trim($_POST['start_time']);
        $end_time      = trim($_POST['end_time']);
        $room_number   = trim($_POST['room'] ?? '');  // FIXED: using room_number
        $notes         = trim($_POST['notes'] ?? '');
        $schedule_id   = (int)($_POST['schedule_id'] ?? 0);

        if ($schedule_id) {
            db_query("UPDATE school_schedule SET trade=$1,level=$2,section=$3,subject=$4,day_of_week=$5,start_time=$6,end_time=$7,room_number=$8,notes=$9 WHERE id=$10 AND teacher_id=$11",
                     [$class_trade,$class_level,$class_section,$subject,$day_of_week,$start_time,$end_time,$room_number,$notes,$schedule_id,$teacher_id]);
            $msg = '✅ Schedule updated and submitted to admin!';
        } else {
            db_query("INSERT INTO school_schedule (teacher_id,trade,level,section,subject,day_of_week,start_time,end_time,room_number,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
                     [$teacher_id,$class_trade,$class_level,$class_section,$subject,$day_of_week,$start_time,$end_time,$room_number,$notes]);
            $msg = '✅ Schedule submitted to admin!';
        }
    }

    if ($action === 'delete') {
        db_query("DELETE FROM school_schedule WHERE id=$1 AND teacher_id=$2", [(int)$_POST['schedule_id'], $teacher_id]);
        $msg = '✅ Schedule entry removed.';
    }
}

// My schedules
$my_schedules = db_fetch_all(db_query(
    "SELECT * FROM school_schedule WHERE teacher_id=$1 ORDER BY CASE day_of_week WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 ELSE 6 END, start_time",
    [$teacher_id]
));

// My classes (for attendance)
$my_classes = db_fetch_all(db_query(
    "SELECT DISTINCT trade, level, section FROM school_schedule WHERE teacher_id=$1 ORDER BY trade, level, section",
    [$teacher_id]
));

$days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
$trades = db_fetch_all(db_query("SELECT DISTINCT trade FROM students ORDER BY trade"));
$levels = ['L1','L2','L3','L4','L5','L6'];
$sections = ['A','B','C','D','E'];
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Report Schedule - ESSJT</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f5f5}
.header{background:linear-gradient(135deg,#1a73e8,#42a5f5);color:white;padding:15px 30px;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:1.4em}.back-btn{background:white;color:#1a73e8;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600}
.container{max-width:1200px;margin:25px auto;padding:0 20px}
.msg{padding:12px 18px;border-radius:8px;margin-bottom:16px;font-weight:600;background:#e8f5e9;color:#2e7d32;border-left:4px solid #4caf50}
.card{background:white;border-radius:12px;padding:22px;margin-bottom:20px;box-shadow:0 4px 15px rgba(0,0,0,.08)}
h2{font-size:1.05em;color:#444;margin-bottom:16px}
.form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}
label{display:block;font-weight:600;color:#555;margin-bottom:5px;font-size:.88em}
input,select,textarea{width:100%;padding:10px 12px;border:2px solid #e0e0e0;border-radius:8px;font-size:.92em}
input:focus,select:focus,textarea:focus{outline:none;border-color:#1a73e8}
.btn{padding:10px 22px;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:.92em}
.btn-blue{background:#1a73e8;color:white}.btn-red{background:#e53935;color:white;padding:5px 12px;font-size:.82em}
.btn-edit{background:#f57c00;color:white;padding:5px 12px;font-size:.82em;border:none;border-radius:6px;cursor:pointer}
table{width:100%;border-collapse:collapse}
th{background:linear-gradient(135deg,#1a73e8,#42a5f5);color:white;padding:11px 10px;text-align:left;font-size:.85em}
td{padding:10px;border-bottom:1px solid #f0f0f0;font-size:.87em}tr:hover{background:#f0f8ff}
.day-badge{padding:3px 10px;border-radius:20px;font-size:.8em;font-weight:700;background:#e3f2fd;color:#1565c0}
.no-data{text-align:center;padding:40px;color:#999}
.info-box{background:#e3f2fd;border-left:4px solid #1a73e8;padding:14px;border-radius:8px;margin-bottom:18px;color:#1565c0;font-size:.9em}
</style>
</head><body>
<div class="header">
    <div style="display:flex;align-items:center;gap:15px">
        <img src="../assets/essjt-logo.png" style="width:45px;height:45px;object-fit:contain" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <h1>📅 Report My Schedule</h1>
    </div>
    <a href="dashboard.php" class="back-btn">← Dashboard</a>
</div>
<div class="container">
<?php if ($msg): ?><div class="msg"><?php echo $msg; ?></div><?php endif; ?>

<div class="info-box">
    ℹ️ As a teacher, you report your class schedule here. The admin can then view and approve all teacher schedules.
    Fill in your classes for each day of the week.
</div>

<!-- SUBMIT SCHEDULE FORM -->
<div class="card">
    <h2>📝 Report a Class Schedule</h2>
    <form method="POST" id="schedForm">
        <input type="hidden" name="action" value="submit_schedule">
        <input type="hidden" name="schedule_id" id="sched_id" value="0">
        <div class="form-grid">
            <div>
                <label>Trade / Department *</label>
                <select name="class_trade" id="f_trade" required>
                    <option value="">-- Select Trade --</option>
                    <?php foreach ($trades as $t): ?>
                    <option value="<?php echo htmlspecialchars($t['trade']); ?>"><?php echo htmlspecialchars($t['trade']); ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div>
                <label>Level *</label>
                <select name="class_level" id="f_level" required>
                    <option value="">-- Select Level --</option>
                    <?php foreach ($levels as $l): ?><option value="<?php echo $l; ?>"><?php echo $l; ?></option><?php endforeach; ?>
                </select>
            </div>
            <div>
                <label>Section *</label>
                <select name="class_section" id="f_section" required>
                    <?php foreach ($sections as $s): ?><option value="<?php echo $s; ?>"><?php echo $s; ?></option><?php endforeach; ?>
                </select>
            </div>
            <div>
                <label>Subject *</label>
                <input type="text" name="subject" id="f_subject" placeholder="e.g. Mathematics" required>
            </div>
            <div>
                <label>Day of Week *</label>
                <select name="day_of_week" id="f_day" required>
                    <?php foreach ($days as $d): ?><option value="<?php echo $d; ?>"><?php echo $d; ?></option><?php endforeach; ?>
                </select>
            </div>
            <div>
                <label>Start Time *</label>
                <input type="time" name="start_time" id="f_start" required value="07:30">
            </div>
            <div>
                <label>End Time *</label>
                <input type="time" name="end_time" id="f_end" required value="09:00">
            </div>
            <div>
                <label>Room / Location</label>
                <input type="text" name="room" id="f_room" placeholder="e.g. Room 12">
            </div>
        </div>
        <div style="margin-top:12px">
            <label>Notes (optional)</label>
            <textarea name="notes" id="f_notes" rows="2" placeholder="Any additional notes for admin..."></textarea>
        </div>
        <div style="margin-top:16px;display:flex;gap:10px">
            <button type="submit" class="btn btn-blue" id="submitBtn">📤 Submit to Admin</button>
            <button type="button" class="btn" style="background:#f0f0f0;color:#555" onclick="resetForm()">✕ Clear</button>
        </div>
    </form>
</div>

<!-- MY SCHEDULE TABLE -->
<div class="card">
    <h2>📋 My Submitted Schedules (<?php echo count($my_schedules); ?> entries)</h2>
    <?php if (empty($my_schedules)): ?>
    <div class="no-data">📭 No schedules submitted yet. Use the form above to report your classes.</div>
    <?php else: ?>
    <table>
        <tr><th>Day</th><th>Class</th><th>Subject</th><th>Time</th><th>Room</th><th>Notes</th><th>Actions</th></tr>
        <?php foreach ($my_schedules as $s): ?>
        <tr>
            <td><span class="day-badge"><?php echo $s['day_of_week']; ?></span></td>
            <td><strong><?php echo $s['trade']; ?></strong> <?php echo $s['level']; ?><?php echo $s['section']; ?></td>
            <td><?php echo htmlspecialchars($s['subject']); ?></td>
            <td><?php echo substr($s['start_time'],0,5); ?> – <?php echo substr($s['end_time'],0,5); ?></td>
            <td><?php echo htmlspecialchars($s['room_number'] ?? '—'); ?></td>
            <td style="max-width:200px;font-size:.82em;color:#888"><?php echo htmlspecialchars($s['notes'] ?? ''); ?></td>
            <td style="white-space:nowrap">
                <button class="btn-edit" onclick="editSched(<?php echo $s['id']; ?>,'<?php echo addslashes($s['trade']); ?>','<?php echo $s['level']; ?>','<?php echo $s['section']; ?>','<?php echo addslashes($s['subject']); ?>','<?php echo $s['day_of_week']; ?>','<?php echo $s['start_time']; ?>','<?php echo $s['end_time']; ?>','<?php echo addslashes($s['room_number']??''); ?>','<?php echo addslashes($s['notes']??''); ?>')">✏️ Edit</button>
                <form method="POST" style="display:inline" onsubmit="return confirm('Remove this schedule?')">
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="schedule_id" value="<?php echo $s['id']; ?>">
                    <button type="submit" class="btn btn-red">🗑</button>
                </form>
            </td>
        </tr>
        <?php endforeach; ?>
    </table>
    <?php endif; ?>
</div>
</div>
<script>
function editSched(id,trade,level,section,subject,day,start,end,room,notes) {
    document.getElementById('sched_id').value=id;
    document.getElementById('f_trade').value=trade;
    document.getElementById('f_level').value=level;
    document.getElementById('f_section').value=section;
    document.getElementById('f_subject').value=subject;
    document.getElementById('f_day').value=day;
    document.getElementById('f_start').value=start.substring(0,5);
    document.getElementById('f_end').value=end.substring(0,5);
    document.getElementById('f_room').value=room;
    document.getElementById('f_notes').value=notes;
    document.getElementById('submitBtn').textContent='💾 Update Schedule';
    window.scrollTo({top:0,behavior:'smooth'});
}
function resetForm() {
    document.getElementById('schedForm').reset();
    document.getElementById('sched_id').value='0';
    document.getElementById('submitBtn').textContent='📤 Submit to Admin';
}
</script>
</body></html>
