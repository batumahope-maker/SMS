<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') { header('Location: login.php'); exit(); }
$success='';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $act = $_POST['action'];
    if ($act === 'add') {
        $tid = !empty($_POST['teacher_id']) ? (int)$_POST['teacher_id'] : null;
        $ins = $pdo->prepare("INSERT INTO school_schedule (day_of_week,start_time,end_time,subject,teacher_id,trade,level,section,room_number) VALUES (?,?,?,?,?,?,?,?,?)");
        $ins->execute([$_POST['day_of_week'],$_POST['start_time'],$_POST['end_time'],$_POST['subject'],$tid,$_POST['class_trade'],$_POST['class_level'],$_POST['class_section'],$_POST['room_number']]);
        $success = 'Schedule entry added!';
    } elseif ($act === 'delete') {
        $del = $pdo->prepare("DELETE FROM school_schedule WHERE id=?"); $del->execute([(int)$_POST['id']]); $success = 'Deleted!';
    }
}
$ts = $pdo->query("SELECT id,full_name FROM users WHERE role='teacher' AND status='Active' ORDER BY full_name");
$teachers = $ts->fetchAll(PDO::FETCH_ASSOC);
$ss = $pdo->query("SELECT s.*,u.full_name as teacher_name FROM school_schedule s LEFT JOIN users u ON s.teacher_id=u.id WHERE s.is_active=1 ORDER BY FIELD(s.day_of_week,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'), s.start_time");
$schedule = $ss->fetchAll(PDO::FETCH_ASSOC);
$by_day=[]; foreach ($schedule as $s) $by_day[$s['day_of_week']][] = $s;
$days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
$day_colors=['Monday'=>'#1a73e8','Tuesday'=>'#e53935','Wednesday'=>'#11998e','Thursday'=>'#9c27b0','Friday'=>'#f4511e','Saturday'=>'#607d8b'];
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Class Schedule - ESSJT Admin</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f5f5}
.header{background:linear-gradient(135deg,#1a73e8,#42a5f5);color:white;padding:15px 30px;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:1.4em}.back-btn{background:white;color:#1a73e8;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600}
.container{max-width:1100px;margin:30px auto;padding:0 20px}
.form-card{background:white;padding:25px;border-radius:12px;margin-bottom:25px;box-shadow:0 4px 15px rgba(0,0,0,.08)}
.form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:15px}
label{display:block;font-weight:600;color:#555;margin-bottom:6px;font-size:.9em}
input,select{width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:.9em}
.submit-btn{padding:12px 30px;background:#1a73e8;color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;margin-top:15px}
.day-section{background:white;border-radius:12px;margin-bottom:20px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,.08)}
.day-header{color:white;padding:12px 20px;font-weight:700;font-size:1.05em}
table{width:100%;border-collapse:collapse}
th{background:#f8f9fa;padding:10px;text-align:left;font-size:.9em;color:#555}
td{padding:10px;border-bottom:1px solid #f0f0f0;font-size:.9em}
.del-btn{background:#ffebee;color:#e53935;border:none;padding:5px 12px;border-radius:6px;cursor:pointer;font-weight:600;font-size:.82em}
.success{background:#e8f5e9;color:#2e7d32;padding:12px;border-radius:8px;margin-bottom:15px}
</style></head><body>
<div class="header">
    <div style="display:flex;align-items:center;gap:15px">
        <img src="../assets/essjt-logo.png" style="width:45px;height:45px;object-fit:contain" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <h1>📅 Manage Class Schedule</h1>
    </div>
    <a href="control_panel.php" class="back-btn">← Back to Panel</a>
</div>
<div class="container">
<?php if ($success): ?><div class="success">✅ <?php echo $success; ?></div><?php endif; ?>
<div class="form-card">
    <h3 style="margin-bottom:20px">➕ Add Schedule Entry</h3>
    <form method="POST">
        <input type="hidden" name="action" value="add">
        <div class="form-grid">
            <div><label>Day</label>
                <select name="day_of_week" required>
                    <?php foreach (['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] as $d): ?><option value="<?php echo $d; ?>"><?php echo $d; ?></option><?php endforeach; ?>
                </select>
            </div>
            <div><label>Start Time</label><input type="time" name="start_time" required></div>
            <div><label>End Time</label><input type="time" name="end_time" required></div>
            <div><label>Subject</label><input type="text" name="subject" required placeholder="e.g. Mathematics"></div>
            <div><label>Teacher</label>
                <select name="teacher_id">
                    <option value="">-- Select Teacher --</option>
                    <?php foreach ($teachers as $t): ?><option value="<?php echo $t['id']; ?>"><?php echo htmlspecialchars($t['full_name']); ?></option><?php endforeach; ?>
                </select>
            </div>
            <div><label>Trade</label>
                <select name="class_trade" required>
                    <option value="">-- Select Trade --</option>
                    <?php foreach (['Software Development','Electronics & Telecom','Tourism','Accounting','Food and Beverages','Automobile','Building and Construction','Mechanics'] as $tr): ?><option value="<?php echo $tr; ?>"><?php echo $tr; ?></option><?php endforeach; ?>
                </select>
            </div>
            <div><label>Level</label>
                <select name="class_level" required>
                    <?php foreach (['L3','L4','L5'] as $l): ?><option value="<?php echo $l; ?>"><?php echo $l; ?></option><?php endforeach; ?>
                </select>
            </div>
            <div><label>Section</label>
                <select name="class_section" required>
                    <?php foreach (['A','B'] as $s): ?><option value="<?php echo $s; ?>"><?php echo $s; ?></option><?php endforeach; ?>
                </select>
            </div>
            <div><label>Room Number</label><input type="text" name="room_number" placeholder="e.g. 101"></div>
        </div>
        <button type="submit" class="submit-btn">📅 Add to Schedule</button>
    </form>
</div>
<h3 style="margin-bottom:15px;color:#333">📋 Current Schedule (<?php echo count($schedule); ?> entries)</h3>
<?php if (empty($schedule)): ?>
    <div style="text-align:center;padding:40px;background:white;border-radius:12px;color:#999">No schedule entries yet.</div>
<?php else: foreach ($days as $day): if (!isset($by_day[$day])) continue; ?>
<div class="day-section">
    <div class="day-header" style="background:<?php echo $day_colors[$day]; ?>">📅 <?php echo $day; ?> (<?php echo count($by_day[$day]); ?> classes)</div>
    <table>
        <tr><th>Time</th><th>Subject</th><th>Teacher</th><th>Class</th><th>Room</th><th>Action</th></tr>
        <?php foreach ($by_day[$day] as $p): ?>
        <tr>
            <td><?php echo date('h:i A',strtotime($p['start_time'])); ?> - <?php echo date('h:i A',strtotime($p['end_time'])); ?></td>
            <td><strong><?php echo htmlspecialchars($p['subject']); ?></strong></td>
            <td><?php echo htmlspecialchars($p['teacher_name']??'N/A'); ?></td>
            <td><?php echo $p['trade'].'-'.$p['level'].'-'.$p['section']; ?></td>
            <td><?php echo htmlspecialchars($p['room_number']??'-'); ?></td>
            <td><form method="POST" style="display:inline"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?php echo $p['id']; ?>"><button type="submit" class="del-btn" onclick="return confirm('Delete?')">🗑️</button></form></td>
        </tr>
        <?php endforeach; ?>
    </table>
</div>
<?php endforeach; endif; ?>
</div></body></html>
