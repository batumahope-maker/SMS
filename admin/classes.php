<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') { header('Location: login.php'); exit(); }

$sel_trade = trim($_GET['trade'] ?? '');
$sel_level = trim($_GET['level'] ?? '');
$sel_sec   = trim($_GET['section'] ?? '');

$cg = $pdo->query("SELECT s.trade, s.level, s.section, COUNT(u.id) as student_count FROM students s JOIN users u ON s.user_id=u.id WHERE u.role='student' GROUP BY s.trade, s.level, s.section ORDER BY s.trade, s.level, s.section");
$class_groups = $cg->fetchAll(PDO::FETCH_ASSOC);

$by_trade = [];
foreach ($class_groups as $c) $by_trade[$c['trade']][] = $c;
$total_students = array_sum(array_column($class_groups,'student_count'));
$total_classes  = count($class_groups);

$class_students = [];
if ($sel_trade && $sel_level && $sel_sec) {
    $sq = $pdo->prepare("SELECT u.id,u.username,u.full_name,u.phone,u.email,u.status,s.gender FROM users u JOIN students s ON u.id=s.user_id WHERE u.role='student' AND s.trade=? AND s.level=? AND s.section=? ORDER BY u.full_name");
    $sq->execute([$sel_trade, $sel_level, $sel_sec]);
    $class_students = $sq->fetchAll(PDO::FETCH_ASSOC);
}
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Classes - ESSJT</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f5f5}
.header{background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:15px 30px;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:1.4em}.back-btn{background:white;color:#764ba2;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600}
.container{max-width:1400px;margin:25px auto;padding:0 20px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-bottom:22px}
.stat{background:white;border-radius:12px;padding:18px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,.07);border-top:4px solid #764ba2}
.stat-n{font-size:2.2em;font-weight:800;color:#764ba2}.stat-l{color:#888;font-size:.85em;margin-top:4px}
.trade-section{background:white;border-radius:14px;margin-bottom:20px;box-shadow:0 4px 15px rgba(0,0,0,.08);overflow:hidden}
.trade-header{background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:14px 22px;display:flex;justify-content:space-between;align-items:center}
.trade-header h2{font-size:1.1em}
.trade-total{background:rgba(255,255,255,.25);padding:4px 14px;border-radius:20px;font-size:.85em;font-weight:700}
.classes-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;padding:16px}
.class-card{background:#f8f9ff;border:2px solid #e8eaff;border-radius:10px;padding:14px;text-align:center;cursor:pointer;transition:.2s;text-decoration:none;display:block;color:#333}
.class-card:hover{border-color:#764ba2;background:#ede7f6;transform:translateY(-2px)}
.class-name{font-size:1.3em;font-weight:800;color:#764ba2;margin-bottom:5px}
.class-count{font-size:2em;font-weight:900;color:#333;line-height:1}
.class-label{font-size:.78em;color:#888;margin-top:3px}
.level-group{padding:0 16px 16px}
.level-title{font-weight:700;color:#555;font-size:.88em;text-transform:uppercase;letter-spacing:.5px;margin:12px 0 8px;padding:6px 10px;background:#f0f0f0;border-radius:6px}
.student-panel{background:white;border-radius:14px;padding:22px;margin-bottom:20px;box-shadow:0 4px 15px rgba(0,0,0,.08)}
.breadcrumb{background:#ede7f6;padding:10px 18px;border-radius:8px;margin-bottom:16px;font-size:.9em;color:#764ba2}
table{width:100%;border-collapse:collapse}
th{background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:11px 10px;text-align:left;font-size:.85em}
td{padding:10px;border-bottom:1px solid #f0f0f0;font-size:.87em}tr:hover{background:#f8f9ff}
.badge{padding:3px 9px;border-radius:20px;font-size:.78em;font-weight:700}
.Active{background:#e8f5e9;color:#2e7d32}.Pending{background:#fff3e0;color:#e65100}.Suspended{background:#ffebee;color:#c62828}
</style></head><body>
<div class="header">
    <div style="display:flex;align-items:center;gap:15px">
        <img src="../assets/essjt-logo.png" style="width:45px;height:45px;object-fit:contain" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <h1>🏫 Classes & Students</h1>
    </div>
    <a href="control_panel.php" class="back-btn">← Back to Panel</a>
</div>
<div class="container">
<div class="stats">
    <div class="stat"><div class="stat-n"><?php echo count($by_trade); ?></div><div class="stat-l">Trades</div></div>
    <div class="stat"><div class="stat-n"><?php echo $total_classes; ?></div><div class="stat-l">Total Classes</div></div>
    <div class="stat"><div class="stat-n"><?php echo number_format($total_students); ?></div><div class="stat-l">Total Students</div></div>
</div>

<?php if ($sel_trade && $sel_level && $sel_sec && !empty($class_students)): ?>
<div class="breadcrumb">🏫 <a href="classes.php" style="color:#764ba2;text-decoration:none">All Classes</a> → <strong><?php echo htmlspecialchars($sel_trade); ?></strong> → <?php echo $sel_level.$sel_sec; ?> (<?php echo count($class_students); ?> students)</div>
<div class="student-panel">
    <div style="display:flex;justify-content:space-between;margin-bottom:18px">
        <h3 style="color:#764ba2">👥 <?php echo htmlspecialchars($sel_trade); ?> — <?php echo $sel_level.$sel_sec; ?></h3>
        <a href="classes.php" style="background:#f0f0f0;color:#555;padding:8px 16px;border-radius:8px;text-decoration:none;font-size:.88em;font-weight:600">← All Classes</a>
    </div>
    <table>
        <tr><th>#</th><th>Student Name</th><th>Student ID</th><th>Gender</th><th>Phone</th><th>Email</th><th>Status</th></tr>
        <?php foreach ($class_students as $i => $s): ?>
        <tr>
            <td style="color:#888"><?php echo $i+1; ?></td>
            <td style="font-weight:700"><?php echo htmlspecialchars($s['full_name']); ?></td>
            <td style="color:#764ba2;font-weight:700"><?php echo $s['username']; ?></td>
            <td><?php echo $s['gender']??'—'; ?></td>
            <td><?php echo htmlspecialchars($s['phone']??'—'); ?></td>
            <td><?php echo htmlspecialchars($s['email']); ?></td>
            <td><span class="badge <?php echo $s['status']; ?>"><?php echo $s['status']; ?></span></td>
        </tr>
        <?php endforeach; ?>
    </table>
</div>

<?php else: ?>
<?php foreach ($by_trade as $trade => $classes):
    $trade_total = array_sum(array_column($classes,'student_count'));
    $by_level = [];
    foreach ($classes as $c) $by_level[$c['level']][] = $c;
    ksort($by_level);
?>
<div class="trade-section">
    <div class="trade-header"><h2>🏭 <?php echo htmlspecialchars($trade); ?></h2><span class="trade-total"><?php echo $trade_total; ?> students</span></div>
    <?php foreach ($by_level as $level => $lclasses): ?>
    <div class="level-group">
        <div class="level-title">📚 Level <?php echo $level; ?></div>
        <div class="classes-grid">
            <?php foreach ($lclasses as $c): ?>
            <a href="?trade=<?php echo urlencode($c['trade']); ?>&level=<?php echo urlencode($c['level']); ?>&section=<?php echo urlencode($c['section']); ?>" class="class-card">
                <div class="class-name"><?php echo $c['level'].$c['section']; ?></div>
                <div class="class-count"><?php echo $c['student_count']; ?></div>
                <div class="class-label">students</div>
            </a>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endforeach; ?>
</div>
<?php endforeach; ?>
<?php if (empty($by_trade)): ?>
<div style="background:white;border-radius:12px;padding:60px;text-align:center;color:#999">📭 No classes found.</div>
<?php endif; ?>
<?php endif; ?>
</div></body></html>
