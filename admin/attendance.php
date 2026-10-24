<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') { header('Location: login.php'); exit(); }
$success='';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $act = $_POST['action'];
    if ($act === 'add') {
        $chk = $pdo->prepare("SELECT id FROM attendance WHERE student_id=? AND date=?");
        $chk->execute([(int)$_POST['student_id'], $_POST['date']]);
        if ($chk->fetch()) {
            $upd = $pdo->prepare("UPDATE attendance SET status=?,notes=? WHERE student_id=? AND date=?");
            $upd->execute([$_POST['status'], $_POST['notes']??'', (int)$_POST['student_id'], $_POST['date']]);
            $success = 'Attendance updated!';
        } else {
            $ins = $pdo->prepare("INSERT INTO attendance (student_id,date,status,notes) VALUES (?,?,?,?)");
            $ins->execute([(int)$_POST['student_id'], $_POST['date'], $_POST['status'], $_POST['notes']??'']);
            $success = 'Attendance recorded!';
        }
    } elseif ($act === 'delete') {
        $del = $pdo->prepare("DELETE FROM attendance WHERE id=?");
        $del->execute([(int)$_POST['id']]);
        $success = 'Record deleted!';
    }
}

$s = $pdo->query("SELECT u.id,u.username,u.full_name,s.trade,s.level,s.section FROM users u LEFT JOIN students s ON u.id=s.user_id WHERE u.role='student' AND u.status='Active' ORDER BY u.username");
$students = $s->fetchAll(PDO::FETCH_ASSOC);

$filter_date    = $_GET['date']    ?? date('Y-m-d');
$filter_student = (int)($_GET['student_id'] ?? 0);

