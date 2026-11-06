<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'teacher') { header('Location: login.php'); exit(); }

$teacher_id = $_SESSION['user_id'];
$full_name  = $_SESSION['full_name'];

$stmt = $pdo->prepare("SELECT DISTINCT trade, level, section FROM school_schedule WHERE teacher_id = ?");
$stmt->execute([$teacher_id]);
$my_classes = $stmt->fetchAll(PDO::FETCH_ASSOC);
$class_count = count($my_classes);

$student_count = 0;
foreach ($my_classes as $c) {
    $s = $pdo->prepare("SELECT COUNT(*) as cnt FROM students WHERE trade = ? AND level = ? AND section = ?");
    $s->execute([$c['trade'], $c['level'], $c['section']]);
    $student_count += (int)$s->fetch(PDO::FETCH_ASSOC)['cnt'];
}

$stmt2 = $pdo->prepare("SELECT COUNT(*) as cnt FROM marks");
$stmt2->execute();
$marks_count = (int)$stmt2->fetch(PDO::FETCH_ASSOC)['cnt'];

$stmt3 = $pdo->prepare("SELECT COUNT(*) as cnt FROM announcements WHERE target_audience IN ('All','Teachers')");
$stmt3->execute();
$ann_count = (int)$stmt3->fetch(PDO::FETCH_ASSOC)['cnt'];

$stmt4 = $pdo->prepare("SELECT username, full_name, logged_in_at, ip_address FROM login_activity WHERE role = 'student' ORDER BY logged_in_at DESC LIMIT 10");
$stmt4->execute();
$recent_students = $stmt4->fetchAll(PDO::FETCH_ASSOC);
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
.welcome h2{color:#1565c0;font-size:1.25em}.welcome p{color:#666;margin-top:3px;font-size:.9em}
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
.card-title{font-weight:700;font-size:.95em;margin-bottom:4px}.card-desc{font-size:.78em;color:#888}
.login-panel{background:white;border-radius:13px;padding:20px;box-shadow:0 4px 15px rgba(0,0,0,.08)}
.login-item{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f5f5f5}
.login-item:last-child{border:none}
.login-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#4caf50,#2e7d32);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:.88em;flex-shrink:0}
.login-name{font-weight:600;font-size:.88em;color:#333}.login-id{font-size:.78em;color:#888}
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
        <a href="logout.php" class="logout-btn">🚪 Logout</a>
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
                    $initials = strtoupper(substr(preg_replace('/[^A-Za-z ]/','',$s['full_name']),0,2));
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
