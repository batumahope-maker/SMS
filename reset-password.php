<?php
require_once 'config.php';

$message = '';
$success = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'];
    $new_password = $_POST['new_password'];
    
    // Hash the new password
    $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);
    
    // Update in database
    $stmt = $conn->prepare("UPDATE users SET password = ? WHERE username = ?");
    $stmt->bind_param("ss", $hashed_password, $username);
    
    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            $message = "✅ Password updated successfully for $username!";
            $success = true;
        } else {
            $message = "❌ No user found with username: $username";
        }
    } else {
        $message = "❌ Error: " . $stmt->error;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Tool</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            border-radius: 15px;
            padding: 40px;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        h1 { color: #333; margin-bottom: 10px; }
        .subtitle { color: #666; margin-bottom: 30px; }
        .message {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-weight: 500;
        }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: 600; color: #333; }
        input, select {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 1em;
        }
        input:focus, select:focus {
            outline: none;
            border-color: #667eea;
        }
        button {
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1.1em;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }
        button:hover { transform: translateY(-2px); }
        .quick-buttons {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 20px;
        }
        .quick-btn {
            padding: 10px;
            background: #f8f9fa;
            border: 2px solid #667eea;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9em;
            transition: all 0.3s;
        }
        .quick-btn:hover {
            background: #667eea;
            color: white;
        }
        .info-box {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            border-left: 4px solid #2196f3;
        }
        .info-box h3 { color: #1976d2; margin-bottom: 10px; font-size: 1.1em; }
        .info-box p { color: #555; margin: 5px 0; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Password Reset Tool</h1>
        <p class="subtitle">Update user passwords for testing</p>

        <?php if ($message): ?>
            <div class="message <?php echo $success ? 'success' : 'error'; ?>">
                <?php echo $message; ?>
            </div>
        <?php endif; ?>

        <form method="POST" action="">
            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" required placeholder="e.g., STU0004" value="STU0004">
            </div>

            <div class="form-group">
                <label for="new_password">New Password</label>
                <input type="text" id="new_password" name="new_password" required placeholder="e.g., student123" value="student123">
            </div>

            <button type="submit">🔑 Reset Password</button>
        </form>

        <div class="quick-buttons">
            <button class="quick-btn" onclick="setStudent()">Student: STU0004</button>
            <button class="quick-btn" onclick="setTeacher()">Teacher: TEA003</button>
            <button class="quick-btn" onclick="setAdmin()">Admin: admin</button>
        </div>

        <div class="info-box">
            <h3>📝 Default Test Accounts:</h3>
            <p><strong>Student:</strong> STU0004 / student123</p>
            <p><strong>Teacher:</strong> TEA003 / teacher123</p>
            <p><strong>Admin:</strong> admin / admin123</p>
        </div>
    </div>

    <script>
        function setStudent() {
            document.getElementById('username').value = 'STU0004';
            document.getElementById('new_password').value = 'student123';
        }
        function setTeacher() {
            document.getElementById('username').value = 'TEA003';
            document.getElementById('new_password').value = 'teacher123';
        }
        function setAdmin() {
            document.getElementById('username').value = 'admin';
            document.getElementById('new_password').value = 'admin123';
        }
    </script>
</body>
</html>