if ($filter_student) {
    $r = $pdo->prepare("SELECT a.*,u.full_name,u.username FROM attendance a JOIN users u ON a.student_id=u.id WHERE a.student_id=? ORDER BY a.date DESC");
    $r->execute([$filter_student]);
} else {
    $r = $pdo->prepare("SELECT a.*,u.full_name,u.username FROM attendance a JOIN users u ON a.student_id=u.id WHERE a.date=? ORDER BY u.username");
    $r->execute([$filter_date]);
}
$records = $r->fetchAll(PDO::FETCH_ASSOC);
$present = count(array_filter($records, fn($x)=>$x['status']==='Present'));
$absent  = count(array_filter($records, fn($x)=>$x['status']==='Absent'));
$late    = count(array_filter($records, fn($x)=>$x['status']==='Late'));
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Attendance - ESSJT Admin</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f5f5}
.header{background:linear-gradient(135deg,#4caf50,#81c784);color:white;padding:15px 30px;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:1.4em}.back-btn{background:white;color:#4caf50;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600}
.container{max-width:1100px;margin:30px auto;padding:0 20px}
.form-card,.table-card{background:white;padding:25px;border-radius:12px;margin-bottom:25px;box-shadow:0 4px 15px rgba(0,0,0,.08)}
.form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:15px}
label{display:block;font-weight:600;color:#555;margin-bottom:6px;font-size:.9em}
input,select{width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:.9em}
.submit-btn{padding:12px 25px;background:#4caf50;color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;margin-top:15px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-bottom:20px}
.stat{background:#f8f9fa;padding:15px;border-radius:10px;text-align:center}
.stat-num{font-size:1.8em;font-weight:700}.stat-label{color:#666;font-size:.85em}
.filter-bar{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;align-items:flex-end}
.filter-bar input,.filter-bar select{flex:1;min-width:150px;padding:10px;border:2px solid #e0e0e0;border-radius:8px}
.filter-btn{padding:10px 20px;background:#4caf50;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer}
table{width:100%;border-collapse:collapse}
th{background:linear-gradient(135deg,#4caf50,#81c784);color:white;padding:12px;text-align:left}
td{padding:11px;border-bottom:1px solid #f0f0f0}tr:hover{background:#f8f9fa}
.badge{padding:3px 10px;border-radius:20px;font-weight:700;font-size:.82em}
.Present{background:#e8f5e9;color:#2e7d32}.Absent{background:#ffebee;color:#c62828}.Late{background:#fff3e0;color:#e65100}
.del-btn{background:#ffebee;color:#e53935;border:none;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:.82em;font-weight:600}
.success{background:#e8f5e9;color:#2e7d32;padding:12px;border-radius:8px;margin-bottom:15px}
</style></head><body>
<div class="header">
    <div style="display:flex;align-items:center;gap:15px">
        <img src="../assets/essjt-logo.png" style="width:45px;height:45px;object-fit:contain" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <h1>📋 Manage Attendance</h1>
    </div>
    <a href="control_panel.php" class="back-btn">← Back to Panel</a>
</div>
<div class="container">
<?php if ($success): ?><div class="success">✅ <?php echo $success; ?></div><?php endif; ?>
<div class="form-card">
    <h3 style="margin-bottom:20px">➕ Record Attendance</h3>
    <form method="POST">
        <input type="hidden" name="action" value="add">
        <div class="form-grid">
            <div><label>Student</label>
                <select name="student_id" required>
                    <option value="">-- Select Student --</option>
                    <?php foreach ($students as $s): ?><option value="<?php echo $s['id']; ?>"><?php echo htmlspecialchars($s['username'].' - '.$s['full_name']); ?></option><?php endforeach; ?>
                </select>
            </div>
            <div><label>Date</label><input type="date" name="date" required value="<?php echo date('Y-m-d'); ?>"></div>
            <div><label>Status</label>
                <select name="status" required>
                    <option value="Present">✅ Present</option>
                    <option value="Absent">❌ Absent</option>
                    <option value="Late">⏰ Late</option>
                </select>
            </div>
            <div><label>Notes</label><input type="text" name="notes" placeholder="e.g. Medical excuse"></div>
        </div>
        <button type="submit" class="submit-btn">💾 Save</button>
    </form>
</div>
<div class="table-card">
    <form method="GET" style="margin-bottom:20px">
        <div class="filter-bar">
            <input type="date" name="date" value="<?php echo htmlspecialchars($filter_date); ?>">
            <select name="student_id">
                <option value="">-- All Students --</option>
                <?php foreach ($students as $s): ?><option value="<?php echo $s['id']; ?>" <?php echo $filter_student==$s['id']?'selected':''; ?>><?php echo htmlspecialchars($s['username'].' - '.$s['full_name']); ?></option><?php endforeach; ?>
            </select>
            <button type="submit" class="filter-btn">🔍 Filter</button>
        </div>
    </form>
    <div class="stats">
        <div class="stat"><div class="stat-num" style="color:#4caf50"><?php echo $present; ?></div><div class="stat-label">✅ Present</div></div>
        <div class="stat"><div class="stat-num" style="color:#e53935"><?php echo $absent; ?></div><div class="stat-label">❌ Absent</div></div>
        <div class="stat"><div class="stat-num" style="color:#ff9800"><?php echo $late; ?></div><div class="stat-label">⏰ Late</div></div>
    </div>
    <table>
        <tr><th>Student</th><th>Date</th><th>Status</th><th>Notes</th><th>Action</th></tr>
        <?php if (empty($records)): ?>
        <tr><td colspan="5" style="text-align:center;padding:30px;color:#999">No records found.</td></tr>
        <?php else: foreach ($records as $r): ?>
        <tr>
            <td><?php echo htmlspecialchars($r['username'].' - '.$r['full_name']); ?></td>
            <td><?php echo date('d M Y',strtotime($r['date'])); ?></td>
            <td><span class="badge <?php echo $r['status']; ?>"><?php echo $r['status']; ?></span></td>
            <td><?php echo htmlspecialchars($r['notes']??'-'); ?></td>
            <td><form method="POST"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?php echo $r['id']; ?>">
                <button type="submit" class="del-btn" onclick="return confirm('Delete?')">🗑️</button></form></td>
        </tr>
        <?php endforeach; endif; ?>
    </table>
</div>
</div></body></html>
