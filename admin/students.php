<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') { header('Location: login.php'); exit(); }

$search = trim($_GET['search'] ?? '');
if ($search) {
    $stmt = $pdo->prepare("SELECT u.*,s.trade,s.level,s.section FROM users u LEFT JOIN students s ON u.id=s.user_id WHERE u.role='student' AND (u.full_name LIKE ? OR u.username LIKE ? OR s.trade LIKE ?) ORDER BY u.created_at DESC");
    $stmt->execute(["%$search%", "%$search%", "%$search%"]);
} else {
    $stmt = $pdo->query("SELECT u.*,s.trade,s.level,s.section FROM users u LEFT JOIN students s ON u.id=s.user_id WHERE u.role='student' ORDER BY u.created_at DESC");
}
$students = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>All Students - ESSJT</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f5f5}
.header{background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:15px 30px;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:1.4em}.back-btn{background:white;color:#764ba2;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600}
.container{max-width:1200px;margin:30px auto;padding:0 20px}
.search-bar{background:white;padding:20px;border-radius:12px;margin-bottom:20px;box-shadow:0 4px 15px rgba(0,0,0,.08);display:flex;gap:10px}
.search-bar input{flex:1;padding:12px;border:2px solid #e0e0e0;border-radius:8px;font-size:1em}
.search-bar input:focus{outline:none;border-color:#764ba2}
.search-bar button{padding:12px 25px;background:#764ba2;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer}
.count{color:#666;margin-bottom:15px}
table{width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,.08)}
th{background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:12px;text-align:left}
td{padding:12px;border-bottom:1px solid #f0f0f0}tr:hover{background:#f8f9fa}
.badge{padding:3px 10px;border-radius:20px;font-size:.8em;font-weight:700}
.Active{background:#e8f5e9;color:#2e7d32}.Pending{background:#fff3e0;color:#e65100}.Suspended{background:#ffebee;color:#c62828}
</style></head><body>
<div class="header">
    <div style="display:flex;align-items:center;gap:15px">
        <img src="../assets/essjt-logo.png" style="width:45px;height:45px;object-fit:contain" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <h1>👥 All Students</h1>
    </div>
    <a href="control_panel.php" class="back-btn">← Back to Panel</a>
</div>
<div class="container">
    <form class="search-bar" method="GET">
        <input type="text" name="search" placeholder="🔍 Search by name, ID, or trade..." value="<?php echo htmlspecialchars($search); ?>">
        <button type="submit">Search</button>
        <?php if ($search): ?><a href="students.php" style="padding:12px 20px;background:#f0f0f0;border-radius:8px;text-decoration:none;color:#555">Clear</a><?php endif; ?>
    </form>
    <p class="count">Showing <strong><?php echo count($students); ?></strong> student(s)</p>
    <table>
        <tr><th>#</th><th>Student ID</th><th>Full Name</th><th>Trade</th><th>Level</th><th>Section</th><th>Email</th><th>Status</th></tr>
        <?php if (empty($students)): ?>
            <tr><td colspan="8" style="text-align:center;padding:40px;color:#999">No students found</td></tr>
        <?php else: foreach ($students as $i => $s): ?>
        <tr>
            <td><?php echo $i+1; ?></td>
            <td><strong><?php echo htmlspecialchars($s['username']); ?></strong></td>
            <td><?php echo htmlspecialchars($s['full_name']); ?></td>
            <td><?php echo htmlspecialchars($s['trade']??'-'); ?></td>
            <td><?php echo htmlspecialchars($s['level']??'-'); ?></td>
            <td><?php echo htmlspecialchars($s['section']??'-'); ?></td>
            <td><?php echo htmlspecialchars($s['email']); ?></td>
            <td><span class="badge <?php echo $s['status']; ?>"><?php echo $s['status']; ?></span></td>
        </tr>
        <?php endforeach; endif; ?>
    </table>
</div></body></html>
