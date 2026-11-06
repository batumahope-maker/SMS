<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id'])) { header('Location: login.php'); exit(); }
$user_id = $_SESSION['user_id'];
$role    = $_SESSION['role'];
if ($role === 'student') {
    $s = $pdo->prepare("SELECT trade, level, section FROM students WHERE user_id = ?");
    $s->execute([$user_id]);
    $info = $s->fetch(PDO::FETCH_ASSOC);
    $stmt = $pdo->prepare("SELECT s.*, u.full_name as teacher_name FROM school_schedule s LEFT JOIN users u ON s.teacher_id = u.id WHERE s.trade = ? AND s.level = ? AND s.section = ? AND s.is_active = 1 ORDER BY FIELD(s.day_of_week,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'), s.start_time");
    $stmt->execute([$info['trade'], $info['level'], $info['section']]);
} else {
    $stmt = $pdo->prepare("SELECT s.*, u.full_name as teacher_name FROM school_schedule s LEFT JOIN users u ON s.teacher_id = u.id WHERE s.teacher_id = ? AND s.is_active = 1 ORDER BY FIELD(s.day_of_week,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'), s.start_time");
    $stmt->execute([$user_id]);
}
$schedule = $stmt->fetchAll(PDO::FETCH_ASSOC);
$by_day = [];
foreach ($schedule as $s) $by_day[$s['day_of_week']][] = $s;
$days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
$day_colors = ['Monday'=>'#1a73e8','Tuesday'=>'#e53935','Wednesday'=>'#11998e','Thursday'=>'#9c27b0','Friday'=>'#f4511e','Saturday'=>'#607d8b'];
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Class Schedule - ESSJT</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f5f5}
.header{background:linear-gradient(135deg,#1a73e8,#42a5f5);color:white;padding:15px 30px;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:1.4em}.back-btn{background:white;color:#1a73e8;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600}
.container{max-width:900px;margin:30px auto;padding:0 20px}
.day-section{background:white;border-radius:12px;margin-bottom:20px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.08)}
.day-header{color:white;padding:12px 20px;font-weight:700;font-size:1.1em}
.period{display:grid;grid-template-columns:120px 1fr auto;gap:15px;padding:15px 20px;border-bottom:1px solid #f0f0f0;align-items:center}
.period:last-child{border-bottom:none}
.time{font-weight:700;color:#333}.subject{font-weight:600;color:#333}.teacher{color:#666;font-size:0.9em}
.room{background:#f0f0f0;padding:3px 10px;border-radius:20px;font-size:0.85em;color:#555}
.empty{text-align:center;padding:60px;color:#999}
</style></head><body>
<div class="header">
    <div style="display:flex;align-items:center;gap:15px">
        <img src="../assets/essjt-logo.png" style="width:45px;height:45px;object-fit:contain" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <h1>📅 Class Schedule</h1>
    </div>
    <a href="dashboard.php" class="back-btn">← Back to Dashboard</a>
</div>
<div class="container">
<?php if (empty($schedule)): ?>
    <div class="empty" style="background:white;border-radius:12px">📅 No schedule has been set up yet. Please check back later!</div>
<?php else: foreach ($days as $day): if (!isset($by_day[$day])) continue; ?>
    <div class="day-section">
        <div class="day-header" style="background:<?php echo $day_colors[$day]; ?>">📅 <?php echo $day; ?></div>
        <?php foreach ($by_day[$day] as $p): ?>
        <div class="period">
            <div class="time">⏰ <?php echo date('h:i A', strtotime($p['start_time'])); ?><br><small style="color:#999"><?php echo date('h:i A', strtotime($p['end_time'])); ?></small></div>
            <div>
                <div class="subject">📖 <?php echo htmlspecialchars($p['subject']); ?></div>
                <?php if ($role==='student' && !empty($p['teacher_name'])): ?><div class="teacher">👨‍🏫 <?php echo htmlspecialchars($p['teacher_name']); ?></div><?php endif; ?>
            </div>
            <?php if (!empty($p['room_number'])): ?><span class="room">🚪 Room <?php echo htmlspecialchars($p['room_number']); ?></span><?php endif; ?>
        </div>
        <?php endforeach; ?>
    </div>
<?php endforeach; endif; ?>
</div></body></html>
