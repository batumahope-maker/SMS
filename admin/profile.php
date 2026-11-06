<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id'])) { header('Location: index.php'); exit(); }
$user_id = $_SESSION['user_id'];
$role    = $_SESSION['role'];
$success = '';
$error   = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $full_name = trim($_POST['full_name']);
    $email     = trim($_POST['email']);
    $phone     = trim($_POST['phone']);
    $new_pass  = $_POST['new_password'] ?? '';
    $conf_pass = $_POST['confirm_password'] ?? '';

    if (!empty($new_pass)) {
        if ($new_pass !== $conf_pass) { $error = 'Passwords do not match!'; }
        elseif (strlen($new_pass) < 6) { $error = 'Password must be at least 6 characters!'; }
        else {
            $hashed = password_hash($new_pass, PASSWORD_DEFAULT);
            db_query("UPDATE users SET full_name=$1,email=$2,phone=$3,password=$4 WHERE id=$5",
                     [$full_name,$email,$phone,$hashed,$user_id]);
            $_SESSION['full_name'] = $full_name;
            $success = 'Profile and password updated!';
        }
    } else {
        db_query("UPDATE users SET full_name=$1,email=$2,phone=$3 WHERE id=$4", [$full_name,$email,$phone,$user_id]);
        $_SESSION['full_name'] = $full_name;
        $success = 'Profile updated successfully!';
    }
}

$user = db_fetch(db_query("SELECT * FROM users WHERE id=$1", [$user_id]));
$extra = ($role === 'student') ? db_fetch(db_query("SELECT * FROM students WHERE user_id=$1", [$user_id])) : null;

$color = $role === 'student' ? '#11998e' : ($role === 'teacher' ? '#1a73e8' : '#9c27b0');
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>My Profile - ESSJT</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f5f5}
.header{background:linear-gradient(135deg,<?php echo $color; ?>,#aaa);color:white;padding:15px 30px;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:1.4em}.back-btn{background:white;color:<?php echo $color; ?>;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600}
.container{max-width:700px;margin:30px auto;padding:0 20px}
.card{background:white;border-radius:15px;padding:30px;margin-bottom:20px;box-shadow:0 4px 15px rgba(0,0,0,0.08)}
.avatar{width:80px;height:80px;border-radius:50%;background:<?php echo $color; ?>;color:white;font-size:2em;display:flex;align-items:center;justify-content:center;margin:0 auto 15px}
.name{text-align:center;font-size:1.5em;font-weight:700;color:#333}
.role-badge{display:inline-block;background:<?php echo $color; ?>;color:white;padding:4px 15px;border-radius:20px;font-size:0.85em;margin:8px auto;display:block;text-align:center;width:fit-content;margin:8px auto}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-top:20px}
.info-item{background:#f8f9fa;padding:12px;border-radius:8px}
.info-label{font-size:0.8em;color:#666}.info-value{font-weight:600;color:#333;margin-top:3px}
.section-title{font-size:1.1em;font-weight:700;color:#333;margin-bottom:20px}
.form-group{margin-bottom:18px}
label{display:block;font-weight:600;color:#555;margin-bottom:6px}
input{width:100%;padding:12px;border:2px solid #e0e0e0;border-radius:8px;font-size:1em}
input:focus{outline:none;border-color:<?php echo $color; ?>}
.submit-btn{width:100%;padding:14px;background:<?php echo $color; ?>;color:white;border:none;border-radius:10px;font-size:1em;font-weight:700;cursor:pointer}
.success{background:#e8f5e9;color:#2e7d32;padding:12px;border-radius:8px;margin-bottom:15px}
.error{background:#ffebee;color:#c62828;padding:12px;border-radius:8px;margin-bottom:15px}
</style></head><body>
<div class="header">
    <div style="display:flex;align-items:center;gap:15px">
        <img src="../assets/essjt-logo.png" style="width:45px;height:45px;object-fit:contain" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <h1>👤 My Profile</h1>
    </div>
    <a href="dashboard.php" class="back-btn">← Back to Dashboard</a>
</div>
<div class="container">
    <div class="card">
        <div class="avatar"><?php echo strtoupper(substr($user['full_name'],0,1)); ?></div>
        <div class="name"><?php echo htmlspecialchars($user['full_name']); ?></div>
        <div class="role-badge"><?php echo ucfirst($user['role']); ?></div>
        <div class="info-grid">
            <div class="info-item"><div class="info-label">Username/ID</div><div class="info-value"><?php echo $user['username']; ?></div></div>
            <div class="info-item"><div class="info-label">Status</div><div class="info-value" style="color:green"><?php echo $user['status']; ?></div></div>
            <div class="info-item"><div class="info-label">Email</div><div class="info-value"><?php echo $user['email']; ?></div></div>
            <div class="info-item"><div class="info-label">Phone</div><div class="info-value"><?php echo $user['phone'] ?? 'N/A'; ?></div></div>
            <?php if ($extra): ?>
            <div class="info-item"><div class="info-label">Trade</div><div class="info-value"><?php echo $extra['trade'] ?? 'N/A'; ?></div></div>
            <div class="info-item"><div class="info-label">Level / Section</div><div class="info-value"><?php echo ($extra['level']??'').'/'.($extra['section']??''); ?></div></div>
            <?php endif; ?>
        </div>
    </div>

    <div class="card">
        <div class="section-title">✏️ Edit Profile</div>
        <?php if ($success): ?><div class="success">✅ <?php echo $success; ?></div><?php endif; ?>
        <?php if ($error): ?><div class="error">❌ <?php echo $error; ?></div><?php endif; ?>
        <form method="POST">
            <div class="form-group"><label>Full Name</label><input type="text" name="full_name" value="<?php echo htmlspecialchars($user['full_name']); ?>" required></div>
            <div class="form-group"><label>Email</label><input type="email" name="email" value="<?php echo htmlspecialchars($user['email']); ?>" required></div>
            <div class="form-group"><label>Phone</label><input type="tel" name="phone" value="<?php echo htmlspecialchars($user['phone']??''); ?>"></div>
            <div class="form-group"><label>New Password <small style="color:#999">(leave blank to keep current)</small></label><input type="password" name="new_password" placeholder="New password..."></div>
            <div class="form-group"><label>Confirm New Password</label><input type="password" name="confirm_password" placeholder="Repeat new password..."></div>
            <button type="submit" class="submit-btn">💾 Save Changes</button>
        </form>
    </div>
</div>
</body></html>
