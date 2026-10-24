<?php
session_start();

// Check if splash screen has been shown
if (!isset($_SESSION['splash_shown'])) {
    $_SESSION['splash_shown'] = true;
    if (file_exists('splash.php')) {
        header('Location: splash.php');
        exit();
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ESSJT Portal - Choose Your Login</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            padding: 50px;
            max-width: 1200px;
            width: 100%;
            text-align: center;
            animation: fadeIn 0.5s ease-in;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .logo { width: 140px; height: 140px; margin: 0 auto 20px; }
        .logo img { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 4px 20px rgba(0,0,0,0.15)); }
        h1 { color: #333; font-size: 2.5em; margin-bottom: 10px; font-weight: 700; }
        .subtitle { color: #666; font-size: 1.2em; margin-bottom: 10px; }
        .tagline { color: #999; font-size: 1em; margin-bottom: 40px; }
        .badge {
            display: inline-block;
            background: linear-gradient(135deg, #ffd89b 0%, #19547b 100%);
            color: white;
            padding: 10px 25px;
            border-radius: 25px;
            font-weight: 600;
            margin-bottom: 40px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        .portals {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            margin-top: 30px;
        }
        .portal-card {
            background: white;
            border-radius: 15px;
            padding: 40px 30px;
            text-decoration: none;
            transition: all 0.3s ease;
            cursor: pointer;
            position: relative;
            overflow: hidden;
        }
        .portal-card:hover { transform: translateY(-10px); box-shadow: 0 15px 40px rgba(0,0,0,0.2); }
        .student-card { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; }
        .teacher-card { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; }
        .admin-card { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; }
        .portal-icon { font-size: 4em; margin-bottom: 20px; display: block; }
        .portal-title { font-size: 1.8em; font-weight: 700; margin-bottom: 15px; }
        .portal-description { font-size: 1em; opacity: 0.9; line-height: 1.5; }
        .footer { margin-top: 50px; padding-top: 30px; border-top: 2px solid #eee; color: #999; font-size: 0.9em; }
        .footer a { color: #667eea; text-decoration: none; margin: 0 10px; }
        @media (max-width: 768px) {
            .container { padding: 30px 20px; }
            h1 { font-size: 2em; }
            .portals { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <?php if (file_exists('assets/essjt-logo.png')): ?>
                <img src="assets/essjt-logo.png" alt="ESSJT Logo">
            <?php else: ?>
                <img src="https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png" alt="ESSJT Logo" onerror="this.style.display='none'">
            <?php endif; ?>
        </div>
        
        <h1>ESSJT Portal</h1>
        <p class="subtitle">École Secondaire Saint Joseph le Travailleur</p>
        <p class="tagline">Comprehensive School Management System</p>
        
        <div class="badge">🔐 Secure Login Portal</div>

        <div class="portals">
            <a href="student-login.php" class="portal-card student-card">
                <span class="portal-icon">👨‍🎓</span>
                <div class="portal-title">Student Portal</div>
                <div class="portal-description">Access your grades, attendance & fees</div>
            </a>

            <a href="teacher-login.php" class="portal-card teacher-card">
                <span class="portal-icon">👨‍🏫</span>
                <div class="portal-title">Teacher Portal</div>
                <div class="portal-description">Manage classes, marks & attendance</div>
            </a>

            <a href="admin-login.php" class="portal-card admin-card">
                <span class="portal-icon">👨‍💼</span>
                <div class="portal-title">Admin Portal</div>
                <div class="portal-description">Complete system administration</div>
            </a>
        </div>

        <div class="footer">
            <p>ESSJT School Management System | Professional Education Portal</p>
            <p><a href="https://essjt.org.rw/" target="_blank">🌐 School Website</a> | <a href="diagnostic.php">🔧 Diagnostic</a></p>
        </div>
    </div>
</body>
</html>