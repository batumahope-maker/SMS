<?php
session_start();
require_once '../config.php';
require_role('teacher');

$teacher = fetch_single("SELECT * FROM teachers WHERE user_id = {$_SESSION['user_id']}");

// Get today's attendance marked by this teacher
$today = date('Y-m-d');
$today_attendance = fetch_all("
    SELECT a.*, s.student_id, s.full_name, s.trade, s.level, s.section
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    WHERE DATE(a.created_at) = '$today'
    ORDER BY a.created_at DESC
");

// Get today's marks entered
$today_marks = fetch_all("
    SELECT m.*, s.student_id, s.full_name, s.trade
    FROM marks m
    JOIN students s ON m.student_id = s.id
    WHERE DATE(m.created_at) = '$today'
    ORDER BY m.created_at DESC
");

// Get this week's stats
$week_start = date('Y-m-d', strtotime('monday this week'));
$week_attendance = count_records('attendance', "DATE(created_at) >= '$week_start'");
$week_marks = count_records('marks', "DATE(created_at) >= '$week_start'");
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>My Activity - ESSJT</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f7fa; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: #2563eb; color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .nav { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .nav a { margin-right: 15px; text-decoration: none; color: #2563eb; font-weight: bold; }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 20px; }
        .stat-card { background: white; padding: 20px; border-radius: 10px; text-align: center; border-left: 4px solid #2563eb; }
        .stat-value { font-size: 2rem; font-weight: bold; color: #1a202c; }
        .stat-label { color: #666; margin-top: 5px; }
        .card { background: white; padding: 25px; border-radius: 10px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f5f7fa; padding: 12px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #eee; }
        .badge { padding: 5px 15px; border-radius: 20px; font-weight: bold; display: inline-block; }
        .badge-present { background: #d1fae5; color: #065f46; }
        .badge-absent { background: #fee; color: #c00; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 My Activity Report</h1>
            <p>Welcome, <?php echo $teacher['full_name']; ?></p>
            <p><?php echo date('l, F j, Y'); ?></p>
        </div>
        
        <div class="nav">
            <a href="dashboard.php">📊 Dashboard</a>
            <a href="my_activity.php">📋 My Activity</a>
            <a href="../admin/marks.php">📚 Enter Marks</a>
            <a href="../admin/attendance.php">📅 Mark Attendance</a>
            <a href="../includes/logout.php">🚪 Logout</a>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value"><?php echo count($today_attendance); ?></div>
                <div class="stat-label">Attendance Today</div>
            </div>
            <div class="stat-card" style="border-left-color: #10b981;">
                <div class="stat-value"><?php echo count($today_marks); ?></div>
                <div class="stat-label">Marks Entered Today</div>
            </div>
            <div class="stat-card" style="border-left-color: #f59e0b;">
                <div class="stat-value"><?php echo $week_attendance; ?></div>
                <div class="stat-label">Attendance This Week</div>
            </div>
            <div class="stat-card" style="border-left-color: #ef4444;">
                <div class="stat-value"><?php echo $week_marks; ?></div>
                <div class="stat-label">Marks This Week</div>
            </div>
        </div>
        
        <div class="card">
            <h3 style="margin-bottom: 20px;">📅 Today's Attendance Records (<?php echo count($today_attendance); ?>)</h3>
            <?php if (count($today_attendance) > 0): ?>
                <table>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Student ID</th>
                            <th>Name</th>
                            <th>Class</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($today_attendance as $a): ?>
                        <tr>
                            <td><?php echo date('H:i', strtotime($a['created_at'])); ?></td>
                            <td><?php echo $a['student_id']; ?></td>
                            <td><?php echo $a['full_name']; ?></td>
                            <td><?php echo $a['trade']; ?> - <?php echo $a['level']; ?>-<?php echo $a['section']; ?></td>
                            <td>
                                <span class="badge badge-<?php echo strtolower($a['status']); ?>">
                                    <?php echo $a['status']; ?>
                                </span>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php else: ?>
                <div style="text-align: center; padding: 40px; color: #666;">
                    No attendance marked today yet
                </div>
            <?php endif; ?>
        </div>
        
        <div class="card">
            <h3 style="margin-bottom: 20px;">📚 Today's Marks Entered (<?php echo count($today_marks); ?>)</h3>
            <?php if (count($today_marks) > 0): ?>
                <table>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Student</th>
                            <th>Subject</th>
                            <th>Term</th>
                            <th>Marks</th>
                            <th>Grade</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($today_marks as $m): ?>
                        <tr>
                            <td><?php echo date('H:i', strtotime($m['created_at'])); ?></td>
                            <td><?php echo $m['student_id']; ?> - <?php echo $m['full_name']; ?></td>
                            <td><?php echo $m['subject']; ?></td>
                            <td><?php echo $m['term']; ?></td>
                            <td><?php echo $m['marks']; ?>/100</td>
                            <td><strong><?php echo $m['grade']; ?></strong></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php else: ?>
                <div style="text-align: center; padding: 40px; color: #666;">
                    No marks entered today yet
                </div>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>
