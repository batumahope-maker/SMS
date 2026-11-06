<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') { header('Location: login.php'); exit(); }
$success='';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $act = $_POST['action'];
    if ($act === 'add') {
        $ins = $pdo->prepare("INSERT INTO payments (student_id,amount,payment_method,reference,payment_date) VALUES (?,?,?,?,?)");
        $ins->execute([(int)$_POST['student_id'],(float)$_POST['amount'],$_POST['payment_method'],$_POST['reference']??'',$_POST['payment_date']]);
        $success = 'Payment recorded!';
    } elseif ($act === 'delete') {
        $del = $pdo->prepare("DELETE FROM payments WHERE id=?"); $del->execute([(int)$_POST['id']]); $success = 'Deleted!';
    }
}
$ss = $pdo->query("SELECT u.id,u.username,u.full_name FROM users u WHERE u.role='student' AND u.status='Active' ORDER BY u.username");
$students = $ss->fetchAll(PDO::FETCH_ASSOC);
$filter = (int)($_GET['student_id'] ?? 0);
if ($filter) {
    $r = $pdo->prepare("SELECT p.*,u.full_name,u.username FROM payments p JOIN users u ON p.student_id=u.id WHERE p.student_id=? ORDER BY p.payment_date DESC");
    $r->execute([$filter]);
} else {
    $r = $pdo->query("SELECT p.*,u.full_name,u.username FROM payments p JOIN users u ON p.student_id=u.id ORDER BY p.payment_date DESC LIMIT 100");
}
$payments = $r->fetchAll(PDO::FETCH_ASSOC);
$total = array_sum(array_column($payments,'amount'));
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Payments - ESSJT Admin</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f5f5}
.header{background:linear-gradient(135deg,#ff9800,#ffb74d);color:white;padding:15px 30px;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:1.4em}.back-btn{background:white;color:#ff9800;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600}
.container{max-width:1100px;margin:30px auto;padding:0 20px}
.form-card,.table-card{background:white;padding:25px;border-radius:12px;margin-bottom:25px;box-shadow:0 4px 15px rgba(0,0,0,.08)}
.form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:15px}
label{display:block;font-weight:600;color:#555;margin-bottom:6px;font-size:.9em}
input,select{width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:.9em}
.submit-btn{padding:12px 25px;background:#ff9800;color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;margin-top:15px}
.total-box{background:linear-gradient(135deg,#ff9800,#ffb74d);color:white;padding:20px;border-radius:12px;text-align:center;margin-bottom:20px}
.total-num{font-size:2em;font-weight:700}
.filter-bar{display:flex;gap:10px;margin-bottom:15px;flex-wrap:wrap;align-items:flex-end}
.filter-bar select{flex:1;min-width:200px;padding:10px;border:2px solid #e0e0e0;border-radius:8px}
.filter-btn{padding:10px 20px;background:#ff9800;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer}
table{width:100%;border-collapse:collapse}
th{background:linear-gradient(135deg,#ff9800,#ffb74d);color:white;padding:12px;text-align:left}
td{padding:11px;border-bottom:1px solid #f0f0f0}tr:hover{background:#f8f9fa}
.del-btn{background:#ffebee;color:#e53935;border:none;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:.82em;font-weight:600}
.success{background:#e8f5e9;color:#2e7d32;padding:12px;border-radius:8px;margin-bottom:15px}
</style></head><body>
<div class="header">
    <div style="display:flex;align-items:center;gap:15px">
        <img src="../assets/essjt-logo.png" style="width:45px;height:45px;object-fit:contain" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <h1>💳 Manage Payments</h1>
    </div>
    <a href="control_panel.php" class="back-btn">← Back to Panel</a>
</div>
<div class="container">
<?php if ($success): ?><div class="success">✅ <?php echo $success; ?></div><?php endif; ?>
<div class="form-card">
    <h3 style="margin-bottom:20px">➕ Record New Payment</h3>
    <form method="POST">
        <input type="hidden" name="action" value="add">
        <div class="form-grid">
            <div><label>Student</label>
                <select name="student_id" required>
                    <option value="">-- Select Student --</option>
                    <?php foreach ($students as $s): ?><option value="<?php echo $s['id']; ?>"><?php echo htmlspecialchars($s['username'].' - '.$s['full_name']); ?></option><?php endforeach; ?>
                </select>
            </div>
            <div><label>Amount (RWF)</label><input type="number" name="amount" required min="0" step="100" placeholder="e.g. 50000"></div>
            <div><label>Payment Method</label>
                <select name="payment_method" required>
                    <option value="Cash">💵 Cash</option><option value="Mobile Money">📱 Mobile Money</option><option value="Bank Transfer">🏦 Bank Transfer</option><option value="Card">💳 Card</option>
                </select>
            </div>
            <div><label>Reference</label><input type="text" name="reference" placeholder="e.g. RCP001"></div>
            <div><label>Payment Date</label><input type="date" name="payment_date" required value="<?php echo date('Y-m-d'); ?>"></div>
        </div>
        <button type="submit" class="submit-btn">💾 Record Payment</button>
    </form>
</div>
<div class="total-box">
    <div>Total Payments Shown</div>
    <div class="total-num"><?php echo number_format($total,0); ?> RWF</div>
    <div style="opacity:.9"><?php echo count($payments); ?> records</div>
</div>
<div class="table-card">
    <form method="GET" style="margin-bottom:15px">
        <div class="filter-bar">
            <select name="student_id">
                <option value="">-- Filter by Student --</option>
                <?php foreach ($students as $s): ?><option value="<?php echo $s['id']; ?>" <?php echo $filter==$s['id']?'selected':''; ?>><?php echo htmlspecialchars($s['username'].' - '.$s['full_name']); ?></option><?php endforeach; ?>
            </select>
            <button type="submit" class="filter-btn">🔍 Filter</button>
            <?php if ($filter): ?><a href="payments.php" style="padding:10px 15px;background:#f0f0f0;border-radius:8px;text-decoration:none;color:#555">Clear</a><?php endif; ?>
        </div>
    </form>
    <table>
        <tr><th>Student</th><th>Amount</th><th>Method</th><th>Reference</th><th>Date</th><th>Action</th></tr>
        <?php if (empty($payments)): ?>
        <tr><td colspan="6" style="text-align:center;padding:30px;color:#999">No payments found.</td></tr>
        <?php else: foreach ($payments as $p): ?>
        <tr>
            <td><?php echo htmlspecialchars($p['username'].' - '.$p['full_name']); ?></td>
            <td><strong><?php echo number_format($p['amount'],0); ?> RWF</strong></td>
            <td><?php echo htmlspecialchars($p['payment_method']??'-'); ?></td>
            <td><?php echo htmlspecialchars($p['reference']??'-'); ?></td>
            <td><?php echo date('d M Y',strtotime($p['payment_date'])); ?></td>
            <td><form method="POST"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?php echo $p['id']; ?>"><button type="submit" class="del-btn" onclick="return confirm('Delete?')">🗑️</button></form></td>
        </tr>
        <?php endforeach; endif; ?>
    </table>
</div>
</div></body></html>
