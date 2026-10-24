<?php
session_start();
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header('Location: ../admin-login.php');
    exit();
}
require_once '../config.php';

// Get top performers by average marks
$top_students = $conn->query("
    SELECT 
        u.id,
        u.username,
        u.full_name,
        s.trade,
        s.level,
        s.section,
        AVG((m.marks / m.max_marks) * 100) as average_percentage,
        COUNT(DISTINCT m.subject) as subjects_count
    FROM users u
    JOIN students s ON u.id = s.user_id
    LEFT JOIN marks m ON u.id = m.student_id
    WHERE u.role = 'student' AND u.status = 'Active'
    GROUP BY u.id
    HAVING subjects_count > 0
    ORDER BY average_percentage DESC
    LIMIT 50
");

// Get subject-wise toppers
$subject_toppers = $conn->query("
    SELECT 
        m.subject,
        u.username,
        u.full_name,
        s.trade,
        s.level,
        (m.marks / m.max_marks) * 100 as percentage,
        m.marks,
        m.max_marks
    FROM marks m
    JOIN users u ON m.student_id = u.id
    JOIN students s ON u.id = s.user_id
    WHERE m.id IN (
        SELECT m2.id 
        FROM marks m2 
        WHERE m2.subject = m.subject 
        ORDER BY (m2.marks / m2.max_marks) DESC 
        LIMIT 1
    )
    ORDER BY m.subject
");

// Get attendance champions
$attendance_champs = $conn->query("
    SELECT 
        u.username,
        u.full_name,
        s.trade,
        s.level,
        COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as present_count,
        COUNT(*) as total_records,
        (COUNT(CASE WHEN a.status = 'Present' THEN 1 END) / COUNT(*) * 100) as attendance_percentage
    FROM users u
    JOIN students s ON u.id = s.user_id
    LEFT JOIN attendance a ON u.id = a.student_id
    WHERE u.role = 'student' AND u.status = 'Active'
    GROUP BY u.id
    HAVING total_records > 0
    ORDER BY attendance_percentage DESC, present_count DESC
    LIMIT 20
");
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Best Performers - ESSJT</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h1 { font-size: 1.8em; }
        .btn-back { background: white; color: #667eea; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; }
        .container { max-width: 1400px; margin: 40px auto; padding: 0 20px; }
        
        .section { background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); margin-bottom: 30px; }
        .section h2 { color: #667eea; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px solid #667eea; }
        
        .podium {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }
        .podium-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            position: relative;
        }
        .podium-card.first {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            grid-row: 1;
            grid-column: 2;
        }
        .podium-card.second {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            grid-row: 1;
            grid-column: 1;
            margin-top: 20px;
        }
        .podium-card.third {
            background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
            grid-row: 1;
            grid-column: 3;
            margin-top: 40px;
        }
        .rank-badge {
            font-size: 3em;
            margin-bottom: 10px;
        }
        .student-name {
            font-size: 1.3em;
            font-weight: 700;
            margin-bottom: 5px;
        }
        .student-id {
            opacity: 0.9;
            margin-bottom: 15px;
        }
        .percentage {
            font-size: 2.5em;
            font-weight: 700;
            margin-bottom: 5px;
        }
        
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #667eea; color: white; padding: 15px; text-align: left; font-weight: 600; }
        td { padding: 15px; border-bottom: 1px solid #e0e0e0; }
        tr:hover { background: #f8f9fa; }
        
        .rank-number {
            background: #667eea;
            color: white;
            width: 35px;
            height: 35px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
        }
        .rank-1 { background: #f093fb; }
        .rank-2 { background: #4facfe; }
        .rank-3 { background: #43e97b; }
        
        .percentage-bar {
            height: 8px;
            background: #e0e0e0;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 5px;
        }
        .percentage-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            transition: width 0.3s;
        }
        
        .subject-card {
            background: white;
            border-left: 5px solid #667eea;
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .subject-name {
            font-size: 1.2em;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏆 Best Performers</h1>
        <a href="control_panel.php" class="btn-back">← Back</a>
    </div>

    <div class="container">
        <!-- TOP 3 PODIUM -->
        <div class="section">
            <h2>🥇 Top 3 Students (Overall Performance)</h2>
            <div class="podium">
                <?php 
                $top_students->data_seek(0);
                $rank = 0;
                $positions = ['', 'first', 'second', 'third'];
                while ($student = $top_students->fetch_assoc()): 
                    $rank++;
                    if ($rank > 3) break;
                    $badges = ['', '🥇', '🥈', '🥉'];
                ?>
                    <div class="podium-card <?php echo $positions[$rank]; ?>">
                        <div class="rank-badge"><?php echo $badges[$rank]; ?></div>
                        <div class="student-name"><?php echo htmlspecialchars($student['full_name']); ?></div>
                        <div class="student-id"><?php echo htmlspecialchars($student['username']); ?></div>
                        <div class="percentage"><?php echo number_format($student['average_percentage'], 1); ?>%</div>
                        <div><?php echo htmlspecialchars($student['trade'] . '-' . $student['level']); ?></div>
                    </div>
                <?php endwhile; ?>
            </div>
        </div>

        <!-- ALL TOP PERFORMERS -->
        <div class="section">
            <h2>📊 Top 50 Students</h2>
            <table>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Student ID</th>
                        <th>Full Name</th>
                        <th>Class</th>
                        <th>Subjects</th>
                        <th>Average</th>
                        <th>Performance</th>
                    </tr>
                </thead>
                <tbody>
                    <?php 
                    $top_students->data_seek(0);
                    $rank = 0;
                    while ($student = $top_students->fetch_assoc()): 
                        $rank++;
                        $rank_class = $rank <= 3 ? "rank-$rank" : '';
                    ?>
                        <tr>
                            <td><span class="rank-number <?php echo $rank_class; ?>"><?php echo $rank; ?></span></td>
                            <td><strong><?php echo htmlspecialchars($student['username']); ?></strong></td>
                            <td><?php echo htmlspecialchars($student['full_name']); ?></td>
                            <td><?php echo htmlspecialchars($student['trade'] . '-' . $student['level'] . '-' . $student['section']); ?></td>
                            <td><?php echo $student['subjects_count']; ?> subjects</td>
                            <td><strong><?php echo number_format($student['average_percentage'], 1); ?>%</strong></td>
                            <td style="width: 150px;">
                                <div class="percentage-bar">
                                    <div class="percentage-fill" style="width: <?php echo $student['average_percentage']; ?>%;"></div>
                                </div>
                            </td>
                        </tr>
                    <?php endwhile; ?>
                </tbody>
            </table>
        </div>

        <!-- SUBJECT TOPPERS -->
        <div class="section">
            <h2>📚 Subject-Wise Champions</h2>
            <?php if ($subject_toppers && $subject_toppers->num_rows > 0): ?>
                <?php while ($topper = $subject_toppers->fetch_assoc()): ?>
                    <div class="subject-card">
                        <div class="subject-name"><?php echo htmlspecialchars($topper['subject']); ?></div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong><?php echo htmlspecialchars($topper['full_name']); ?></strong>
                                (<?php echo htmlspecialchars($topper['username']); ?>)
                                <br>
                                <small><?php echo htmlspecialchars($topper['trade'] . '-' . $topper['level']); ?></small>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 2em; font-weight: 700; color: #667eea;">
                                    <?php echo number_format($topper['percentage'], 1); ?>%
                                </div>
                                <small><?php echo $topper['marks'] . '/' . $topper['max_marks']; ?></small>
                            </div>
                        </div>
                    </div>
                <?php endwhile; ?>
            <?php else: ?>
                <p style="text-align: center; padding: 40px; color: #999;">No subject data available yet.</p>
            <?php endif; ?>
        </div>

        <!-- ATTENDANCE CHAMPIONS -->
        <div class="section">
            <h2>📋 Attendance Champions</h2>
            <table>
                <thead>
                    <tr>
                        <th>Student ID</th>
                        <th>Full Name</th>
                        <th>Class</th>
                        <th>Present Days</th>
                        <th>Attendance %</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if ($attendance_champs && $attendance_champs->num_rows > 0): ?>
                        <?php while ($champ = $attendance_champs->fetch_assoc()): ?>
                            <tr>
                                <td><strong><?php echo htmlspecialchars($champ['username']); ?></strong></td>
                                <td><?php echo htmlspecialchars($champ['full_name']); ?></td>
                                <td><?php echo htmlspecialchars($champ['trade'] . '-' . $champ['level']); ?></td>
                                <td><?php echo $champ['present_count']; ?> / <?php echo $champ['total_records']; ?></td>
                                <td><strong><?php echo number_format($champ['attendance_percentage'], 1); ?>%</strong></td>
                            </tr>
                        <?php endwhile; ?>
                    <?php else: ?>
                        <tr><td colspan="5" style="text-align: center; padding: 40px; color: #999;">No attendance data available yet.</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>
