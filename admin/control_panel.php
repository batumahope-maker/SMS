<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') { header('Location: login.php'); exit(); }
$admin_name = $_SESSION['full_name'] ?? 'Administrator';

$total_students  = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='student' AND status='Active'")->fetchColumn();
$total_teachers  = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='teacher' AND status='Active'")->fetchColumn();
$pending         = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='student' AND status='Pending'")->fetchColumn();
$total_payments  = (float)$pdo->query("SELECT COALESCE(SUM(amount),0) FROM payments")->fetchColumn();
$announcements   = (int)$pdo->query("SELECT COUNT(*) FROM announcements")->fetchColumn();
$upcoming_events = (int)$pdo->query("SELECT COUNT(*) FROM school_events WHERE event_date >= CURDATE() AND is_active=1")->fetchColumn();
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin Control Panel - ESSJT</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#ffffff}
.header{background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:15px 30px;display:flex;justify-content:space-between;align-items:center}
.header-left{display:flex;align-items:center;gap:15px}
.header-left img{width:50px;height:50px;object-fit:contain}
.header h1{font-size:1.4em}.header p{opacity:.85;font-size:.9em}
.header-right{display:flex;align-items:center;gap:15px}
.logout-btn{background:white;color:#764ba2;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600}
.container{max-width:1400px;margin:30px auto;padding:0 20px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:20px;margin-bottom:30px}
.stat-card{background:white;padding:25px;border-radius:15px;box-shadow:0 4px 15px rgba(0,0,0,.08);text-align:center}
.stat-icon{font-size:2.5em;margin-bottom:10px}
.stat-number{font-size:2em;font-weight:700;color:#667eea}
.stat-label{color:#666;font-size:.9em;margin-top:5px}
.section{background:white;border-radius:15px;padding:25px;margin-bottom:25px;box-shadow:0 4px 15px rgba(0,0,0,.08)}
.section-title{font-size:1.2em;font-weight:700;color:#333;margin-bottom:20px;padding-bottom:10px;border-bottom:2px solid #f0f0f0}
.cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:15px}
.card{background:#f8f9fa;border-radius:12px;padding:20px;text-align:center;text-decoration:none;color:inherit;transition:all .3s;border:2px solid transparent;display:block}
.card:hover{transform:translateY(-3px);box-shadow:0 8px 20px rgba(0,0,0,.1);border-color:#667eea}
.card-icon{font-size:2.5em;margin-bottom:10px}
.card-title{font-weight:700;color:#333;margin-bottom:5px}
.card-desc{font-size:.8em;color:#666}
.pending-badge{display:inline-block;background:#e53935;color:white;border-radius:50%;width:22px;height:22px;font-size:.75em;line-height:22px;margin-left:5px;font-weight:700}
.login-item{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f5f5f5}
.login-item:last-child{border:none}
.login-avatar{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:.82em;flex-shrink:0}
.login-name{font-weight:600;font-size:.85em;color:#333}
.login-id{font-size:.75em;color:#888}
.login-time{font-size:.75em;margin-left:auto;white-space:nowrap}
</style></head><body>
<div class="header">
    <div class="header-left">
        <img src="../assets/essjt-logo.png" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <div><h1>Admin Control Panel</h1><p>École Secondaire Saint Joseph le Travailleur</p></div>
    </div>
    <div class="header-right">
        <span>👋 <?php echo htmlspecialchars($admin_name); ?></span>
        <a href="logout.php" class="logout-btn">🚪 Logout</a>
    </div>
</div>
<div class="container">
    <div class="stats">
        <div class="stat-card"><div class="stat-icon">🎓</div><div class="stat-number"><?php echo $total_students; ?></div><div class="stat-label">Active Students</div></div>
        <div class="stat-card"><div class="stat-icon">👨‍🏫</div><div class="stat-number"><?php echo $total_teachers; ?></div><div class="stat-label">Teachers</div></div>
        <div class="stat-card"><div class="stat-icon">⏳</div><div class="stat-number" style="color:#f4511e"><?php echo $pending; ?></div><div class="stat-label">Pending Approval</div></div>
        <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-number" style="font-size:1.3em"><?php echo number_format($total_payments); ?></div><div class="stat-label">Total Payments (RWF)</div></div>
        <div class="stat-card"><div class="stat-icon">📢</div><div class="stat-number"><?php echo $announcements; ?></div><div class="stat-label">Announcements</div></div>
        <div class="stat-card"><div class="stat-icon">🎉</div><div class="stat-number"><?php echo $upcoming_events; ?></div><div class="stat-label">Upcoming Events</div></div>
    </div>
    <div class="section">
        <div class="section-title">🎓 Student Management</div>
        <div class="cards-grid">
            <a href="students.php" class="card"><div class="card-icon">👥</div><div class="card-title">All Students</div><div class="card-desc">Browse & manage students</div></a>
            <a href="approve-students.php" class="card"><div class="card-icon">✅</div><div class="card-title">Approve Students <?php if($pending>0) echo "<span class='pending-badge'>$pending</span>"; ?></div><div class="card-desc">Approve pending registrations</div></a>
            <a href="marks.php" class="card"><div class="card-icon">📊</div><div class="card-title">Manage Marks</div><div class="card-desc">Enter & edit student grades</div></a>
            <a href="attendance.php" class="card"><div class="card-icon">📋</div><div class="card-title">Attendance</div><div class="card-desc">Mark daily attendance</div></a>
            <a href="payments.php" class="card"><div class="card-icon">💳</div><div class="card-title">Fee Payments</div><div class="card-desc">Record & track payments</div></a>
            <a href="best_performers.php" class="card"><div class="card-icon">🏆</div><div class="card-title">Best Performers</div><div class="card-desc">Top students</div></a>
        </div>
    </div>
    <div class="section">
        <div class="section-title">👨‍🏫 Teacher Management</div>
        <div class="cards-grid">
            <a href="teachers.php" class="card"><div class="card-icon">👨‍🏫</div><div class="card-title">All Teachers</div><div class="card-desc">Manage teachers</div></a>
            <a href="teacher_salaries.php" class="card"><div class="card-icon">💰</div><div class="card-title">Teacher Salaries</div><div class="card-desc">Record salaries</div></a>
        </div>
    </div>
    <div class="section">
        <div class="section-title">📚 Academic Management</div>
        <div class="cards-grid">
            <a href="classes.php" class="card"><div class="card-icon">🏫</div><div class="card-title">View Classes</div><div class="card-desc">Browse all classes</div></a>
            <a href="schedule.php" class="card"><div class="card-icon">📅</div><div class="card-title">Class Schedule</div><div class="card-desc">Manage timetable</div></a>
            <a href="reports.php" class="card"><div class="card-icon">📈</div><div class="card-title">Reports</div><div class="card-desc">Academic & financial reports</div></a>
        </div>
    </div>
    <div class="section">
        <div class="section-title">📢 Communication & Rules</div>
        <div class="cards-grid">
            <a href="announcements.php" class="card"><div class="card-icon">📢</div><div class="card-title">Announcements</div><div class="card-desc">Post announcements</div></a>
            <a href="events.php" class="card"><div class="card-icon">🎉</div><div class="card-title">School Events</div><div class="card-desc">Manage events</div></a>
            <a href="rules.php" class="card"><div class="card-icon">📜</div><div class="card-title">School Rules</div><div class="card-desc">Manage rules</div></a>
        </div>
    </div>
    <div class="section">
        <div class="section-title">🟢 Recent Portal Activity</div>
        <?php
        $st = $pdo->query("SELECT username, full_name, logged_in_at, role FROM login_activity ORDER BY logged_in_at DESC LIMIT 10");
        $logins = $st->fetchAll(PDO::FETCH_ASSOC);
        if (empty($logins)): ?>
            <p style="color:#bbb;text-align:center;padding:20px">No logins recorded yet.</p>
        <?php else: foreach ($logins as $l):
            $initials = strtoupper(substr(preg_replace('/[^A-Za-z ]/','',$l['full_name']),0,2));
            $d = time() - strtotime($l['logged_in_at']);
            $t = $d<60?'Just now':($d<3600?round($d/60).'m ago':($d<86400?round($d/3600).'h ago':date('d M',strtotime($l['logged_in_at']))));
            $color = $l['role']==='teacher' ? 'linear-gradient(135deg,#1565c0,#42a5f5)' : 'linear-gradient(135deg,#2e7d32,#66bb6a)';
        ?>
        <div class="login-item">
            <div class="login-avatar" style="background:<?php echo $color; ?>"><?php echo $initials; ?></div>
            <div>
                <div class="login-name"><?php echo htmlspecialchars($l['full_name']); ?></div>
                <div class="login-id"><?php echo $l['username']; ?> &bull; <?php echo $l['role']; ?></div>
            </div>
            <div class="login-time" style="color:<?php echo $l['role']==='teacher'?'#1565c0':'#2e7d32'; ?>"><?php echo $t; ?></div>
        </div>
        <?php endforeach; endif; ?>
    </div>
</div>
</body></html>
