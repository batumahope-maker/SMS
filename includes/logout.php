<?php
session_start();
$role = $_SESSION['role'] ?? '';
session_destroy();
if ($role === 'student')     header('Location: ../student/index.php');
elseif ($role === 'teacher') header('Location: ../teacher/index.php');
else                         header('Location: ../admin/index.php');
exit();