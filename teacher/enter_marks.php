<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'teacher') { header('Location: login.php'); exit(); }

$teacher_id = $_SESSION['user_id'];
$msg = '';

// SAVE MARKS
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'save_marks') {
    $subject  = trim($_POST['subject']);
    $term     = trim($_POST['term']);
    $year     = trim($_POST['year']);
    $max_m    = (float)$_POST['max_marks'];
    $marks_in = $_POST['marks'] ?? [];
    $saved    = 0;
    foreach ($marks_in as $student_id => $mark_val) {
        if ($mark_val === '' || $mark_val === null) continue;
        $mark_val = (float)$mark_val;
        $chk = $pdo->prepare("SELECT id FROM marks WHERE student_id = ? AND subject = ? AND term = ? AND year = ?");
        $chk->execute([$student_id, $subject, $term, $year]);
        $existing = $chk->fetch(PDO::FETCH_ASSOC);
        if ($existing) {
            $upd = $pdo->prepare("UPDATE marks SET marks = ?, max_marks = ? WHERE id = ?");
            $upd->execute([$mark_val, $max_m, $existing['id']]);
        } else {
            $ins = $pdo->prepare("INSERT INTO marks (student_id, subject, term, year, marks, max_marks) VALUES (?, ?, ?, ?, ?, ?)");
            $ins->execute([$student_id, $subject, $term, $year, $mark_val, $max_m]);
        }
        $saved++;
    }
    $msg = "✅ Marks saved for $saved students — Subject: $subject, $term $year";
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'delete') {
    $del = $pdo->prepare("DELETE FROM marks WHERE id = ?");
    $del->execute([(int)$_POST['mark_id']]);
    $msg = '✅ Mark deleted.';
}

$stmt = $pdo->prepare("SELECT DISTINCT trade, level, section FROM school_schedule WHERE teacher_id = ? ORDER BY trade, level, section");
$stmt->execute([$teacher_id]);
$my_classes = $stmt->fetchAll(PDO::FETCH_ASSOC);

$sel_trade   = trim($_GET['trade']   ?? ($my_classes[0]['trade']   ?? ''));
$sel_level   = trim($_GET['level']   ?? ($my_classes[0]['level']   ?? ''));
$sel_section = trim($_GET['section'] ?? ($my_classes[0]['section'] ?? ''));
$sel_subject = trim($_GET['subject'] ?? '');
$sel_term    = trim($_GET['term']    ?? 'Term 1');
$sel_year    = trim($_GET['year']    ?? date('Y'));

$students = [];
if ($sel_trade && $sel_level && $sel_section) {
    $s = $pdo->prepare("SELECT u.id, u.full_name, u.username FROM users u JOIN students s ON u.id=s.user_id WHERE u.role='student' AND u.status='Active' AND s.trade=? AND s.level=? AND s.section=? ORDER BY u.full_name");
    $s->execute([$sel_trade, $sel_level, $sel_section]);
    $students = $s->fetchAll(PDO::FETCH_ASSOC);
}

$existing_marks = [];
if ($students && $sel_subject && $sel_term && $sel_year) {
    foreach ($students as $stu) {
        $m = $pdo->prepare("SELECT id, marks, max_marks FROM marks WHERE student_id = ? AND subject = ? AND term = ? AND year = ?");
        $m->execute([$stu['id'], $sel_subject, $sel_term, $sel_year]);
        $row = $m->fetch(PDO::FETCH_ASSOC);
        if ($row) $existing_marks[$stu['id']] = $row;
    }
}

$marks_list = [];
if ($students) {
    $ids = array_column($students, 'id');
    if (!empty($ids)) {
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $ml = $pdo->prepare("SELECT m.*, u.full_name FROM marks m JOIN users u ON m.student_id=u.id WHERE m.student_id IN ($placeholders) ORDER BY u.full_name, m.subject, m.term");
        $ml->execute($ids);
        $marks_list = $ml->fetchAll(PDO::FETCH_ASSOC);
    }
}

