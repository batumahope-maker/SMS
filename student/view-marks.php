<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'student') { header('Location: login.php'); exit(); }
$user_id = $_SESSION['user_id'];
$stmt = $pdo->prepare("SELECT * FROM marks WHERE student_id = ? ORDER BY year DESC, term, subject");
$stmt->execute([$user_id]);
$marks = $stmt->fetchAll(PDO::FETCH_ASSOC);
$by_term = [];
foreach ($marks as $m) $by_term[$m['year'].'-'.$m['term']][] = $m;
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>My Grades - ESSJT</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f5f5}
.header{background:linear-gradient(135deg,#11998e,#38ef7d);color:white;padding:15px 30px;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:1.4em}.back-btn{background:white;color:#11998e;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600}
.container{max-width:900px;margin:30px auto;padding:0 20px}
.term-card{background:white;border-radius:12px;margin-bottom:25px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.08)}
.term-header{background:linear-gradient(135deg,#11998e,#38ef7d);color:white;padding:12px 20px;font-weight:700}
table{width:100%;border-collapse:collapse}
th{background:#f8f9fa;padding:12px;text-align:left;font-weight:600;color:#555;border-bottom:2px solid #eee}
td{padding:12px;border-bottom:1px solid #f0f0f0}
.grade{padding:3px 12px;border-radius:20px;font-weight:700;font-size:0.85em;color:white}
.A{background:#4caf50}.B{background:#8bc34a}.C{background:#ffc107;color:#333}.D{background:#ff9800}.F{background:#e53935}
.progress{background:#eee;border-radius:10px;height:8px;overflow:hidden}
.progress-bar{height:100%;border-radius:10px;background:linear-gradient(to right,#11998e,#38ef7d)}
.empty{text-align:center;padding:60px;color:#999}
</style></head><body>
<div class="header">
    <div style="display:flex;align-items:center;gap:15px">
        <img src="../assets/essjt-logo.png" style="width:45px;height:45px;object-fit:contain" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <h1>📊 My Grades</h1>
    </div>
    <a href="dashboard.php" class="back-btn">← Back to Dashboard</a>
</div>
<div class="container">
<?php if (empty($marks)): ?>
    <div class="empty" style="background:white;border-radius:12px">📊 No grades recorded yet. Check back after exams!</div>
<?php else: foreach ($by_term as $term_key => $term_marks):
    $avg = array_sum(array_map(fn($m) => ($m['marks']/$m['max_marks'])*100, $term_marks)) / count($term_marks);
    [$year,$term] = explode('-', $term_key, 2);
?>
    <div class="term-card">
        <div class="term-header">📅 <?php echo $term; ?> - <?php echo $year; ?> &bull; Average: <?php echo number_format($avg,1); ?>%</div>
        <table>
            <tr><th>Subject</th><th>Marks</th><th>Percentage</th><th>Grade</th><th>Progress</th></tr>
            <?php foreach ($term_marks as $m):
                $pct   = ($m['marks']/$m['max_marks'])*100;
                $grade = $pct>=80?'A':($pct>=65?'B':($pct>=50?'C':($pct>=40?'D':'F')));
            ?>
            <tr>
                <td><?php echo htmlspecialchars($m['subject']); ?></td>
                <td><?php echo $m['marks']; ?>/<?php echo $m['max_marks']; ?></td>
                <td><?php echo number_format($pct,1); ?>%</td>
                <td><span class="grade <?php echo $grade; ?>"><?php echo $grade; ?></span></td>
                <td style="width:150px"><div class="progress"><div class="progress-bar" style="width:<?php echo $pct; ?>%"></div></div></td>
            </tr>
            <?php endforeach; ?>
        </table>
    </div>
<?php endforeach; endif; ?>
</div></body></html>
