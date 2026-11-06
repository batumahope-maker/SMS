<?php
session_start();
require_once '../config.php';
if (isset($_SESSION['user_id']) && $_SESSION['role'] === 'student') { header('Location: dashboard.php'); exit(); }

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    if (empty($username) || empty($password)) {
        $error = 'Please enter both Student ID and password.';
    } else {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$user) {
            $error = "Student ID '$username' not found.";
        } elseif ($user['role'] !== 'student') {
            $error = '⛔ This is not a student account.';
        } elseif ($user['status'] === 'Suspended') {
            $error = '🚫 Your account has been suspended.';
        } elseif ($user['status'] !== 'Active') {
            $error = 'Your account is not active.';
        } elseif (!password_verify($password, $user['password']) && $password !== $user['password']) {
            $error = '❌ Incorrect password.';
        } else {
            session_regenerate_id(true);
            $_SESSION['user_id']   = $user['id'];
            $_SESSION['username']  = $user['username'];
            $_SESSION['full_name'] = $user['full_name'];
            $_SESSION['role']      = 'student';
            try {
                $log = $pdo->prepare("INSERT INTO login_activity (user_id, role, username, full_name, ip_address) VALUES (?, ?, ?, ?, ?)");
                $log->execute([$user['id'], 'student', $user['username'], $user['full_name'], $_SERVER['REMOTE_ADDR']]);
            } catch(Exception $e) {}
            header('Location: dashboard.php'); exit();
        }
    }
}
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Student Login — ESSJT</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;background:linear-gradient(135deg,#1b5e20 0%,#2e7d32 40%,#43a047 100%)}
body{display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',sans-serif;min-height:100vh}
.box{background:white;border-radius:20px;padding:44px 40px;width:100%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.logo-wrap{text-align:center;margin-bottom:22px}
.logo-wrap img{width:80px;height:80px;object-fit:contain}
.portal-label{background:#e8f5e9;color:#2e7d32;padding:5px 16px;border-radius:20px;font-size:.82em;font-weight:700;display:inline-block;margin-top:8px}
h2{text-align:center;color:#1b5e20;font-size:1.5em;margin-bottom:4px}
.subtitle{text-align:center;color:#888;font-size:.88em;margin-bottom:26px}
.error{background:#ffebee;color:#c62828;padding:12px 16px;border-radius:10px;font-size:.9em;margin-bottom:18px;border-left:4px solid #e53935}
label{display:block;font-weight:700;color:#444;margin-bottom:6px;font-size:.9em}
input{width:100%;padding:13px 16px;border:2px solid #e0e0e0;border-radius:10px;font-size:1em;margin-bottom:18px;transition:.2s}
input:focus{outline:none;border-color:#2e7d32}
.btn{width:100%;padding:14px;background:linear-gradient(135deg,#2e7d32,#43a047);color:white;border:none;border-radius:10px;font-size:1.05em;font-weight:700;cursor:pointer}
</style>
</head><body>
<div class="box">
    <div class="logo-wrap">
        <img src="../assets/essjt-logo.png" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <div class="portal-label">🎓 STUDENT PORTAL</div>
    </div>
    <h2>Student Login</h2>
    <p class="subtitle">École Secondaire Saint Joseph le Travailleur</p>
    <?php if ($error): ?><div class="error"><?php echo htmlspecialchars($error); ?></div><?php endif; ?>
    <form method="POST">
        <label>Student ID</label>
        <input type="text" name="username" placeholder="Enter your Student ID" value="<?php echo htmlspecialchars($_POST['username'] ?? ''); ?>" autofocus required>
        <label>Password</label>
        <input type="password" name="password" placeholder="Enter your password" required>
        <button type="submit" class="btn">🔐 Login to Student Portal</button>
    </form>
</div>
</body></html>