function grade($pct) {
    if ($pct>=90) return 'A+'; if ($pct>=80) return 'A';
    if ($pct>=70) return 'B';  if ($pct>=60) return 'C';
    if ($pct>=50) return 'D';  return 'F';
}
$terms = ['Term 1','Term 2','Term 3'];
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Enter Marks - ESSJT</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f5f5}
.header{background:linear-gradient(135deg,#1a73e8,#42a5f5);color:white;padding:15px 30px;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:1.4em}.back-btn{background:white;color:#1a73e8;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600}
.container{max-width:1200px;margin:25px auto;padding:0 20px}
.msg{padding:12px 18px;border-radius:8px;margin-bottom:16px;font-weight:600;background:#e8f5e9;color:#2e7d32;border-left:4px solid #4caf50}
.card{background:white;border-radius:12px;padding:22px;margin-bottom:20px;box-shadow:0 4px 15px rgba(0,0,0,.08)}
h2{font-size:1.05em;color:#444;margin-bottom:14px}
.form-row{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}
.form-row>div{flex:1;min-width:130px}
label{display:block;font-weight:600;color:#555;margin-bottom:5px;font-size:.88em}
input,select{width:100%;padding:10px 12px;border:2px solid #e0e0e0;border-radius:8px;font-size:.92em}
input:focus,select:focus{outline:none;border-color:#1a73e8}
.btn{padding:10px 22px;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:.92em}
.btn-blue{background:#1a73e8;color:white}.btn-green{background:#4caf50;color:white}
.btn-red{background:#e53935;color:white;padding:5px 12px;font-size:.82em}
.marks-table{width:100%;border-collapse:collapse}
.marks-table th{background:linear-gradient(135deg,#1a73e8,#42a5f5);color:white;padding:11px 10px;text-align:left;font-size:.85em}
.marks-table td{padding:10px;border-bottom:1px solid #f0f0f0;font-size:.87em}
.marks-table tr:hover{background:#f0f8ff}
.marks-input{width:80px;padding:7px;border:2px solid #e0e0e0;border-radius:6px;text-align:center;font-weight:700;font-size:.95em}
.marks-input:focus{border-color:#1a73e8;outline:none}
.pct{font-size:.8em;color:#888}
.grade{padding:2px 8px;border-radius:12px;font-weight:800;font-size:.8em}
.gA{background:#e8f5e9;color:#2e7d32}.gB{background:#e3f2fd;color:#1565c0}.gC{background:#fff3e0;color:#e65100}.gD{background:#fbe9e7;color:#bf360c}.gF{background:#ffebee;color:#c62828}
table{width:100%;border-collapse:collapse}
th{background:linear-gradient(135deg,#1a73e8,#42a5f5);color:white;padding:11px 10px;text-align:left;font-size:.85em}
td{padding:10px;border-bottom:1px solid #f0f0f0;font-size:.87em}tr:hover{background:#f0f8ff}
</style>
</head><body>
<div class="header">
    <div style="display:flex;align-items:center;gap:15px">
        <img src="../assets/essjt-logo.png" style="width:45px;height:45px;object-fit:contain" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <h1>📝 Enter Student Marks</h1>
    </div>
    <a href="dashboard.php" class="back-btn">← Dashboard</a>
</div>
<div class="container">
<?php if ($msg): ?><div class="msg"><?php echo $msg; ?></div><?php endif; ?>
<div class="card">
    <h2>📌 Select Class & Subject</h2>
    <form method="GET" class="form-row">
        <div>
            <label>Class</label>
            <select name="trade" id="class_sel">
                <?php foreach ($my_classes as $c): ?>
                <option value="<?php echo $c['trade']; ?>" data-level="<?php echo $c['level']; ?>" data-sec="<?php echo $c['section']; ?>"
                    <?php echo ($c['trade']===$sel_trade&&$c['level']===$sel_level&&$c['section']===$sel_section)?'selected':''; ?>>
                    <?php echo $c['trade'].' '.$c['level'].$c['section']; ?>
                </option>
                <?php endforeach; ?>
            </select>
        </div>
        <input type="hidden" name="level"   id="f_level"   value="<?php echo htmlspecialchars($sel_level); ?>">
        <input type="hidden" name="section" id="f_section" value="<?php echo htmlspecialchars($sel_section); ?>">
        <div><label>Subject *</label><input type="text" name="subject" value="<?php echo htmlspecialchars($sel_subject); ?>" placeholder="e.g. Mathematics" required></div>
        <div><label>Term</label>
            <select name="term"><?php foreach ($terms as $t): ?><option value="<?php echo $t; ?>" <?php echo $sel_term===$t?'selected':''; ?>><?php echo $t; ?></option><?php endforeach; ?></select>
        </div>
        <div><label>Year</label>
            <select name="year"><?php for ($y=date('Y');$y>=date('Y')-3;$y--): ?><option value="<?php echo $y; ?>" <?php echo $sel_year==$y?'selected':''; ?>><?php echo $y; ?></option><?php endfor; ?></select>
        </div>
        <div style="display:flex;align-items:flex-end"><button type="submit" class="btn btn-blue">🔍 Load</button></div>
    </form>
</div>
<?php if ($students && $sel_subject): ?>
<div class="card">
    <h2>✏️ Enter Marks — <?php echo $sel_trade.' '.$sel_level.$sel_section; ?> | <?php echo htmlspecialchars($sel_subject); ?> | <?php echo $sel_term.' '.$sel_year; ?></h2>
    <form method="POST">
        <input type="hidden" name="action"  value="save_marks">
        <input type="hidden" name="subject" value="<?php echo htmlspecialchars($sel_subject); ?>">
        <input type="hidden" name="term"    value="<?php echo htmlspecialchars($sel_term); ?>">
        <input type="hidden" name="year"    value="<?php echo htmlspecialchars($sel_year); ?>">
        <div style="margin-bottom:14px">
            <label style="margin:0">Out of: <input type="number" name="max_marks" value="100" min="1" style="width:80px;display:inline;padding:6px;margin-left:8px"></label>
        </div>
        <table class="marks-table">
            <tr><th>#</th><th>Student Name</th><th>Student ID</th><th>Marks</th><th>%</th><th>Grade</th></tr>
            <?php foreach ($students as $i => $stu):
                $ex  = $existing_marks[$stu['id']] ?? null;
                $val = $ex ? $ex['marks'] : '';
                $max = $ex ? $ex['max_marks'] : 100;
                $pct = ($val !== '' && $max > 0) ? round(($val/$max)*100,1) : null;
                $g   = $pct !== null ? grade($pct) : '';
                $gc  = $g ? 'g'.substr($g,0,1) : '';
            ?>
            <tr>
                <td><?php echo $i+1; ?></td>
                <td style="font-weight:600"><?php echo htmlspecialchars($stu['full_name']); ?></td>
                <td style="color:#667eea"><?php echo $stu['username']; ?></td>
                <td><input type="number" class="marks-input" name="marks[<?php echo $stu['id']; ?>]" value="<?php echo $val; ?>" min="0" max="200" step="0.5" placeholder="—" oninput="updateRow(this,<?php echo $i; ?>)"></td>
                <td class="pct" id="pct_<?php echo $i; ?>"><?php echo $pct !== null ? $pct.'%' : '—'; ?></td>
                <td><span class="grade <?php echo $gc; ?>" id="grade_<?php echo $i; ?>"><?php echo $g; ?></span></td>
            </tr>
            <?php endforeach; ?>
        </table>
        <div style="margin-top:16px">
            <button type="submit" class="btn btn-green">💾 Save All Marks (<?php echo count($students); ?> students)</button>
        </div>
    </form>
</div>
<?php endif; ?>
<?php if (!empty($marks_list)): ?>
<div class="card">
    <h2>📋 All Marks for <?php echo $sel_trade.' '.$sel_level.$sel_section; ?></h2>
    <table>
        <tr><th>Student</th><th>Subject</th><th>Term</th><th>Year</th><th>Score</th><th>Grade</th><th>Action</th></tr>
        <?php foreach ($marks_list as $m):
            $pct = $m['max_marks']>0 ? round(($m['marks']/$m['max_marks'])*100,1) : 0;
            $g = grade($pct); $gc = 'g'.substr($g,0,1);
        ?>
        <tr>
            <td style="font-weight:600"><?php echo htmlspecialchars($m['full_name']); ?></td>
            <td><?php echo htmlspecialchars($m['subject']); ?></td>
            <td><?php echo $m['term']; ?></td><td><?php echo $m['year']; ?></td>
            <td><?php echo $m['marks'].'/'.$m['max_marks']; ?> <small class="pct">(<?php echo $pct; ?>%)</small></td>
            <td><span class="grade <?php echo $gc; ?>"><?php echo $g; ?></span></td>
            <td>
                <form method="POST" style="display:inline" onsubmit="return confirm('Delete this mark?')">
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="mark_id" value="<?php echo $m['id']; ?>">
                    <button type="submit" class="btn btn-red">🗑 Delete</button>
                </form>
            </td>
        </tr>
        <?php endforeach; ?>
    </table>
</div>
<?php endif; ?>
</div>
<script>
function updateRow(input,i){const val=parseFloat(input.value);const max=parseFloat(document.querySelector('[name="max_marks"]').value)||100;const pctEl=document.getElementById('pct_'+i);const gradeEl=document.getElementById('grade_'+i);if(!isNaN(val)&&max>0){const pct=Math.round((val/max)*1000)/10;pctEl.textContent=pct+'%';let g='F',gc='gF';if(pct>=90){g='A+';gc='gA'}else if(pct>=80){g='A';gc='gA'}else if(pct>=70){g='B';gc='gB'}else if(pct>=60){g='C';gc='gC'}else if(pct>=50){g='D';gc='gD'}gradeEl.textContent=g;gradeEl.className='grade '+gc;}else{pctEl.textContent='—';gradeEl.textContent='';gradeEl.className='grade';}}
document.getElementById('class_sel')?.addEventListener('change',function(){const opt=this.options[this.selectedIndex];document.getElementById('f_level').value=opt.dataset.level||'';document.getElementById('f_section').value=opt.dataset.sec||'';});
</script>
</body></html>
