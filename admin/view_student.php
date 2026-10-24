<?php
session_start();
require_once '../config.php';

$student_id = $_GET['id'] ?? 0;
$student = fetch_single("SELECT * FROM students WHERE id = $student_id");

if (!$student) {
    header("Location: students.php");
    exit();
}

// Get marks
$marks = fetch_all("SELECT * FROM marks WHERE student_id = {$student['id']} ORDER BY created_at DESC");

// Get attendance stats
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
    <title>Student Profile - <?php echo $student['full_name']; ?></title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f7fa; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: #8B0000; color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .nav { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .nav a { margin-right: 15px; text-decoration: none; color: #8B0000; font-weight: bold; }
        .profile-grid { display: grid; grid-template-columns: 300px 1fr; gap: 20px; }
        .profile-card { background: white; padding: 30px; border-radius: 10px; text-align: center; }
        .profile-photo { width: 150px; height: 150px; border-radius: 50%; background: #e2e8f0; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 4rem; }
        .info-section { background: white; padding: 25px; border-radius: 10px; margin-bottom: 20px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .info-item { padding: 10px 0; border-bottom: 1px solid #eee; }
        .info-label { font-weight: bold; color: #666; font-size: 0.9rem; }
        .info-value { color: #1a202c; margin-top: 5px; }
        .badge { padding: 6px 15px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; display: inline-block; }
        .badge-success { background: #d1fae5; color: #065f46; }
        .badge-danger { background: #fee; color: #c00; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
        .stat-box { background: white; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #4299e1; }
        .stat-value { font-size: 2rem; font-weight: bold; color: #1a202c; }
        .stat-label { color: #666; font-size: 0.9rem; margin-top: 5px; }
        table { width: 100%; }
        th { background: #f5f7fa; padding: 12px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #eee; }
        .btn { padding: 10px 20px; border-radius: 5px; text-decoration: none; color: white; font-weight: bold; display: inline-block; }
        .btn-edit { background: #f59e0b; }
        .btn-back { background: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>👨‍🎓 Student Profile</h1>
            <p><?php echo $student['student_id']; ?> - <?php echo $student['full_name']; ?></p>
        </div>
        
        <div class="nav">
            <a href="dashboard.php">📊 Dashboard</a>
            <a href="students.php">👨‍🎓 Students</a>
            <a href="edit_student.php?id=<?php echo $student['id']; ?>" class="btn btn-edit">✏️ Edit Profile</a>
        </div>
        
        <div class="profile-grid">
            <div class="profile-card">
                <div class="profile-photo">
                    <?php echo $student['gender'] == 'Male' ? '👨‍🎓' : '👩‍🎓'; ?>
                </div>
                <h2><?php echo $student['full_name']; ?></h2>
                <p style="color: #666; margin: 10px 0;"><?php echo $student['student_id']; ?></p>
                <span class="badge badge-<?php echo $student['status'] == 'Active' ? 'success' : 'danger'; ?>">
                    <?php echo $student['status']; ?>
                </span>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee;">
                    <div style="margin-bottom: 15px;">
                        <div class="info-label">Trade</div>
                        <div style="font-weight: bold; margin-top: 5px;"><?php echo $student['trade']; ?></div>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <div class="info-label">Level & Section</div>
                        <div style="font-weight: bold; margin-top: 5px;"><?php echo $student['level']; ?>-<?php echo $student['section']; ?></div>
                    </div>
                    <div>
                        <div class="info-label">Enrollment Date</div>
                        <div style="font-weight: bold; margin-top: 5px;"><?php echo format_date($student['enrollment_date']); ?></div>
                    </div>
                </div>
            </div>
            
            <div>
                <div class="stats-grid">
                    <div class="stat-box">
                        <div class="stat-value"><?php echo $attendance_stats['present'] ?? 0; ?></div>
                        <div class="stat-label">Days Present</div>
                    </div>
                    <div class="stat-box" style="border-left-color: #f59e0b;">
                        <div class="stat-value"><?php echo $attendance_stats['absent'] ?? 0; ?></div>
                        <div class="stat-label">Days Absent</div>
                    </div>
                    <div class="stat-box" style="border-left-color: #ef4444;">
                        <div class="stat-value"><?php echo format_money($student['fee_balance']); ?></div>
                        <div class="stat-label">Fee Balance</div>
                    </div>
                </div>
                
                <div class="info-section">
                    <h3 style="margin-bottom: 20px;">📋 Personal Information</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Full Name</div>
                            <div class="info-value"><?php echo $student['full_name']; ?></div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Gender</div>
                            <div class="info-value"><?php echo $student['gender']; ?></div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Date of Birth</div>
                            <div class="info-value"><?php echo format_date($student['date_of_birth']); ?></div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Email</div>
                            <div class="info-value"><?php echo $student['email']; ?></div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Phone</div>
                            <div class="info-value"><?php echo $student['phone'] ?: 'N/A'; ?></div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Address</div>
                            <div class="info-value"><?php echo $student['address'] ?: 'N/A'; ?></div>
                        </div>
                    </div>
                </div>
                
                <div class="info-section">
                    <h3 style="margin-bottom: 20px;">👨‍👩‍👧 Guardian Information</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Guardian Name</div>
                            <div class="info-value"><?php echo $student['guardian_name'] ?: 'N/A'; ?></div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Guardian Phone</div>
                            <div class="info-value"><?php echo $student['guardian_phone'] ?: 'N/A'; ?></div>
                        </div>
                    </div>
                </div>
                
                <div class="info-section">
                    <h3 style="margin-bottom: 20px;">💰 Fee Information</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Fee Paid</div>
                            <div class="info-value" style="color: #10b981; font-weight: bold;"><?php echo format_money($student['fee_paid']); ?></div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Fee Balance</div>
                            <div class="info-value" style="color: #ef4444; font-weight: bold;"><?php echo format_money($student['fee_balance']); ?></div>
                        </div>
                    </div>
                </div>
                
                <?php if (count($marks) > 0): ?>
                <div class="info-section">
                    <h3 style="margin-bottom: 20px;">📊 Recent Marks</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Subject</th>
                                <th>Term</th>
                                <th>Marks</th>
                                <th>Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach (array_slice($marks, 0, 5) as $mark): ?>
                            <tr>
                                <td><?php echo $mark['subject']; ?></td>
                                <td><?php echo $mark['term']; ?></td>
                                <td><?php echo $mark['marks']; ?>/100</td>
                                <td><strong><?php echo $mark['grade']; ?></strong></td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <?php endif; ?>
            </div>
        </div>
        
        <div style="margin-top: 20px;">
            <a href="students.php" class="btn btn-back">← Back to Students</a>
            <a href="edit_student.php?id=<?php echo $student['id']; ?>" class="btn btn-edit">✏️ Edit Profile</a>
        </div>
    </div>
</body>
</html>
