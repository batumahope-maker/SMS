<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'student') { header('Location: login.php'); exit(); }
$user_id = $_SESSION['user_id'];
$stmt = $pdo->prepare("SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC");
$stmt->execute([$user_id]);
$records = $stmt->fetchAll(PDO::FETCH_ASSOC);
$total   = count($records);
$present = count(array_filter($records, fn($r) => $r['status']==='Present'));
$absent  = count(array_filter($records, fn($r) => $r['status']==='Absent'));
$late    = count(array_filter($records, fn($r) => $r['status']==='Late'));
$pct     = $total > 0 ? round(($present/$total)*100, 1) : 0;
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>My Attendance - ESSJT</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f5f5}
.header{background:linear-gradient(135deg,#4caf50,#81c784);color:white;padding:15px 30px;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:1.4em}.back-btn{background:white;color:#4caf50;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600}
.container{max-width:900px;margin:30px auto;padding:0 20px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-bottom:25px}
.stat{background:white;padding:20px;border-radius:12px;text-align:center;box-shadow:0 4px 15px rgba(0,0,0,0.08)}
.stat-num{font-size:2em;font-weight:700}.stat-label{color:#666;font-size:0.9em}
table{width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.08)}
th{background:#4caf50;color:white;padding:12px;text-align:left}td{padding:12px;border-bottom:1px solid #f0f0f0}
.badge{padding:3px 12px;border-radius:20px;font-weight:700;font-size:0.85em}
.Present{background:#e8f5e9;color:#2e7d32}.Absent{background:#ffebee;color:#c62828}.Late{background:#fff3e0;color:#e65100}
.empty{text-align:center;padding:60px;color:#999}
</style></head><body>
<div class="header">
    <div style="display:flex;align-items:center;gap:15px">
        <img src="../assets/essjt-logo.png" style="width:45px;height:45px;object-fit:contain" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <h1>📋 My Attendance</h1>
    </div>
    <a href="dashboard.php" class="back-btn">← Back to Dashboard</a>
</div>
<div class="container">
<div class="stats">
    <div class="stat"><div class="stat-num" style="color:#4caf50"><?php echo $pct; ?>%</div><div class="stat-label">Attendance Rate</div></div>
    <div class="stat"><div class="stat-num" style="color:#4caf50"><?php echo $present; ?></div><div class="stat-label">Days Present</div></div>
    <div class="stat"><div class="stat-num" style="color:#e53935"><?php echo $absent; ?></div><div class="stat-label">Days Absent</div></div>
    <div class="stat"><div class="stat-num" style="color:#ff9800"><?php echo $late; ?></div><div class="stat-label">Days Late</div></div>
</div>
<?php if (empty($records)): ?>
    <div class="empty" style="background:white;border-radius:12px">📋 No attendance records yet!</div>
<?php else: ?>
<table><tr><th>Date</th><th>Day</th><th>Status</th><th>Notes</th></tr>
<?php foreach ($records as $r): ?>
<tr>
    <td><?php echo date('d M Y', strtotime($r['date'])); ?></td>
    <td><?php echo date('l', strtotime($r['date'])); ?></td>
    <td><span class="badge <?php echo $r['status']; ?>"><?php echo $r['status']; ?></span></td>
    <td><?php echo htmlspecialchars($r['notes'] ?? '-'); ?></td>
</tr>
<?php endforeach; ?>
</table>
<?php endif; ?>
</div></body></html>
