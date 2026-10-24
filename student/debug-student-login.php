<?php
// DEBUG VERSION - Student Login with error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

session_start();

echo "<!-- Session started -->\n";

// Check if config exists
if (!file_exists('../config.php')) {
    die("ERROR: config.php not found! Please create it in the root essjt folder.");
}

require_once '../config.php';
echo "<!-- Config loaded -->\n";

// Test database connection
if ($conn->connect_error) {
    die("ERROR: Database connection failed: " . $conn->connect_error);
}
echo "<!-- Database connected -->\n";

$error = '';
$debug_info = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $debug_info .= "Form submitted!\n";
    
    $username = trim($_POST['username']);
    $password = $_POST['password'];
    
    $debug_info .= "Username: " . htmlspecialchars($username) . "\n";
    $debug_info .= "Password length: " . strlen($password) . "\n";
    
    // Check credentials
    $stmt = $conn->prepare("SELECT * FROM users WHERE username = ? AND role = 'student'");
    if (!$stmt) {
        die("ERROR: Prepare failed: " . $conn->error);
    }
    
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $debug_info .= "Query executed. Rows found: " . $result->num_rows . "\n";
    
    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        
        $debug_info .= "User found!\n";
        $debug_info .= "User ID: " . $user['id'] . "\n";
        $debug_info .= "Status: " . $user['status'] . "\n";
        $debug_info .= "Stored password (first 10 chars): " . substr($user['password'], 0, 10) . "\n";
        
        // Check if account is active
        if ($user['status'] !== 'Active') {
            $error = 'Your account is pending approval.';
            $debug_info .= "Account not active!\n";
        } else {
            $debug_info .= "Checking password...\n";
            
            // Try both password_verify and direct comparison
            $password_verified = password_verify($password, $user['password']);
            $direct_match = ($password === $user['password']);
            
            $debug_info .= "Password verify result: " . ($password_verified ? "TRUE" : "FALSE") . "\n";
            $debug_info .= "Direct match result: " . ($direct_match ? "TRUE" : "FALSE") . "\n";
            
            if ($password_verified || $direct_match) {
                $debug_info .= "PASSWORD CORRECT! Setting session...\n";
                
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];
                $_SESSION['role'] = $user['role'];
                
                $debug_info .= "Session variables set:\n";
                $debug_info .= "- user_id: " . $_SESSION['user_id'] . "\n";
                $debug_info .= "- username: " . $_SESSION['username'] . "\n";
                $debug_info .= "- role: " . $_SESSION['role'] . "\n";
                
                // Check if dashboard exists
                if (file_exists('dashboard.php')) {
                    $debug_info .= "Dashboard file exists!\n";
                    $debug_info .= "Redirecting to dashboard.php...\n";
                    header('Location: dashboard.php');
                    exit();
                } else {
                    $error = "SUCCESS! Login worked, but dashboard.php doesn't exist yet.";
                    $debug_info .= "ERROR: dashboard.php file not found!\n";
                }
            } else {
                $error = 'Invalid password!';
                $debug_info .= "Password incorrect!\n";
            }
        }
    } else {
        $error = 'User not found or not a student!';
        $debug_info .= "No student user found with that username.\n";
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DEBUG - Student Login</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            padding: 40px;
            max-width: 600px;
            margin: 0 auto;
        }
        h1 { color: #11998e; margin-bottom: 20px; }
        .debug-box {
            background: #f8f9fa;
            border: 2px solid #11998e;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            font-family: monospace;
            white-space: pre-wrap;
            font-size: 0.9em;
        }
        .error { background: #fee; color: #c92a2a; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .success { background: #e8f5e9; color: #2e7d32; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: 600; }
        input {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 1em;
        }
        button {
            width: 100%;
            padding: 15px;
            background: #11998e;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1.1em;
            font-weight: 600;
            cursor: pointer;
        }
        button:hover { background: #0f7f72; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 DEBUG - Student Login</h1>
        <p>This debug version shows exactly what's happening.</p>

        <?php if ($error): ?>
            <div class="<?php echo strpos($error, 'SUCCESS') !== false ? 'success' : 'error'; ?>">
                <?php echo htmlspecialchars($error); ?>
            </div>
        <?php endif; ?>

        <?php if ($debug_info): ?>
            <div class="debug-box">
                <strong>Debug Information:</strong>
                <?php echo htmlspecialchars($debug_info); ?>
            </div>
        <?php endif; ?>

        <form method="POST" action="">
            <div class="form-group">
                <label for="username">Student ID</label>
                <input type="text" id="username" name="username" required placeholder="STU0004" value="STU0004">
            </div>

            <div class="form-group">
                <label for="password">Password</label>
                <input type="text" id="password" name="password" required placeholder="student123" value="student123">
            </div>

            <button type="submit">🔍 Test Login</button>
        </form>

        <div class="debug-box" style="margin-top: 30px;">
            <strong>System Check:</strong>
            Config file exists: <?php echo file_exists('../config.php') ? '✅ YES' : '❌ NO'; ?>
            Database connected: <?php echo isset($conn) && !$conn->connect_error ? '✅ YES' : '❌ NO'; ?>
            Dashboard exists: <?php echo file_exists('dashboard.php') ? '✅ YES' : '❌ NO'; ?>
        </div>
    </div>
</body>
</html>
