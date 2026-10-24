<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'student') { header('Location: login.php'); exit(); }
$user_id = $_SESSION['user_id'];
$stmt = $pdo->prepare("SELECT * FROM payments WHERE student_id = ? ORDER BY payment_date DESC");
$stmt->execute([$user_id]);
$payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
$total = array_sum(array_column($payments, 'amount'));
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>My Payments - ESSJT</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f5f5}
.header{background:linear-gradient(135deg,#ff9800,#ffb74d);color:white;padding:15px 30px;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:1.4em}.back-btn{background:white;color:#ff9800;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600}
.container{max-width:900px;margin:30px auto;padding:0 20px}
.total-card{background:white;padding:25px;border-radius:12px;margin-bottom:25px;box-shadow:0 4px 15px rgba(0,0,0,0.08);text-align:center}
.total-amount{font-size:2.5em;font-weight:700;color:#ff9800}
table{width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.08)}
th{background:#ff9800;color:white;padding:12px;text-align:left}td{padding:12px;border-bottom:1px solid #f0f0f0}
.empty{text-align:center;padding:60px;color:#999}
</style></head><body>
<div class="header">
    <div style="display:flex;align-items:center;gap:15px">
        <img src="../assets/essjt-logo.png" style="width:45px;height:45px;object-fit:contain" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <h1>💳 My Payments</h1>
    </div>
    <a href="dashboard.php" class="back-btn">← Back to Dashboard</a>
</div>
<div class="container">
<div class="total-card">
    <div style="color:#666;margin-bottom:5px">Total Amount Paid</div>
    <div class="total-amount"><?php echo number_format($total, 0); ?> RWF</div>
    <div style="color:#999;margin-top:5px"><?php echo count($payments); ?> payment(s) recorded</div>
</div>
<?php if (empty($payments)): ?>
    <div class="empty" style="background:white;border-radius:12px">💳 No payment records found!</div>
<?php else: ?>
<table><tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th></tr>
<?php foreach ($payments as $p): ?>
<tr>
    <td><?php echo date('d M Y', strtotime($p['payment_date'])); ?></td>
    <td><strong><?php echo number_format($p['amount'], 0); ?> RWF</strong></td>
    <td><?php echo htmlspecialchars($p['payment_method'] ?? '-'); ?></td>
    <td><?php echo htmlspecialchars($p['reference'] ?? '-'); ?></td>
</tr>
<?php endforeach; ?>
</table>
<?php endif; ?>
</div></body></html>
