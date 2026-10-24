<?php
// ============================================================
// ESSJT URL ROUTING INSTALLER
// Creates clean URLs: essjt.org.rw/student, /teacher, /admin
// Adds login tracking + recent logins on dashboards
// Place at: C:\xampp\htdocs\essjt\INSTALL-ROUTING.php
// Visit: http://localhost/essjt/INSTALL-ROUTING.php
// ============================================================

$base = __DIR__;
$ok = []; $fail = [];

function write_file($base, $path, $content) {
    global $ok, $fail;
    $full = $base . '/' . $path;
    $dir  = dirname($full);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    if (file_put_contents($full, $content) !== false) $ok[] = $path;
    else $fail[] = $path;
}

// ── 1. ROOT .htaccess ─────────────────────────────────────
// Routes /student → /student/index.php
//        /teacher → /teacher/index.php
//        /admin   → /admin/index.php
write_file($base, '.htaccess', <<<'HTACCESS'
Options -Indexes
RewriteEngine On
RewriteBase /essjt/

# Clean portal URLs
RewriteRule ^student/?$  student/index.php  [L,NC]
RewriteRule ^teacher/?$  teacher/index.php  [L,NC]
RewriteRule ^admin/?$    admin/index.php    [L,NC]

# Block direct access to PHP includes
RewriteRule ^includes/   - [F,L]
HTACCESS);

// ── 2. SUPABASE: Login tracking table (SQL to run once) ───
// We handle this via PHP since we can't run SQL directly here

// ── 3. UPDATED config.php with login logging ──────────────
write_file($base, 'config.php', <<<'CONFIG'
<?php
// ── Database connection ───────────────────────────────────
$pg_conn = null;

function get_pg() {
    global $pg_conn;
    if ($pg_conn === null) {
        $pg_conn = pg_connect(
            "host=db.lmabkqlqoowuhfsimpua.supabase.co " .
            "port=5432 dbname=postgres user=postgres " .
            "password=-vida_de_la_rose sslmode=require"
        );
        if (!$pg_conn) die("<div style='padding:40px;color:red;font-family:sans-serif'>❌ Database connection failed. Check your internet connection.</div>");
    }
    return $pg_conn;
}

function db_query($sql, $params = []) {
    $pg = get_pg();
    return empty($params) ? pg_query($pg, $sql) : pg_query_params($pg, $sql, $params);
}
function db_fetch($result)       { return pg_fetch_assoc($result); }
function db_fetch_all($result)   { return pg_fetch_all($result) ?: []; }
function db_count($result)       { return pg_num_rows($result); }

// ── Login activity logger ─────────────────────────────────
function log_login($user_id, $role, $username, $full_name) {
    // Ensure table exists
    db_query("CREATE TABLE IF NOT EXISTS login_activity (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER,
        role        VARCHAR(20),
        username    VARCHAR(100),
        full_name   VARCHAR(200),
        ip_address  VARCHAR(50),
        logged_in_at TIMESTAMP DEFAULT NOW()
    )");
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    db_query(
        "INSERT INTO login_activity (user_id, role, username, full_name, ip_address) VALUES ($1,$2,$3,$4,$5)",
        [$user_id, $role, $username, $full_name, $ip]
    );
    // Keep only last 500 records to avoid bloat
    db_query("DELETE FROM login_activity WHERE id NOT IN (SELECT id FROM login_activity ORDER BY logged_in_at DESC LIMIT 500)");
}

// ── Portal URL helpers ────────────────────────────────────
function portal_url($role) {
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    if (str_contains($host, 'essjt.org.rw')) {
        return match($role) {
            'student' => 'https://essjt.org.rw/student',
            'teacher' => 'https://essjt.org.rw/teacher',
            'admin'   => 'https://essjt.org.rw/admin',
            default   => '/'
        };
    }
    // Local development
    return match($role) {
        'student' => '/essjt/student',
        'teacher' => '/essjt/teacher',
        'admin'   => '/essjt/admin',
        default   => '/essjt/'
    };
}
CONFIG);

