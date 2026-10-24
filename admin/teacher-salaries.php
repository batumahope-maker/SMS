<?php
session_start();
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header('Location: ../admin-login.php');
    exit();
}
require_once '../config.php';

$message = '';

// Handle delete
if (isset($_GET['delete'])) {
    $id = $_GET['delete'];
    $conn->query("DELETE FROM teacher_salaries WHERE id = $id");
    $message = '✅ Salary record deleted!';
}

// Handle add/edit
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $teacher_id = $_POST['teacher_id'];
    $month = $_POST['month'];
    $year = $_POST['year'];
    $base_salary = $_POST['base_salary'];
    $bonuses = $_POST['bonuses'] ?? 0;
    $deductions = $_POST['deductions'] ?? 0;
    $net_salary = $base_salary + $bonuses - $deductions;
    $payment_status = $_POST['payment_status'];
    $payment_date = $_POST['payment_date'] ?? null;
    $notes = $_POST['notes'] ?? '';
    
    if (isset($_POST['edit_id'])) {
        $edit_id = $_POST['edit_id'];
        $stmt = $conn->prepare("UPDATE teacher_salaries SET teacher_id=?, month=?, year=?, base_salary=?, bonuses=?, deductions=?, net_salary=?, payment_status=?, payment_date=?, notes=? WHERE id=?");
        $stmt->bind_param("issddddsssi", $teacher_id, $month, $year, $base_salary, $bonuses, $deductions, $net_salary, $payment_status, $payment_date, $notes, $edit_id);
        $message = '✅ Salary updated!';
    } else {
        $stmt = $conn->prepare("INSERT INTO teacher_salaries (teacher_id, month, year, base_salary, bonuses, deductions, net_salary, payment_status, payment_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("issddddsss", $teacher_id, $month, $year, $base_salary, $bonuses, $deductions, $net_salary, $payment_status, $payment_date, $notes);
        $message = '✅ Salary recorded!';
    }
    $stmt->execute();
}

$edit_record = null;
if (isset($_GET['edit'])) {
    $edit_id = $_GET['edit'];
    $edit_record = $conn->query("SELECT * FROM teacher_salaries WHERE id = $edit_id")->fetch_assoc();
}

$teachers = $conn->query("SELECT id, username, full_name FROM users WHERE role = 'teacher' ORDER BY full_name");

