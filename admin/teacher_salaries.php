<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') { header('Location: login.php'); exit(); }
$success='';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $act = $_POST['action'];
    if ($act === 'add') {
        $base=(float)$_POST['base_salary']; $bon=(float)($_POST['bonuses']??0); $ded=(float)($_POST['deductions']??0); $net=$base+$bon-$ded;
        $chk = $pdo->prepare("SELECT id FROM teacher_salaries WHERE teacher_id=? AND month=? AND year=?");
        $chk->execute([(int)$_POST['teacher_id'],$_POST['month'],$_POST['year']]);
        if ($chk->fetch()) {
            $upd = $pdo->prepare("UPDATE teacher_salaries SET base_salary=?,bonuses=?,deductions=?,net_salary=?,payment_status=? WHERE teacher_id=? AND month=? AND year=?");
            $upd->execute([$base,$bon,$ded,$net,$_POST['payment_status'],(int)$_POST['teacher_id'],$_POST['month'],$_POST['year']]);
        } else {
            $ins = $pdo->prepare("INSERT INTO teacher_salaries (teacher_id,month,year,base_salary,bonuses,deductions,net_salary,payment_status,paid_date) VALUES (?,?,?,?,?,?,?,?,?)");
            $ins->execute([(int)$_POST['teacher_id'],$_POST['month'],$_POST['year'],$base,$bon,$ded,$net,$_POST['payment_status'],!empty($_POST['payment_date'])?$_POST['payment_date']:null]);
        }
        $success = 'Salary recorded!';
    } elseif ($act === 'delete') {
        $del = $pdo->prepare("DELETE FROM teacher_salaries WHERE id=?"); $del->execute([(int)$_POST['id']]); $success = 'Deleted!';
    }
}
$ts = $pdo->query("SELECT id,username,full_name FROM users WHERE role='teacher' AND status='Active' ORDER BY full_name");
$teachers = $ts->fetchAll(PDO::FETCH_ASSOC);
$rs = $pdo->query("SELECT ts.*,u.full_name,u.username FROM teacher_salaries ts JOIN users u ON ts.teacher_id=u.id ORDER BY ts.year DESC,ts.month,u.full_name");
$result = $rs->fetchAll(PDO::FETCH_ASSOC);
$total_paid = array_sum(array_map(fn($r)=>$r['payment_status']==='Paid'?$r['net_salary']:0, $result));
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Teacher Salaries - ESSJT Admin</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f5f5}
.header{background:linear-gradient(135deg,#9c27b0,#ce93d8);color:white;padding:15px 30px;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:1.4em}.back-btn{background:white;color:#9c27b0;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600}
.container{max-width:1100px;margin:30px auto;padding:0 20px}
.form-card,.table-card{background:white;padding:25px;border-radius:12px;margin-bottom:25px;box-shadow:0 4px 15px rgba(0,0,0,.08)}
.form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:15px}
label{display:block;font-weight:600;color:#555;margin-bottom:6px;font-size:.9em}
input,select{width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:.9em}
.submit-btn{padding:12px 25px;background:#9c27b0;color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;margin-top:15px}
.total-box{background:linear-gradient(135deg,#9c27b0,#ce93d8);color:white;padding:20px;border-radius:12px;text-align:center;margin-bottom:20px}
.total-num{font-size:2em;font-weight:700}
table{width:100%;border-collapse:collapse}
th{background:linear-gradient(135deg,#9c27b0,#ce93d8);color:white;padding:12px;text-align:left}
td{padding:11px;border-bottom:1px solid #f0f0f0}tr:hover{background:#f8f9fa}
.badge{padding:3px 10px;border-radius:20px;font-weight:700;font-size:.82em}
.Paid{background:#e8f5e9;color:#2e7d32}.Pending{background:#fff3e0;color:#e65100}
.del-btn{background:#ffebee;color:#e53935;border:none;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:.82em;font-weight:600}
.success{background:#e8f5e9;color:#2e7d32;padding:12px;border-radius:8px;margin-bottom:15px}
</style></head><body>
<div class="header">
    <div style="display:flex;align-items:center;gap:15px">
        <img src="../assets/essjt-logo.png" style="width:45px;height:45px;object-fit:contain" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <h1>💰 Teacher Salaries</h1>
    </div>
    <a href="control_panel.php" class="back-btn">← Back to Panel</a>
</div>
<div class="container">
<?php if ($success): ?><div class="success">✅ <?php echo $success; ?></div><?php endif; ?>
<div class="form-card">
    <h3 style="margin-bottom:20px">➕ Record Salary</h3>
    <form method="POST">
        <input type="hidden" name="action" value="add">
        <div class="form-grid">
            <div><label>Teacher</label>
                <select name="teacher_id" required>
                    <option value="">-- Select --</option>
                    <?php foreach ($teachers as $t): ?><option value="<?php echo $t['id']; ?>"><?php echo htmlspecialchars($t['username'].' - '.$t['full_name']); ?></option><?php endforeach; ?>
                </select>
            </div>
            <div><label>Month</label>
                <select name="month" required>
                    <?php foreach (['January','February','March','April','May','June','July','August','September','October','November','December'] as $m): ?><option value="<?php echo $m; ?>" <?php echo $m===date('F')?'selected':''; ?>><?php echo $m; ?></option><?php endforeach; ?>
                </select>
            </div>
            <div><label>Year</label><input type="text" name="year" required value="<?php echo date('Y'); ?>"></div>
            <div><label>Base Salary (RWF)</label><input type="number" name="base_salary" required min="0" step="1000" placeholder="e.g. 150000"></div>
            <div><label>Bonuses (RWF)</label><input type="number" name="bonuses" min="0" step="1000" value="0"></div>
            <div><label>Deductions (RWF)</label><input type="number" name="deductions" min="0" step="1000" value="0"></div>
            <div><label>Payment Status</label>
                <select name="payment_status"><option value="Pending">⏳ Pending</option><option value="Paid">✅ Paid</option></select>
            </div>
            <div><label>Payment Date</label><input type="date" name="payment_date"></div>
        </div>
        <button type="submit" class="submit-btn">💾 Save Salary</button>
    </form>
</div>
<div class="total-box">
    <div>Total Salaries Paid</div>
    <div class="total-num"><?php echo number_format($total_paid,0); ?> RWF</div>
</div>
<div class="table-card">
    <table>
        <tr><th>Teacher</th><th>Month/Year</th><th>Base</th><th>Bonus</th><th>Deductions</th><th>Net</th><th>Status</th><th>Action</th></tr>
        <?php if (empty($result)): ?>
        <tr><td colspan="8" style="text-align:center;padding:30px;color:#999">No salary records yet.</td></tr>
        <?php else: foreach ($result as $r): ?>
        <tr>
            <td><?php echo htmlspecialchars($r['username'].' - '.$r['full_name']); ?></td>
            <td><?php echo $r['month'].' '.$r['year']; ?></td>
            <td><?php echo number_format($r['base_salary'],0); ?></td>
            <td style="color:green">+<?php echo number_format($r['bonuses']??0,0); ?></td>
            <td style="color:red">-<?php echo number_format($r['deductions']??0,0); ?></td>
            <td><strong><?php echo number_format($r['net_salary'],0); ?> RWF</strong></td>
            <td><span class="badge <?php echo $r['payment_status']; ?>"><?php echo $r['payment_status']; ?></span></td>
            <td><form method="POST"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?php echo $r['id']; ?>"><button type="submit" class="del-btn" onclick="return confirm('Delete?')">🗑️</button></form></td>
        </tr>
        <?php endforeach; endif; ?>
    </table>
</div>
</div></body></html>
