<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') { header('Location: login.php'); exit(); }

$top = $pdo->query("SELECT u.id, u.username, u.full_name, s.trade, s.level, s.section, AVG((m.marks/m.max_marks)*100) as avg_pct, COUNT(DISTINCT m.subject) as subjects_count FROM users u JOIN students s ON u.id=s.user_id LEFT JOIN marks m ON u.id=m.student_id WHERE u.role='student' AND u.status='Active' GROUP BY u.id HAVING subjects_count > 0 ORDER BY avg_pct DESC LIMIT 50");
$top_students = $top->fetchAll(PDO::FETCH_ASSOC);

$att = $pdo->query("SELECT u.username, u.full_name, s.trade, s.level, COUNT(CASE WHEN a.status='Present' THEN 1 END) as present_count, COUNT(*) as total_records, (COUNT(CASE WHEN a.status='Present' THEN 1 END)/COUNT(*)*100) as att_pct FROM users u JOIN students s ON u.id=s.user_id LEFT JOIN attendance a ON u.id=a.student_id WHERE u.role='student' AND u.status='Active' GROUP BY u.id HAVING total_records > 0 ORDER BY att_pct DESC, present_count DESC LIMIT 20");
$att_champs = $att->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Best Performers - ESSJT</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f5f5}
.header{background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:15px 30px;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:1.4em}.back-btn{background:white;color:#667eea;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600}
.container{max-width:1200px;margin:30px auto;padding:0 20px}
.section{background:white;padding:25px;border-radius:15px;box-shadow:0 4px 15px rgba(0,0,0,.1);margin-bottom:25px}
.section h2{color:#667eea;margin-bottom:20px;padding-bottom:12px;border-bottom:3px solid #667eea}
.podium{display:grid;grid-template-columns:1fr 1.2fr 1fr;gap:20px;margin-bottom:25px;align-items:end}
.podium-card{color:white;padding:25px;border-radius:15px;text-align:center}
.p1{background:linear-gradient(135deg,#f093fb,#f5576c)}
.p2{background:linear-gradient(135deg,#4facfe,#00f2fe)}
.p3{background:linear-gradient(135deg,#43e97b,#38f9d7)}
.rank-badge{font-size:3em;margin-bottom:8px}
.pname{font-size:1.2em;font-weight:700;margin-bottom:4px}
.pid{opacity:.9;margin-bottom:12px;font-size:.9em}
.pct{font-size:2em;font-weight:700}
table{width:100%;border-collapse:collapse}
th{background:#667eea;color:white;padding:12px;text-align:left;font-size:.85em}
td{padding:12px;border-bottom:1px solid #f0f0f0;font-size:.87em}tr:hover{background:#f8f9ff}
.rank-num{background:#667eea;color:white;width:30px;height:30px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:.85em}
.r1{background:#f093fb}.r2{background:#4facfe}.r3{background:#43e97b}
.bar{background:#eee;border-radius:4px;height:6px;margin-top:3px}
.bar-fill{background:linear-gradient(to right,#667eea,#764ba2);height:6px;border-radius:4px}
.empty{text-align:center;padding:40px;color:#999}
</style></head><body>
<div class="header">
    <div style="display:flex;align-items:center;gap:15px">
        <img src="../assets/essjt-logo.png" style="width:45px;height:45px;object-fit:contain" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <h1>🏆 Best Performers</h1>
    </div>
    <a href="control_panel.php" class="back-btn">← Back</a>
</div>
<div class="container">

<?php if (count($top_students) >= 3): ?>
<div class="section">
    <h2>🥇 Top 3 Students (Overall Performance)</h2>
    <div class="podium">
        <div class="podium-card p2">
            <div class="rank-badge">🥈</div>
            <div class="pname"><?php echo htmlspecialchars($top_students[1]['full_name']); ?></div>
            <div class="pid"><?php echo $top_students[1]['username']; ?></div>
            <div class="pct"><?php echo number_format($top_students[1]['avg_pct'],1); ?>%</div>
            <div><?php echo htmlspecialchars($top_students[1]['trade'].'-'.$top_students[1]['level']); ?></div>
        </div>
        <div class="podium-card p1">
            <div class="rank-badge">🥇</div>
            <div class="pname"><?php echo htmlspecialchars($top_students[0]['full_name']); ?></div>
            <div class="pid"><?php echo $top_students[0]['username']; ?></div>
            <div class="pct"><?php echo number_format($top_students[0]['avg_pct'],1); ?>%</div>
            <div><?php echo htmlspecialchars($top_students[0]['trade'].'-'.$top_students[0]['level']); ?></div>
        </div>
        <div class="podium-card p3">
            <div class="rank-badge">🥉</div>
            <div class="pname"><?php echo htmlspecialchars($top_students[2]['full_name']); ?></div>
            <div class="pid"><?php echo $top_students[2]['username']; ?></div>
            <div class="pct"><?php echo number_format($top_students[2]['avg_pct'],1); ?>%</div>
            <div><?php echo htmlspecialchars($top_students[2]['trade'].'-'.$top_students[2]['level']); ?></div>
        </div>
    </div>
</div>
<?php endif; ?>

<div class="section">
    <h2>📊 Top 50 Students</h2>
    <?php if (empty($top_students)): ?>
    <div class="empty">📭 No marks data yet.</div>
    <?php else: ?>
    <table>
        <tr><th>Rank</th><th>Student ID</th><th>Full Name</th><th>Class</th><th>Subjects</th><th>Average</th><th>Progress</th></tr>
        <?php foreach ($top_students as $i => $s): $rank=$i+1; $rc=$rank<=3?"r$rank":''; ?>
        <tr>
            <td><span class="rank-num <?php echo $rc; ?>"><?php echo $rank; ?></span></td>
            <td><strong><?php echo htmlspecialchars($s['username']); ?></strong></td>
            <td><?php echo htmlspecialchars($s['full_name']); ?></td>
            <td><?php echo htmlspecialchars($s['trade'].'-'.$s['level'].'-'.$s['section']); ?></td>
            <td><?php echo $s['subjects_count']; ?> subjects</td>
            <td><strong><?php echo number_format($s['avg_pct'],1); ?>%</strong></td>
            <td style="width:120px"><div class="bar"><div class="bar-fill" style="width:<?php echo min(100,$s['avg_pct']); ?>%"></div></div></td>
        </tr>
        <?php endforeach; ?>
    </table>
    <?php endif; ?>
</div>

<div class="section">
    <h2>📋 Attendance Champions</h2>
    <?php if (empty($att_champs)): ?>
    <div class="empty">📭 No attendance data yet.</div>
    <?php else: ?>
    <table>
        <tr><th>Student ID</th><th>Full Name</th><th>Class</th><th>Present Days</th><th>Attendance %</th></tr>
        <?php foreach ($att_champs as $c): ?>
        <tr>
            <td><strong><?php echo htmlspecialchars($c['username']); ?></strong></td>
            <td><?php echo htmlspecialchars($c['full_name']); ?></td>
            <td><?php echo htmlspecialchars($c['trade'].'-'.$c['level']); ?></td>
            <td><?php echo $c['present_count'].'/'.$c['total_records']; ?></td>
            <td><strong><?php echo number_format($c['att_pct'],1); ?>%</strong></td>
        </tr>
        <?php endforeach; ?>
    </table>
    <?php endif; ?>
</div>
</div></body></html>
