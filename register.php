<?php
session_start();
require_once 'config.php';

$success = false;
$error   = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $full_name        = trim($_POST['full_name']);
    $email            = trim($_POST['email']);
    $phone            = trim($_POST['phone']);
    $dob              = $_POST['dob'];
    $gender           = $_POST['gender'];
    $trade            = $_POST['trade'];
    $level            = $_POST['level'];
    $section          = $_POST['section'];
    $password         = $_POST['password'];
    $confirm_password = $_POST['confirm_password'];

    if ($password !== $confirm_password) {
        $error = 'Passwords do not match!';
    } elseif (strlen($password) < 6) {
        $error = 'Password must be at least 6 characters!';
    } else {
        // Check email exists
        $check = db_query("SELECT id FROM users WHERE email = $1", [$email]);
        if (db_count($check) > 0) {
            $error = 'Email already registered!';
        } else {
            // Generate Student ID
            $max_result = db_query("SELECT MAX(CAST(SUBSTRING(username FROM 4) AS INTEGER)) as max_id FROM users WHERE username LIKE 'STU%'");
            $max_row    = db_fetch($max_result);
            $next_id    = ($max_row['max_id'] ?? 0) + 1;
            $student_id = 'STU' . str_pad($next_id, 4, '0', STR_PAD_LEFT);

            $hashed_password = password_hash($password, PASSWORD_DEFAULT);

            // Insert user
            $ins = db_query(
                "INSERT INTO users (username, full_name, email, phone, password, role, status) VALUES ($1,$2,$3,$4,$5,'student','Pending') RETURNING id",
                [$student_id, $full_name, $email, $phone, $hashed_password]
            );

            if ($ins) {
                $new_user   = db_fetch($ins);
                $new_user_id = $new_user['id'];

                // Insert student details
                db_query(
                    "INSERT INTO students (user_id, trade, level, section, dob, gender) VALUES ($1,$2,$3,$4,$5,$6)",
                    [$new_user_id, $trade, $level, $section, $dob, $gender]
                );

                $success = true;
                $_SESSION['registered_student_id']   = $student_id;
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
            min-height: 100vh; padding: 40px 20px;
        }
        .container {
            max-width: 600px; margin: 0 auto; background: white;
            border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white; padding: 40px; text-align: center;
        }
        .logo { width: 100px; height: 100px; margin: 0 auto 20px; }
        .logo img { width: 100%; height: 100%; object-fit: contain; }
        .header h1 { font-size: 2em; margin-bottom: 10px; }
        .header p { opacity: 0.9; }
        .success-box {
            background: #d4edda; border: 2px solid #28a745;
            padding: 40px; text-align: center;
        }
        .success-box h2 { color: #155724; font-size: 2em; margin-bottom: 20px; }
        .student-id-box {
            background: white; padding: 20px; border-radius: 10px;
            margin: 20px 0; border: 2px dashed #28a745;
        }
        .student-id-box strong { color: #11998e; font-size: 1.8em; }
        .important {
            background: #fff3cd; border-left: 4px solid #ffc107;
            padding: 15px; margin: 20px 0; text-align: left;
        }
        .login-btn {
            display: inline-block; background: #11998e; color: white;
            padding: 15px 40px; border-radius: 10px; text-decoration: none;
            font-weight: 600; margin-top: 20px;
        }
        .form-container { padding: 40px; }
        .error-message {
            background: #f8d7da; color: #721c24; padding: 15px;
            border-radius: 8px; margin-bottom: 20px; border: 1px solid #f5c6cb;
        }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: 600; color: #333; }
        input, select {
            width: 100%; padding: 12px; border: 2px solid #e0e0e0;
            border-radius: 8px; font-size: 1em;
        }
        input:focus, select:focus { outline: none; border-color: #11998e; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        button {
            width: 100%; padding: 15px;
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white; border: none; border-radius: 10px;
            font-size: 1.1em; font-weight: 600; cursor: pointer;
        }
        .back-link {
            text-align: center; margin-top: 20px;
            padding-top: 20px; border-top: 2px solid #f0f0f0;
        }
        .back-link a { color: #11998e; text-decoration: none; font-weight: 600; }
        @media (max-width: 768px) { .form-row { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
<div class="container">
    <?php if ($success): ?>
        <div class="success-box">
            <div class="logo">
                <img src="assets/essjt-logo.png" alt="ESSJT Logo"
                     onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
            </div>
            <h2>🎉 Registration Successful!</h2>
            <p>Congratulations, <strong><?php echo htmlspecialchars($_SESSION['registered_student_name']); ?></strong>!</p>
            <p>You have successfully registered at<br>
            <strong>École Secondaire Saint Joseph le Travailleur (ESSJT)</strong></p>
            <div class="student-id-box">
                <p>Your Student ID:</p>
                <strong><?php echo htmlspecialchars($_SESSION['registered_student_id']); ?></strong>
            </div>
            <div class="important">
                <strong>⚠️ Important:</strong><br>
                Your account is <strong>pending approval</strong> by the administrator.<br>
                Please save your Student ID: <strong><?php echo $_SESSION['registered_student_id']; ?></strong>
            </div>
            <a href="student/index.php" class="login-btn">Go to Student Login</a>
        </div>
    <?php else: ?>
        <div class="header">
            <div class="logo">
                <img src="assets/essjt-logo.png" alt="ESSJT Logo"
                     onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
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
                    <label>Full Name *</label>
                    <input type="text" name="full_name" required placeholder="Enter your full name">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" name="email" required placeholder="your@email.com">
                    </div>
                    <div class="form-group">
                        <label>Phone *</label>
                        <input type="tel" name="phone" required placeholder="+250XXXXXXXXX">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Date of Birth *</label>
                        <input type="date" name="dob" required>
                    </div>
                    <div class="form-group">
                        <label>Gender *</label>
                        <select name="gender" required>
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Trade/Program *</label>
                    <select name="trade" required>
                        <option value="">Select Trade/Program</option>
                        <option value="Software Development">Software Development</option>
                        <option value="Electronics and Telecommunication">Electronics and Telecommunication</option>
                        <option value="Tourism">Tourism</option>
                        <option value="Accounting">Accounting</option>
                        <option value="Food and Beverages">Food and Beverages</option>
                        <option value="Automobile">Automobile</option>
                        <option value="Building and Construction">Building and Construction</option>
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Level *</label>
                        <select name="level" required>
                            <option value="">Select Level</option>
                            <option value="L1">L1</option>
                            <option value="L2">L2</option>
                            <option value="L3">L3</option>
                            <option value="L4">L4</option>
                            <option value="L5">L5</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Section *</label>
                        <select name="section" required>
                            <option value="">Select Section</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Password *</label>
                        <input type="password" name="password" required placeholder="Min. 6 characters">
                    </div>
                    <div class="form-group">
                        <label>Confirm Password *</label>
                        <input type="password" name="confirm_password" required placeholder="Repeat password">
                    </div>
                </div>
                <button type="submit">📝 Register Now</button>
            </form>
            <div class="back-link">
                Already have an account? <a href="student/index.php">Login here</a>
            </div>
        </div>
    <?php endif; ?>
</div>
</body>
</html>
