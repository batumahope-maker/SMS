<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') { header('Location: login.php'); exit(); }
$admin_id = $_SESSION['user_id'];
$success='';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $act = $_POST['action'];
    if ($act === 'add') {
        $ins = $pdo->prepare("INSERT INTO announcements (title,content,target_audience,priority,created_by) VALUES (?,?,?,?,?)");
        $ins->execute([$_POST['title'],$_POST['content'],$_POST['target_audience'],$_POST['priority'],$admin_id]);
        $success = 'Announcement posted!';
    } elseif ($act === 'delete') {
        $del = $pdo->prepare("DELETE FROM announcements WHERE id=?");
        $del->execute([(int)$_POST['id']]);
        $success = 'Deleted!';
    }
}
$stmt = $pdo->query("SELECT a.*,u.full_name as author FROM announcements a JOIN users u ON a.created_by=u.id ORDER BY CASE a.priority WHEN 'Urgent' THEN 1 WHEN 'High' THEN 2 WHEN 'Normal' THEN 3 ELSE 4 END, a.created_at DESC");
$announcements = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Announcements - ESSJT Admin</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f5f5}
.header{background:linear-gradient(135deg,#f4511e,#ff8a65);color:white;padding:15px 30px;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:1.4em}.back-btn{background:white;color:#f4511e;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600}
.container{max-width:1000px;margin:30px auto;padding:0 20px}
.form-card{background:white;padding:25px;border-radius:12px;margin-bottom:25px;box-shadow:0 4px 15px rgba(0,0,0,.08)}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:15px}
.form-group{margin-bottom:15px}
label{display:block;font-weight:600;color:#555;margin-bottom:6px}
input,select,textarea{width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:.95em;font-family:inherit}
textarea{height:100px;resize:vertical}
.submit-btn{padding:12px 30px;background:#f4511e;color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer}
.ann-card{background:white;border-radius:12px;padding:20px;margin-bottom:15px;box-shadow:0 4px 15px rgba(0,0,0,.08);border-left:5px solid #ddd}
.ann-card.Urgent{border-color:#e53935}.ann-card.High{border-color:#ff9800}.ann-card.Normal{border-color:#1a73e8}.ann-card.Low{border-color:#9e9e9e}
.ann-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px}
.ann-title{font-weight:700;color:#333;font-size:1.05em}
.badge{padding:3px 10px;border-radius:20px;font-size:.8em;font-weight:700;color:white}
.Urgent{background:#e53935}.High{background:#ff9800}.Normal{background:#1a73e8}.Low{background:#9e9e9e}
.ann-body p{color:#555;line-height:1.6}
.ann-meta{color:#999;font-size:.82em;margin-top:10px}
.del-btn{background:#ffebee;color:#e53935;border:none;padding:6px 15px;border-radius:6px;cursor:pointer;font-weight:600}
.success{background:#e8f5e9;color:#2e7d32;padding:12px;border-radius:8px;margin-bottom:15px}
</style></head><body>
<div class="header">
    <div style="display:flex;align-items:center;gap:15px">
        <img src="../assets/essjt-logo.png" style="width:45px;height:45px;object-fit:contain" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <h1>📢 Manage Announcements</h1>
    </div>
    <a href="control_panel.php" class="back-btn">← Back to Panel</a>
</div>
<div class="container">
<?php if ($success): ?><div class="success">✅ <?php echo $success; ?></div><?php endif; ?>
<div class="form-card">
    <h3 style="margin-bottom:20px">➕ Post New Announcement</h3>
    <form method="POST">
        <input type="hidden" name="action" value="add">
        <div class="form-group"><label>Title</label><input type="text" name="title" required placeholder="Announcement title..."></div>
        <div class="form-group"><label>Content</label><textarea name="content" required placeholder="Write your announcement here..."></textarea></div>
        <div class="form-row">
            <div class="form-group"><label>Target Audience</label>
                <select name="target_audience"><option value="All">All</option><option value="Students">Students Only</option><option value="Teachers">Teachers Only</option></select>
            </div>
            <div class="form-group"><label>Priority</label>
                <select name="priority"><option value="Normal">Normal</option><option value="High">High</option><option value="Urgent">Urgent</option><option value="Low">Low</option></select>
            </div>
        </div>
        <button type="submit" class="submit-btn">📢 Post</button>
    </form>
</div>
<h3 style="margin-bottom:15px;color:#333">📋 All Announcements (<?php echo count($announcements); ?>)</h3>
<?php if (empty($announcements)): ?>
    <div style="text-align:center;padding:40px;background:white;border-radius:12px;color:#999">No announcements yet.</div>
<?php else: foreach ($announcements as $a): $p=$a['priority']; ?>
<div class="ann-card <?php echo $p; ?>">
    <div class="ann-header">
        <div>
            <span class="badge <?php echo $p; ?>"><?php echo $p; ?></span>
            <div class="ann-title" style="margin-top:8px"><?php echo htmlspecialchars($a['title']); ?></div>
        </div>
        <form method="POST" style="margin-left:15px">
            <input type="hidden" name="action" value="delete">
            <input type="hidden" name="id" value="<?php echo $a['id']; ?>">
            <button type="submit" class="del-btn" onclick="return confirm('Delete?')">🗑️</button>
        </form>
    </div>
    <div class="ann-body"><p><?php echo nl2br(htmlspecialchars($a['content'])); ?></p></div>
    <div class="ann-meta">👤 <?php echo $a['author']; ?> &bull; 📅 <?php echo date('d M Y',strtotime($a['created_at'])); ?> &bull; 🎯 <?php echo $a['target_audience']; ?></div>
</div>
<?php endforeach; endif; ?>
</div></body></html>
