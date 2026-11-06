<?php
session_start();
require_once '../config.php';

$success = '';
$error = '';

// Record payment
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['record_payment'])) {
    $student_id = (int)$_POST['student_id'];
    $amount = (float)$_POST['amount'];
    $method = clean($_POST['payment_method']);
    $reference = clean($_POST['reference']);
    
    // Get student
    $student = fetch_single("SELECT * FROM students WHERE id = $student_id");
    
    if ($student && $amount > 0 && $amount <= $student['fee_balance']) {
        // Insert payment
        $sql = "INSERT INTO fee_payments (student_id, amount, payment_method, reference_number, payment_date) 
                VALUES ($student_id, $amount, '$method', '$reference', CURDATE())";
        
        if (query($sql)) {
            // Update student balance
            $new_paid = $student['fee_paid'] + $amount;
            $new_balance = $student['fee_balance'] - $amount;
            
            query("UPDATE students SET fee_paid = $new_paid, fee_balance = $new_balance WHERE id = $student_id");
            
            $success = "Payment of " . format_money($amount) . " recorded successfully!";
        } else {
            $error = "Error recording payment!";
        }
    } else {
        $error = "Invalid payment amount or student not found!";
    }
}

// Get students with pending fees
$students = fetch_all("SELECT * FROM students WHERE fee_balance > 0 ORDER BY fee_balance DESC");

// Get recent payments
$payments = fetch_all("
    SELECT p.*, s.student_id, s.full_name, s.trade, s.level
    FROM fee_payments p
    JOIN students s ON p.student_id = s.id
    ORDER BY p.payment_date DESC
    LIMIT 50
");
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Fee Payments - ESSJT</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f7fa; padding: 20px; }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { background: #8B0000; color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .nav { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .nav a { margin-right: 15px; text-decoration: none; color: #8B0000; font-weight: bold; }
        .grid { display: grid; grid-template-columns: 1fr 2fr; gap: 20px; }
        .card { background: white; padding: 25px; border-radius: 10px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; color: #333; }
        input, select { width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 5px; }
        .btn { padding: 12px 24px; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; }
        .btn-primary { background: #8B0000; color: white; width: 100%; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f5f7fa; padding: 12px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #eee; }
        .success { background: #d1fae5; color: #065f46; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .error { background: #fee; color: #c00; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
        .stat-box { background: white; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #10b981; }
        .stat-value { font-size: 1.5rem; font-weight: bold; color: #1a202c; }
        .stat-label { color: #666; font-size: 0.9rem; margin-top: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💰 Fee Payments</h1>
            <p>Record and manage student fee payments</p>
        </div>
        
        <div class="nav">
            <a href="dashboard.php">📊 Dashboard</a>
            <a href="students.php">👨‍🎓 Students</a>
            <a href="payments.php">💰 Payments</a>
        </div>
        
        <div class="stats">
            <div class="stat-box">
                <div class="stat-value"><?php echo count($students); ?></div>
                <div class="stat-label">Students with Pending Fees</div>
            </div>
            <div class="stat-box" style="border-left-color: #ef4444;">
                <div class="stat-value"><?php echo format_money(array_sum(array_column($students, 'fee_balance'))); ?></div>
                <div class="stat-label">Total Pending Amount</div>
            </div>
        </div>
        
        <?php if ($success): ?>
            <div class="success"><?php echo $success; ?></div>
        <?php endif; ?>
        
        <?php if ($error): ?>
            <div class="error"><?php echo $error; ?></div>
        <?php endif; ?>
        
        <div class="grid">
            <div class="card">
                <h3 style="margin-bottom: 20px;">💳 Record Payment</h3>
                <form method="POST">
                    <div class="form-group">
                        <label>Student</label>
                        <select name="student_id" required id="studentSelect" onchange="showBalance()">
                            <option value="">Select Student</option>
                            <?php foreach ($students as $s): ?>
                                <option value="<?php echo $s['id']; ?>" data-balance="<?php echo $s['fee_balance']; ?>">
                                    <?php echo $s['student_id']; ?> - <?php echo $s['full_name']; ?> (Balance: <?php echo format_money($s['fee_balance']); ?>)
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    
                    <div id="balanceInfo" style="display: none; padding: 10px; background: #fef3c7; border-radius: 5px; margin-bottom: 15px;">
                        <strong>Current Balance:</strong> <span id="balanceAmount"></span>
                    </div>
                    
                    <div class="form-group">
                        <label>Amount (RWF)</label>
                        <input type="number" name="amount" min="1" step="0.01" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Payment Method</label>
                        <select name="payment_method" required>
                            <option value="">Select Method</option>
                            <option value="Cash">Cash</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Mobile Money">Mobile Money (MTN/Airtel)</option>
                            <option value="Cheque">Cheque</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Reference Number</label>
                        <input type="text" name="reference" placeholder="Optional">
                    </div>
                    
                    <button type="submit" name="record_payment" class="btn btn-primary">✅ Record Payment</button>
                </form>
            </div>
            
            <div class="card">
                <h3 style="margin-bottom: 20px;">📋 Recent Payments</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Amount</th>
                            <th>Method</th>
                            <th>Reference</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (count($payments) > 0): ?>
                            <?php foreach ($payments as $p): ?>
                            <tr>
                                <td>
                                    <strong><?php echo $p['student_id']; ?></strong><br>
                                    <small><?php echo $p['full_name']; ?></small>
                                </td>
                                <td style="color: #10b981; font-weight: bold;"><?php echo format_money($p['amount']); ?></td>
                                <td><?php echo $p['payment_method']; ?></td>
                                <td><?php echo $p['reference_number'] ?: 'N/A'; ?></td>
                                <td><?php echo format_date($p['payment_date']); ?></td>
                            </tr>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <tr>
                                <td colspan="5" style="text-align: center; padding: 40px; color: #666;">
                                    No payments recorded yet
                                </td>
                            </tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    
    <script>
        function showBalance() {
            const select = document.getElementById('studentSelect');
            const option = select.options[select.selectedIndex];
            const balance = option.dataset.balance;
            
            if (balance) {
                document.getElementById('balanceInfo').style.display = 'block';
                document.getElementById('balanceAmount').textContent = 'RWF ' + parseInt(balance).toLocaleString();
            } else {
                document.getElementById('balanceInfo').style.display = 'none';
            }
        }
    </script>
</body>
</html>
