<?php
session_start();
require_once '../config.php';

$type = $_GET['type'] ?? 'students';

// Set headers for Excel download
header('Content-Type: application/vnd.ms-excel');
header('Content-Disposition: attachment; filename="ESSJT_' . $type . '_' . date('Y-m-d') . '.xls"');

echo '<!DOCTYPE html>';
echo '<html>';
echo '<head><meta charset="UTF-8"></head>';
echo '<body>';

if ($type == 'students') {
    echo '<h2>ESSJT - All Students Report</h2>';
    echo '<p>Generated: ' . date('Y-m-d H:i:s') . '</p>';
    echo '<table border="1">';
    echo '<thead>';
    echo '<tr>';
    echo '<th>Student ID</th>';
    echo '<th>Full Name</th>';
    echo '<th>Trade</th>';
    echo '<th>Level</th>';
    echo '<th>Section</th>';
    echo '<th>Gender</th>';
    echo '<th>Phone</th>';
    echo '<th>Email</th>';
    echo '<th>Guardian Name</th>';
    echo '<th>Guardian Phone</th>';
    echo '<th>Enrollment Date</th>';
    echo '<th>Fee Paid</th>';
    echo '<th>Fee Balance</th>';
    echo '<th>Status</th>';
    echo '</tr>';
    echo '</thead>';
    echo '<tbody>';
    
    $students = fetch_all("SELECT * FROM students ORDER BY student_id");
    foreach ($students as $s) {
        echo '<tr>';
        echo '<td>' . $s['student_id'] . '</td>';
        echo '<td>' . $s['full_name'] . '</td>';
        echo '<td>' . $s['trade'] . '</td>';
        echo '<td>' . $s['level'] . '</td>';
        echo '<td>' . $s['section'] . '</td>';
        echo '<td>' . $s['gender'] . '</td>';
        echo '<td>' . $s['phone'] . '</td>';
        echo '<td>' . $s['email'] . '</td>';
        echo '<td>' . $s['guardian_name'] . '</td>';
        echo '<td>' . $s['guardian_phone'] . '</td>';
        echo '<td>' . $s['enrollment_date'] . '</td>';
        echo '<td>' . $s['fee_paid'] . '</td>';
        echo '<td>' . $s['fee_balance'] . '</td>';
        echo '<td>' . $s['status'] . '</td>';
        echo '</tr>';
    }
    
    echo '</tbody>';
    echo '</table>';
    
} elseif ($type == 'teachers') {
    echo '<h2>ESSJT - All Teachers Report</h2>';
    echo '<p>Generated: ' . date('Y-m-d H:i:s') . '</p>';
    echo '<table border="1">';
    echo '<thead>';
    echo '<tr>';
    echo '<th>Teacher ID</th>';
    echo '<th>Full Name</th>';
    echo '<th>Subject</th>';
    echo '<th>Department</th>';
    echo '<th>Gender</th>';
    echo '<th>Phone</th>';
    echo '<th>Email</th>';
    echo '<th>Qualification</th>';
    echo '<th>Experience</th>';
    echo '<th>Monthly Salary</th>';
    echo '<th>Status</th>';
    echo '</tr>';
    echo '</thead>';
    echo '<tbody>';
    
    $teachers = fetch_all("SELECT * FROM teachers ORDER BY teacher_id");
    foreach ($teachers as $t) {
        echo '<tr>';
        echo '<td>' . $t['teacher_id'] . '</td>';
        echo '<td>' . $t['full_name'] . '</td>';
        echo '<td>' . $t['subject'] . '</td>';
        echo '<td>' . $t['department'] . '</td>';
        echo '<td>' . $t['gender'] . '</td>';
        echo '<td>' . $t['phone'] . '</td>';
        echo '<td>' . $t['email'] . '</td>';
        echo '<td>' . $t['qualification'] . '</td>';
        echo '<td>' . $t['experience'] . '</td>';
        echo '<td>' . $t['monthly_salary'] . '</td>';
        echo '<td>' . $t['status'] . '</td>';
        echo '</tr>';
    }
    
    echo '</tbody>';
    echo '</table>';
    
} elseif ($type == 'fees') {
    echo '<h2>ESSJT - Fee Collection Report</h2>';
    echo '<p>Generated: ' . date('Y-m-d H:i:s') . '</p>';
    echo '<table border="1">';
    echo '<thead>';
    echo '<tr>';
    echo '<th>Student ID</th>';
    echo '<th>Full Name</th>';
    echo '<th>Trade</th>';
    echo '<th>Level</th>';
    echo '<th>Fee Paid</th>';
    echo '<th>Fee Balance</th>';
    echo '<th>Payment Status</th>';
    echo '</tr>';
    echo '</thead>';
    echo '<tbody>';
    
    $students = fetch_all("SELECT * FROM students ORDER BY fee_balance DESC");
    foreach ($students as $s) {
        echo '<tr>';
        echo '<td>' . $s['student_id'] . '</td>';
        echo '<td>' . $s['full_name'] . '</td>';
        echo '<td>' . $s['trade'] . '</td>';
        echo '<td>' . $s['level'] . '</td>';
        echo '<td>' . $s['fee_paid'] . '</td>';
        echo '<td>' . $s['fee_balance'] . '</td>';
        echo '<td>' . ($s['fee_balance'] == 0 ? 'Paid in Full' : 'Pending') . '</td>';
        echo '</tr>';
    }
    
    echo '</tbody>';
    echo '</table>';
    
} elseif ($type == 'marks') {
    echo '<h2>ESSJT - Student Marks Report</h2>';
    echo '<p>Generated: ' . date('Y-m-d H:i:s') . '</p>';
    echo '<table border="1">';
    echo '<thead>';
    echo '<tr>';
    echo '<th>Student ID</th>';
    echo '<th>Student Name</th>';
    echo '<th>Subject</th>';
    echo '<th>Term</th>';
    echo '<th>Marks</th>';
    echo '<th>Grade</th>';
    echo '<th>Date</th>';
    echo '</tr>';
    echo '</thead>';
    echo '<tbody>';
    
    $marks = fetch_all("
        SELECT m.*, s.student_id, s.full_name 
        FROM marks m 
        JOIN students s ON m.student_id = s.id 
        ORDER BY s.student_id, m.subject
    ");
    
    foreach ($marks as $m) {
        echo '<tr>';
        echo '<td>' . $m['student_id'] . '</td>';
        echo '<td>' . $m['full_name'] . '</td>';
        echo '<td>' . $m['subject'] . '</td>';
        echo '<td>' . $m['term'] . '</td>';
        echo '<td>' . $m['marks'] . '</td>';
        echo '<td>' . $m['grade'] . '</td>';
        echo '<td>' . $m['created_at'] . '</td>';
        echo '</tr>';
    }
    
    echo '</tbody>';
    echo '</table>';
}

echo '</body>';
echo '</html>';
?>