// ── 4. STUDENT login page ─────────────────────────────────
write_file($base, 'student/index.php', <<<'PHP'
<?php
session_start();
require_once '../config.php';
if (isset($_SESSION['user_id']) && $_SESSION['role'] === 'student') { header('Location: dashboard.php'); exit(); }

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password']         ?? '';
    if (empty($username) || empty($password)) {
        $error = 'Please enter both Student ID and password.';
    } else {
        $result = db_query("SELECT * FROM users WHERE username = $1", [$username]);
        if (db_count($result) === 0) {
            $error = "Student ID '$username' not found. Check your ID card and try again.";
        } else {
            $user = db_fetch($result);
            if ($user['role'] !== 'student') {
                $error = '⛔ This is not a student account. Are you a teacher? Use: essjt.org.rw/teacher';
            } elseif ($user['status'] === 'Pending') {
                $error = '⏳ Your account is pending approval by the administrator. Please wait.';
            } elseif ($user['status'] === 'Suspended') {
                $error = '🚫 Your account has been suspended. Contact the school office.';
            } elseif ($user['status'] !== 'Active') {
                $error = 'Your account is not active. Contact the school administration.';
            } elseif (!password_verify($password, $user['password']) && $password !== $user['password']) {
                $error = '❌ Incorrect password. Please try again.';
            } else {
                session_regenerate_id(true);
                $_SESSION['user_id']   = $user['id'];
                $_SESSION['username']  = $user['username'];
                $_SESSION['full_name'] = $user['full_name'];
                $_SESSION['role']      = 'student';
                // Log the login
                log_login($user['id'], 'student', $user['username'], $user['full_name']);
                header('Location: dashboard.php'); exit();
            }
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
.portal-label{background:#e8f5e9;color:#2e7d32;padding:5px 16px;border-radius:20px;font-size:.82em;font-weight:700;display:inline-block;margin-top:8px;letter-spacing:.5px}
h2{text-align:center;color:#1b5e20;font-size:1.5em;margin-bottom:4px}
.subtitle{text-align:center;color:#888;font-size:.88em;margin-bottom:26px}
.error{background:#ffebee;color:#c62828;padding:12px 16px;border-radius:10px;font-size:.9em;margin-bottom:18px;border-left:4px solid #e53935}
label{display:block;font-weight:700;color:#444;margin-bottom:6px;font-size:.9em}
input{width:100%;padding:13px 16px;border:2px solid #e0e0e0;border-radius:10px;font-size:1em;margin-bottom:18px;transition:.2s}
input:focus{outline:none;border-color:#2e7d32;box-shadow:0 0 0 3px rgba(46,125,50,.1)}
.btn{width:100%;padding:14px;background:linear-gradient(135deg,#2e7d32,#43a047);color:white;border:none;border-radius:10px;font-size:1.05em;font-weight:700;cursor:pointer;transition:.2s}
.btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(46,125,50,.4)}
.url-badge{background:#f5f5f5;border:1px solid #e0e0e0;border-radius:8px;padding:10px 14px;text-align:center;margin-top:20px;font-size:.82em;color:#888}
.url-badge code{color:#2e7d32;font-weight:700}
.reg-link{text-align:center;margin-top:16px;font-size:.88em;color:#888}
.reg-link a{color:#2e7d32;font-weight:700;text-decoration:none}
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
    <div class="reg-link"><a href="../register.php">Don't have an account? Register here →</a></div>
    <div class="url-badge">🌐 <code>essjt.org.rw/student</code></div>
</div>
</body></html>
PHP);

// ── 5. TEACHER login page ─────────────────────────────────
write_file($base, 'teacher/index.php', <<<'PHP'
<?php
session_start();
require_once '../config.php';
if (isset($_SESSION['user_id']) && $_SESSION['role'] === 'teacher') { header('Location: dashboard.php'); exit(); }

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password']         ?? '';
    if (empty($username) || empty($password)) {
        $error = 'Please enter both username and password.';
    } else {
        $result = db_query("SELECT * FROM users WHERE username = $1", [$username]);
        if (db_count($result) === 0) {
            $error = "Username '$username' not found. Contact the admin if you need an account.";
        } else {
            $user = db_fetch($result);
            if ($user['role'] !== 'teacher') {
                $error = '⛔ This is not a teacher account. Students use: essjt.org.rw/student';
            } elseif ($user['status'] === 'Suspended') {
                $error = '🚫 Your account has been suspended. Contact the school administration.';
            } elseif ($user['status'] !== 'Active') {
                $error = 'Your account is not active. Contact the school administration.';
            } elseif (!password_verify($password, $user['password']) && $password !== $user['password']) {
                $error = '❌ Incorrect password. Please try again.';
            } else {
                session_regenerate_id(true);
                $_SESSION['user_id']   = $user['id'];
                $_SESSION['username']  = $user['username'];
                $_SESSION['full_name'] = $user['full_name'];
                $_SESSION['role']      = 'teacher';
                log_login($user['id'], 'teacher', $user['username'], $user['full_name']);
                header('Location: dashboard.php'); exit();
            }
        }
    }
}
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Teacher Login — ESSJT</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;background:linear-gradient(135deg,#0d47a1 0%,#1565c0 40%,#1976d2 100%)}
body{display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',sans-serif;min-height:100vh}
.box{background:white;border-radius:20px;padding:44px 40px;width:100%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.logo-wrap{text-align:center;margin-bottom:22px}
.logo-wrap img{width:80px;height:80px;object-fit:contain}
.portal-label{background:#e3f2fd;color:#1565c0;padding:5px 16px;border-radius:20px;font-size:.82em;font-weight:700;display:inline-block;margin-top:8px;letter-spacing:.5px}
h2{text-align:center;color:#0d47a1;font-size:1.5em;margin-bottom:4px}
.subtitle{text-align:center;color:#888;font-size:.88em;margin-bottom:26px}
.error{background:#ffebee;color:#c62828;padding:12px 16px;border-radius:10px;font-size:.9em;margin-bottom:18px;border-left:4px solid #e53935}
label{display:block;font-weight:700;color:#444;margin-bottom:6px;font-size:.9em}
input{width:100%;padding:13px 16px;border:2px solid #e0e0e0;border-radius:10px;font-size:1em;margin-bottom:18px;transition:.2s}
input:focus{outline:none;border-color:#1565c0;box-shadow:0 0 0 3px rgba(21,101,192,.1)}
.btn{width:100%;padding:14px;background:linear-gradient(135deg,#1565c0,#1976d2);color:white;border:none;border-radius:10px;font-size:1.05em;font-weight:700;cursor:pointer;transition:.2s}
.btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(21,101,192,.4)}
.url-badge{background:#f5f5f5;border:1px solid #e0e0e0;border-radius:8px;padding:10px 14px;text-align:center;margin-top:20px;font-size:.82em;color:#888}
.url-badge code{color:#1565c0;font-weight:700}
.info{background:#e3f2fd;border-radius:10px;padding:12px 14px;text-align:center;margin-top:16px;font-size:.85em;color:#1565c0}
</style>
</head><body>
<div class="box">
    <div class="logo-wrap">
        <img src="../assets/essjt-logo.png" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <div class="portal-label">👨‍🏫 TEACHER PORTAL</div>
    </div>
    <h2>Teacher Login</h2>
    <p class="subtitle">École Secondaire Saint Joseph le Travailleur</p>
    <?php if ($error): ?><div class="error"><?php echo htmlspecialchars($error); ?></div><?php endif; ?>
    <form method="POST">
        <label>Username</label>
        <input type="text" name="username" placeholder="Enter your username" value="<?php echo htmlspecialchars($_POST['username'] ?? ''); ?>" autofocus required>
        <label>Password</label>
        <input type="password" name="password" placeholder="Enter your password" required>
        <button type="submit" class="btn">🔐 Login to Teacher Portal</button>
    </form>
    <div class="info">ℹ️ Teacher accounts are created by the school administrator only.</div>
    <div class="url-badge">🌐 <code>essjt.org.rw/teacher</code></div>
</div>
</body></html>
PHP);

// ── 6. ADMIN login page ───────────────────────────────────
write_file($base, 'admin/index.php', <<<'PHP'
<?php
session_start();
require_once '../config.php';
if (isset($_SESSION['user_id']) && $_SESSION['role'] === 'admin') { header('Location: control_panel.php'); exit(); }

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password']         ?? '';
    if (empty($username) || empty($password)) {
        $error = 'Please enter both username and password.';
    } else {
        $result = db_query("SELECT * FROM users WHERE username = $1", [$username]);
        if (db_count($result) === 0) {
            $error = "Username '$username' not found.";
        } else {
            $user = db_fetch($result);
            if ($user['role'] !== 'admin') {
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
                log_login($user['id'], 'admin', $user['username'], $user['full_name']);
                header('Location: control_panel.php'); exit();
            }
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
PHP);

// ── 7. TEACHER DASHBOARD with recent student logins ───────
write_file($base, 'teacher/dashboard.php', <<<'PHP'
<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'teacher') { header('Location: index.php'); exit(); }

$teacher_id = $_SESSION['user_id'];
$full_name  = $_SESSION['full_name'];

$my_classes    = db_fetch_all(db_query("SELECT DISTINCT trade,level,section FROM school_schedule WHERE teacher_id=$1", [$teacher_id]));
$class_count   = count($my_classes);
$student_count = 0;
foreach ($my_classes as $c) {
    $r = db_query("SELECT COUNT(*) as cnt FROM students WHERE trade=$1 AND level=$2 AND section=$3", [$c['trade'],$c['level'],$c['section']]);
    $student_count += (int)db_fetch($r)['cnt'];
}
$marks_count = (int)db_fetch(db_query("SELECT COUNT(*) as cnt FROM marks m JOIN students s ON m.student_id=s.user_id WHERE s.trade IN (SELECT DISTINCT trade FROM school_schedule WHERE teacher_id=$1)", [$teacher_id]))['cnt'];
$ann_count   = (int)db_fetch(db_query("SELECT COUNT(*) as cnt FROM announcements WHERE target_audience IN ('All','Teachers')"))['cnt'];

// Recent student logins (last 10)
$recent_students = db_fetch_all(db_query(
    "SELECT username, full_name, logged_in_at, ip_address
     FROM login_activity
     WHERE role = 'student'
     ORDER BY logged_in_at DESC
     LIMIT 10"
));
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Teacher Dashboard — ESSJT</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f5f5}
.header{background:linear-gradient(135deg,#1565c0,#1976d2);color:white;padding:18px 30px;display:flex;justify-content:space-between;align-items:center}
.header-left{display:flex;align-items:center;gap:15px}
.logo{width:52px;height:52px;object-fit:contain}
h1{font-size:1.5em}.school-name{font-size:.88em;opacity:.85;margin-top:2px}
.header-right{text-align:right}.teacher-name{font-size:1.05em;font-weight:700}
.logout-btn{background:rgba(255,255,255,.2);color:white;padding:7px 16px;border-radius:8px;text-decoration:none;font-size:.88em;margin-top:7px;display:inline-block;border:1px solid rgba(255,255,255,.35)}
.container{max-width:1200px;margin:28px auto;padding:0 20px}
.welcome{background:white;border-radius:12px;padding:18px 24px;margin-bottom:22px;box-shadow:0 4px 15px rgba(0,0,0,.08);display:flex;align-items:center;justify-content:space-between}
.welcome h2{color:#1565c0;font-size:1.25em}
.welcome p{color:#666;margin-top:3px;font-size:.9em}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:26px}
.stat{background:white;border-radius:12px;padding:16px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,.07);border-top:4px solid #1565c0}
.stat-n{font-size:2em;font-weight:800;color:#1565c0}.stat-l{color:#888;font-size:.82em;margin-top:4px}
.two-col{display:grid;grid-template-columns:2fr 1fr;gap:20px}
h3{color:#444;font-size:1em;margin-bottom:14px;font-weight:700}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.card{background:white;border-radius:13px;padding:20px;text-align:center;box-shadow:0 4px 15px rgba(0,0,0,.08);text-decoration:none;color:#333;transition:.2s;display:block;border-bottom:4px solid transparent}
.card:hover{transform:translateY(-4px);box-shadow:0 8px 25px rgba(0,0,0,.14)}
.c1{border-color:#1a73e8}.c2{border-color:#4caf50}.c3{border-color:#e91e63}.c4{border-color:#ff9800}.c5{border-color:#9c27b0}.c6{border-color:#00897b}.c7{border-color:#f44336}.c8{border-color:#607d8b}
.card-icon{font-size:2.4em;margin-bottom:8px;display:block}
.card-title{font-weight:700;font-size:.95em;margin-bottom:4px}
.card-desc{font-size:.78em;color:#888}
.login-panel{background:white;border-radius:13px;padding:20px;box-shadow:0 4px 15px rgba(0,0,0,.08)}
.login-item{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f5f5f5}
.login-item:last-child{border:none}
.login-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#4caf50,#2e7d32);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:.88em;flex-shrink:0}
.login-name{font-weight:600;font-size:.88em;color:#333}
.login-id{font-size:.78em;color:#888}
.login-time{font-size:.75em;color:#1565c0;margin-left:auto;text-align:right;white-space:nowrap}
.no-logins{text-align:center;padding:25px;color:#bbb;font-size:.88em}
.online-dot{width:8px;height:8px;background:#4caf50;border-radius:50%;display:inline-block;margin-right:4px}
</style>
</head><body>
<div class="header">
    <div class="header-left">
        <img src="../assets/essjt-logo.png" class="logo" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <div><h1>Teacher Portal</h1><div class="school-name">École Secondaire Saint Joseph le Travailleur</div></div>
    </div>
    <div class="header-right">
        <div class="teacher-name">👨‍🏫 <?php echo htmlspecialchars($full_name); ?></div>
        <small style="opacity:.8">Teacher Account</small><br>
        <a href="../logout.php" class="logout-btn">🚪 Logout</a>
    </div>
</div>
<div class="container">
    <div class="welcome">
        <div><h2>Welcome back, <?php echo htmlspecialchars(explode(' ',$full_name)[0]); ?>! 👋</h2>
        <p>Manage your classes, attendance, marks and schedule from here.</p></div>
        <div style="color:#1565c0;font-size:.88em;font-weight:600">📅 <?php echo date('l, d F Y'); ?></div>
    </div>
    <div class="stats">
        <div class="stat"><div class="stat-n"><?php echo $class_count; ?></div><div class="stat-l">My Classes</div></div>
        <div class="stat"><div class="stat-n"><?php echo $student_count; ?></div><div class="stat-l">My Students</div></div>
        <div class="stat"><div class="stat-n"><?php echo $marks_count; ?></div><div class="stat-l">Marks Entered</div></div>
        <div class="stat"><div class="stat-n"><?php echo $ann_count; ?></div><div class="stat-l">Announcements</div></div>
    </div>

    <div class="two-col">
        <div>
            <h3>📌 Quick Actions</h3>
            <div class="grid">
                <a href="take_attendance.php" class="card c1"><span class="card-icon">📋</span><div class="card-title">Take Attendance</div><div class="card-desc">Mark present, absent, late</div></a>
                <a href="enter_marks.php"     class="card c2"><span class="card-icon">📝</span><div class="card-title">Enter Marks</div><div class="card-desc">Add & edit grades</div></a>
                <a href="report_schedule.php" class="card c3"><span class="card-icon">📅</span><div class="card-title">Report Schedule</div><div class="card-desc">Submit timetable to admin</div></a>
                <a href="view-announcements.php" class="card c4"><span class="card-icon">📢</span><div class="card-title">Announcements</div><div class="card-desc">School notices</div></a>
                <a href="view-rules.php"      class="card c5"><span class="card-icon">📜</span><div class="card-title">School Rules</div><div class="card-desc">Regulations</div></a>
                <a href="view-events.php"     class="card c6"><span class="card-icon">🎉</span><div class="card-title">Events</div><div class="card-desc">Upcoming activities</div></a>
                <a href="view-schedule.php"   class="card c7"><span class="card-icon">🗓️</span><div class="card-title">My Timetable</div><div class="card-desc">Full schedule</div></a>
                <a href="profile.php"         class="card c8"><span class="card-icon">👤</span><div class="card-title">My Profile</div><div class="card-desc">Update info & password</div></a>
            </div>
        </div>
        <div>
            <h3>🟢 Recently Logged-in Students</h3>
            <div class="login-panel">
                <?php if (empty($recent_students)): ?>
                <div class="no-logins">📭 No student logins recorded yet.</div>
                <?php else: foreach ($recent_students as $s):
                    $initials = strtoupper(implode('', array_map(fn($w)=>$w[0], array_filter(explode(' ', $s['full_name'])))));
                    $initials = substr($initials, 0, 2);
                    $time_diff = time() - strtotime($s['logged_in_at']);
                    $time_str  = $time_diff < 60 ? 'Just now' : ($time_diff < 3600 ? round($time_diff/60).'m ago' : ($time_diff < 86400 ? round($time_diff/3600).'h ago' : date('d M', strtotime($s['logged_in_at']))));
                ?>
                <div class="login-item">
                    <div class="login-avatar"><?php echo $initials; ?></div>
                    <div>
                        <div class="login-name"><?php echo htmlspecialchars($s['full_name']); ?></div>
                        <div class="login-id"><?php echo $s['username']; ?></div>
                    </div>
                    <div class="login-time"><span class="online-dot"></span><?php echo $time_str; ?></div>
                </div>
                <?php endforeach; endif; ?>
            </div>
        </div>
    </div>
</div>
</body></html>
PHP);

// ── 8. ADMIN CONTROL PANEL with recent teacher logins ─────
write_file($base, 'admin/recent_logins.php', <<<'PHP'
<?php
// Partial: Recent login widget - included in control_panel.php
// Returns HTML for recent teachers (last 10) and recent students (last 10)
$recent_teachers = db_fetch_all(db_query(
    "SELECT username, full_name, logged_in_at FROM login_activity WHERE role='teacher' ORDER BY logged_in_at DESC LIMIT 8"
));
$recent_students = db_fetch_all(db_query(
    "SELECT username, full_name, logged_in_at FROM login_activity WHERE role='student' ORDER BY logged_in_at DESC LIMIT 8"
));
function time_ago($ts) {
    $d = time() - strtotime($ts);
    if ($d < 60)    return 'Just now';
    if ($d < 3600)  return round($d/60).'m ago';
    if ($d < 86400) return round($d/3600).'h ago';
    return date('d M H:i', strtotime($ts));
}
?>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:6px">
<div>
<h4 style="color:#444;font-size:.92em;margin-bottom:12px;font-weight:700">👨‍🏫 Recently Logged-in Teachers</h4>
<?php if (empty($recent_teachers)): ?>
<p style="color:#bbb;font-size:.85em;text-align:center;padding:15px">No teacher logins yet</p>
<?php else: foreach ($recent_teachers as $t):
    $initials = strtoupper(substr(str_replace(' ','',preg_replace('/\b(\w)\w+\s*/','$1',$t['full_name'])),0,2));
?>
<div style="display:flex;align-items:center;gap:9px;padding:8px 0;border-bottom:1px solid #f5f5f5">
    <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#1565c0,#42a5f5);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:.82em;flex-shrink:0"><?php echo $initials; ?></div>
    <div style="flex:1"><div style="font-weight:600;font-size:.85em;color:#333"><?php echo htmlspecialchars($t['full_name']); ?></div><div style="font-size:.75em;color:#888"><?php echo $t['username']; ?></div></div>
    <div style="font-size:.75em;color:#1565c0;white-space:nowrap"><?php echo time_ago($t['logged_in_at']); ?></div>
</div>
<?php endforeach; endif; ?>
</div>
<div>
<h4 style="color:#444;font-size:.92em;margin-bottom:12px;font-weight:700">🎓 Recently Logged-in Students</h4>
<?php if (empty($recent_students)): ?>
<p style="color:#bbb;font-size:.85em;text-align:center;padding:15px">No student logins yet</p>
<?php else: foreach ($recent_students as $s):
    $initials = strtoupper(substr(str_replace(' ','',preg_replace('/\b(\w)\w+\s*/','$1',$s['full_name'])),0,2));
?>
<div style="display:flex;align-items:center;gap:9px;padding:8px 0;border-bottom:1px solid #f5f5f5">
    <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#2e7d32,#66bb6a);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:.82em;flex-shrink:0"><?php echo $initials; ?></div>
    <div style="flex:1"><div style="font-weight:600;font-size:.85em;color:#333"><?php echo htmlspecialchars($s['full_name']); ?></div><div style="font-size:.75em;color:#888"><?php echo $s['username']; ?></div></div>
    <div style="font-size:.75em;color:#2e7d32;white-space:nowrap"><?php echo time_ago($s['logged_in_at']); ?></div>
</div>
<?php endforeach; endif; ?>
</div>
</div>
PHP);

// ── Show results ──────────────────────────────────────────
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>ESSJT Routing Installer</title>
<style>body{font-family:'Segoe UI',sans-serif;padding:35px;max-width:750px;margin:0 auto;background:#f5f5f5}
.card{background:white;padding:28px;border-radius:14px;box-shadow:0 4px 18px rgba(0,0,0,.1);margin-bottom:20px}
h1{margin-bottom:5px;color:#333}.sub{color:#999;font-size:.9em;margin-bottom:22px}
.ok{background:#e8f5e9;color:#2e7d32;padding:9px 14px;border-radius:7px;margin:4px 0;font-size:.88em}
.err{background:#ffebee;color:#c62828;padding:9px 14px;border-radius:7px;margin:4px 0;font-size:.88em}
.big-ok{background:linear-gradient(135deg,#4caf50,#2e7d32);color:white;padding:18px;border-radius:12px;font-size:1.1em;font-weight:800;text-align:center;margin-bottom:18px}
h2{margin-bottom:14px;color:#444;font-size:1.05em}
.url-box{background:#1e1e1e;color:#4caf50;padding:15px 20px;border-radius:10px;font-family:monospace;font-size:.95em;margin:10px 0;line-height:2}
.links{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:16px}
a.btn{display:block;padding:12px;border-radius:10px;text-decoration:none;font-weight:700;text-align:center;color:white;font-size:.9em}
.l1{background:#2e7d32}.l2{background:#1565c0}.l3{background:#6a1b9a}
.warn{background:#fff3cd;border-left:4px solid #ffc107;padding:12px;border-radius:8px;margin-top:14px;font-size:.85em}
.htaccess-note{background:#e3f2fd;padding:14px;border-radius:8px;font-size:.86em;color:#1565c0;margin-top:12px;line-height:1.7}
</style></head><body>
<h1>🚀 ESSJT URL Routing Installer</h1>
<p class="sub">Sets up separate portal URLs + login tracking</p>
<?php if (empty($fail)): ?>
<div class="big-ok">✅ All <?php echo count($ok); ?> files installed!</div>
<?php endif; ?>
<div class="card"><h2>Files Installed</h2>
<?php foreach($ok as $f): ?><div class="ok">✅ <?php echo $f; ?></div><?php endforeach; ?>
<?php foreach($fail as $f): ?><div class="err">❌ FAILED: <?php echo $f; ?></div><?php endforeach; ?>
</div>
<div class="card">
    <h2>🌐 Your Portal URLs</h2>
    <div class="url-box">
        🎓 Students → <strong>https://essjt.org.rw/student</strong><br>
        👨‍🏫 Teachers → <strong>https://essjt.org.rw/teacher</strong><br>
        🔐 Admin   → <strong>https://essjt.org.rw/admin</strong>
    </div>
    <div class="htaccess-note">
        ℹ️ <strong>Local testing URLs (XAMPP):</strong><br>
        http://localhost/essjt/student<br>
        http://localhost/essjt/teacher<br>
        http://localhost/essjt/admin<br><br>
        ⚠️ Make sure <strong>mod_rewrite</strong> is enabled in XAMPP Apache for clean URLs to work.
        In XAMPP → Apache → httpd.conf → uncomment <code>LoadModule rewrite_module</code>
    </div>
    <div class="links">
        <a href="student/index.php" class="btn l1">🎓 Student Login</a>
        <a href="teacher/index.php" class="btn l2">👨‍🏫 Teacher Login</a>
        <a href="admin/index.php"   class="btn l3">🔐 Admin Login</a>
    </div>
</div>
<div class="warn">⚠️ Delete <code>INSTALL-ROUTING.php</code> after installation!</div>
</body></html>
