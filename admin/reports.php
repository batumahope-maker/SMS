<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') { header('Location: login.php'); exit(); }

$total_students  = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='student' AND status='Active'")->fetchColumn();
$total_teachers  = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='teacher' AND status='Active'")->fetchColumn();
$pending         = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='student' AND status='Pending'")->fetchColumn();
$total_payments  = (float)$pdo->query("SELECT COALESCE(SUM(amount),0) FROM payments")->fetchColumn();
$total_salaries  = (float)$pdo->query("SELECT COALESCE(SUM(net_salary),0) FROM teacher_salaries WHERE payment_status='Paid'")->fetchColumn();
$avg_attendance  = $pdo->query("SELECT ROUND(AVG(CASE WHEN status='Present' THEN 100 ELSE 0 END),1) FROM attendance")->fetchColumn() ?? 0;
$avg_marks       = $pdo->query("SELECT ROUND(AVG((marks/max_marks)*100),1) FROM marks")->fetchColumn() ?? 0;
$upcoming_events = (int)$pdo->query("SELECT COUNT(*) FROM school_events WHERE event_date >= CURDATE() AND is_active=1")->fetchColumn();

$ts = $pdo->query("SELECT s.trade, COUNT(*) as total FROM students s JOIN users u ON s.user_id=u.id WHERE u.status='Active' GROUP BY s.trade ORDER BY total DESC");
$trade_stats = $ts->fetchAll(PDO::FETCH_ASSOC);

$mp = $pdo->query("SELECT DATE_FORMAT(payment_date,'%M %Y') as month, SUM(amount) as total FROM payments GROUP BY DATE_FORMAT(payment_date,'%Y-%m'), DATE_FORMAT(payment_date,'%M %Y') ORDER BY DATE_FORMAT(payment_date,'%Y-%m') DESC LIMIT 6");
$monthly_payments = $mp->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reports - ESSJT Admin</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f5f5}
.header{background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:15px 30px;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:1.4em}.back-btn{background:white;color:#764ba2;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600}
.container{max-width:1100px;margin:30px auto;padding:0 20px}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:15px;margin-bottom:25px}
.stat{background:white;padding:20px;border-radius:12px;text-align:center;box-shadow:0 4px 15px rgba(0,0,0,.08)}
.stat-icon{font-size:2em;margin-bottom:8px}.stat-num{font-size:1.8em;font-weight:700}.stat-label{color:#666;font-size:.85em;margin-top:5px}
.section-card{background:white;border-radius:12px;padding:25px;margin-bottom:25px;box-shadow:0 4px 15px rgba(0,0,0,.08)}
.section-title{font-size:1.1em;font-weight:700;color:#333;margin-bottom:15px;padding-bottom:10px;border-bottom:2px solid #f0f0f0}
table{width:100%;border-collapse:collapse}
th{background:#f8f9fa;padding:10px;text-align:left;font-weight:600;color:#555;font-size:.9em}
td{padding:10px;border-bottom:1px solid #f0f0f0}
.bar{height:8px;background:#eee;border-radius:4px;overflow:hidden;margin-top:4px}
.bar-fill{height:100%;background:linear-gradient(to right,#667eea,#764ba2);border-radius:4px}
</style></head><body>
<div class="header">
    <div style="display:flex;align-items:center;gap:15px">
        <img src="../assets/essjt-logo.png" style="width:45px;height:45px;object-fit:contain" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <h1>📈 School Reports</h1>
    </div>
    <a href="control_panel.php" class="back-btn">← Back to Panel</a>
</div>
<div class="container">
<div class="stats-grid">
    <div class="stat"><div class="stat-icon">🎓</div><div class="stat-num" style="color:#667eea"><?php echo $total_students; ?></div><div class="stat-label">Active Students</div></div>
    <div class="stat"><div class="stat-icon">👨‍🏫</div><div class="stat-num" style="color:#1a73e8"><?php echo $total_teachers; ?></div><div class="stat-label">Teachers</div></div>
    <div class="stat"><div class="stat-icon">⏳</div><div class="stat-num" style="color:#f4511e"><?php echo $pending; ?></div><div class="stat-label">Pending</div></div>
    <div class="stat"><div class="stat-icon">💰</div><div class="stat-num" style="color:#ff9800;font-size:1.2em"><?php echo number_format($total_payments,0); ?></div><div class="stat-label">Total Fees (RWF)</div></div>
    <div class="stat"><div class="stat-icon">💼</div><div class="stat-num" style="color:#9c27b0;font-size:1.2em"><?php echo number_format($total_salaries,0); ?></div><div class="stat-label">Salaries Paid (RWF)</div></div>
    <div class="stat"><div class="stat-icon">📋</div><div class="stat-num" style="color:#4caf50"><?php echo $avg_attendance; ?>%</div><div class="stat-label">Avg Attendance</div></div>
    <div class="stat"><div class="stat-icon">📊</div><div class="stat-num" style="color:#11998e"><?php echo $avg_marks; ?>%</div><div class="stat-label">Avg Grade</div></div>
    <div class="stat"><div class="stat-icon">🎉</div><div class="stat-num" style="color:#e91e63"><?php echo $upcoming_events; ?></div><div class="stat-label">Upcoming Events</div></div>
</div>
<div class="section-card">
    <div class="section-title">🎓 Students by Trade</div>
    <?php if (empty($trade_stats)): ?>
    <p style="color:#999;text-align:center;padding:20px">No student data yet.</p>
    <?php else:
    $max = max(array_column($trade_stats,'total')); ?>
    <table><tr><th>Trade</th><th>Students</th><th>Distribution</th></tr>
    <?php foreach ($trade_stats as $t): $pct=$total_students>0?round(($t['total']/$total_students)*100,1):0; ?>
    <tr>
        <td><?php echo htmlspecialchars($t['trade']??'Unknown'); ?></td>
        <td><strong><?php echo $t['total']; ?></strong> (<?php echo $pct; ?>%)</td>
        <td style="width:200px"><div class="bar"><div class="bar-fill" style="width:<?php echo round(($t['total']/$max)*100); ?>%"></div></div></td>
    </tr>
    <?php endforeach; endif; ?>
    </table>
</div>
<div class="section-card">
    <div class="section-title">💰 Monthly Fee Collections</div>
    <?php if (empty($monthly_payments)): ?>
    <p style="color:#999;text-align:center;padding:20px">No payment data yet.</p>
    <?php else: ?>
    <table><tr><th>Month</th><th>Total Collected</th></tr>
    <?php foreach ($monthly_payments as $p): ?>
    <tr><td><?php echo $p['month']; ?></td><td><strong><?php echo number_format($p['total'],0); ?> RWF</strong></td></tr>
    <?php endforeach; endif; ?>
    </table>
</div>
</div></body></html>
