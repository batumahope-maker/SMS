<?php
/**
 * ESSJT MASS STUDENT GENERATOR
 * Generates 1200 students with realistic data
 * Run this file ONCE via browser: http://localhost/essjt/generate_students.php
 */

require_once 'config.php';

// Rwandan first names
$first_names_male = ['Eric', 'Patrick', 'Emmanuel', 'Jean', 'Claude', 'David', 'Samuel', 'Daniel', 'Joseph', 'Paul', 'Pierre', 'Jacques', 'Robert', 'Thomas', 'Frank', 'Kevin', 'Brian', 'Chris', 'Alex', 'Michael'];
$first_names_female = ['Marie', 'Grace', 'Alice', 'Sarah', 'Esther', 'Ruth', 'Rachel', 'Rebecca', 'Christine', 'Claire', 'Anne', 'Rose', 'Emma', 'Lucy', 'Nancy', 'Betty', 'Joyce', 'Janet', 'Mary', 'Gloria'];

// Rwandan last names
$last_names = ['MUGISHA', 'UWASE', 'KAMAU', 'MUTONI', 'NKUNDA', 'HABIMANA', 'UMUTONI', 'BIZIMANA', 'INGABIRE', 'NSENGIYUMVA', 'MUKAMANA', 'MUGABE', 'UWERA', 'NDAYISABA', 'MUNYESHYAKA', 'UWINEZA', 'HAKIZIMANA', 'MUKASHYAKA', 'NIYONZIMA', 'NIRERE', 'UWIZEYE', 'MUTAMBA', 'MUKANDAYISENGA', 'NIYIBIZI', 'UWAMAHORO', 'NSANZIMANA', 'MUKAMWIZA', 'UWIMBABAZI', 'MUKARUTESI', 'NDAGIJIMANA'];

// All 8 trades
$trades = [
    'Software Development',
    'Electronics and Telecommunication',
    'Mechanics',
    'Automobile',
    'Food and Beverages',
    'Tourism',
    'Accounting',
    'Building and Construction'
];

// Levels and sections
$levels = ['L3', 'L4', 'L5'];
$sections = ['A', 'B'];

// Kigali districts
$districts = ['Gasabo', 'Kicukiro', 'Nyarugenge'];

echo "<h1>🎓 ESSJT Mass Student Generator</h1>";
echo "<p>Generating 1200 students...</p>";
echo "<hr>";

$success_count = 0;
$error_count = 0;

// Start transaction for better performance
mysqli_begin_transaction($conn);

try {
    for ($i = 4; $i <= 1203; $i++) {
        $student_id = 'STU' . str_pad($i, 4, '0', STR_PAD_LEFT);
        
        // Random gender
        $gender = ($i % 2 == 0) ? 'Male' : 'Female';
        $first_name = $gender == 'Male' ? $first_names_male[array_rand($first_names_male)] : $first_names_female[array_rand($first_names_female)];
        $last_name = $last_names[array_rand($last_names)];
        $full_name = $first_name . ' ' . $last_name;
        
        // Generate email
        $email_name = strtolower(str_replace(' ', '.', $first_name)) . '.' . strtolower($last_name) . $i;
        $email = $email_name . '@student.essjt.rw';
        
        // Random trade, level, section
        $trade = $trades[array_rand($trades)];
        $level = $levels[array_rand($levels)];
        $section = $sections[array_rand($sections)];
        
        // Random phone
        $phone = '+25078' . rand(1000000, 9999999);
        
        // Random address
        $district = $districts[array_rand($districts)];
        $address = 'Kigali, ' . $district;
        
        // Random guardian
        $guardian_name = $last_names[array_rand($last_names)] . ' ' . $first_names_male[array_rand($first_names_male)];
        $guardian_phone = '+25078' . rand(1000000, 9999999);
        
        // Random enrollment date (last 2 years)
        $days_ago = rand(1, 730);
        $enrollment_date = date('Y-m-d', strtotime("-$days_ago days"));
        
        // Random date of birth (18-25 years ago)
        $years_ago = rand(18, 25);
        $date_of_birth = date('Y-m-d', strtotime("-$years_ago years"));
        
        // Get fee for this trade/level
        $fee_sql = "SELECT amount FROM fees_structure WHERE trade = '$trade' AND level = '$level' LIMIT 1";
        $fee_result = mysqli_query($conn, $fee_sql);
        $total_fee = 500000; // default
        if ($fee_result && mysqli_num_rows($fee_result) > 0) {
            $total_fee = mysqli_fetch_assoc($fee_result)['amount'];
        }
        
        // Random payment status (60% paid some, 30% paid full, 10% paid nothing)
        $rand = rand(1, 100);
        if ($rand <= 30) {
            // Paid in full
            $fee_paid = $total_fee;
            $fee_balance = 0;
        } elseif ($rand <= 90) {
            // Paid partially (50-90%)
            $percentage = rand(50, 90) / 100;
            $fee_paid = round($total_fee * $percentage);
            $fee_balance = $total_fee - $fee_paid;
        } else {
            // Paid nothing
            $fee_paid = 0;
            $fee_balance = $total_fee;
        }
        
        $password = md5('student123'); // Default password
        
        // Insert into users table
        $user_sql = "INSERT INTO users (username, email, password, role, status, has_profile, created_at) 
                     VALUES ('$student_id', '$email', '$password', 'student', 'Active', TRUE, NOW())";
        
        if (mysqli_query($conn, $user_sql)) {
            $user_id = mysqli_insert_id($conn);
            
            // Insert into students table
            $student_sql = "INSERT INTO students (
                user_id, student_id, full_name, email, password, trade, level, section, 
                gender, date_of_birth, phone, address, guardian_name, guardian_phone, 
                enrollment_date, fee_paid, fee_balance, status, created_at
            ) VALUES (
                $user_id, '$student_id', '$full_name', '$email', '$password', '$trade', 
                '$level', '$section', '$gender', '$date_of_birth', '$phone', '$address', 
                '$guardian_name', '$guardian_phone', '$enrollment_date', $fee_paid, 
                $fee_balance, 'Active', NOW()
            )";
            
            if (mysqli_query($conn, $student_sql)) {
                $success_count++;
                if ($success_count % 100 == 0) {
                    echo "<p>✅ Created $success_count students...</p>";
                    flush();
                }
            } else {
                $error_count++;
                echo "<p style='color: red;'>❌ Error creating student record for $student_id</p>";
            }
        } else {
            $error_count++;
            echo "<p style='color: red;'>❌ Error creating user for $student_id</p>";
        }
    }
    
    // Commit transaction
    mysqli_commit($conn);
    
    echo "<hr>";
    echo "<h2 style='color: green;'>🎉 SUCCESS!</h2>";
    echo "<p><strong>Total Students Created:</strong> $success_count</p>";
    echo "<p><strong>Errors:</strong> $error_count</p>";
    echo "<hr>";
    echo "<p>✅ All done! Go to your admin panel to see all students!</p>";
    echo "<p><a href='admin/students.php' style='background: #8B0000; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>View Students →</a></p>";
    
} catch (Exception $e) {
    mysqli_rollback($conn);
    echo "<p style='color: red;'>❌ Transaction failed: " . $e->getMessage() . "</p>";
}

echo "<hr>";
echo "<p><strong>⚠️ IMPORTANT:</strong> Delete this file after use for security!</p>";
echo "<p>Run this command: <code>del generate_students.php</code></p>";
?>
