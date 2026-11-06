<?php
session_start();
require_once 'config.php';

// Redirect if already logged in
if (is_logged_in()) {
    $role = $_SESSION['role'];
    header("Location: $role/dashboard.php");
    exit();
}

// Handle Login
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = clean($_POST['email']);
    $password = $_POST['password'];
    $role = clean($_POST['role']);
    
    // Admin login
    if ($role === 'admin') {
        $sql = "SELECT * FROM users WHERE username = '$email' AND role = 'admin' LIMIT 1";
    } else {
        // Student/Teacher login
        $sql = "SELECT * FROM users WHERE email = '$email' AND role = '$role' LIMIT 1";
    }
    
    $user = fetch_single($sql);
    
    if ($user && md5($password) === $user['password']) {
        // Set session
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['email'] = $user['email'];
        $_SESSION['logged_in_at'] = time();
        
        // Update last login
        update('users', ['last_login' => date('Y-m-d H:i:s')], "id = {$user['id']}");
        
        // Log activity
        log_activity($user['id'], 'Login');
        
        // Redirect to dashboard
        header("Location: {$user['role']}/dashboard.php");
        exit();
    } else {
        $error = "Invalid credentials. Please try again.";
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - ESSJT School Management System</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Work+Sans:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Work Sans', sans-serif;
            background: linear-gradient(135deg, #8B0000 0%, #5c0000 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .login-container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
            max-width: 1000px;
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr;
        }
        
        .login-left {
            background: linear-gradient(135deg, #8B0000 0%, #a52a2a 100%);
            color: white;
            padding: 60px 40px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        
        .logo {
            font-family: 'Playfair Display', serif;
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .logo-icon {
            font-size: 3rem;
        }
        
        .login-left h2 {
            font-size: 1.8rem;
            margin-bottom: 1rem;
            color: #d4af37;
        }
        
        .login-left p {
            font-size: 1.1rem;
            opacity: 0.9;
            line-height: 1.6;
            margin-bottom: 2rem;
        }
        
        .features {
            list-style: none;
        }
        
        .features li {
            padding: 0.5rem 0;
            opacity: 0.9;
        }
        
        .features li::before {
            content: "✓ ";
            color: #d4af37;
            font-weight: bold;
            margin-right: 10px;
        }
        
        .login-right {
            padding: 60px 40px;
        }
        
        .login-header {
            text-align: center;
            margin-bottom: 2rem;
        }
        
        .login-header h1 {
            font-family: 'Playfair Display', serif;
            color: #8B0000;
            font-size: 2rem;
            margin-bottom: 0.5rem;
        }
        
        .login-header p {
            color: #666;
        }
        
        .role-selector {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 2rem;
        }
        
        .role-btn {
            padding: 1rem;
            border: 2px solid #e0e0e0;
            background: white;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s;
            text-align: center;
        }
        
        .role-btn:hover {
            border-color: #8B0000;
            transform: translateY(-2px);
        }
        
        .role-btn.active {
            border-color: #8B0000;
            background: #8B0000;
            color: white;
        }
        
        .role-btn .icon {
            font-size: 2rem;
            display: block;
            margin-bottom: 0.5rem;
        }
        
        .role-btn .label {
            font-size: 0.9rem;
            font-weight: 600;
        }
        
        .form-group {
            margin-bottom: 1.5rem;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            color: #333;
            font-weight: 600;
            font-size: 0.9rem;
        }
        
        .form-control {
            width: 100%;
            padding: 0.9rem 1rem;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 1rem;
            font-family: inherit;
            transition: all 0.3s;
        }
        
        .form-control:focus {
            outline: none;
            border-color: #8B0000;
            box-shadow: 0 0 0 3px rgba(139,0,0,0.1);
        }
        
        .btn-login {
            width: 100%;
            padding: 1rem;
            background: #8B0000;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .btn-login:hover {
            background: #a52a2a;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(139,0,0,0.3);
        }
        
        .alert {
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            font-size: 0.9rem;
        }
        
        .alert-error {
            background: #fee;
            border: 1px solid #fcc;
            color: #c33;
        }
        
        .divider {
            text-align: center;
            margin: 1.5rem 0;
            color: #999;
            font-size: 0.85rem;
        }
        
        .demo-credentials {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 8px;
            font-size: 0.85rem;
            color: #666;
        }
        
        .demo-credentials strong {
            color: #8B0000;
        }
        
        @media (max-width: 768px) {
            .login-container {
                grid-template-columns: 1fr;
            }
            
            .login-left {
                padding: 40px 20px;
            }
            
            .login-right {
                padding: 40px 20px;
            }
            
            .role-selector {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-left">
            <div class="logo">
                <span class="logo-icon">⛪</span>
                <span>ESSJT</span>
            </div>
            <h2>School Management System</h2>
            <p>Welcome to École Secondaire Saint Joseph le Travailleur official portal. Access your dashboard to manage students, teachers, grades, and more.</p>
            <ul class="features">
                <li>Student Management</li>
                <li>Teacher Portal</li>
                <li>Grades & Attendance</li>
                <li>Fee Management</li>
                <li>Reports & Analytics</li>
            </ul>
            <div style="margin-top: 2rem; opacity: 0.8; font-size: 0.9rem;">
                <strong>Contact:</strong><br>
                📞 +250 788 635 040<br>
                📧 essjt2007@yahoo.fr<br>
                📍 Muhima, Kigali, Rwanda
            </div>
        </div>
        
        <div class="login-right">
            <div class="login-header">
                <h1>Welcome Back</h1>
                <p>Please login to continue</p>
            </div>
            
            <?php if (isset($error)): ?>
            <div class="alert alert-error">
                ❌ <?php echo $error; ?>
            </div>
            <?php endif; ?>
            
            <form method="POST" action="" id="loginForm">
                <div class="role-selector">
                    <label class="role-btn active" onclick="selectRole('admin')">
                        <input type="radio" name="role" value="admin" checked style="display: none;">
                        <span class="icon">🛡️</span>
                        <span class="label">Admin</span>
                    </label>
                    <label class="role-btn" onclick="selectRole('teacher')">
                        <input type="radio" name="role" value="teacher" style="display: none;">
                        <span class="icon">👨‍🏫</span>
                        <span class="label">Teacher</span>
                    </label>
                    <label class="role-btn" onclick="selectRole('student')">
                        <input type="radio" name="role" value="student" style="display: none;">
                        <span class="icon">👨‍🎓</span>
                        <span class="label">Student</span>
                    </label>
                </div>
                
                <div class="form-group">
                    <label id="emailLabel">Username</label>
                    <input type="text" name="email" class="form-control" required placeholder="Enter username" id="emailInput">
                </div>
                
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" name="password" class="form-control" required placeholder="Enter password">
                </div>
                
                <button type="submit" class="btn-login">Login</button>
                
                <div class="divider">── Demo Credentials ──</div>
                
                <div class="demo-credentials">
                    <div id="demoCredentials">
                        <strong>Admin:</strong> admin / admin123<br>
                        <strong>Teacher:</strong> jb.nkurunziza@essjt.rw / teacher123<br>
                        <strong>Student:</strong> alice.uwase@student.essjt.rw / pass123
                    </div>
                </div>
            </form>
        </div>
    </div>
    
    <script>
        function selectRole(role) {
            // Update active state
            document.querySelectorAll('.role-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            event.currentTarget.classList.add('active');
            
            // Update label and placeholder
            const emailLabel = document.getElementById('emailLabel');
            const emailInput = document.getElementById('emailInput');
            
            if (role === 'admin') {
                emailLabel.textContent = 'Username';
                emailInput.placeholder = 'Enter username';
                emailInput.type = 'text';
            } else {
                emailLabel.textContent = 'Email Address';
                emailInput.placeholder = 'Enter email address';
                emailInput.type = 'email';
            }
        }
        
        // Auto-fill demo credentials on role change
        document.querySelectorAll('input[name="role"]').forEach(radio => {
            radio.addEventListener('change', function() {
                const role = this.value;
                const emailInput = document.getElementById('emailInput');
                const passwordInput = document.querySelector('input[name="password"]');
                
                // Optional: Auto-fill for demo
                if (role === 'admin') {
                    emailInput.value = 'admin';
                    passwordInput.value = 'admin123';
                } else if (role === 'teacher') {
                    emailInput.value = 'jb.nkurunziza@essjt.rw';
                    passwordInput.value = 'teacher123';
                } else if (role === 'student') {
                    emailInput.value = 'alice.uwase@student.essjt.rw';
                    passwordInput.value = 'pass123';
                }
            });
        });
    </script>
</body>
</html>
