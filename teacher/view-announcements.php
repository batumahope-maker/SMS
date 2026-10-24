<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id'])) { header('Location: login.php'); exit(); }
$role = $_SESSION['role'];
$stmt = $pdo->prepare("SELECT a.*, u.full_name as author FROM announcements a JOIN users u ON a.created_by=u.id WHERE a.target_audience IN ('All', ?) ORDER BY CASE a.priority WHEN 'Urgent' THEN 1 WHEN 'High' THEN 2 WHEN 'Normal' THEN 3 ELSE 4 END, a.created_at DESC");
$stmt->execute([ucfirst($role).'s']);
$announcements = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Announcements - ESSJT</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f5f5}
.header{background:linear-gradient(135deg,#f4511e,#ff8a65);color:white;padding:15px 30px;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:1.4em}.back-btn{background:white;color:#f4511e;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600}
.container{max-width:900px;margin:30px auto;padding:0 20px}
.card{background:white;border-radius:12px;padding:25px;margin-bottom:20px;box-shadow:0 4px 15px rgba(0,0,0,0.08);border-left:5px solid #ddd}
.card.urgent{border-color:#e53935;background:#fff8f8}.card.high{border-color:#ff9800;background:#fffbf0}
.card.normal{border-color:#1a73e8}.card.low{border-color:#9e9e9e}
.priority-badge{display:inline-block;padding:3px 12px;border-radius:20px;font-size:0.8em;font-weight:700;margin-bottom:10px}
.badge-urgent{background:#e53935;color:white}.badge-high{background:#ff9800;color:white}
.badge-normal{background:#1a73e8;color:white}.badge-low{background:#9e9e9e;color:white}
.card h3{font-size:1.2em;color:#333;margin-bottom:10px}.card p{color:#555;line-height:1.7}
.card-meta{color:#999;font-size:0.85em;margin-top:12px}
.empty{text-align:center;padding:60px;color:#999;font-size:1.2em}
</style></head><body>
<div class="header">
    <div style="display:flex;align-items:center;gap:15px">
        <img src="../assets/essjt-logo.png" style="width:45px;height:45px;object-fit:contain" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <h1>📢 School Announcements</h1>
    </div>
    <a href="dashboard.php" class="back-btn">← Back to Dashboard</a>
</div>
<div class="container">
<?php if (empty($announcements)): ?>
    <div class="empty">📭 No announcements at this time. Check back later!</div>
<?php else: foreach ($announcements as $a): $p = strtolower($a['priority']); ?>
    <div class="card <?php echo $p; ?>">
        <span class="priority-badge badge-<?php echo $p; ?>"><?php echo $a['priority']; ?></span>
        <h3><?php echo htmlspecialchars($a['title']); ?></h3>
        <p><?php echo nl2br(htmlspecialchars($a['content'])); ?></p>
        <div class="card-meta">👤 <?php echo htmlspecialchars($a['author']); ?> &bull; 📅 <?php echo date('d M Y', strtotime($a['created_at'])); ?> &bull; 🎯 For: <?php echo $a['target_audience']; ?></div>
    </div>
<?php endforeach; endif; ?>
</div></body></html>
