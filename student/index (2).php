<?php
session_start();
require_once '../config.php';

// Check if there's an approval notification for this user
$show_approval = false;
$approval_data = null;

if (isset($_SESSION['show_approval_message'])) {
    $show_approval = true;
    $approval_data = $_SESSION['show_approval_message'];
    unset($_SESSION['show_approval_message']);
}

// If already logged in as student, go to dashboard
if (isset($_SESSION['user_id']) && $_SESSION['role'] === 'student') {
    header('Location: dashboard.php');
    exit();
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username']);
    $password = $_POST['password'];
    
    $stmt = $conn->prepare("SELECT * FROM users WHERE username = ? AND role = 'student'");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        
        // Check if account is active
        if ($user['status'] === 'Pending') {
            $error = 'Your account is pending admin approval. Please wait for confirmation.';
        } else if ($user['status'] !== 'Active') {
            $error = 'Your account has been suspended. Please contact administration.';
        } else if (password_verify($password, $user['password']) || $password === $user['password']) {
            // Check if this is first login after approval
            $first_login = !isset($_SESSION['student_first_login_' . $user['id']]);
            
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];
            $_SESSION['full_name'] = $user['full_name'];
            
            if ($first_login) {
                $_SESSION['show_approval_message'] = [
                    'student_name' => $user['full_name'],
                    'student_id' => $user['username']
                ];
                $_SESSION['student_first_login_' . $user['id']] = true;
            }
            
            header('Location: dashboard.php');
            exit();
        } else {
            $error = 'Invalid password! Please try again.';
        }
    } else {
        $error = 'Student ID not found! Please check your ID.';
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
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        /* Approval Message Styles */
        .approval-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            animation: fadeIn 0.5s;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .approval-modal {
            background: white;
            border-radius: 20px;
            max-width: 600px;
            width: 90%;
            padding: 50px;
            text-align: center;
            animation: slideUp 0.5s;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        @keyframes slideUp {
            from { transform: translateY(50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .approval-icon {
            font-size: 6em;
            animation: bounce 1s infinite;
            margin-bottom: 20px;
        }
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
        }
        .approval-logo {
            width: 120px;
            height: 120px;
            margin: 0 auto 30px;
        }
        .approval-logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            filter: drop-shadow(0 5px 15px rgba(0,0,0,0.2));
        }
        .approval-modal h2 {
            color: #11998e;
            font-size: 2.5em;
            margin-bottom: 20px;
        }
        .approval-modal .student-name {
            font-size: 1.8em;
            color: #333;
            font-weight: 700;
            margin: 20px 0;
        }
        .approval-modal .message {
            font-size: 1.3em;
            color: #666;
            line-height: 1.8;
            margin: 20px 0;
        }
        .approval-modal .school-name {
            font-size: 1.5em;
            color: #11998e;
            font-weight: 700;
            margin: 20px 0;
        }
        .student-id-box {
            background: #e8f5e9;
            border: 3px dashed #11998e;
            padding: 25px;
            border-radius: 15px;
            margin: 30px 0;
        }
        .student-id-box p {
            color: #666;
            margin-bottom: 10px;
        }
        .student-id-box strong {
            color: #11998e;
            font-size: 2em;
        }
        .continue-btn {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
            padding: 18px 50px;
            border: none;
            border-radius: 12px;
            font-size: 1.2em;
            font-weight: 700;
            cursor: pointer;
            margin-top: 30px;
            transition: all 0.3s;
        }
        .continue-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 25px rgba(17, 153, 142, 0.4);
        }
        
        /* Login Form Styles */
        .login-container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            padding: 50px 40px;
            max-width: 450px;
            width: 100%;
            animation: slideIn 0.5s ease-out;
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(-30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .logo-container { width: 120px; height: 120px; margin: 0 auto 25px; }
        .logo-container img { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 4px 15px rgba(0,0,0,0.1)); }
        .student-icon { font-size: 3em; margin-bottom: 15px; display: block; text-align: center; }
        h1 { color: #11998e; font-size: 2em; margin-bottom: 10px; text-align: center; font-weight: 700; }
        .subtitle { color: #666; font-size: 1em; margin-bottom: 25px; text-align: center; }
        .info-box {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            margin-bottom: 30px;
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(17, 153, 142, 0.2);
            text-align: center;
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
        .form-group { margin-bottom: 25px; text-align: left; }
        label { display: block; color: #333; font-weight: 600; margin-bottom: 8px; font-size: 0.95em; }
        input[type="text"], input[type="password"] {
            width: 100%;
            padding: 15px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 1em;
            transition: all 0.3s ease;
            background: #f8f9fa;
        }
        input:focus {
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
        .login-button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(17, 153, 142, 0.4); }
        .register-section { margin-top: 25px; padding-top: 20px; border-top: 2px solid #f0f0f0; text-align: center; }
        .register-text { color: #666; margin-bottom: 15px; }
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
        .register-button:hover { transform: translateY(-2px); }
        .back-link { margin-top: 20px; text-align: center; }
        .back-link a { color: #11998e; text-decoration: none; font-weight: 600; }
    </style>
</head>
<body>
    <?php if ($show_approval && $approval_data): ?>
        <!-- APPROVAL CONFIRMATION MODAL -->
        <div class="approval-overlay">
            <div class="approval-modal">
                <div class="approval-icon">🎉</div>
                
                <div class="approval-logo">
                    <img src="../assets/essjt-logo.png" alt="ESSJT Logo" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
                </div>
                
                <h2>Congratulations!</h2>
                
                <p class="student-name"><?php echo htmlspecialchars($approval_data['student_name']); ?></p>
                
                <p class="message">
                    Your account has been approved!<br>
                    <strong>You are now officially a student at</strong>
                </p>
                
                <p class="school-name">
                    École Secondaire Saint Joseph<br>le Travailleur (ESSJT)
                </p>
                
                <div class="student-id-box">
                    <p>Your Student ID:</p>
                    <strong><?php echo htmlspecialchars($approval_data['student_id']); ?></strong>
                </div>
                
                <p class="message">
                    Welcome to ESSJT family!<br>
                    You can now access all student portal features.
                </p>
                
                <button class="continue-btn" onclick="this.parentElement.parentElement.remove()">
                    Continue to Dashboard →
                </button>
            </div>
        </div>
    <?php endif; ?>

    <div class="login-container">
        <div class="logo-container">
            <img src="../assets/essjt-logo.png" alt="ESSJT Logo" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
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
            <a href="../register.php" class="register-button">📝 Register as Student</a>
        </div>

        <div class="back-link">
            <a href="../index.php">← Back to Portal Selection</a>
        </div>
    </div>
</body>
</html>
