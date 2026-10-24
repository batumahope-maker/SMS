<?php
$host = "localhost";
$user = "root";
$password = "";
$database = "student_result_system";

$conn = mysqli_connect($host, $user, $password, $database);

if (!$conn) {
    die("Database connection failed");
}
?>
