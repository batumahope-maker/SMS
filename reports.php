<?php
session_start();

// Check if user is logged in and is an admin
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header('Location: ../admin-login.php');
    exit();
}

require_once '../config.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reports - ESSJT Admin</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h1 { font-size: 1.8em; }
        .back-btn {
            background: white;
            color: #667eea;
            padding: 10px 20px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s;
        }
        .back-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
        .container { max-width: 1200px; margin: 40px auto; padding: 0 20px; }
        .reports-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 25px;
        }
        .report-card {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            transition: all 0.3s;
        }
        .report-card:hover { transform: translateY(-5px); box-shadow: 0 8px 25px rgba(0,0,0,0.15); }
        .report-icon { font-size: 3em; margin-bottom: 15px; }
        .report-card h3 { color: #667eea; margin-bottom: 15px; font-size: 1.4em; }
        .report-card p { color: #666; margin-bottom: 20px; line-height: 1.6; }
        .generate-btn {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 25px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s;
        }
        .generate-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); }
        .page-title {
            background: white;
            padding: 30px;
            border-radius: 15px;
            margin-bottom: 30px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .page-title h2 { color: #667eea; font-size: 2em; margin-bottom: 10px; }
        .page-title p { color: #666; font-size: 1.1em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Reports & Analytics</h1>
        <a href="control_panel.php" class="back-btn">← Back to Control Panel</a>
    </div>

    <div class="container">
        <div class="page-title">
            <h2>Generate Reports</h2>
            <p>Create detailed reports for various aspects of school management</p>
        </div>

        <div class="reports-grid">
            <div class="report-card">
                <div class="report-icon">👥</div>
                <h3>Student Report</h3>
                <p>Generate comprehensive reports for all students including personal details, academic performance, and attendance records.</p>
                <a href="print_report.php?type=students" class="generate-btn">📄 Generate Report</a>
            </div>

            <div class="report-card">
                <div class="report-icon">👨‍🏫</div>
                <h3>Teacher Report</h3>
                <p>View detailed teacher information, assigned classes, activity levels, and performance metrics.</p>
                <a href="print_report.php?type=teachers" class="generate-btn">📄 Generate Report</a>
            </div>

            <div class="report-card">
                <div class="report-icon">📚</div>
                <h3>Class Report</h3>
                <p>Get class-wise statistics including student count, average performance, and attendance percentages.</p>
                <a href="print_report.php?type=classes" class="generate-btn">📄 Generate Report</a>
            </div>

            <div class="report-card">
                <div class="report-icon">📋</div>
                <h3>Attendance Report</h3>
                <p>Track attendance patterns, identify frequent absentees, and monitor overall attendance rates.</p>
                <a href="print_report.php?type=attendance" class="generate-btn">📄 Generate Report</a>
            </div>

            <div class="report-card">
                <div class="report-icon">📊</div>
                <h3>Marks Report</h3>
                <p>Analyze academic performance across subjects, identify top performers and students needing support.</p>
                <a href="print_report.php?type=marks" class="generate-btn">📄 Generate Report</a>
            </div>

            <div class="report-card">
                <div class="report-icon">💰</div>
                <h3>Financial Report</h3>
                <p>Track fee collection, pending payments, total revenue, and financial summaries by period.</p>
                <a href="print_report.php?type=financial" class="generate-btn">📄 Generate Report</a>
            </div>

            <div class="report-card">
                <div class="report-icon">📈</div>
                <h3>Performance Trends</h3>
                <p>Visualize academic trends over time, compare class performances, and identify improvement areas.</p>
                <a href="print_report.php?type=trends" class="generate-btn">📄 Generate Report</a>
            </div>

            <div class="report-card">
                <div class="report-icon">🏆</div>
                <h3>Best Performers</h3>
                <p>View top-performing students by overall grades, subject-wise excellence, and improvement rates.</p>
                <a href="best_performers.php" class="generate-btn">📄 View Report</a>
            </div>

            <div class="report-card">
                <div class="report-icon">📅</div>
                <h3>Monthly Summary</h3>
                <p>Get a comprehensive monthly overview including admissions, attendance, academics, and finances.</p>
                <a href="print_report.php?type=monthly" class="generate-btn">📄 Generate Report</a>
            </div>
        </div>
    </div>
</body>
</html>
