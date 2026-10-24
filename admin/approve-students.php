<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') { header('Location: login.php'); exit(); }

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = (int)$_POST['id'];
    $action = $_POST['action'];
    if ($action === 'approve') { $s = $pdo->prepare("UPDATE users SET status='Active' WHERE id=?"); $s->execute([$id]); }
    elseif ($action === 'reject') { $s = $pdo->prepare("UPDATE users SET status='Suspended' WHERE id=?"); $s->execute([$id]); }
    header('Location: approve-students.php'); exit();
}
$stmt = $pdo->query("SELECT u.*,s.trade,s.level,s.section FROM users u LEFT JOIN students s ON u.id=s.user_id WHERE u.role='student' AND u.status='Pending' ORDER BY u.created_at DESC");
$pending = $stmt->fetchAll(PDO::FETCH_ASSOC);
$stmt2 = $pdo->query("SELECT COUNT(*) as c FROM users WHERE role='student' AND status='Active'");
$approved = (int)$stmt2->fetch(PDO::FETCH_ASSOC)['c'];
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Approve Students - ESSJT</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f5f5}
.header{background:linear-gradient(135deg,#e53935,#ef5350);color:white;padding:15px 30px;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:1.4em}.back-btn{background:white;color:#e53935;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600}
.container{max-width:1100px;margin:30px auto;padding:0 20px}
.stats{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:25px}
.stat{background:white;padding:20px;border-radius:12px;text-align:center;box-shadow:0 4px 15px rgba(0,0,0,.08)}
.stat-num{font-size:2.5em;font-weight:700}.stat-label{color:#666}
.card{background:white;border-radius:12px;padding:20px;margin-bottom:15px;box-shadow:0 4px 15px rgba(0,0,0,.08);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:15px}
.student-info h3{color:#333;margin-bottom:5px}.student-info p{color:#666;font-size:.9em}
.badge{display:inline-block;padding:3px 12px;border-radius:20px;font-size:.82em;font-weight:700;background:#fff3e0;color:#e65100;margin-top:5px}
.actions{display:flex;gap:10px}
.approve-btn,.reject-btn{padding:10px 25px;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:.95em}
.approve-btn{background:#4caf50;color:white}.reject-btn{background:#e53935;color:white}
.empty{text-align:center;padding:60px;background:white;border-radius:12px;color:#666;font-size:1.1em}
</style></head><body>
<div class="header">
    <div style="display:flex;align-items:center;gap:15px">
        <img src="../assets/essjt-logo.png" style="width:45px;height:45px;object-fit:contain" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <h1>✅ Approve Students</h1>
    </div>
    <a href="control_panel.php" class="back-btn">← Back to Panel</a>
</div>
<div class="container">
    <div class="stats">
        <div class="stat"><div class="stat-num" style="color:#e53935"><?php echo count($pending); ?></div><div class="stat-label">⏳ Pending</div></div>
        <div class="stat"><div class="stat-num" style="color:#4caf50"><?php echo $approved; ?></div><div class="stat-label">✅ Active Students</div></div>
    </div>
    <?php if (empty($pending)): ?>
        <div class="empty">🎉 No pending registrations!</div>
    <?php else: foreach ($pending as $s): ?>
        <div class="card">
            <div class="student-info">
                <h3>👤 <?php echo htmlspecialchars($s['full_name']); ?></h3>
                <p>📧 <?php echo $s['email']; ?> &bull; 📱 <?php echo $s['phone']??'N/A'; ?></p>
                <p>🎓 <?php echo $s['trade']??'N/A'; ?> | Level: <?php echo $s['level']??'N/A'; ?> | Section: <?php echo $s['section']??'N/A'; ?></p>
                <p>📅 Registered: <?php echo date('d M Y H:i', strtotime($s['created_at'])); ?></p>
                <span class="badge">⏳ Pending</span>
            </div>
            <div class="actions">
                <form method="POST"><input type="hidden" name="id" value="<?php echo $s['id']; ?>"><input type="hidden" name="action" value="approve"><button type="submit" class="approve-btn">✅ Approve</button></form>
                <form method="POST"><input type="hidden" name="id" value="<?php echo $s['id']; ?>"><input type="hidden" name="action" value="reject"><button type="submit" class="reject-btn" onclick="return confirm('Reject?')">❌ Reject</button></form>
            </div>
        </div>
    <?php endforeach; endif; ?>
</div></body></html>
