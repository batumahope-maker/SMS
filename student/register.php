<?php
session_start();
require_once 'config.php';

$success = false;
$error = '';
$student_name = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get form data
    $full_name = trim($_POST['full_name']);
    $email = trim($_POST['email']);
    $phone = trim($_POST['phone']);
    $dob = $_POST['dob'];
    $gender = $_POST['gender'];
    $trade = $_POST['trade'];
    $level = $_POST['level'];
    $section = $_POST['section'];
    $password = $_POST['password'];
    $confirm_password = $_POST['confirm_password'];
    
    // Validation
    if ($password !== $confirm_password) {
        $error = 'Passwords do not match!';
    } else if (strlen($password) < 6) {
        $error = 'Password must be at least 6 characters long!';
    } else {
        // Check if email already exists
        $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        if ($stmt->get_result()->num_rows > 0) {
            $error = 'Email already registered!';
        } else {
            // Generate student ID
            $result = $conn->query("SELECT MAX(CAST(SUBSTRING(username, 4) AS UNSIGNED)) as max_id FROM users WHERE username LIKE 'STU%'");
            $row = $result->fetch_assoc();
            $next_id = ($row['max_id'] ?? 0) + 1;
            $student_id = 'STU' . str_pad($next_id, 4, '0', STR_PAD_LEFT);
            
            // Hash password
            $hashed_password = password_hash($password, PASSWORD_DEFAULT);
            
            // Insert into users table
            $stmt = $conn->prepare("INSERT INTO users (username, full_name, email, phone, password, role, status) VALUES (?, ?, ?, ?, ?, 'student', 'Pending')");
            $stmt->bind_param("sssss", $student_id, $full_name, $email, $phone, $hashed_password);
            
            if ($stmt->execute()) {
                $user_id = $conn->insert_id;
                
                // Insert into students table
                $stmt2 = $conn->prepare("INSERT INTO students (user_id, trade, level, section, dob, gender) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt2->bind_param("isssss", $user_id, $trade, $level, $section, $dob, $gender);
                $stmt2->execute();
                
                $success = true;
                $student_name = $full_name;
                $_SESSION['registered_student_id'] = $student_id;
                $_SESSION['registered_student_name'] = $full_name;
            } else {
                $error = 'Registration failed. Please try again.';
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Registration - ESSJT</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        .logo { width: 100px; height: 100px; margin: 0 auto 20px; }
        .logo img { width: 100%; height: 100%; object-fit: contain; }
        .header h1 { font-size: 2em; margin-bottom: 10px; }
        .header p { opacity: 0.9; }
        
        .success-message {
            background: #d4edda;
            border: 2px solid #28a745;
            padding: 40px;
            text-align: center;
        }
        .success-icon { font-size: 5em; margin-bottom: 20px; }
        .success-message h2 { color: #155724; font-size: 2em; margin-bottom: 20px; }
        .success-message .student-id {
            background: white;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            border: 2px dashed #28a745;
        }
        .success-message .student-id strong { color: #11998e; font-size: 1.5em; }
        .success-message p { color: #155724; line-height: 1.8; margin: 15px 0; font-size: 1.1em; }
        .success-message .important {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
        }
        .success-message .important strong { color: #856404; }
        .login-btn {
            display: inline-block;
            background: #11998e;
            color: white;
            padding: 15px 40px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            margin-top: 20px;
            transition: all 0.3s;
        }
        .login-btn:hover { background: #0f7f72; transform: translateY(-2px); }
        
        .form-container { padding: 40px; }
        .error-message {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            border: 1px solid #f5c6cb;
        }
        .form-group { margin-bottom: 20px; }
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
        }
        input, select {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 1em;
            transition: all 0.3s;
        }
        input:focus, select:focus {
            outline: none;
            border-color: #11998e;
        }
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        button {
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 1.1em;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        button:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(17, 153, 142, 0.3); }
        .back-link {
            text-align: center;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px solid #f0f0f0;
        }
        .back-link a { color: #11998e; text-decoration: none; font-weight: 600; }
        @media (max-width: 768px) {
            .form-row { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <?php if ($success): ?>
            <div class="success-message">
                <div class="success-icon">🎉</div>
                <div class="logo">
                    <img src="assets/essjt-logo.png" alt="ESSJT Logo" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
                </div>
                <h2>Registration Successful!</h2>
                <p>Congratulations, <strong><?php echo htmlspecialchars($student_name); ?></strong>!</p>
                <p>You have successfully registered at</p>
                <p><strong>École Secondaire Saint Joseph le Travailleur (ESSJT)</strong></p>
                
                <div class="student-id">
                    <p>Your Student ID:</p>
                    <strong><?php echo htmlspecialchars($_SESSION['registered_student_id']); ?></strong>
                </div>
                
                <div class="important">
                    <strong>⚠️ Important:</strong>
                    <p>Your account is currently <strong>pending approval</strong> by the school administrator.</p>
                    <p>You will receive confirmation once your account has been approved.</p>
                    <p>Please save your Student ID for future reference.</p>
                </div>
                
                <p style="margin-top: 30px;">
                    <strong>Next Steps:</strong><br>
                    Wait for admin approval, then you can login with your Student ID and password.
                </p>
                
                <a href="student-login.php" class="login-btn">Go to Student Login</a>
            </div>
        <?php else: ?>
            <div class="header">
                <div class="logo">
                    <img src="assets/essjt-logo.png" alt="ESSJT Logo" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
                </div>
                <h1>📝 Student Registration</h1>
                <p>École Secondaire Saint Joseph le Travailleur</p>
            </div>
            
            <div class="form-container">
                <?php if ($error): ?>
                    <div class="error-message">⚠️ <?php echo htmlspecialchars($error); ?></div>
                <?php endif; ?>
                
                <form method="POST" action="">
                    <div class="form-group">
                        <label for="full_name">Full Name *</label>
                        <input type="text" id="full_name" name="full_name" required placeholder="Enter your full name">
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="email">Email *</label>
                            <input type="email" id="email" name="email" required placeholder="your@email.com">
                        </div>
                        
                        <div class="form-group">
                            <label for="phone">Phone Number *</label>
                            <input type="tel" id="phone" name="phone" required placeholder="+250XXXXXXXXX">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="dob">Date of Birth *</label>
                            <input type="date" id="dob" name="dob" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="gender">Gender *</label>
                            <select id="gender" name="gender" required>
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="trade">Trade *</label>
                            <select id="trade" name="trade" required>
                                <option value="">Select Trade</option>
                                <option value="ICT">ICT</option>
                                <option value="Construction">Construction</option>
                                <option value="Hospitality">Hospitality</option>
                                <option value="Agriculture">Agriculture</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="level">Level *</label>
                            <select id="level" name="level" required>
                                <option value="">Select Level</option>
                                <option value="S1">S1</option>
                                <option value="S2">S2</option>
                                <option value="S3">S3</option>
                                <option value="S4">S4</option>
                                <option value="S5">S5</option>
                                <option value="S6">S6</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="section">Section *</label>
                        <select id="section" name="section" required>
                            <option value="">Select Section</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                        </select>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="password">Password *</label>
                            <input type="password" id="password" name="password" required placeholder="Min. 6 characters">
                        </div>
                        
                        <div class="form-group">
                            <label for="confirm_password">Confirm Password *</label>
                            <input type="password" id="confirm_password" name="confirm_password" required placeholder="Repeat password">
                        </div>
                    </div>
                    
                    <button type="submit">📝 Register Now</button>
                </form>
                
                <div class="back-link">
                    Already have an account? <a href="student-login.php">Login here</a>
                </div>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>
