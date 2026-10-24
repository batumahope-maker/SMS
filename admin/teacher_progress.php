<?php
session_start();
require_once '../config.php';

$today = date('Y-m-d');

// Get all teachers with today's activity
$teachers = fetch_all("SELECT * FROM teachers WHERE status = 'Active' ORDER BY full_name");

$teacher_activity = [];
foreach ($teachers as $t) {
    $attendance_count = count_records('attendance', "DATE(created_at) = '$today'");
    $marks_count = count_records('marks', "DATE(created_at) = '$today'");
    
    $teacher_activity[] = [
        'teacher' => $t,
        'attendance' => $attendance_count,
        'marks' => $marks_count,
        'total' => $attendance_count + $marks_count
    ];
}

// Sort by total activity
usort($teacher_activity, function($a, $b) {
    return $b['total'] - $a['total'];
});
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Teacher Progress Today - ESSJT</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f7fa; padding: 20px; }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { background: #6366f1; color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .nav { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .nav a { margin-right: 15px; text-decoration: none; color: #6366f1; font-weight: bold; }
        .card { background: white; padding: 25px; border-radius: 10px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f5f7fa; padding: 12px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #eee; }
        .progress-high { background: #d1fae5; }
        .progress-medium { background: #fef3c7; }
        .progress-low { background: #fee; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Teacher Progress Report</h1>
            <p>Today's activity: <?php echo date('l, F j, Y'); ?></p>
        </div>
        
        <div class="nav">
            <a href="dashboard.php">📊 Dashboard</a>
            <a href="teachers.php">👨‍🏫 Teachers</a>
            <a href="teacher_progress.php">📊 Teacher Progress</a>
        </div>
        
        <div class="card">
            <h3 style="margin-bottom: 20px;">👨‍🏫 All Teachers - Today's Activity</h3>
            <table>
                <thead>
                    <tr>
                        <th>Teacher ID</th>
                        <th>Name</th>
                        <th>Subject</th>
                        <th>Department</th>
                        <th>Attendance Marked</th>
                        <th>Marks Entered</th>
                        <th>Total Actions</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($teacher_activity as $ta): ?>
                    <?php 
                        $class = '';
                        if ($ta['total'] >= 10) $class = 'progress-high';
                        elseif ($ta['total'] >= 5) $class = 'progress-medium';
                        elseif ($ta['total'] > 0) $class = 'progress-low';
                    ?>
                    <tr class="<?php echo $class; ?>">
                        <td><?php echo $ta['teacher']['teacher_id']; ?></td>
                        <td><?php echo $ta['teacher']['full_name']; ?></td>
                        <td><?php echo $ta['teacher']['subject']; ?></td>
                        <td><?php echo $ta['teacher']['department']; ?></td>
                        <td style="text-align: center;"><strong><?php echo $ta['attendance']; ?></strong></td>
                        <td style="text-align: center;"><strong><?php echo $ta['marks']; ?></strong></td>
                        <td style="text-align: center; font-weight: bold; font-size: 1.2rem;">
                            <?php echo $ta['total']; ?>
                        </td>
                        <td>
                            <?php if ($ta['total'] >= 10): ?>
                                <span style="color: #10b981; font-weight: bold;">✓ Very Active</span>
                            <?php elseif ($ta['total'] >= 5): ?>
                                <span style="color: #f59e0b; font-weight: bold;">⚠ Active</span>
                            <?php elseif ($ta['total'] > 0): ?>
                                <span style="color: #ef4444; font-weight: bold;">⚠ Low Activity</span>
                            <?php else: ?>
                                <span style="color: #6c757d; font-weight: bold;">✗ No Activity</span>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            
            <div style="margin-top: 30px; padding: 20px; background: #f5f7fa; border-radius: 8px;">
                <h4 style="margin-bottom: 10px;">Legend:</h4>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
                    <div style="padding: 10px; background: #d1fae5; border-radius: 5px; text-align: center;">
                        <strong>Very Active</strong><br>10+ actions
                    </div>
                    <div style="padding: 10px; background: #fef3c7; border-radius: 5px; text-align: center;">
                        <strong>Active</strong><br>5-9 actions
                    </div>
                    <div style="padding: 10px; background: #fee; border-radius: 5px; text-align: center;">
                        <strong>Low Activity</strong><br>1-4 actions
                    </div>
                    <div style="padding: 10px; background: #e5e7eb; border-radius: 5px; text-align: center;">
                        <strong>No Activity</strong><br>0 actions
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
