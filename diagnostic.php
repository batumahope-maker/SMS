<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ESSJT System Diagnostic</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 1000px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 {
            color: #333;
            text-align: center;
        }
        .test-section {
            background: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .test-item {
            padding: 15px;
            margin: 10px 0;
            border-left: 4px solid #ccc;
            background: #f9f9f9;
        }
        .test-item.pass {
            border-left-color: #4caf50;
            background: #e8f5e9;
        }
        .test-item.fail {
            border-left-color: #f44336;
            background: #ffebee;
        }
        .test-item.warn {
            border-left-color: #ff9800;
            background: #fff3e0;
        }
        .status {
            font-weight: bold;
            margin-right: 10px;
        }
        .pass .status { color: #4caf50; }
        .fail .status { color: #f44336; }
        .warn .status { color: #ff9800; }
        .fix {
            background: #fffde7;
            padding: 10px;
            margin-top: 10px;
            border-radius: 4px;
            font-size: 0.9em;
        }
        .test-link {
            display: inline-block;
            background: #2196f3;
            color: white;
            padding: 8px 15px;
            text-decoration: none;
            border-radius: 4px;
            margin: 5px;
        }
        .test-link:hover {
            background: #1976d2;
        }
    </style>
</head>
<body>
    <h1>🔍 ESSJT System Diagnostic</h1>
    <p style="text-align: center; color: #666;">This page checks if all required files and features are working</p>

    <div class="test-section">
        <h2>📂 File Structure Tests</h2>

        <div class="test-item <?php echo file_exists('index.php') ? 'pass' : 'fail'; ?>">
            <span class="status"><?php echo file_exists('index.php') ? '✅ PASS' : '❌ FAIL'; ?></span>
            <strong>Main Portal Page (index.php)</strong>
            <?php if (!file_exists('index.php')): ?>
                <div class="fix">
                    <strong>Fix:</strong> Copy index-COMPLETE.php, rename to index.php, and place in root essjt folder
                </div>
            <?php endif; ?>
        </div>

        <div class="test-item <?php echo file_exists('admin-login.php') ? 'pass' : 'fail'; ?>">
            <span class="status"><?php echo file_exists('admin-login.php') ? '✅ PASS' : '❌ FAIL'; ?></span>
            <strong>Admin Login Page (admin-login.php)</strong>
            <?php if (!file_exists('admin-login.php')): ?>
                <div class="fix">
                    <strong>Fix:</strong> Copy admin-login.php to root essjt folder
                </div>
            <?php endif; ?>
        </div>

        <div class="test-item <?php echo file_exists('student-login.php') ? 'pass' : 'fail'; ?>">
            <span class="status"><?php echo file_exists('student-login.php') ? '✅ PASS' : '❌ FAIL'; ?></span>
            <strong>Student Login Page (student-login.php)</strong>
            <?php if (!file_exists('student-login.php')): ?>
                <div class="fix">
                    <strong>Fix:</strong> Copy student-login.php to root essjt folder
                </div>
            <?php endif; ?>
        </div>

        <div class="test-item <?php echo file_exists('teacher-login.php') ? 'pass' : 'fail'; ?>">
            <span class="status"><?php echo file_exists('teacher-login.php') ? '✅ PASS' : '❌ FAIL'; ?></span>
            <strong>Teacher Login Page (teacher-login.php)</strong>
            <?php if (!file_exists('teacher-login.php')): ?>
                <div class="fix">
                    <strong>Fix:</strong> Copy teacher-login.php to root essjt folder
                </div>
            <?php endif; ?>
        </div>

        <div class="test-item <?php echo file_exists('assets/essjt-logo.png') ? 'pass' : 'fail'; ?>">
            <span class="status"><?php echo file_exists('assets/essjt-logo.png') ? '✅ PASS' : '❌ FAIL'; ?></span>
            <strong>Logo Image (assets/essjt-logo.png)</strong>
            <?php if (!file_exists('assets/essjt-logo.png')): ?>
                <div class="fix">
                    <strong>Fix:</strong> Copy essjt-logo.png to assets folder
                </div>
            <?php endif; ?>
        </div>

        <div class="test-item <?php echo file_exists('config.php') ? 'pass' : 'fail'; ?>">
            <span class="status"><?php echo file_exists('config.php') ? '✅ PASS' : '❌ FAIL'; ?></span>
            <strong>Database Config (config.php)</strong>
            <?php if (!file_exists('config.php')): ?>
                <div class="fix">
                    <strong>Fix:</strong> Create config.php with database connection details
                </div>
            <?php endif; ?>
        </div>
    </div>

    <div class="test-section">
        <h2>🔒 Folder Security Tests</h2>

        <div class="test-item <?php echo file_exists('student/index.php') ? 'pass' : 'warn'; ?>">
            <span class="status"><?php echo file_exists('student/index.php') ? '✅ PASS' : '⚠️ WARN'; ?></span>
            <strong>Student Folder Redirect (student/index.php)</strong>
            <?php if (!file_exists('student/index.php')): ?>
                <div class="fix">
                    <strong>Fix:</strong> Create student/index.php that redirects to ../student-login.php
                </div>
            <?php endif; ?>
        </div>

        <div class="test-item <?php echo file_exists('teacher/index.php') ? 'pass' : 'warn'; ?>">
            <span class="status"><?php echo file_exists('teacher/index.php') ? '✅ PASS' : '⚠️ WARN'; ?></span>
            <strong>Teacher Folder Redirect (teacher/index.php)</strong>
            <?php if (!file_exists('teacher/index.php')): ?>
                <div class="fix">
                    <strong>Fix:</strong> Create teacher/index.php that redirects to ../teacher-login.php
                </div>
            <?php endif; ?>
        </div>

        <div class="test-item <?php echo file_exists('admin/index.php') ? 'pass' : 'warn'; ?>">
            <span class="status"><?php echo file_exists('admin/index.php') ? '✅ PASS' : '⚠️ WARN'; ?></span>
            <strong>Admin Folder Redirect (admin/index.php)</strong>
            <?php if (!file_exists('admin/index.php')): ?>
                <div class="fix">
                    <strong>Fix:</strong> Create admin/index.php that redirects to ../admin-login.php
                </div>
            <?php endif; ?>
        </div>
    </div>

    <div class="test-section">
        <h2>🧪 Manual Tests</h2>
        <p>Click these links to test if everything works:</p>
        
        <a href="index.php" class="test-link" target="_blank">Test Main Portal</a>
        <a href="student-login.php" class="test-link" target="_blank">Test Student Login</a>
        <a href="teacher-login.php" class="test-link" target="_blank">Test Teacher Login</a>
        <a href="admin-login.php" class="test-link" target="_blank">Test Admin Login</a>
        <br><br>
        <a href="student/" class="test-link" target="_blank">Test Student Folder (should redirect)</a>
        <a href="teacher/" class="test-link" target="_blank">Test Teacher Folder (should redirect)</a>
        <a href="admin/" class="test-link" target="_blank">Test Admin Folder (should redirect)</a>
    </div>

    <?php if (file_exists('config.php')): ?>
    <div class="test-section">
        <h2>🗄️ Database Connection Test</h2>
        <?php
        require_once 'config.php';
        try {
            $testQuery = $conn->query("SELECT COUNT(*) as count FROM users");
            $result = $testQuery->fetch_assoc();
            echo '<div class="test-item pass">';
            echo '<span class="status">✅ PASS</span>';
            echo '<strong>Database Connection</strong><br>';
            echo 'Found ' . $result['count'] . ' users in database';
            echo '</div>';
        } catch (Exception $e) {
            echo '<div class="test-item fail">';
            echo '<span class="status">❌ FAIL</span>';
            echo '<strong>Database Connection</strong><br>';
            echo 'Error: ' . $e->getMessage();
            echo '</div>';
        }
        ?>
    </div>
    <?php endif; ?>

    <div class="test-section">
        <h2>📊 System Summary</h2>
        <?php
        $total_tests = 9;
        $passed = 0;
        $files_to_check = [
            'index.php',
            'admin-login.php',
            'student-login.php',
            'teacher-login.php',
            'assets/essjt-logo.png',
            'config.php',
            'student/index.php',
            'teacher/index.php',
            'admin/index.php'
        ];
        
        foreach ($files_to_check as $file) {
            if (file_exists($file)) $passed++;
        }
        
        $percentage = round(($passed / $total_tests) * 100);
        $color = $percentage >= 80 ? '#4caf50' : ($percentage >= 50 ? '#ff9800' : '#f44336');
        ?>
        <div style="text-align: center; font-size: 2em; color: <?php echo $color; ?>">
            <?php echo $passed; ?> / <?php echo $total_tests; ?> Tests Passed (<?php echo $percentage; ?>%)
        </div>
        
        <?php if ($percentage < 100): ?>
            <p style="text-align: center; margin-top: 20px; color: #666;">
                Your system is not fully configured. Please fix the failing tests above.
            </p>
        <?php else: ?>
            <p style="text-align: center; margin-top: 20px; color: #4caf50; font-weight: bold;">
                🎉 All tests passed! Your system is properly configured!
            </p>
        <?php endif; ?>
    </div>
</body>
</html>
