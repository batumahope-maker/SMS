<?php
session_start();
require_once '../config.php';

$success = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    // Generate student ID
    $student_id = generate_id('STU', 'students', 'student_id');
    
    // Get form data
    $full_name = clean($_POST['full_name']);
    $email = clean($_POST['email']);
    $password = md5('student123'); // Default password
    $trade = clean($_POST['trade']);
    $level = clean($_POST['level']);
    $section = clean($_POST['section']);
    $gender = clean($_POST['gender']);
    $dob = clean($_POST['date_of_birth']);
    $phone = clean($_POST['phone']);
    $address = clean($_POST['address']);
    $guardian_name = clean($_POST['guardian_name']);
    $guardian_phone = clean($_POST['guardian_phone']);
    
    // Get fee amount
    $fee_result = fetch_single("SELECT amount FROM fees_structure WHERE trade = '$trade' AND level = '$level'");
    $fee_balance = $fee_result ? $fee_result['amount'] : 500000;
    
    // Insert into users table
    $user_sql = "INSERT INTO users (username, email, password, role, status, has_profile) 
                 VALUES ('$student_id', '$email', '$password', 'student', 'Active', TRUE)";
    
    if (query($user_sql)) {
        $user_id = last_id();
        
        // Insert into students table
        $student_sql = "INSERT INTO students (
            user_id, student_id, full_name, email, password, trade, level, section,
            gender, date_of_birth, phone, address, guardian_name, guardian_phone,
            enrollment_date, fee_paid, fee_balance, status
        ) VALUES (
            $user_id, '$student_id', '$full_name', '$email', '$password', '$trade',
            '$level', '$section', '$gender', '$dob', '$phone', '$address',
            '$guardian_name', '$guardian_phone', CURDATE(), 0, $fee_balance, 'Active'
        )";
        
        if (query($student_sql)) {
            $success = "Student $full_name added successfully! Student ID: $student_id";
        } else {
            $error = "Error adding student details!";
        }
    } else {
        $error = "Error creating user account!";
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Add Student - ESSJT</title>
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
        label { display: block; margin-bottom: 5px; font-weight: bold; color: #333; }
        input, select, textarea { width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 5px; font-size: 1rem; }
        textarea { resize: vertical; min-height: 80px; }
        .btn { padding: 12px 24px; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 1rem; }
        .btn-primary { background: #8B0000; color: white; }
        .btn-primary:hover { background: #a52a2a; }
        .btn-secondary { background: #6c757d; color: white; margin-left: 10px; }
        .success { background: #d1fae5; color: #065f46; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .error { background: #fee; color: #c00; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .required { color: red; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>➕ Add New Student</h1>
            <p>Register a new student in the system</p>
        </div>
        
        <div class="nav">
            <a href="dashboard.php">📊 Dashboard</a>
            <a href="students.php">👨‍🎓 Students</a>
            <a href="teachers.php">👨‍🏫 Teachers</a>
        </div>
        
        <?php if ($success): ?>
            <div class="success"><?php echo $success; ?> <a href="students.php">View All Students</a></div>
        <?php endif; ?>
        
        <?php if ($error): ?>
            <div class="error"><?php echo $error; ?></div>
        <?php endif; ?>
        
        <div class="form-container">
            <form method="POST">
                <div class="form-grid">
                    <div class="form-group">
                        <label>Full Name <span class="required">*</span></label>
                        <input type="text" name="full_name" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Email <span class="required">*</span></label>
                        <input type="email" name="email" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Trade <span class="required">*</span></label>
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
                        <label>Gender <span class="required">*</span></label>
                        <select name="gender" required>
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Date of Birth <span class="required">*</span></label>
                        <input type="date" name="date_of_birth" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Phone Number</label>
                        <input type="tel" name="phone" placeholder="+250...">
                    </div>
                    
                    <div class="form-group full">
                        <label>Address</label>
                        <textarea name="address" placeholder="Kigali, Rwanda"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>Guardian Name</label>
                        <input type="text" name="guardian_name">
                    </div>
                    
                    <div class="form-group">
                        <label>Guardian Phone</label>
                        <input type="tel" name="guardian_phone" placeholder="+250...">
                    </div>
                </div>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee;">
                    <button type="submit" class="btn btn-primary">✅ Add Student</button>
                    <a href="students.php" class="btn btn-secondary" style="text-decoration: none; display: inline-block;">Cancel</a>
                </div>
                
                <div style="margin-top: 20px; padding: 15px; background: #f0f9ff; border-radius: 5px;">
                    <strong>Note:</strong> Student ID will be auto-generated. Default password is <code>student123</code>
                </div>
            </form>
        </div>
    </div>
</body>
</html>
