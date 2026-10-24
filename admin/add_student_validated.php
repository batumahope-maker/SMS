<?php
session_start();
require_once '../config.php';

$success = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    // VALIDATION RULES
    $full_name = clean($_POST['full_name']);
    $email = clean($_POST['email']);
    $trade = clean($_POST['trade']);
    $level = clean($_POST['level']);
    $section = clean($_POST['section']);
    $gender = clean($_POST['gender']);
    $dob = clean($_POST['date_of_birth']);
    $phone = clean($_POST['phone']);
    $guardian_name = clean($_POST['guardian_name']);
    $guardian_phone = clean($_POST['guardian_phone']);
    
    // RULE 1: Check if email already exists
    $existing_email = fetch_single("SELECT id FROM users WHERE email = '$email'");
    if ($existing_email) {
        $error = "❌ This email is already registered in the system!";
    }
    // RULE 2: Check if student is at least 10 years old
    else if (date('Y') - date('Y', strtotime($dob)) < 10) {
        $error = "❌ Student must be at least 10 years old!";
    }
    // RULE 3: Validate phone format (Rwanda)
    else if ($phone && !preg_match('/^(\+?250|0)[7][0-9]{8}$/', $phone)) {
        $error = "❌ Invalid Rwandan phone number format! Use: +250XXXXXXXXX or 07XXXXXXXX";
    }
    // RULE 4: Validate guardian phone
    else if ($guardian_phone && !preg_match('/^(\+?250|0)[7][0-9]{8}$/', $guardian_phone)) {
        $error = "❌ Invalid guardian phone number format!";
    }
    // RULE 5: Full name must have at least 2 words
    else if (str_word_count($full_name) < 2) {
        $error = "❌ Full name must include first and last name!";
    }
    else {
        // ALL VALIDATION PASSED - PROCEED
        $student_id = generate_id('STU', 'students', 'student_id');
        $password = md5('student123');
        
        $fee_result = fetch_single("SELECT amount FROM fees_structure WHERE trade = '$trade' AND level = '$level'");
        $fee_balance = $fee_result ? $fee_result['amount'] : 500000;
        
        $user_sql = "INSERT INTO users (username, email, password, role, status, has_profile) 
                     VALUES ('$student_id', '$email', '$password', 'student', 'Active', TRUE)";
        
        if (query($user_sql)) {
            $user_id = last_id();
            
            $student_sql = "INSERT INTO students (
                user_id, student_id, full_name, email, password, trade, level, section,
                gender, date_of_birth, phone, address, guardian_name, guardian_phone,
                enrollment_date, fee_paid, fee_balance, status
            ) VALUES (
                $user_id, '$student_id', '$full_name', '$email', '$password', '$trade',
                '$level', '$section', '$gender', '$dob', '$phone', 'Kigali, Rwanda',
                '$guardian_name', '$guardian_phone', CURDATE(), 0, $fee_balance, 'Active'
            )";
            
            if (query($student_sql)) {
                $success = "✅ Student added successfully!<br>Student ID: <strong>$student_id</strong><br>Default Password: student123";
            }
        }
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Add Student (Validated) - ESSJT</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f7fa; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { background: #8B0000; color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .nav { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .nav a { margin-right: 15px; text-decoration: none; color: #8B0000; font-weight: bold; }
        .form-container { background: white; padding: 30px; border-radius: 10px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .form-group { margin-bottom: 20px; }
        .form-group.full { grid-column: 1 / -1; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, select { width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 5px; }
        input:focus, select:focus { border-color: #8B0000; outline: none; }
        .btn { padding: 12px 24px; background: #8B0000; color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; }
        .btn:hover { background: #a52a2a; }
        .success { background: #d1fae5; color: #065f46; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .error { background: #fee; color: #c00; padding: 15px; border-radius: 5px; margin-bottom: 20px; font-weight: bold; }
        .required { color: red; }
        .validation-rules { background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .validation-rules h4 { color: #1e40af; margin-bottom: 10px; }
        .validation-rules ul { margin-left: 20px; }
        .validation-rules li { color: #1e3a8a; margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>➕ Add New Student (With Validation)</h1>
            <p>Register a new student with automatic validation</p>
        </div>
        
        <div class="nav">
            <a href="control_panel.php">← Control Panel</a>
            <a href="students.php">👨‍🎓 Students</a>
        </div>
        
        <?php if ($success): ?>
            <div class="success"><?php echo $success; ?></div>
        <?php endif; ?>
        
        <?php if ($error): ?>
            <div class="error"><?php echo $error; ?></div>
        <?php endif; ?>
        
        <div class="validation-rules">
            <h4>🔒 Validation Rules:</h4>
            <ul>
                <li>✓ Email must be unique (not already in system)</li>
                <li>✓ Student must be at least 10 years old</li>
                <li>✓ Phone must be valid Rwandan format (+250XXXXXXXXX)</li>
                <li>✓ Guardian phone must be valid format</li>
                <li>✓ Full name must include first and last name</li>
                <li>✓ All required fields (*) must be filled</li>
            </ul>
        </div>
        
        <div class="form-container">
            <form method="POST">
                <h3 style="margin-bottom: 20px;">Personal Information</h3>
                
                <div class="form-grid">
                    <div class="form-group">
                        <label>Full Name <span class="required">*</span></label>
                        <input type="text" name="full_name" required placeholder="First Last">
                    </div>
                    
                    <div class="form-group">
                        <label>Email <span class="required">*</span></label>
                        <input type="email" name="email" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Gender <span class="required">*</span></label>
                        <select name="gender" required>
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Date of Birth <span class="required">*</span></label>
                        <input type="date" name="date_of_birth" required max="<?php echo date('Y-m-d', strtotime('-10 years')); ?>">
                    </div>
                    
                    <div class="form-group">
                        <label>Phone Number</label>
                        <input type="text" name="phone" placeholder="+250XXXXXXXXX or 07XXXXXXXX">
                    </div>
                    
                    <div class="form-group">
                        <label>Trade/Program <span class="required">*</span></label>
                        <select name="trade" required>
                            <option value="">Select Trade</option>
                            <option value="Software Development">Software Development</option>
                            <option value="Electronics and Telecommunication">Electronics & Telecommunication</option>
                            <option value="Mechanics">Mechanics</option>
                            <option value="Automobile">Automobile</option>
                            <option value="Food and Beverages">Food and Beverages</option>
                            <option value="Tourism">Tourism</option>
                            <option value="Accounting">Accounting</option>
                            <option value="Building and Construction">Building and Construction</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Level <span class="required">*</span></label>
                        <select name="level" required>
                            <option value="">Select Level</option>
                            <option value="L3">Level 3</option>
                            <option value="L4">Level 4</option>
                            <option value="L5">Level 5</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Section <span class="required">*</span></label>
                        <select name="section" required>
                            <option value="">Select Section</option>
                            <option value="A">Section A</option>
                            <option value="B">Section B</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Guardian Name <span class="required">*</span></label>
                        <input type="text" name="guardian_name" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Guardian Phone <span class="required">*</span></label>
                        <input type="text" name="guardian_phone" required placeholder="+250XXXXXXXXX">
                    </div>
                </div>
                
                <div style="margin-top: 30px;">
                    <button type="submit" class="btn">✅ Add Student</button>
                </div>
            </form>
        </div>
    </div>
</body>
</html>