$salaries = $conn->query("SELECT s.*, u.username, u.full_name 
                         FROM teacher_salaries s 
                         JOIN users u ON s.teacher_id = u.id 
                         ORDER BY s.year DESC, s.month DESC 
                         LIMIT 100");

$total_paid = $conn->query("SELECT SUM(net_salary) as total FROM teacher_salaries WHERE payment_status = 'Paid'")->fetch_assoc()['total'] ?? 0;
$total_pending = $conn->query("SELECT SUM(net_salary) as total FROM teacher_salaries WHERE payment_status = 'Pending'")->fetch_assoc()['total'] ?? 0;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Teacher Salaries - ESSJT</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; }
        .header h1 { font-size: 1.8em; }
        .btn-back { background: white; color: #667eea; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; }
        .container { max-width: 1400px; margin: 40px auto; padding: 0 20px; }
        .message { padding: 15px; border-radius: 8px; margin-bottom: 20px; font-weight: 600; background: #d4edda; color: #155724; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: white; padding: 25px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); text-align: center; }
        .stat-value { font-size: 2.5em; font-weight: 700; color: #667eea; }
        .stat-label { color: #666; margin-top: 10px; font-weight: 600; }
        .grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 30px; }
        .section { background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .section h2 { color: #667eea; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px solid #667eea; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: 600; color: #333; }
        input, select, textarea { width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1em; font-family: inherit; }
        textarea { min-height: 80px; resize: vertical; }
        button { width: 100%; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 10px; font-size: 1.1em; font-weight: 600; cursor: pointer; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #667eea; color: white; padding: 12px; text-align: left; font-weight: 600; font-size: 0.9em; }
        td { padding: 12px; border-bottom: 1px solid #e0e0e0; font-size: 0.9em; }
        tr:hover { background: #f8f9fa; }
        .badge { padding: 5px 12px; border-radius: 15px; font-size: 0.8em; font-weight: 600; }
        .badge-paid { background: #d4edda; color: #155724; }
        .badge-pending { background: #fff3cd; color: #856404; }
        .btn-small { padding: 6px 12px; border-radius: 5px; text-decoration: none; font-weight: 600; font-size: 0.85em; display: inline-block; margin-right: 5px; }
        .btn-edit { background: #ffc107; color: #000; }
        .btn-delete { background: #dc3545; color: white; }
    </style>
    <script>
        function calculateNet() {
            const base = parseFloat(document.getElementById('base_salary').value) || 0;
            const bonus = parseFloat(document.getElementById('bonuses').value) || 0;
            const deduct = parseFloat(document.getElementById('deductions').value) || 0;
            document.getElementById('net_display').textContent = 'Net: RWF ' + (base + bonus - deduct).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
    </script>
</head>
<body>
    <div class="header">
        <h1>💵 Teacher Salaries</h1>
        <a href="control_panel.php" class="btn-back">← Back</a>
    </div>
    <div class="container">
        <?php if ($message): ?><div class="message"><?php echo $message; ?></div><?php endif; ?>
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">RWF <?php echo number_format($total_paid); ?></div>
                <div class="stat-label">Total Paid</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">RWF <?php echo number_format($total_pending); ?></div>
                <div class="stat-label">Total Pending</div>
            </div>
        </div>
        <div class="grid">
            <div class="section">
                <h2><?php echo $edit_record ? '✏️ Edit Salary' : '💰 Record Salary'; ?></h2>
                <form method="POST">
                    <?php if ($edit_record): ?><input type="hidden" name="edit_id" value="<?php echo $edit_record['id']; ?>"><?php endif; ?>
                    <div class="form-group">
                        <label>Teacher *</label>
                        <select name="teacher_id" required>
                            <option value="">Choose Teacher...</option>
                            <?php while ($teacher = $teachers->fetch_assoc()): ?>
                                <option value="<?php echo $teacher['id']; ?>" <?php echo ($edit_record && $edit_record['teacher_id'] == $teacher['id']) ? 'selected' : ''; ?>>
                                    <?php echo htmlspecialchars($teacher['username'] . ' - ' . $teacher['full_name']); ?>
                                </option>
                            <?php endwhile; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Month *</label>
                        <select name="month" required>
                            <?php 
                            $months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                            foreach($months as $m): ?>
                                <option value="<?php echo $m; ?>" <?php echo ($edit_record && $edit_record['month'] == $m) ? 'selected' : ''; ?>><?php echo $m; ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Year *</label>
                        <input type="text" name="year" required value="<?php echo $edit_record ? $edit_record['year'] : '2026'; ?>">
                    </div>
                    <div class="form-group">
                        <label>Base Salary (RWF) *</label>
                        <input type="number" id="base_salary" name="base_salary" step="0.01" required onchange="calculateNet()" value="<?php echo $edit_record ? $edit_record['base_salary'] : ''; ?>">
                    </div>
                    <div class="form-group">
                        <label>Bonuses (RWF)</label>
                        <input type="number" id="bonuses" name="bonuses" step="0.01" onchange="calculateNet()" value="<?php echo $edit_record ? $edit_record['bonuses'] : '0'; ?>">
                    </div>
                    <div class="form-group">
                        <label>Deductions (RWF)</label>
                        <input type="number" id="deductions" name="deductions" step="0.01" onchange="calculateNet()" value="<?php echo $edit_record ? $edit_record['deductions'] : '0'; ?>">
                    </div>
                    <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                        <strong id="net_display" style="color: #2e7d32; font-size: 1.3em;">Net: RWF 0</strong>
                    </div>
                    <div class="form-group">
                        <label>Payment Status *</label>
                        <select name="payment_status" required>
                            <option value="Pending" <?php echo ($edit_record && $edit_record['payment_status'] == 'Pending') ? 'selected' : ''; ?>>Pending</option>
                            <option value="Paid" <?php echo ($edit_record && $edit_record['payment_status'] == 'Paid') ? 'selected' : ''; ?>>Paid</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Payment Date</label>
                        <input type="date" name="payment_date" value="<?php echo $edit_record ? $edit_record['payment_date'] : ''; ?>">
                    </div>
                    <div class="form-group">
                        <label>Notes</label>
                        <textarea name="notes"><?php echo $edit_record ? htmlspecialchars($edit_record['notes']) : ''; ?></textarea>
                    </div>
                    <button type="submit"><?php echo $edit_record ? '💾 Update' : '💰 Record Salary'; ?></button>
                    <?php if ($edit_record): ?><a href="teacher_salaries.php" style="display: block; text-align: center; margin-top: 10px; color: #667eea; text-decoration: none;">Cancel</a><?php endif; ?>
                </form>
            </div>
            <div class="section">
                <h2>📋 Salary Records</h2>
                <div style="max-height: 700px; overflow-y: auto;">
                    <table>
                        <thead><tr><th>Teacher</th><th>Period</th><th>Base</th><th>Net Salary</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            <?php if ($salaries && $salaries->num_rows > 0): ?>
                                <?php while ($salary = $salaries->fetch_assoc()): ?>
                                    <tr>
                                        <td><strong><?php echo htmlspecialchars($salary['username']); ?></strong><br><small><?php echo htmlspecialchars($salary['full_name']); ?></small></td>
                                        <td><?php echo htmlspecialchars($salary['month'] . ' ' . $salary['year']); ?></td>
                                        <td>RWF <?php echo number_format($salary['base_salary']); ?></td>
                                        <td><strong>RWF <?php echo number_format($salary['net_salary']); ?></strong></td>
                                        <td><span class="badge badge-<?php echo strtolower($salary['payment_status']); ?>"><?php echo $salary['payment_status']; ?></span></td>
                                        <td>
                                            <a href="teacher_salaries.php?edit=<?php echo $salary['id']; ?>" class="btn-small btn-edit">✏️</a>
                                            <a href="teacher_salaries.php?delete=<?php echo $salary['id']; ?>" class="btn-small btn-delete" onclick="return confirm('Delete?')">🗑️</a>
                                        </td>
                                    </tr>
                                <?php endwhile; ?>
                            <?php else: ?>
                                <tr><td colspan="6" style="text-align: center; padding: 40px; color: #999;">No salary records yet.</td></tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    <script>calculateNet();</script>
</body>
</html>
