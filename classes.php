<?php
session_start();
require_once '../config.php';

// Get all unique classes
$classes = fetch_all("
    SELECT DISTINCT trade, level, section, COUNT(*) as student_count
    FROM students
    WHERE status = 'Active'
    GROUP BY trade, level, section
    ORDER BY trade, level, section
");
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Classes - ESSJT</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f7fa; padding: 20px; }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { background: #8b5cf6; color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .nav { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .nav a { margin-right: 15px; text-decoration: none; color: #8b5cf6; font-weight: bold; }
        .classes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .class-card { background: white; padding: 25px; border-radius: 10px; border-left: 4px solid #8b5cf6; transition: transform 0.2s; }
        .class-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
        .class-header { margin-bottom: 15px; }
        .class-trade { font-size: 1.1rem; font-weight: bold; color: #1a202c; }
        .class-level { color: #666; margin-top: 5px; }
        .student-count { font-size: 2rem; font-weight: bold; color: #8b5cf6; margin: 15px 0; }
        .btn { padding: 10px 20px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; }
        .btn:hover { background: #7c3aed; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏫 Classes Overview</h1>
            <p>Organized by Trade, Level, and Section</p>
        </div>
        
        <div class="nav">
            <a href="dashboard.php">📊 Dashboard</a>
            <a href="students.php">👨‍🎓 All Students</a>
            <a href="classes.php">🏫 Classes</a>
        </div>
        
        <div class="classes-grid">
            <?php foreach ($classes as $class): ?>
            <div class="class-card">
                <div class="class-header">
                    <div class="class-trade"><?php echo $class['trade']; ?></div>
                    <div class="class-level">
                        Level <?php echo $class['level']; ?> - Section <?php echo $class['section']; ?>
                    </div>
                </div>
                
                <div class="student-count"><?php echo $class['student_count']; ?></div>
                <div style="color: #666; margin-bottom: 20px;">Students</div>
                
                <a href="class_details.php?trade=<?php echo urlencode($class['trade']); ?>&level=<?php echo $class['level']; ?>&section=<?php echo $class['section']; ?>" 
                   class="btn">
                   View Class →
                </a>
            </div>
            <?php endforeach; ?>
        </div>
        
        <div style="margin-top: 30px; background: white; padding: 25px; border-radius: 10px;">
            <h3 style="margin-bottom: 15px;">📊 Summary</h3>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
                <div style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold;"><?php echo count($classes); ?></div>
                    <div style="color: #666;">Total Classes</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold;">8</div>
                    <div style="color: #666;">Trades</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold;"><?php echo count_records('students', "status = 'Active'"); ?></div>
                    <div style="color: #666;">Active Students</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
