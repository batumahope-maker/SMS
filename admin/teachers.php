<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') { header('Location: login.php'); exit(); }
$success=''; $error='';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $act = $_POST['action'];
    if ($act === 'add') {
        $chk = $pdo->prepare("SELECT id FROM users WHERE username=? OR email=?");
        $chk->execute([$_POST['username'], $_POST['email']]);
        if ($chk->fetch()) { $error = 'Username or email already exists!'; }
        else {
            $pass = password_hash($_POST['password'], PASSWORD_DEFAULT);
            $ins = $pdo->prepare("INSERT INTO users (username,full_name,email,phone,password,role,status) VALUES (?,?,?,?,?,'teacher','Active')");
            $ins->execute([$_POST['username'],$_POST['full_name'],$_POST['email'],$_POST['phone'],$pass]);
            $success = 'Teacher added!';
        }
    } elseif ($act === 'delete') {
        $del = $pdo->prepare("DELETE FROM users WHERE id=? AND role='teacher'");
        $del->execute([(int)$_POST['id']]);
        $success = 'Teacher deleted!';
    } elseif ($act === 'toggle') {
        $t = $pdo->prepare("SELECT status FROM users WHERE id=?");
        $t->execute([(int)$_POST['id']]);
        $row = $t->fetch(PDO::FETCH_ASSOC);
        $ns = $row['status'] === 'Active' ? 'Suspended' : 'Active';
        $upd = $pdo->prepare("UPDATE users SET status=? WHERE id=?");
        $upd->execute([$ns, (int)$_POST['id']]);
        $success = 'Teacher status updated!';
    }
}
$stmt = $pdo->query("SELECT * FROM users WHERE role='teacher' ORDER BY full_name");
$teachers = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Teachers - ESSJT Admin</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f5f5}
.header{background:linear-gradient(135deg,#1a73e8,#42a5f5);color:white;padding:15px 30px;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:1.4em}.back-btn{background:white;color:#1a73e8;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600}
.container{max-width:1100px;margin:30px auto;padding:0 20px}
.form-card,.table-card{background:white;padding:25px;border-radius:12px;margin-bottom:25px;box-shadow:0 4px 15px rgba(0,0,0,.08)}
.form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px}
label{display:block;font-weight:600;color:#555;margin-bottom:6px;font-size:.9em}
input{width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:.9em}
input:focus{outline:none;border-color:#1a73e8}
.submit-btn{padding:12px 30px;background:#1a73e8;color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;margin-top:15px}
table{width:100%;border-collapse:collapse}
th{background:linear-gradient(135deg,#1a73e8,#42a5f5);color:white;padding:12px;text-align:left}
td{padding:12px;border-bottom:1px solid #f0f0f0}tr:hover{background:#f8f9fa}
.badge{padding:3px 10px;border-radius:20px;font-size:.8em;font-weight:700}
.Active{background:#e8f5e9;color:#2e7d32}.Suspended{background:#ffebee;color:#c62828}
.btn{padding:6px 12px;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:.82em}
.del-btn{background:#ffebee;color:#e53935}.tog-btn{background:#e3f2fd;color:#1a73e8}
.success{background:#e8f5e9;color:#2e7d32;padding:12px;border-radius:8px;margin-bottom:15px}
.error{background:#ffebee;color:#c62828;padding:12px;border-radius:8px;margin-bottom:15px}
</style></head><body>
<div class="header">
    <div style="display:flex;align-items:center;gap:15px">
        <img src="../assets/essjt-logo.png" style="width:45px;height:45px;object-fit:contain" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <h1>👨‍🏫 Manage Teachers</h1>
    </div>
    <a href="control_panel.php" class="back-btn">← Back to Panel</a>
</div>
<div class="container">
<?php if ($success): ?><div class="success">✅ <?php echo $success; ?></div><?php endif; ?>
<?php if ($error): ?><div class="error">❌ <?php echo $error; ?></div><?php endif; ?>
<div class="form-card">
    <h3 style="margin-bottom:20px">➕ Add New Teacher</h3>
    <form method="POST">
        <input type="hidden" name="action" value="add">
        <div class="form-grid">
            <div><label>Username</label><input type="text" name="username" required placeholder="e.g. teacher61"></div>
            <div><label>Full Name</label><input type="text" name="full_name" required placeholder="Full name"></div>
            <div><label>Email</label><input type="email" name="email" required placeholder="teacher@essjt.rw"></div>
            <div><label>Phone</label><input type="tel" name="phone" placeholder="+250XXXXXXXXX"></div>
            <div><label>Password</label><input type="password" name="password" required placeholder="Min 6 chars"></div>
        </div>
        <button type="submit" class="submit-btn">➕ Add Teacher</button>
    </form>
</div>
<div class="table-card">
    <h3 style="margin-bottom:15px">👨‍🏫 All Teachers (<?php echo count($teachers); ?>)</h3>
    <table>
        <tr><th>#</th><th>Username</th><th>Full Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Actions</th></tr>
        <?php if (empty($teachers)): ?>
        <tr><td colspan="7" style="text-align:center;padding:40px;color:#999">No teachers yet.</td></tr>
        <?php else: foreach ($teachers as $i => $t): ?>
        <tr>
            <td><?php echo $i+1; ?></td>
            <td><strong><?php echo htmlspecialchars($t['username']); ?></strong></td>
            <td><?php echo htmlspecialchars($t['full_name']); ?></td>
            <td><?php echo htmlspecialchars($t['email']); ?></td>
            <td><?php echo htmlspecialchars($t['phone']??'-'); ?></td>
            <td><span class="badge <?php echo $t['status']; ?>"><?php echo $t['status']; ?></span></td>
            <td style="display:flex;gap:6px">
                <form method="POST"><input type="hidden" name="action" value="toggle"><input type="hidden" name="id" value="<?php echo $t['id']; ?>">
                    <button type="submit" class="btn tog-btn"><?php echo $t['status']==='Active'?'🔒 Suspend':'✅ Activate'; ?></button></form>
                <form method="POST"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?php echo $t['id']; ?>">
                    <button type="submit" class="btn del-btn" onclick="return confirm('Delete?')">🗑️</button></form>
            </td>
        </tr>
        <?php endforeach; endif; ?>
    </table>
</div>
</div></body></html>
