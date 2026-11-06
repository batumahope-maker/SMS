<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') { header('Location: login.php'); exit(); }
$msg = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    if ($action === 'save') {
        $student_id = (int)$_POST['student_id'];
        $subject    = trim($_POST['subject']);
        $term       = trim($_POST['term']);
        $year       = trim($_POST['year']);
        $marks      = (float)$_POST['marks'];
        $max_marks  = (float)($_POST['max_marks'] ?? 100);
        $mark_id    = (int)($_POST['mark_id'] ?? 0);
        if ($mark_id) {
            $upd = $pdo->prepare("UPDATE marks SET subject=?,term=?,year=?,marks=?,max_marks=? WHERE id=?");
            $upd->execute([$subject,$term,$year,$marks,$max_marks,$mark_id]);
            $msg = '✅ Mark updated!';
        } else {
            $ins = $pdo->prepare("INSERT INTO marks (student_id,subject,term,year,marks,max_marks) VALUES (?,?,?,?,?,?)");
            $ins->execute([$student_id,$subject,$term,$year,$marks,$max_marks]);
            $msg = '✅ Mark added!';
        }
    }
    if ($action === 'delete') {
        $del = $pdo->prepare("DELETE FROM marks WHERE id=?"); $del->execute([(int)$_POST['mark_id']]); $msg = '✅ Mark deleted.';
    }
}

$filter_student = trim($_GET['student_id'] ?? '');
$filter_subject = trim($_GET['subject'] ?? '');
$filter_term    = trim($_GET['term'] ?? '');

$sql = "SELECT m.*, u.full_name, u.username, s.trade, s.level, s.section FROM marks m JOIN users u ON m.student_id=u.id JOIN students s ON m.student_id=s.user_id WHERE 1=1";
$params = [];
if ($filter_student) { $sql .= " AND m.student_id=?"; $params[] = $filter_student; }
if ($filter_subject) { $sql .= " AND m.subject LIKE ?"; $params[] = "%$filter_subject%"; }
if ($filter_term)    { $sql .= " AND m.term=?"; $params[] = $filter_term; }
$sql .= " ORDER BY u.full_name, m.subject, m.term";
$stmt = $pdo->prepare($sql); $stmt->execute($params);
$marks_list = $stmt->fetchAll(PDO::FETCH_ASSOC);

$ss = $pdo->query("SELECT u.id,u.full_name,u.username,s.trade,s.level,s.section FROM users u JOIN students s ON u.id=s.user_id WHERE u.role='student' AND u.status='Active' ORDER BY u.full_name");
$students = $ss->fetchAll(PDO::FETCH_ASSOC);

