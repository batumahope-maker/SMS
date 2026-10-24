<?php
session_start();
require_once '../config.php';

$success = '';
$error = '';

// Mark attendance
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['mark_attendance'])) {
    $date = clean($_POST['date']);
    $trade = clean($_POST['trade']);
    $level = clean($_POST['level']);
    $section = clean($_POST['section']);
    
    // Get students
    $students = fetch_all("SELECT id FROM students WHERE trade = '$trade' AND level = '$level' AND section = '$section' AND status = 'Active'");
    
    $count = 0;
    foreach ($students as $s) {
        $student_id = $s['id'];
        $status = $_POST['status_' . $student_id] ?? 'Absent';
        
        // Check if already marked
        $exists = fetch_single("SELECT id FROM attendance WHERE student_id = $student_id AND date = '$date'");
        
        if (!$exists) {
            query("INSERT INTO attendance (student_id, date, status) VALUES ($student_id, '$date', '$status')");
            $count++;
        }
    }
    
    $success = "Attendance marked for $count students!";
}

// Get attendance records
$attendance_filter = '';
if (isset($_GET['date'])) {
    $filter_date = clean($_GET['date']);
    $attendance_filter = "WHERE DATE(a.date) = '$filter_date'";
}

$attendance = fetch_all("
    SELECT a.*, s.student_id, s.full_name, s.trade, s.level, s.section
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    $attendance_filter
    ORDER BY a.date DESC, s.full_name
    LIMIT 100
");
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Attendance Management - ESSJT</title>
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
        .badge { padding: 5px 15px; border-radius: 20px; font-weight: bold; display: inline-block; }
        .badge-present { background: #d1fae5; color: #065f46; }
        .badge-absent { background: #fee; color: #c00; }
        .success { background: #d1fae5; color: #065f46; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📅 Attendance Management</h1>
            <p>Mark and track student attendance</p>
        </div>
        
        <div class="nav">
            <a href="dashboard.php">📊 Dashboard</a>
            <a href="students.php">👨‍🎓 Students</a>
            <a href="marks.php">📊 Marks</a>
            <a href="attendance.php">📅 Attendance</a>
        </div>
        
        <?php if ($success): ?>
            <div class="success"><?php echo $success; ?></div>
        <?php endif; ?>
        
        <div class="grid">
            <div class="card">
                <h3 style="margin-bottom: 20px;">✅ Mark Attendance</h3>
                <form method="POST" id="attendanceForm">
                    <div class="form-group">
                        <label>Date</label>
                        <input type="date" name="date" value="<?php echo date('Y-m-d'); ?>" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Trade</label>
                        <select name="trade" id="trade" required>
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
                        <select name="level" id="level" required>
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
                    
                    <button type="button" onclick="loadStudents()" class="btn btn-primary">Load Students</button>
                </form>
                
                <div id="studentsList" style="margin-top: 20px;"></div>
            </div>
            
            <div class="card">
                <h3 style="margin-bottom: 20px;">📋 Recent Attendance</h3>
                
                <form method="GET" style="margin-bottom: 20px;">
                    <input type="date" name="date" value="<?php echo $_GET['date'] ?? date('Y-m-d'); ?>" style="width: auto; display: inline;">
                    <button type="submit" class="btn btn-primary" style="width: auto; display: inline; padding: 10px 20px;">Filter</button>
                </form>
                
                <table>
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Trade/Level</th>
                            <th>Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (count($attendance) > 0): ?>
                            <?php foreach ($attendance as $a): ?>
                            <tr>
                                <td>
                                    <strong><?php echo $a['student_id']; ?></strong><br>
                                    <small><?php echo $a['full_name']; ?></small>
                                </td>
                                <td><?php echo $a['trade']; ?> - <?php echo $a['level']; ?>-<?php echo $a['section']; ?></td>
                                <td><?php echo format_date($a['date']); ?></td>
                                <td>
                                    <span class="badge badge-<?php echo strtolower($a['status']); ?>">
                                        <?php echo $a['status']; ?>
                                    </span>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <tr>
                                <td colspan="4" style="text-align: center; padding: 40px; color: #666;">
                                    No attendance records found
                                </td>
                            </tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    
    <script>
        function loadStudents() {
            const trade = document.getElementById('trade').value;
            const level = document.getElementById('level').value;
            
            if (!trade || !level) {
                alert('Please select Trade and Level');
                return;
            }
            
            // This would normally be an AJAX call
            // For now, we'll reload the page with parameters
            alert('This feature requires the full student list to be loaded via AJAX. \nFor now, use the database directly or implement the AJAX functionality.');
        }
    </script>
</body>
</html>
