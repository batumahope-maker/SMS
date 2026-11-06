<?php
session_start();
require_once '../config.php';

$success = '';
$error = '';

// Add teacher
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['add_teacher'])) {
    $teacher_id = generate_id('TEA', 'teachers', 'teacher_id');
    $full_name = clean($_POST['full_name']);
    $email = clean($_POST['email']);
    $password = md5($_POST['password']);
    $subject = clean($_POST['subject']);
    $department = clean($_POST['department']);
    $phone = clean($_POST['phone']);
    $gender = clean($_POST['gender']);
    $qualification = clean($_POST['qualification']);
    $experience = (int)$_POST['experience'];
    $salary = (float)$_POST['monthly_salary'];
    
    // Create user
    $user_sql = "INSERT INTO users (username, email, password, role, status, has_profile) 
                 VALUES ('$teacher_id', '$email', '$password', 'teacher', 'Active', TRUE)";
    
    if (query($user_sql)) {
        $user_id = last_id();
        
        // Create teacher
        $teacher_sql = "INSERT INTO teachers (
            user_id, teacher_id, full_name, email, password, subject, department,
            gender, phone, qualification, experience, monthly_salary, status
        ) VALUES (
            $user_id, '$teacher_id', '$full_name', '$email', '$password', '$subject',
            '$department', '$gender', '$phone', '$qualification', $experience, $salary, 'Active'
        )";
        
        if (query($teacher_sql)) {
            $success = "Teacher $full_name added successfully! ID: $teacher_id";
        }
    }
}

// Delete teacher
if (isset($_GET['delete'])) {
    $id = (int)$_GET['delete'];
    $teacher = fetch_single("SELECT user_id FROM teachers WHERE id = $id");
    
    if ($teacher) {
        query("DELETE FROM teachers WHERE id = $id");
        query("DELETE FROM users WHERE id = {$teacher['user_id']}");
        $success = "Teacher deleted successfully!";
    }
}

$teachers = fetch_all("SELECT * FROM teachers ORDER BY created_at DESC");
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Manage Teachers - ESSJT</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f7fa; padding: 20px; }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { background: #8B0000; color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .nav { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .nav a { margin-right: 15px; text-decoration: none; color: #8B0000; font-weight: bold; }
        .grid { display: grid; grid-template-columns: 1fr 2fr; gap: 20px; }
        .card { background: white; padding: 25px; border-radius: 10px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, select { width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 5px; }
        .btn { padding: 12px 24px; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; }
        .btn-primary { background: #8B0000; color: white; width: 100%; }
        .btn-delete { background: #ef4444; color: white; padding: 6px 12px; text-decoration: none; display: inline-block; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f5f7fa; padding: 12px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #eee; }
        .success { background: #d1fae5; color: #065f46; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>👨‍🏫 Manage Teachers</h1>
            <p>Add, view, and remove teachers</p>
        </div>
        
        <div class="nav">
            <a href="dashboard.php">📊 Dashboard</a>
            <a href="students.php">👨‍🎓 Students</a>
            <a href="teachers.php">👨‍🏫 View Teachers</a>
            <a href="manage_teachers.php">➕ Manage Teachers</a>
        </div>
        
        <?php if ($success): ?>
            <div class="success"><?php echo $success; ?></div>
        <?php endif; ?>
        
        <div class="grid">
            <div class="card">
                <h3 style="margin-bottom: 20px;">➕ Add New Teacher</h3>
                <form method="POST">
                    <div class="form-group">
                        <label>Full Name</label>
                        <input type="text" name="full_name" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" name="password" required value="teacher123">
                    </div>
                    
                    <div class="form-group">
                        <label>Subject</label>
                        <select name="subject" required>
                            <option value="">Select Subject</option>
                            <option value="Software Development">Software Development</option>
                            <option value="Electronics and Telecommunication">Electronics & Telecom</option>
                            <option value="Mechanics">Mechanics</option>
                            <option value="Automobile">Automobile</option>
                            <option value="Food and Beverages">Food & Beverages</option>
                            <option value="Tourism">Tourism</option>
                            <option value="Accounting">Accounting</option>
                            <option value="Building and Construction">Building & Construction</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Department</label>
                        <select name="department" required>
                            <option value="">Select Department</option>
                            <option value="Technology">Technology</option>
                            <option value="Engineering">Engineering</option>
                            <option value="Hospitality">Hospitality</option>
                            <option value="Business">Business</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Gender</label>
                        <select name="gender" required>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Phone</label>
                        <input type="tel" name="phone" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Qualification</label>
                        <select name="qualification" required>
                            <option value="Masters Degree">Masters Degree</option>
                            <option value="Bachelor Degree">Bachelor Degree</option>
                            <option value="Professional Diploma">Professional Diploma</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Experience (years)</label>
                        <input type="number" name="experience" required min="0">
                    </div>
                    
                    <div class="form-group">
                        <label>Monthly Salary (RWF)</label>
                        <input type="number" name="monthly_salary" required>
                    </div>
                    
                    <button type="submit" name="add_teacher" class="btn btn-primary">Add Teacher</button>
                </form>
            </div>
            
            <div class="card">
                <h3 style="margin-bottom: 20px;">📋 All Teachers (<?php echo count($teachers); ?>)</h3>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Subject</th>
                            <th>Phone</th>
                            <th>Salary</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($teachers as $t): ?>
                        <tr>
                            <td><?php echo $t['teacher_id']; ?></td>
                            <td><?php echo $t['full_name']; ?></td>
                            <td><?php echo $t['subject']; ?></td>
                            <td><?php echo $t['phone']; ?></td>
                            <td><?php echo format_money($t['monthly_salary']); ?></td>
                            <td>
                                <a href="?delete=<?php echo $t['id']; ?>" 
                                   class="btn-delete" 
                                   onclick="return confirm('Delete teacher <?php echo $t['full_name']; ?>?')">
                                   Delete
                                </a>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</body>
</html>
