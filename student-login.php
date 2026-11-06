<?php
session_start();
require_once 'config.php';

// If already logged in, redirect to dashboard
if (isset($_SESSION['user_id']) && $_SESSION['role'] === 'student') {
    header('Location: student/dashboard.php');
    exit();
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username']);
    $password = $_POST['password'];
    
    // Check credentials - only allow students
    $stmt = $conn->prepare("SELECT * FROM users WHERE username = ? AND role = 'student'");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        
        // Check if account is active
        if ($user['status'] !== 'Active') {
            $error = 'Your account is pending approval. Please wait for admin confirmation.';
        } else if (password_verify($password, $user['password']) || $password === $user['password']) {
            // Set session variables
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];
            
            // Redirect to student dashboard
            header('Location: student/dashboard.php');
            exit();
        } else {
            $error = 'Invalid credentials! Please check your Student ID and password.';
        }
    } else {
        $error = 'Invalid credentials or you are not a student! Use the correct login page.';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Login - ESSJT</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
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
            padding: 50px 40px;
            max-width: 450px;
            width: 100%;
            text-align: center;
            animation: slideIn 0.5s ease-out;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .logo-container {
            width: 120px;
            height: 120px;
            margin: 0 auto 25px;
        }

        .logo-container img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            filter: drop-shadow(0 4px 15px rgba(0,0,0,0.1));
        }

        .student-icon {
            font-size: 3em;
            margin-bottom: 15px;
            display: block;
        }

        h1 {
            color: #11998e;
            font-size: 2em;
            margin-bottom: 10px;
            font-weight: 700;
        }

        .subtitle {
            color: #666;
            font-size: 1em;
            margin-bottom: 25px;
        }

        .info-box {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            margin-bottom: 30px;
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(17, 153, 142, 0.2);
        }

        .error-message {
            background: #fee;
            color: #c92a2a;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            border: 2px solid #fcc;
            font-weight: 500;
        }

        .form-group {
            margin-bottom: 25px;
            text-align: left;
        }

        label {
            display: block;
            color: #333;
            font-weight: 600;
            margin-bottom: 8px;
            font-size: 0.95em;
        }

        input[type="text"],
        input[type="password"] {
            width: 100%;
            padding: 15px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 1em;
            transition: all 0.3s ease;
            background: #f8f9fa;
        }

        input[type="text"]:focus,
        input[type="password"]:focus {
            outline: none;
            border-color: #11998e;
            background: white;
            box-shadow: 0 0 0 3px rgba(17, 153, 142, 0.1);
        }

        .login-button {
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 1.1em;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(17, 153, 142, 0.3);
        }

        .login-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(17, 153, 142, 0.4);
        }

        .login-button:active {
            transform: translateY(0);
        }

        .register-section {
            margin-top: 25px;
            padding-top: 20px;
            border-top: 2px solid #f0f0f0;
        }

        .register-text {
            color: #666;
            margin-bottom: 15px;
        }

        .register-button {
            display: inline-block;
            background: linear-gradient(135deg, #38ef7d 0%, #11998e 100%);
            color: white;
            padding: 12px 30px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(56, 239, 125, 0.3);
        }

        .register-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(56, 239, 125, 0.4);
        }

        .register-button::before {
            content: '📝 ';
        }

        .back-link {
            margin-top: 20px;
        }

        .back-link a {
            color: #11998e;
            text-decoration: none;
            font-weight: 600;
            transition: color 0.3s ease;
        }

        .back-link a:hover {
            color: #38ef7d;
        }

        .back-link a::before {
            content: '← ';
        }

        .teacher-note {
            margin-top: 20px;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 8px;
            font-size: 0.9em;
            color: #666;
        }

        @media (max-width: 480px) {
            .login-container {
                padding: 40px 25px;
            }

            h1 {
                font-size: 1.6em;
            }
        }
    </style>
</head>
<body>
    <div class="login-container">
        <!-- Real ESSJT Logo -->
        <div class="logo-container">
            <img src="assets/essjt-logo.png" alt="ESSJT Logo">
        </div>

        <span class="student-icon">👨‍🎓</span>
        <h1>Student Login</h1>
        <p class="subtitle">École Secondaire Saint Joseph le Travailleur</p>

        <div class="info-box">
            This page is for STUDENTS ONLY
        </div>

        <?php if ($error): ?>
            <div class="error-message">
                ⚠️ <?php echo htmlspecialchars($error); ?>
            </div>
        <?php endif; ?>

        <form method="POST" action="">
            <div class="form-group">
                <label for="username">Student ID</label>
                <input type="text" id="username" name="username" required placeholder="STU0004" autocomplete="username">
            </div>

            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required placeholder="••••••••" autocomplete="current-password">
            </div>

            <button type="submit" class="login-button">Login as Student</button>
        </form>

        <div class="register-section">
            <p class="register-text">Don't have an account?</p>
            <a href="register.php" class="register-button">Register as Student</a>
        </div>

        <div class="teacher-note">
            <strong>Teachers:</strong> Cannot self-register. Contact admin to create your account.
        </div>

        <div class="back-link">
            <a href="index.php">Back to Portal</a>
        </div>
    </div>
</body>
</html>
