<?php
session_start();
require_once '../config.php';

$success = '';
$error = '';

// Bulk mark attendance
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['bulk_attendance'])) {
    $trade = clean($_POST['trade']);
    $level = clean($_POST['level']);
    $section = clean($_POST['section']);
    $date = clean($_POST['date']);
    $status = clean($_POST['status']);
    
    $students = fetch_all("SELECT id FROM students WHERE trade = '$trade' AND level = '$level' AND section = '$section' AND status = 'Active'");
    
    $count = 0;
    foreach ($students as $s) {
        $exists = fetch_single("SELECT id FROM attendance WHERE student_id = {$s['id']} AND date = '$date'");
        if (!$exists) {
            query("INSERT INTO attendance (student_id, date, status) VALUES ({$s['id']}, '$date', '$status')");
            $count++;
        }
    }
    
    $success = "Marked $count students as $status for $date!";
}

// Bulk send notifications (simulated)
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['send_notifications'])) {
    $type = clean($_POST['notification_type']);
    $message = clean($_POST['message']);
    
    if ($type == 'pending_fees') {
        $students = fetch_all("SELECT * FROM students WHERE fee_balance > 0");
        $count = count($students);
        $success = "Notification sent to $count students with pending fees! (Simulated)";
    } elseif ($type == 'all_students') {
        $students = fetch_all("SELECT * FROM students WHERE status = 'Active'");
        $count = count($students);
        $success = "Notification sent to all $count active students! (Simulated)";
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Bulk Operations - ESSJT</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f7fa; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .nav { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .nav a { margin-right: 15px; text-decoration: none; color: #8b5cf6; font-weight: bold; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .card { background: white; padding: 25px; border-radius: 10px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; color: #333; }
        input, select, textarea { width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 5px; }
        textarea { resize: vertical; min-height: 100px; }
        .btn { padding: 12px 24px; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; width: 100%; }
        .btn-primary { background: #8b5cf6; color: white; }
        .btn-primary:hover { background: #7c3aed; }
        .success { background: #d1fae5; color: #065f46; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .error { background: #fee; color: #c00; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚡ Bulk Operations</h1>
            <p>Perform actions on multiple records at once</p>
        </div>
        
        <div class="nav">
            <a href="dashboard.php">📊 Dashboard</a>
            <a href="students.php">👨‍🎓 Students</a>
            <a href="reports.php">📊 Reports</a>
            <a href="bulk_operations.php">⚡ Bulk Operations</a>
        </div>
        
        <?php if ($success): ?>
            <div class="success"><?php echo $success; ?></div>
        <?php endif; ?>
        
        <?php if ($error): ?>
            <div class="error"><?php echo $error; ?></div>
        <?php endif; ?>
        
        <div class="grid">
            <div class="card">
                <h3 style="margin-bottom: 20px;">📅 Bulk Attendance</h3>
                <p style="color: #666; margin-bottom: 20px;">Mark attendance for an entire class at once</p>
                
                <form method="POST">
                    <div class="form-group">
                        <label>Trade</label>
                        <select name="trade" required>
                            <option value="">Select Trade</option>
                            <option value="Software Development">Software Development</option>
                            <option value="Electronics and Telecommunication">Electronics & Telecom</option>
                            <option value="Mechanics">Mechanics</option>
                            <option value="Automobile">Automobile</option>
                            <option value="Food and Beverages">Food and Beverages</option>
                            <option value="Tourism">Tourism</option>
                            <option value="Accounting">Accounting</option>
                            <option value="Building and Construction">Building and Construction</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Level</label>
                        <select name="level" required>
                            <option value="">Select Level</option>
                            <option value="L3">Level 3</option>
                            <option value="L4">Level 4</option>
                            <option value="L5">Level 5</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Section</label>
                        <select name="section" required>
                            <option value="">Select Section</option>
                            <option value="A">Section A</option>
                            <option value="B">Section B</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Date</label>
                        <input type="date" name="date" value="<?php echo date('Y-m-d'); ?>" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Mark All As</label>
                        <select name="status" required>
                            <option value="Present">Present</option>
                            <option value="Absent">Absent</option>
                        </select>
                    </div>
                    
                    <button type="submit" name="bulk_attendance" class="btn btn-primary">✅ Mark Attendance</button>
                </form>
            </div>
            
            <div class="card">
                <h3 style="margin-bottom: 20px;">📧 Send Notifications</h3>
                <p style="color: #666; margin-bottom: 20px;">Send messages to multiple students (Simulated)</p>
                
                <form method="POST">
                    <div class="form-group">
                        <label>Send To</label>
                        <select name="notification_type" required>
                            <option value="">Select Recipients</option>
                            <option value="all_students">All Active Students</option>
                            <option value="pending_fees">Students with Pending Fees</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Message</label>
                        <textarea name="message" required placeholder="Enter your message here..."></textarea>
                    </div>
                    
                    <button type="submit" name="send_notifications" class="btn btn-primary">📧 Send Notifications</button>
                    
                    <div style="margin-top: 15px; padding: 10px; background: #fef3c7; border-radius: 5px; font-size: 0.9rem;">
                        <strong>Note:</strong> This is a simulation. In production, integrate with SMS/Email providers.
                    </div>
                </form>
            </div>
        </div>
        
        <div class="card" style="margin-top: 20px;">
            <h3 style="margin-bottom: 20px;">📊 Quick Statistics</h3>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
                <div style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: #8b5cf6;"><?php echo count_records('students'); ?></div>
                    <div style="color: #666;">Total Students</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: #10b981;"><?php echo count_records('students', "fee_balance = 0"); ?></div>
                    <div style="color: #666;">Fully Paid</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: #ef4444;"><?php echo count_records('students', "fee_balance > 0"); ?></div>
                    <div style="color: #666;">Pending Fees</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: #f59e0b;"><?php echo count_records('marks'); ?></div>
                    <div style="color: #666;">Marks Recorded</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
