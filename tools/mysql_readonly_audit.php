<?php
/**
 * READ-ONLY ESSJT MySQL schema audit for local XAMPP.
 *
 * This script:
 * - accepts connections only from localhost
 * - reads INFORMATION_SCHEMA metadata and table row counts
 * - never selects student/person records
 * - never changes, creates, or deletes database objects or records
 *
 * BEFORE RUNNING:
 * 1. Edit the four connection values below on your own computer.
 * 2. Keep this script inside your local XAMPP project.
 * 3. Open http://localhost/<project-folder>/tools/mysql_readonly_audit.php
 * 4. Save the report, then DELETE this script from the web folder.
 *
 * Do not upload a copy containing your database password.
 */

declare(strict_types=1);

$allowedHosts = ['127.0.0.1', '::1'];
$remote = $_SERVER['REMOTE_ADDR'] ?? '';
if (PHP_SAPI !== 'cli' && !in_array($remote, $allowedHosts, true)) {
    http_response_code(403);
    exit('This audit is available only from the local computer.');
}

// Edit these values locally. Do not send credentials to anyone.
$dbHost = '127.0.0.1';
$dbPort = 3306;
$dbName = 'essjt_school_system';
$dbUser = 'root';
$dbPass = '';

header('Content-Type: text/html; charset=utf-8');

