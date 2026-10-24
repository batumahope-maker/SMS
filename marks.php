<?php
session_start();
require_once '../config.php';

$success = '';
$error = '';

// Add mark
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['add_mark'])) {
    $student_id = (int)$_POST['student_id'];
    $subject = clean($_POST['subject']);
    $term = clean($_POST['term']);
    $marks = (int)$_POST['marks'];
    
    // Calculate grade
    if ($marks >= 80) $grade = 'A';
    elseif ($marks >= 70) $grade = 'B';
    elseif ($marks >= 60) $grade = 'C';
    elseif ($marks >= 50) $grade = 'D';
    else $grade = 'F';
    
    $sql = "INSERT INTO marks (student_id, subject, term, marks, grade) 
            VALUES ($student_id, '$subject', '$term', $marks, '$grade')";
    
    if (query($sql)) {
        $success = "Mark added successfully!";
    } else {
        $error = "Error adding mark!";
    }
}

// Get all students for dropdown
$students = fetch_all("SELECT id, student_id, full_name, trade, level FROM students WHERE status = 'Active' ORDER BY full_name");

// Get recent marks
$recent_marks = fetch_all("
    SELECT m.*, s.student_id, s.full_name, s.trade, s.level 
    FROM marks m 
    JOIN students s ON m.student_id = s.id 
    ORDER BY m.created_at DESC 
    LIMIT 50
");
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Marks Management - ESSJT</title>
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
        th { background: #f5f7fa; padding: 12px; text-align: left; font-weight: bold; }
        td { padding: 12px; border-bottom: 1px solid #eee; }
        .grade { padding: 5px 15px; border-radius: 20px; font-weight: bold; display: inline-block; }
        .grade-A { background: #d1fae5; color: #065f46; }
        .grade-B { background: #dbeafe; color: #1e40af; }
        .grade-C { background: #fef3c7; color: #92400e; }
        .grade-D { background: #fed7aa; color: #9a3412; }
        .grade-F { background: #fee; color: #c00; }
        .success { background: #d1fae5; color: #065f46; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .error { background: #fee; color: #c00; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Marks Management</h1>
            <p>Enter and manage student marks</p>
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
        
        <?php if ($error): ?>
            <div class="error"><?php echo $error; ?></div>
        <?php endif; ?>
        
        <div class="grid">
            <div class="card">
                <h3 style="margin-bottom: 20px;">➕ Add New Mark</h3>
                <form method="POST">
                    <div class="form-group">
                        <label>Student</label>
                        <select name="student_id" required>
                            <option value="">Select Student</option>
                            <?php foreach ($students as $s): ?>
                                <option value="<?php echo $s['id']; ?>">
                                    <?php echo $s['student_id']; ?> - <?php echo $s['full_name']; ?> (<?php echo $s['trade']; ?>)
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Subject</label>
                        <input type="text" name="subject" required placeholder="e.g., Mathematics">
                    </div>
                    
                    <div class="form-group">
                        <label>Term</label>
                        <select name="term" required>
                            <option value="">Select Term</option>
                            <option value="Term 1">Term 1</option>
                            <option value="Term 2">Term 2</option>
                            <option value="Term 3">Term 3</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Marks (out of 100)</label>
                        <input type="number" name="marks" min="0" max="100" required>
                    </div>
                    
                    <button type="submit" name="add_mark" class="btn btn-primary">✅ Add Mark</button>
                </form>
                
                <div style="margin-top: 20px; padding: 15px; background: #f0f9ff; border-radius: 5px; font-size: 0.9rem;">
                    <strong>Grading System:</strong><br>
                    A: 80-100 | B: 70-79 | C: 60-69<br>
                    D: 50-59 | F: Below 50
                </div>
            </div>
            
            <div class="card">
                <h3 style="margin-bottom: 20px;">📚 Recent Marks</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Subject</th>
                            <th>Term</th>
                            <th>Marks</th>
                            <th>Grade</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (count($recent_marks) > 0): ?>
                            <?php foreach ($recent_marks as $m): ?>
                            <tr>
                                <td>
                                    <strong><?php echo $m['student_id']; ?></strong><br>
                                    <small><?php echo $m['full_name']; ?></small>
                                </td>
                                <td><?php echo $m['subject']; ?></td>
                                <td><?php echo $m['term']; ?></td>
                                <td><strong><?php echo $m['marks']; ?>/100</strong></td>
                                <td>
                                    <span class="grade grade-<?php echo $m['grade']; ?>">
                                        <?php echo $m['grade']; ?>
                                    </span>
                                </td>
                                <td><?php echo format_date($m['created_at']); ?></td>
                            </tr>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <tr>
                                <td colspan="6" style="text-align: center; padding: 40px; color: #666;">
                                    No marks recorded yet
                                </td>
                            </tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</body>
</html>
