<?php
/**
 * AUTOMATIC MIGRATION: Supabase → MySQL (FIXED)
 * Copies ALL data from Supabase to local MySQL
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

echo "<pre>";
echo "🚀 Starting Supabase → MySQL Migration\n";
echo "=====================================\n\n";

// Connect to MySQL
$mysqli = new mysqli($mysql_host, $mysql_user, $mysql_pass);
if ($mysqli->connect_error) {
    die("❌ MySQL connection failed: " . $mysqli->connect_error);
}

// Create database if not exists
$mysqli->query("DROP DATABASE IF EXISTS $mysql_db");
$mysqli->query("CREATE DATABASE $mysql_db");
$mysqli->select_db($mysql_db);
echo "✅ Connected to MySQL\n\n";

// Tables to migrate (in correct order for foreign keys)
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
    'login_activity',
    'teacher_salaries'
];

// Function to fetch from Supabase
function fetchSupabase($url, $key, $table) {
    $ch = curl_init("$url/rest/v1/$table?select=*&limit=10000");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "apikey: $key",
        "Authorization: Bearer $key"
    ]);
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($http_code !== 200) {
        return null;
    }
    
    return json_decode($response, true);
}

// Function to infer MySQL column type
function inferType($value) {
    if ($value === null) return 'TEXT';
    if (is_int($value)) return 'INT';
    if (is_float($value)) return 'DECIMAL(10,2)';
    if (is_bool($value)) return 'BOOLEAN';
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) return 'DATE';
    if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/', $value)) return 'DATETIME';
    if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $value)) return 'TIME';
    if (strlen($value) > 255) return 'TEXT';
    return 'VARCHAR(255)';
}

$total_migrated = 0;

// Migrate each table
foreach ($tables as $table) {
    echo "📥 Fetching $table from Supabase...\n";
    
    $data = fetchSupabase($supabase_url, $supabase_key, $table);
    
    if ($data === null) {
        echo "   ⚠️  Table not found or error\n\n";
        continue;
    }
    
    if (!is_array($data) || empty($data)) {
        echo "   ⚠️  No data in $table\n\n";
        continue;
    }
    
    $count = count($data);
    echo "   Found $count records\n";
    
    // Get columns from first record
    $first_row = $data[0];
    $columns = array_keys($first_row);
    
    // Create table structure
    $mysqli->query("DROP TABLE IF EXISTS `$table`");
    
    $create_sql = "CREATE TABLE `$table` (\n";
    $col_defs = [];
    
    foreach ($columns as $col) {
        $sample_value = $first_row[$col];
        $type = inferType($sample_value);
        
        // Special handling for common columns
        if ($col === 'id') {
            $col_defs[] = "  `$col` INT PRIMARY KEY AUTO_INCREMENT";
        } elseif (strpos($col, '_id') !== false && is_numeric($sample_value)) {
            $col_defs[] = "  `$col` INT";
        } else {
            $col_defs[] = "  `$col` $type";
        }
    }
    
    $create_sql .= implode(",\n", $col_defs);
    $create_sql .= "\n)";
    
    if (!$mysqli->query($create_sql)) {
        echo "   ❌ Failed to create table: " . $mysqli->error . "\n\n";
        continue;
    }
    
    // Insert data
    $inserted = 0;
    $errors = 0;
    
    foreach ($data as $row) {
        $cols = [];
        $vals = [];
        
        foreach ($columns as $col) {
            $val = $row[$col] ?? null;
            $cols[] = "`$col`";
            
            if ($val === null) {
                $vals[] = "NULL";
            } elseif (is_bool($val)) {
                $vals[] = $val ? '1' : '0';
            } elseif (is_numeric($val)) {
                $vals[] = $val;
            } else {
                $vals[] = "'" . $mysqli->real_escape_string($val) . "'";
            }
        }
        
        $insert_sql = "INSERT INTO `$table` (" . implode(',', $cols) . ") VALUES (" . implode(',', $vals) . ")";
        
        if ($mysqli->query($insert_sql)) {
            $inserted++;
        } else {
            $errors++;
            if ($errors <= 3) { // Show first 3 errors only
                echo "   ⚠️  Insert error: " . $mysqli->error . "\n";
            }
        }
    }
    
    echo "   ✅ Inserted $inserted records";
    if ($errors > 0) {
        echo " ($errors errors)";
    }
    echo "\n\n";
    
    $total_migrated += $inserted;
}

echo "=====================================\n";
echo "🎉 MIGRATION COMPLETE!\n";
echo "Total records migrated: $total_migrated\n";
echo "\nYour Supabase data is now in MySQL!\n";
echo "You can now use local MySQL offline.\n";
echo "</pre>";

$mysqli->close();
?>