function h(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

try {
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $dbHost,
        $dbPort,
        $dbName
    );
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    $dbInfo = $pdo->query(
        'SELECT DATABASE() AS db_name, VERSION() AS mysql_version, ' .
        '@@character_set_database AS charset_name, ' .
        '@@collation_database AS collation_name'
    )->fetch();

    $tablesStmt = $pdo->prepare(
        'SELECT TABLE_NAME, ENGINE, TABLE_ROWS, TABLE_COLLATION
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = "BASE TABLE"
         ORDER BY TABLE_NAME'
    );
    $tablesStmt->execute();
    $tables = $tablesStmt->fetchAll();

    $columnsStmt = $pdo->prepare(
        'SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY,
                COLUMN_DEFAULT, EXTRA
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
         ORDER BY ORDINAL_POSITION'
    );

    $indexesStmt = $pdo->prepare(
        'SELECT INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME
                ORDER BY SEQ_IN_INDEX SEPARATOR ", ") AS COLUMNS_USED
         FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
         GROUP BY INDEX_NAME, NON_UNIQUE
         ORDER BY INDEX_NAME'
    );

    $foreignStmt = $pdo->prepare(
        'SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME,
                CONSTRAINT_NAME
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
           AND REFERENCED_TABLE_NAME IS NOT NULL
         ORDER BY CONSTRAINT_NAME, ORDINAL_POSITION'
    );

    $report = [];
    foreach ($tables as $table) {
        $name = (string)$table['TABLE_NAME'];

        // Quote an identifier safely for the COUNT query.
        $quoted = '`' . str_replace('`', '``', $name) . '`';
        $count = (int)$pdo->query("SELECT COUNT(*) FROM {$quoted}")->fetchColumn();

        $columnsStmt->execute([$name]);
        $columns = $columnsStmt->fetchAll();

        $indexesStmt->execute([$name]);
        $indexes = $indexesStmt->fetchAll();

        $foreignStmt->execute([$name]);
        $foreignKeys = $foreignStmt->fetchAll();

        $report[] = [
            'name' => $name,
            'engine' => (string)($table['ENGINE'] ?? ''),
            'rows' => $count,
            'columns' => $columns,
            'indexes' => $indexes,
            'foreign_keys' => $foreignKeys,
        ];
    }

    $totalRows = array_sum(array_column($report, 'rows'));
    ?>
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>ESSJT — Read-only MySQL audit</title>
      <style>
        body{font:15px/1.5 system-ui,sans-serif;max-width:1100px;margin:32px auto;padding:0 18px;color:#182230}
        h1,h2{line-height:1.2} .notice{padding:12px 16px;background:#eef6ff;border-left:4px solid #2878c7}
        table{width:100%;border-collapse:collapse;margin:12px 0 24px}th,td{text-align:left;padding:7px 9px;border-bottom:1px solid #ddd;vertical-align:top}
        th{background:#f3f5f7}code{overflow-wrap:anywhere}.small{color:#536171;font-size:13px}
        details{margin:10px 0 18px;border:1px solid #ddd;border-radius:8px;padding:10px}
        @media print{details{break-inside:avoid}}
      </style>
    </head>
    <body>
      <h1>ESSJT — Read-only MySQL audit</h1>
      <p class="notice"><strong>Read-only report.</strong> No student names, email addresses, phone numbers, marks, passwords, or record contents are displayed. No database changes were made.</p>
      <h2>Database connection</h2>
      <table>
        <tr><th>Database</th><td><?= h((string)$dbInfo['db_name']) ?></td></tr>
        <tr><th>MySQL / MariaDB version</th><td><?= h((string)$dbInfo['mysql_version']) ?></td></tr>
        <tr><th>Character set</th><td><?= h((string)$dbInfo['charset_name']) ?></td></tr>
        <tr><th>Collation</th><td><?= h((string)$dbInfo['collation_name']) ?></td></tr>
        <tr><th>Tables</th><td><?= count($report) ?></td></tr>
        <tr><th>Total rows (exact counts)</th><td><?= $totalRows ?></td></tr>
      </table>

      <h2>Table inventory</h2>
      <table>
        <thead><tr><th>Table</th><th>Engine</th><th>Rows</th><th>Columns</th><th>Indexes</th><th>Foreign keys</th></tr></thead>
        <tbody>
        <?php foreach ($report as $item): ?>
          <tr>
            <td><code><?= h($item['name']) ?></code></td>
            <td><?= h($item['engine']) ?></td>
            <td><?= $item['rows'] ?></td>
            <td><?= count($item['columns']) ?></td>
            <td><?= count($item['indexes']) ?></td>
            <td><?= count($item['foreign_keys']) ?></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>

      <h2>Schema details</h2>
      <?php foreach ($report as $item): ?>
        <details>
          <summary><strong><?= h($item['name']) ?></strong> — <?= $item['rows'] ?> rows</summary>
          <h3>Columns</h3>
          <table><thead><tr><th>Name</th><th>Type</th><th>Nullable</th><th>Key</th><th>Default</th><th>Extra</th></tr></thead><tbody>
          <?php foreach ($item['columns'] as $col): ?>
            <tr>
              <td><?= h((string)$col['COLUMN_NAME']) ?></td>
              <td><?= h((string)$col['COLUMN_TYPE']) ?></td>
              <td><?= h((string)$col['IS_NULLABLE']) ?></td>
              <td><?= h((string)$col['COLUMN_KEY']) ?></td>
              <td><?= h((string)($col['COLUMN_DEFAULT'] ?? 'NULL')) ?></td>
              <td><?= h((string)$col['EXTRA']) ?></td>
            </tr>
          <?php endforeach; ?>
          </tbody></table>
          <h3>Indexes</h3>
          <table><thead><tr><th>Name</th><th>Unique</th><th>Columns</th></tr></thead><tbody>
          <?php foreach ($item['indexes'] as $idx): ?>
            <tr><td><?= h((string)$idx['INDEX_NAME']) ?></td><td><?= $idx['NON_UNIQUE'] ? 'No' : 'Yes' ?></td><td><?= h((string)$idx['COLUMNS_USED']) ?></td></tr>
          <?php endforeach; ?>
          </tbody></table>
          <h3>Foreign keys</h3>
          <?php if (!$item['foreign_keys']): ?>
            <p class="small">No declared foreign keys.</p>
          <?php else: ?>
            <table><thead><tr><th>Column</th><th>References</th><th>Constraint</th></tr></thead><tbody>
            <?php foreach ($item['foreign_keys'] as $fk): ?>
              <tr><td><?= h((string)$fk['COLUMN_NAME']) ?></td><td><?= h((string)$fk['REFERENCED_TABLE_NAME']) ?>.<?= h((string)$fk['REFERENCED_COLUMN_NAME']) ?></td><td><?= h((string)$fk['CONSTRAINT_NAME']) ?></td></tr>
            <?php endforeach; ?>
            </tbody></table>
          <?php endif; ?>
        </details>
      <?php endforeach; ?>
      <p class="small">Audit complete. Delete <code>tools/mysql_readonly_audit.php</code> from the XAMPP web folder after saving this report.</p>
    </body>
    </html>
    <?php
} catch (Throwable $e) {
    http_response_code(500);
    echo '<h1>Database audit could not run</h1>';
    echo '<p>Check that MySQL is running and that the local connection values are correct.</p>';
    echo '<p>No database changes were made.</p>';
    // Avoid exposing connection details or credentials in the browser.
    error_log('ESSJT read-only audit error: ' . $e->getMessage());
}
