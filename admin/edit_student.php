<?php
session_start();
require_once '../config.php';

$id = $_GET['id'] ?? 0;
$student = fetch_single("SELECT * FROM students WHERE id = $id");

if (!$student) {
    header("Location: students.php");
    exit();
}

$success = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $full_name = clean($_POST['full_name']);
    $email = clean($_POST['email']);
    $phone = clean($_POST['phone']);
    $address = clean($_POST['address']);
    $guardian_name = clean($_POST['guardian_name']);
    $guardian_phone = clean($_POST['guardian_phone']);
    $status = clean($_POST['status']);
    
    $sql = "UPDATE students SET 
            full_name = '$full_name',
            email = '$email',
            phone = '$phone',
            address = '$address',
            guardian_name = '$guardian_name',
            guardian_phone = '$guardian_phone',
            status = '$status'
            WHERE id = $id";
    
    if (query($sql)) {
        $success = "Student updated successfully!";
        $student = fetch_single("SELECT * FROM students WHERE id = $id");
    } else {
        $error = "Error updating student!";
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Edit Student - <?php echo $student['full_name']; ?></title>
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
        input, select, textarea { width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 5px; }
        .btn { padding: 12px 24px; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; }
        .btn-primary { background: #8B0000; color: white; }
        .btn-secondary { background: #6c757d; color: white; margin-left: 10px; }
        .success { background: #d1fae5; color: #065f46; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .error { background: #fee; color: #c00; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✏️ Edit Student</h1>
            <p><?php echo $student['student_id']; ?> - <?php echo $student['full_name']; ?></p>
        </div>
        
        <div class="nav">
            <a href="students.php">← Back to Students</a>
            <a href="view_student.php?id=<?php echo $id; ?>">👁️ View Profile</a>
        </div>
        
        <?php if ($success): ?>
            <div class="success"><?php echo $success; ?></div>
        <?php endif; ?>
        
        <?php if ($error): ?>
            <div class="error"><?php echo $error; ?></div>
        <?php endif; ?>
        
        <div class="form-container">
            <form method="POST">
                <div class="form-grid">
                    <div class="form-group">
                        <label>Full Name</label>
                        <input type="text" name="full_name" value="<?php echo $student['full_name']; ?>" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email" value="<?php echo $student['email']; ?>" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Phone</label>
                        <input type="tel" name="phone" value="<?php echo $student['phone']; ?>">
                    </div>
                    
                    <div class="form-group">
                        <label>Status</label>
                        <select name="status">
                            <option value="Active" <?php echo $student['status'] == 'Active' ? 'selected' : ''; ?>>Active</option>
                            <option value="Pending" <?php echo $student['status'] == 'Pending' ? 'selected' : ''; ?>>Pending</option>
                            <option value="Suspended" <?php echo $student['status'] == 'Suspended' ? 'selected' : ''; ?>>Suspended</option>
                            <option value="Graduated" <?php echo $student['status'] == 'Graduated' ? 'selected' : ''; ?>>Graduated</option>
                        </select>
                    </div>
                    
                    <div class="form-group full">
                        <label>Address</label>
                        <textarea name="address" rows="2"><?php echo $student['address']; ?></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>Guardian Name</label>
                        <input type="text" name="guardian_name" value="<?php echo $student['guardian_name']; ?>">
                    </div>
                    
                    <div class="form-group">
                        <label>Guardian Phone</label>
                        <input type="tel" name="guardian_phone" value="<?php echo $student['guardian_phone']; ?>">
                    </div>
                </div>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee;">
                    <button type="submit" class="btn btn-primary">💾 Save Changes</button>
                    <a href="students.php" class="btn btn-secondary" style="text-decoration: none; display: inline-block;">Cancel</a>
                </div>
            </form>
        </div>
    </div>
</body>
</html>
