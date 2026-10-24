<?php
session_start();
require_once '../config.php';
require_role('student');

// Get student info
$student = fetch_single("SELECT * FROM students WHERE user_id = {$_SESSION['user_id']}");

// Get marks
$marks = fetch_all("SELECT * FROM marks WHERE student_id = {$student['id']} ORDER BY created_at DESC");

// Get attendance
$attendance_stats = fetch_single("
    SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent
    FROM attendance WHERE student_id = {$student['id']}
");
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Student Dashboard - ESSJT</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f7fa; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .nav { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .nav a { margin-right: 15px; text-decoration: none; color: #10b981; font-weight: bold; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .stat-card { background: white; padding: 25px; border-radius: 10px; border-left: 4px solid #10b981; text-align: center; }
        .stat-value { font-size: 2rem; font-weight: bold; color: #1a202c; }
        .stat-label { color: #666; margin-top: 5px; }
        .card { background: white; padding: 25px; border-radius: 10px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f5f7fa; padding: 12px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>👨‍🎓 Student Portal</h1>
            <p>Welcome, <?php echo $student['full_name']; ?>! (<?php echo $student['student_id']; ?>)</p>
        </div>
        
        <div class="nav">
            <a href="dashboard.php">📊 Dashboard</a>
            <a href="../includes/logout.php">🚪 Logout</a>
        </div>
        
        <div class="card" style="background: #d1fae5; border-left: 4px solid #10b981;">
            <h3 style="color: #065f46; margin-bottom: 10px;">🎉 Welcome to Your Portal!</h3>
            <p style="color: #047857;">View your marks, attendance, and fee status here.</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value"><?php echo $attendance_stats['present'] ?? 0; ?></div>
                <div class="stat-label">Days Present</div>
            </div>
            
            <div class="stat-card" style="border-left-color: #ef4444;">
                <div class="stat-value"><?php echo $attendance_stats['absent'] ?? 0; ?></div>
                <div class="stat-label">Days Absent</div>
            </div>
            
            <div class="stat-card" style="border-left-color: #f59e0b;">
                <div class="stat-value"><?php echo format_money($student['fee_balance']); ?></div>
                <div class="stat-label">Fee Balance</div>
            </div>
            
            <div class="stat-card" style="border-left-color: #3b82f6;">
                <div class="stat-value"><?php echo count($marks); ?></div>
                <div class="stat-label">Total Marks Recorded</div>
            </div>
        </div>
        
        <div class="card">
            <h3 style="margin-bottom: 15px;">📋 Your Information</h3>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                <div>
                    <div style="color: #666; font-size: 0.9rem;">Student ID</div>
                    <div style="font-weight: bold;"><?php echo $student['student_id']; ?></div>
                </div>
                <div>
                    <div style="color: #666; font-size: 0.9rem;">Trade</div>
                    <div style="font-weight: bold;"><?php echo $student['trade']; ?></div>
                </div>
                <div>
                    <div style="color: #666; font-size: 0.9rem;">Level</div>
                    <div style="font-weight: bold;"><?php echo $student['level']; ?>-<?php echo $student['section']; ?></div>
                </div>
                <div>
                    <div style="color: #666; font-size: 0.9rem;">Status</div>
                    <div style="font-weight: bold; color: #10b981;"><?php echo $student['status']; ?></div>
                </div>
            </div>
        </div>
        
        <?php if (count($marks) > 0): ?>
        <div class="card">
            <h3 style="margin-bottom: 20px;">📊 Your Marks</h3>
            <table>
                <thead>
                    <tr>
                        <th>Subject</th>
                        <th>Term</th>
                        <th>Marks</th>
                        <th>Grade</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($marks as $m): ?>
                    <tr>
                        <td><?php echo $m['subject']; ?></td>
                        <td><?php echo $m['term']; ?></td>
                        <td><strong><?php echo $m['marks']; ?>/100</strong></td>
                        <td><strong style="color: <?php echo $m['grade'] == 'A' ? '#10b981' : ($m['grade'] == 'F' ? '#ef4444' : '#f59e0b'); ?>">
                            <?php echo $m['grade']; ?>
                        </strong></td>
                        <td><?php echo format_date($m['created_at']); ?></td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        <?php endif; ?>
        
        <div class="card">
            <h3 style="margin-bottom: 15px;">💰 Fee Status</h3>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                <div>
                    <div style="color: #666;">Fee Paid</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #10b981;"><?php echo format_money($student['fee_paid']); ?></div>
                </div>
                <div>
                    <div style="color: #666;">Balance</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #ef4444;"><?php echo format_money($student['fee_balance']); ?></div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