$terms = ['Term 1','Term 2','Term 3'];
function grade($pct) {
    if ($pct>=90) return ['A+','#1b5e20']; if ($pct>=80) return ['A','#2e7d32'];
    if ($pct>=70) return ['B','#1565c0'];  if ($pct>=60) return ['C','#e65100'];
    if ($pct>=50) return ['D','#bf360c'];  return ['F','#c62828'];
}
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Marks Management - ESSJT</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f5f5}
.header{background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:15px 30px;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:1.4em}.back-btn{background:white;color:#764ba2;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600}
.container{max-width:1400px;margin:25px auto;padding:0 20px}
.msg{padding:12px 18px;border-radius:8px;margin-bottom:16px;font-weight:600;background:#e8f5e9;color:#2e7d32;border-left:4px solid #4caf50}
.card{background:white;border-radius:12px;padding:22px;margin-bottom:20px;box-shadow:0 4px 15px rgba(0,0,0,.08)}
.form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
label{display:block;font-weight:600;color:#555;margin-bottom:5px;font-size:.88em}
input,select{width:100%;padding:10px 12px;border:2px solid #e0e0e0;border-radius:8px;font-size:.92em}
input:focus,select:focus{outline:none;border-color:#764ba2}
.btn{padding:10px 22px;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:.92em}
.btn-purple{background:#764ba2;color:white}.btn-red{background:#e53935;color:white;padding:5px 12px;font-size:.82em}
.filters{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-bottom:18px}
.filters>div{flex:1;min-width:150px}
table{width:100%;border-collapse:collapse}
th{background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:11px 10px;text-align:left;font-size:.85em}
td{padding:10px;border-bottom:1px solid #f0f0f0;font-size:.87em}tr:hover{background:#f8f9ff}
.grade-badge{padding:3px 10px;border-radius:20px;font-size:.82em;font-weight:800;color:white}
.pct-bar{background:#f0f0f0;border-radius:10px;height:8px;margin-top:4px}
.pct-fill{background:linear-gradient(90deg,#667eea,#764ba2);border-radius:10px;height:8px}
.no-data{text-align:center;padding:50px;color:#999}
</style></head><body>
<div class="header">
    <div style="display:flex;align-items:center;gap:15px">
        <img src="../assets/essjt-logo.png" style="width:45px;height:45px;object-fit:contain" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <h1>📊 Marks Management</h1>
    </div>
    <a href="control_panel.php" class="back-btn">← Back to Panel</a>
</div>
<div class="container">
<?php if ($msg): ?><div class="msg"><?php echo $msg; ?></div><?php endif; ?>
<div class="card">
    <h2 style="font-size:1.05em;color:#444;margin-bottom:14px">➕ Add / Edit Mark</h2>
    <form method="POST" id="markForm">
        <input type="hidden" name="action" value="save">
        <input type="hidden" name="mark_id" id="mark_id" value="0">
        <div class="form-grid">
            <div><label>Student *</label>
                <select name="student_id" id="f_student" required>
                    <option value="">-- Select Student --</option>
                    <?php foreach ($students as $s): ?><option value="<?php echo $s['id']; ?>"><?php echo htmlspecialchars($s['full_name'].' ('.$s['username'].') — '.$s['trade'].' '.$s['level'].$s['section']); ?></option><?php endforeach; ?>
                </select>
            </div>
            <div><label>Subject *</label><input type="text" name="subject" id="f_subject" placeholder="e.g. Mathematics" required></div>
            <div><label>Term *</label>
                <select name="term" id="f_term" required>
                    <?php foreach ($terms as $t): ?><option value="<?php echo $t; ?>"><?php echo $t; ?></option><?php endforeach; ?>
                </select>
            </div>
            <div><label>Year *</label>
                <select name="year" id="f_year" required>
                    <?php for ($y=date('Y');$y>=date('Y')-3;$y--): ?><option value="<?php echo $y; ?>"><?php echo $y; ?></option><?php endfor; ?>
                </select>
            </div>
            <div><label>Marks *</label><input type="number" name="marks" id="f_marks" min="0" max="200" step="0.5" required placeholder="e.g. 78"></div>
            <div><label>Out Of</label><input type="number" name="max_marks" id="f_max" value="100" min="1" step="0.5"></div>
        </div>
        <div style="margin-top:16px;display:flex;gap:10px">
            <button type="submit" class="btn btn-purple" id="submitBtn">💾 Save Mark</button>
            <button type="button" class="btn" style="background:#f0f0f0;color:#555" onclick="resetForm()">✕ Clear</button>
        </div>
    </form>
</div>
<div class="card" style="padding:16px 22px">
    <form method="GET" class="filters">
        <div><label>Filter by Student</label>
            <select name="student_id">
                <option value="">All Students</option>
                <?php foreach ($students as $s): ?><option value="<?php echo $s['id']; ?>" <?php echo $filter_student==$s['id']?'selected':''; ?>><?php echo htmlspecialchars($s['full_name']); ?></option><?php endforeach; ?>
            </select>
        </div>
        <div><label>Subject</label><input type="text" name="subject" value="<?php echo htmlspecialchars($filter_subject); ?>" placeholder="Search subject..."></div>
        <div><label>Term</label>
            <select name="term"><option value="">All Terms</option><?php foreach ($terms as $t): ?><option value="<?php echo $t; ?>" <?php echo $filter_term===$t?'selected':''; ?>><?php echo $t; ?></option><?php endforeach; ?></select>
        </div>
        <div style="display:flex;gap:8px;align-items:flex-end">
            <button type="submit" class="btn btn-purple">🔍 Filter</button>
            <a href="marks.php" class="btn" style="background:#f0f0f0;color:#555">Clear</a>
        </div>
    </form>
</div>
<div class="card">
    <h2 style="font-size:1.05em;color:#444;margin-bottom:14px">📋 Marks Records (<?php echo count($marks_list); ?>)</h2>
    <?php if (empty($marks_list)): ?>
    <div class="no-data">📭 No marks found. Add marks using the form above.</div>
    <?php else: ?>
    <table>
        <tr><th>#</th><th>Student</th><th>ID</th><th>Class</th><th>Subject</th><th>Term</th><th>Year</th><th>Score</th><th>Grade</th><th>Actions</th></tr>
        <?php foreach ($marks_list as $i => $m):
            $pct = $m['max_marks']>0 ? round(($m['marks']/$m['max_marks'])*100,1) : 0;
            [$g, $gc] = grade($pct);
        ?>
        <tr>
            <td><?php echo $i+1; ?></td>
            <td style="font-weight:600"><?php echo htmlspecialchars($m['full_name']); ?></td>
            <td style="color:#667eea;font-weight:700"><?php echo $m['username']; ?></td>
            <td><?php echo $m['trade'].' '.$m['level'].$m['section']; ?></td>
            <td><?php echo htmlspecialchars($m['subject']); ?></td>
            <td><?php echo $m['term']; ?></td><td><?php echo $m['year']; ?></td>
            <td>
                <strong><?php echo $m['marks']; ?></strong>/<?php echo $m['max_marks']; ?>
                <div class="pct-bar"><div class="pct-fill" style="width:<?php echo $pct; ?>%"></div></div>
                <small style="color:#888"><?php echo $pct; ?>%</small>
            </td>
            <td><span class="grade-badge" style="background:<?php echo $gc; ?>"><?php echo $g; ?></span></td>
            <td style="white-space:nowrap">
                <button class="btn btn-purple" style="padding:5px 10px;font-size:.82em" onclick="editMark(<?php echo $m['id']; ?>,'<?php echo $m['student_id']; ?>','<?php echo addslashes($m['subject']); ?>','<?php echo $m['term']; ?>','<?php echo $m['year']; ?>','<?php echo $m['marks']; ?>','<?php echo $m['max_marks']; ?>')">✏️</button>
                <form method="POST" style="display:inline" onsubmit="return confirm('Delete?')">
                    <input type="hidden" name="action" value="delete"><input type="hidden" name="mark_id" value="<?php echo $m['id']; ?>">
                    <button type="submit" class="btn btn-red">🗑</button>
                </form>
            </td>
        </tr>
        <?php endforeach; ?>
    </table>
    <?php endif; ?>
</div>
</div>
<script>
function editMark(id,sid,subject,term,year,marks,max){
    document.getElementById('mark_id').value=id;document.getElementById('f_student').value=sid;
    document.getElementById('f_subject').value=subject;document.getElementById('f_term').value=term;
    document.getElementById('f_year').value=year;document.getElementById('f_marks').value=marks;
    document.getElementById('f_max').value=max;document.getElementById('submitBtn').textContent='💾 Update Mark';
    window.scrollTo({top:0,behavior:'smooth'});
}
function resetForm(){document.getElementById('markForm').reset();document.getElementById('mark_id').value='0';document.getElementById('submitBtn').textContent='💾 Save Mark';}
</script>
</body></html>
