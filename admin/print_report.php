<?php
session_start();
require_once '../config.php';

$total_students = count_records('students', "status = 'Active'");
$total_teachers = count_records('teachers', "status = 'Active'");

$fee_stats = fetch_single("
    SELECT 
        SUM(fee_paid) as total_collected,
        SUM(fee_balance) as total_pending
    FROM students
");

$students_by_trade = fetch_all("
    SELECT trade, COUNT(*) as count 
    FROM students 
    WHERE status = 'Active' 
    GROUP BY trade 
    ORDER BY count DESC
");
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>ESSJT System Report</title>
    <style>
        @media print {
            .no-print { display: none !important; }
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 40px; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #8B0000; padding-bottom: 20px; }
        .header h1 { color: #8B0000; font-size: 2.5rem; margin-bottom: 10px; }
        .header p { color: #666; }
        .section { margin-bottom: 30px; page-break-inside: avoid; }
        .section h2 { color: #8B0000; margin-bottom: 15px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
        .stat-box { border: 2px solid #eee; padding: 20px; text-align: center; border-radius: 8px; }
        .stat-value { font-size: 2.5rem; font-weight: bold; color: #8B0000; }
        .stat-label { color: #666; margin-top: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th { background: #8B0000; color: white; padding: 12px; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #eee; }
        tr:nth-child(even) { background: #f9f9f9; }
        .footer { margin-top: 50px; text-align: center; color: #666; font-size: 0.9rem; border-top: 2px solid #eee; padding-top: 20px; }
        .btn { padding: 12px 24px; background: #8B0000; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 1rem; margin-right: 10px; }
    </style>
</head>
<body>
    <div class="no-print" style="margin-bottom: 20px; text-align: center;">
        <button onclick="window.print()" class="btn">🖨️ Print Report</button>
        <button onclick="window.close()" class="btn" style="background: #6c757d;">✕ Close</button>
    </div>
    
    <div class="header">
        <h1>⛪ ESSJT</h1>
        <h2>École Secondaire Saint Joseph de Twumba</h2>
        <p>School Management System - Complete Report</p>
        <p><strong>Generated:</strong> <?php echo date('l, F j, Y - H:i:s'); ?></p>
    </div>
    
    <div class="section">
        <h2>📊 System Overview</h2>
        <div class="stats-grid">
            <div class="stat-box">
                <div class="stat-value"><?php echo $total_students; ?></div>
                <div class="stat-label">Total Students</div>
            </div>
            <div class="stat-box">
                <div class="stat-value"><?php echo $total_teachers; ?></div>
                <div class="stat-label">Total Teachers</div>
            </div>
            <div class="stat-box">
                <div class="stat-value"><?php echo format_money($fee_stats['total_pending']); ?></div>
                <div class="stat-label">Pending Fees</div>
            </div>
        </div>
    </div>
    
    <div class="section">
        <h2>👨‍🎓 Students Distribution by Trade</h2>
        <table>
            <thead>
                <tr>
                    <th>Trade</th>
                    <th>Number of Students</th>
                    <th>Percentage</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($students_by_trade as $trade): ?>
                <tr>
                    <td><?php echo $trade['trade']; ?></td>
                    <td><?php echo $trade['count']; ?></td>
                    <td><?php echo round(($trade['count'] / $total_students) * 100, 1); ?>%</td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    
    <div class="section">
        <h2>💰 Financial Summary</h2>
        <table>
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Amount (RWF)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Total Fees Collected</td>
                    <td style="color: #10b981; font-weight: bold;"><?php echo format_money($fee_stats['total_collected']); ?></td>
                </tr>
                <tr>
                    <td>Total Pending Fees</td>
                    <td style="color: #ef4444; font-weight: bold;"><?php echo format_money($fee_stats['total_pending']); ?></td>
                </tr>
                <tr>
                    <td>Total Expected Revenue</td>
                    <td style="font-weight: bold;"><?php echo format_money($fee_stats['total_collected'] + $fee_stats['total_pending']); ?></td>
                </tr>
            </tbody>
        </table>
    </div>
    
    <div class="footer">
        <p><strong>ESSJT School Management System</strong></p>
        <p>École Secondaire Saint Joseph de Twumba</p>
        <p>Kigali, Rwanda | www.essjt.rw</p>
        <p style="margin-top: 10px;">This report is confidential and for internal use only.</p>
    </div>
</body>
</html>
