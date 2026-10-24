<?php
session_start();
require_once '../config.php';

$trade = isset($_GET['trade']) ? clean($_GET['trade']) : '';
$level = isset($_GET['level']) ? clean($_GET['level']) : '';
$section = isset($_GET['section']) ? clean($_GET['section']) : '';

if (!$trade || !$level || !$section) {
    header("Location: classes.php");
    exit();
}

// Get students in this class
$students = fetch_all("
    SELECT * FROM students 
    WHERE trade = '$trade' AND level = '$level' AND section = '$section' AND status = 'Active'
    ORDER BY full_name
");

$class_name = "$trade - $level-$section";
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title><?php echo $class_name; ?> - ESSJT</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f7fa; padding: 20px; }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { background: #8b5cf6; color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .nav { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .nav a { margin-right: 15px; text-decoration: none; color: #8b5cf6; font-weight: bold; }
        .card { background: white; padding: 25px; border-radius: 10px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f5f7fa; padding: 12px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #eee; }
        .btn { padding: 10px 20px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 5px; display: inline-block; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏫 <?php echo $class_name; ?></h1>
            <p><?php echo count($students); ?> students in this class</p>
        </div>
        
        <div class="nav">
            <a href="classes.php">← Back to Classes</a>
            <a href="dashboard.php">📊 Dashboard</a>
        </div>
        
        <div class="card">
            <h3 style="margin-bottom: 20px;">👨‍🎓 Students List</h3>
            <table>
                <thead>
                    <tr>
                        <th>Student ID</th>
                        <th>Full Name</th>
                        <th>Gender</th>
                        <th>Phone</th>
                        <th>Fee Balance</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($students as $s): ?>
                    <tr>
                        <td><?php echo $s['student_id']; ?></td>
                        <td><?php echo $s['full_name']; ?></td>
                        <td><?php echo $s['gender']; ?></td>
                        <td><?php echo $s['phone'] ?: 'N/A'; ?></td>
                        <td style="color: <?php echo $s['fee_balance'] > 0 ? '#ef4444' : '#10b981'; ?>; font-weight: bold;">
                            <?php echo format_money($s['fee_balance']); ?>
                        </td>
                        <td>
                            <a href="view_student.php?id=<?php echo $s['id']; ?>" class="btn" style="padding: 6px 12px;">View</a>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>
