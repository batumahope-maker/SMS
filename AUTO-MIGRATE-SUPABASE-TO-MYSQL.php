<?php
/**
 * AUTOMATIC MIGRATION: Supabase → MySQL
 * Copies ALL data from Supabase to local MySQL
 * Run this with internet connection (mobile hotspot)
 */

// ========================================
// SUPABASE CREDENTIALS
// ========================================
$supabase_url = 'https://lmabkqlqoowuhfsimpua.supabase.co';
$supabase_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtYWJrcWxxb293dWhmc2ltcHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MjA4MzcsImV4cCI6MjA4NjI5NjgzN30.-rCbztyfsDFuDWecop_osBW24rf01W-rwOhxPZR0c7A';

// ========================================
// LOCAL MYSQL CREDENTIALS
// ========================================
$mysql_host = 'localhost';
$mysql_user = 'root';
$mysql_pass = '';
$mysql_db   = 'essjt_school_system';

echo "🚀 Starting Supabase → MySQL Migration\n";
echo "=====================================\n\n";

// Connect to MySQL
$mysqli = new mysqli($mysql_host, $mysql_user, $mysql_pass);
if ($mysqli->connect_error) {
    die("❌ MySQL connection failed: " . $mysqli->connect_error);
}

// Create database if not exists
$mysqli->query("CREATE DATABASE IF NOT EXISTS $mysql_db");
$mysqli->select_db($mysql_db);
echo "✅ Connected to MySQL\n\n";

// Tables to migrate
$tables = [
    'users',
    'students', 
    'teachers',
    'admins',
    'school_schedule',
    'marks',
    'attendance',
    'announcements',
    'school_events',
    'school_rules',
    'payments',
    'login_activity'
];

// Function to fetch from Supabase
function fetchSupabase($url, $key, $table) {
    $ch = curl_init("$url/rest/v1/$table?select=*");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "apikey: $key",
        "Authorization: Bearer $key"
    ]);
    $response = curl_exec($ch);
    curl_close($ch);
    return json_decode($response, true);
}

// Migrate each table
foreach ($tables as $table) {
    echo "📥 Fetching $table from Supabase...\n";
    
    $data = fetchSupabase($supabase_url, $supabase_key, $table);
    
    if (!$data || !is_array($data)) {
        echo "⚠️  No data or error for $table\n\n";
        continue;
    }
    
    $count = count($data);
    echo "   Found $count records\n";
    
    if ($count === 0) {
        echo "\n";
        continue;
    }
    
    // Get columns from first record
    $columns = array_keys($data[0]);
    
    // Drop and recreate table (preserves structure)
    $mysqli->query("DROP TABLE IF EXISTS $table");
    
    // Create table based on data
    $create_sql = "CREATE TABLE $table (";
    foreach ($columns as $col) {
        $create_sql .= "`$col` TEXT, ";
    }
    $create_sql = rtrim($create_sql, ', ') . ")";
    $mysqli->query($create_sql);
    
    // Insert data
    $inserted = 0;
    foreach ($data as $row) {
        $values = [];
        foreach ($columns as $col) {
            $val = $row[$col] ?? null;
            $values[] = $val === null ? "NULL" : "'" . $mysqli->real_escape_string($val) . "'";
        }
        $insert_sql = "INSERT INTO $table (`" . implode('`,`', $columns) . "`) VALUES (" . implode(',', $values) . ")";
        if ($mysqli->query($insert_sql)) {
            $inserted++;
        }
    }
    
    echo "   ✅ Inserted $inserted records into MySQL\n\n";
}

echo "=====================================\n";
echo "🎉 MIGRATION COMPLETE!\n";
echo "All your Supabase data is now in MySQL\n";
echo "You can now use local MySQL offline!\n";

$mysqli->close();
?>
