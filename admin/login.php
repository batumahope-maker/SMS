<?php
session_start();
require_once '../config.php';
if (isset($_SESSION['user_id']) && $_SESSION['role'] === 'admin') { header('Location: control_panel.php'); exit(); }

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    if (empty($username) || empty($password)) {
        $error = 'Please enter both username and password.';
    } else {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$user) {
            $error = "Username '$username' not found.";
        } elseif ($user['role'] !== 'admin') {
            $error = '⛔ This is not an admin account.';
        } elseif ($user['status'] !== 'Active') {
            $error = 'This account is not active.';
        } elseif (!password_verify($password, $user['password']) && $password !== $user['password']) {
            $error = '❌ Incorrect password.';
        } else {
            session_regenerate_id(true);
            $_SESSION['user_id']   = $user['id'];
            $_SESSION['username']  = $user['username'];
            $_SESSION['full_name'] = $user['full_name'];
            $_SESSION['role']      = 'admin';
            try {
                $log = $pdo->prepare("INSERT INTO login_activity (user_id, role, username, full_name, ip_address) VALUES (?, ?, ?, ?, ?)");
                $log->execute([$user['id'], 'admin', $user['username'], $user['full_name'], $_SERVER['REMOTE_ADDR']]);
            } catch(Exception $e) {}
            header('Location: control_panel.php'); exit();
        }
    }
}
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin Login — ESSJT</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;background:linear-gradient(135deg,#4a148c 0%,#6a1b9a 40%,#7b1fa2 100%)}
body{display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',sans-serif;min-height:100vh}
.box{background:white;border-radius:20px;padding:44px 40px;width:100%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.logo-wrap{text-align:center;margin-bottom:22px}
.logo-wrap img{width:80px;height:80px;object-fit:contain}
.portal-label{background:#f3e5f5;color:#6a1b9a;padding:5px 16px;border-radius:20px;font-size:.82em;font-weight:700;display:inline-block;margin-top:8px;letter-spacing:.5px}
h2{text-align:center;color:#4a148c;font-size:1.5em;margin-bottom:4px}
.subtitle{text-align:center;color:#888;font-size:.88em;margin-bottom:26px}
.error{background:#ffebee;color:#c62828;padding:12px 16px;border-radius:10px;font-size:.9em;margin-bottom:18px;border-left:4px solid #e53935}
label{display:block;font-weight:700;color:#444;margin-bottom:6px;font-size:.9em}
input{width:100%;padding:13px 16px;border:2px solid #e0e0e0;border-radius:10px;font-size:1em;margin-bottom:18px;transition:.2s}
input:focus{outline:none;border-color:#6a1b9a;box-shadow:0 0 0 3px rgba(106,27,154,.1)}
.btn{width:100%;padding:14px;background:linear-gradient(135deg,#6a1b9a,#7b1fa2);color:white;border:none;border-radius:10px;font-size:1.05em;font-weight:700;cursor:pointer;transition:.2s}
.btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(106,27,154,.4)}
.url-badge{background:#f5f5f5;border:1px solid #e0e0e0;border-radius:8px;padding:10px 14px;text-align:center;margin-top:20px;font-size:.82em;color:#888}
.url-badge code{color:#6a1b9a;font-weight:700}
.warn{background:#fff3e0;border-radius:10px;padding:11px 14px;text-align:center;margin-top:12px;font-size:.83em;color:#e65100}
</style>
</head><body>
<div class="box">
    <div class="logo-wrap">
        <img src="../assets/essjt-logo.png" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <div class="portal-label">🔐 ADMIN PORTAL</div>
    </div>
    <h2>Admin Login</h2>
    <p class="subtitle">École Secondaire Saint Joseph le Travailleur</p>
    <?php if ($error): ?><div class="error"><?php echo htmlspecialchars($error); ?></div><?php endif; ?>
    <form method="POST">
        <label>Admin Username</label>
        <input type="text" name="username" placeholder="Enter admin username" autofocus required>
        <label>Password</label>
        <input type="password" name="password" placeholder="Enter password" required>
        <button type="submit" class="btn">🔐 Login to Admin Panel</button>
    </form>
    <div class="warn">⚠️ Restricted area. Authorized personnel only.</div>
    <div class="url-badge">🌐 <code>essjt.org.rw/admin</code></div>
</div>
</body></html>
