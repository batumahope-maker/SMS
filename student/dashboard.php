<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'student') {
    header('Location: login.php'); exit();
}
$user_id      = $_SESSION['user_id'];
$student_name = $_SESSION['full_name'];
$username     = $_SESSION['username'];
$stmt = $pdo->prepare("SELECT * FROM students WHERE user_id = ?");
$stmt->execute([$user_id]);
$info = $stmt->fetch(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Dashboard - ESSJT</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Segoe UI',sans-serif; background:#f5f5f5; }
        .header { background:linear-gradient(135deg,#11998e,#38ef7d); color:white; padding:15px 30px; display:flex; justify-content:space-between; align-items:center; }
        .header-left { display:flex; align-items:center; gap:15px; }
        .header-left img { width:50px; height:50px; object-fit:contain; }
        .header h1 { font-size:1.4em; }
        .logout-btn { background:white; color:#11998e; padding:8px 20px; border-radius:8px; text-decoration:none; font-weight:600; }
        .container { max-width:1200px; margin:30px auto; padding:0 20px; }
        .welcome { background:white; padding:25px; border-radius:15px; box-shadow:0 4px 15px rgba(0,0,0,0.08); margin-bottom:25px; }
        .welcome h2 { color:#11998e; margin-bottom:15px; }
        .info-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:15px; margin-top:15px; }
        .info-item { background:#f8f9fa; padding:12px; border-radius:8px; }
        .info-label { font-size:0.8em; color:#666; }
        .info-value { font-weight:700; color:#333; margin-top:3px; }
        .cards-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:20px; }
        .card { background:white; padding:25px; border-radius:15px; box-shadow:0 4px 15px rgba(0,0,0,0.08); text-decoration:none; color:inherit; display:block; transition:all 0.3s; border-left:4px solid #11998e; }
        .card:hover { transform:translateY(-5px); box-shadow:0 8px 25px rgba(0,0,0,0.12); }
        .card-icon { font-size:2.5em; margin-bottom:12px; }
        .card-title { font-size:1.1em; font-weight:700; color:#333; margin-bottom:8px; }
        .card-desc { color:#666; font-size:0.9em; line-height:1.5; }
    </style>
</head>
<body>
<div class="header">
    <div class="header-left">
        <img src="../assets/essjt-logo.png" alt="ESSJT" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <div>
            <h1>🎓 Student Dashboard</h1>
            <p>École Secondaire Saint Joseph le Travailleur</p>
        </div>
    </div>
    <div style="display:flex;align-items:center;gap:15px">
        <span style="color:white">👋 <?php echo htmlspecialchars($student_name); ?></span>
        <a href="logout.php" class="logout-btn">🚪 Logout</a>
    </div>
</div>
<div class="container">
    <div class="welcome">
        <h2>Welcome Back, <?php echo htmlspecialchars($student_name); ?>! 👋</h2>
        <p>Student ID: <strong><?php echo htmlspecialchars($username); ?></strong></p>
        <div class="info-grid">
            <div class="info-item"><div class="info-label">Trade/Program</div><div class="info-value"><?php echo htmlspecialchars($info['trade'] ?? 'N/A'); ?></div></div>
            <div class="info-item"><div class="info-label">Level</div><div class="info-value"><?php echo htmlspecialchars($info['level'] ?? 'N/A'); ?></div></div>
            <div class="info-item"><div class="info-label">Section</div><div class="info-value"><?php echo htmlspecialchars($info['section'] ?? 'N/A'); ?></div></div>
            <div class="info-item"><div class="info-label">Class</div><div class="info-value"><?php echo htmlspecialchars(($info['trade']??'').'-'.($info['level']??'').'-'.($info['section']??'')); ?></div></div>
        </div>
    </div>
    <div class="cards-grid">
        <a href="view-announcements.php" class="card" style="border-color:#f4511e"><div class="card-icon">📢</div><div class="card-title">Announcements</div><div class="card-desc">View all school announcements and important notices</div></a>
        <a href="view-events.php" class="card" style="border-color:#e91e63"><div class="card-icon">🎉</div><div class="card-title">School Events</div><div class="card-desc">View upcoming school events and activities</div></a>
        <a href="view-rules.php" class="card" style="border-color:#9c27b0"><div class="card-icon">📜</div><div class="card-title">School Rules</div><div class="card-desc">Read school rules and regulations</div></a>
        <a href="view-schedule.php" class="card" style="border-color:#1a73e8"><div class="card-icon">📅</div><div class="card-title">Class Schedule</div><div class="card-desc">View your weekly class timetable</div></a>
        <a href="view-marks.php" class="card" style="border-color:#11998e"><div class="card-icon">📊</div><div class="card-title">My Grades</div><div class="card-desc">View your academic marks and performance</div></a>
        <a href="view-attendance.php" class="card" style="border-color:#4caf50"><div class="card-icon">📋</div><div class="card-title">My Attendance</div><div class="card-desc">Check your attendance records</div></a>
        <a href="view-payments.php" class="card" style="border-color:#ff9800"><div class="card-icon">💳</div><div class="card-title">Fee Payments</div><div class="card-desc">View your payment history and status</div></a>
        <a href="profile.php" class="card" style="border-color:#607d8b"><div class="card-icon">👤</div><div class="card-title">My Profile</div><div class="card-desc">View and update your personal information</div></a>
    </div>
</div>
</body>
</html>
