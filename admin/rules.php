<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') { header('Location: login.php'); exit(); }
$success='';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $act = $_POST['action'];
    if ($act === 'add') {
        $ins = $pdo->prepare("INSERT INTO school_rules (category,rule_number,title,description,severity,applies_to) VALUES (?,?,?,?,?,?)");
        $ins->execute([$_POST['category'],$_POST['rule_number'],$_POST['title'],$_POST['description'],$_POST['severity'],$_POST['applies_to']]);
        $success = 'Rule added!';
    } elseif ($act === 'delete') {
        $del = $pdo->prepare("DELETE FROM school_rules WHERE id=?"); $del->execute([(int)$_POST['id']]); $success = 'Deleted!';
    } elseif ($act === 'toggle') {
        $upd = $pdo->prepare("UPDATE school_rules SET is_active = NOT is_active WHERE id=?"); $upd->execute([(int)$_POST['id']]); $success = 'Updated!';
    }
}
$stmt = $pdo->query("SELECT * FROM school_rules ORDER BY category, rule_number");
$rules = $stmt->fetchAll(PDO::FETCH_ASSOC);
$sev_colors=['Critical'=>'#e53935','Serious'=>'#ff9800','Warning'=>'#ffc107','Info'=>'#1a73e8'];
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>School Rules - ESSJT Admin</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f5f5}
.header{background:linear-gradient(135deg,#9c27b0,#e040fb);color:white;padding:15px 30px;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:1.4em}.back-btn{background:white;color:#9c27b0;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600}
.container{max-width:1000px;margin:30px auto;padding:0 20px}
.form-card{background:white;padding:25px;border-radius:12px;margin-bottom:25px;box-shadow:0 4px 15px rgba(0,0,0,.08)}
.form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:15px}
label{display:block;font-weight:600;color:#555;margin-bottom:6px;font-size:.9em}
input,select,textarea{width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:.9em;font-family:inherit}
textarea{height:80px;resize:vertical}
.submit-btn{padding:12px 25px;background:#9c27b0;color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;margin-top:15px}
.rule-card{background:white;border-radius:12px;padding:20px;margin-bottom:12px;box-shadow:0 4px 15px rgba(0,0,0,.08);display:flex;gap:15px;align-items:flex-start}
.rule-num{background:#9c27b0;color:white;border-radius:8px;padding:5px 12px;font-size:.85em;font-weight:700;white-space:nowrap}
.rule-body{flex:1}.rule-body h4{color:#333;margin-bottom:5px}.rule-body p{color:#555;font-size:.9em;line-height:1.5}
.rule-meta{margin-top:8px;font-size:.82em;color:#999}
.sev-badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:.78em;font-weight:700;color:white}
.actions{display:flex;gap:6px;margin-top:10px}
.del-btn{background:#ffebee;color:#e53935;border:none;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:.82em;font-weight:600}
.tog-btn{background:#e8f5e9;color:#2e7d32;border:none;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:.82em;font-weight:600}
.inactive{opacity:.5}.success{background:#e8f5e9;color:#2e7d32;padding:12px;border-radius:8px;margin-bottom:15px}
</style></head><body>
<div class="header">
    <div style="display:flex;align-items:center;gap:15px">
        <img src="../assets/essjt-logo.png" style="width:45px;height:45px;object-fit:contain" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <h1>📜 Manage School Rules</h1>
    </div>
    <a href="control_panel.php" class="back-btn">← Back to Panel</a>
</div>
<div class="container">
<?php if ($success): ?><div class="success">✅ <?php echo $success; ?></div><?php endif; ?>
<div class="form-card">
    <h3 style="margin-bottom:20px">➕ Add New Rule</h3>
    <form method="POST">
        <input type="hidden" name="action" value="add">
        <div class="form-grid">
            <div><label>Category</label>
                <select name="category" required>
                    <?php foreach (['General','Academic','Discipline','Attendance','Dress Code','Safety','Other'] as $c): ?><option value="<?php echo $c; ?>"><?php echo $c; ?></option><?php endforeach; ?>
                </select>
            </div>
            <div><label>Rule Number</label><input type="text" name="rule_number" placeholder="e.g. 1.1"></div>
            <div><label>Severity</label>
                <select name="severity" required>
                    <option value="Info">ℹ️ Info</option><option value="Warning">⚠️ Warning</option><option value="Serious">🔴 Serious</option><option value="Critical">🚨 Critical</option>
                </select>
            </div>
            <div><label>Applies To</label>
                <select name="applies_to" required>
                    <option value="All">All</option><option value="Students">Students</option><option value="Teachers">Teachers</option><option value="Staff">Staff</option>
                </select>
            </div>
        </div>
        <div style="margin-top:15px"><label>Title</label><input type="text" name="title" required placeholder="Short rule title..."></div>
        <div style="margin-top:12px"><label>Description</label><textarea name="description" required placeholder="Full description..."></textarea></div>
        <button type="submit" class="submit-btn">📜 Add Rule</button>
    </form>
</div>
<h3 style="margin-bottom:15px;color:#333">📋 All Rules (<?php echo count($rules); ?>)</h3>
<?php foreach ($rules as $r): $color=$sev_colors[$r['severity']]??'#999'; ?>
<div class="rule-card <?php echo !$r['is_active']?'inactive':''; ?>">
    <span class="rule-num"><?php echo htmlspecialchars($r['rule_number']??'#'); ?></span>
    <div class="rule-body">
        <h4><?php echo htmlspecialchars($r['title']); ?></h4>
        <p><?php echo htmlspecialchars($r['description']); ?></p>
        <div class="rule-meta">
            <span class="sev-badge" style="background:<?php echo $color; ?>"><?php echo $r['severity']; ?></span>
            &bull; <?php echo $r['category']; ?> &bull; <?php echo $r['applies_to']; ?> &bull; <strong><?php echo $r['is_active']?'Active':'Inactive'; ?></strong>
        </div>
        <div class="actions">
            <form method="POST" style="display:inline"><input type="hidden" name="action" value="toggle"><input type="hidden" name="id" value="<?php echo $r['id']; ?>"><button type="submit" class="tog-btn"><?php echo $r['is_active']?'🔒 Deactivate':'✅ Activate'; ?></button></form>
            <form method="POST" style="display:inline"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?php echo $r['id']; ?>"><button type="submit" class="del-btn" onclick="return confirm('Delete?')">🗑️</button></form>
        </div>
    </div>
</div>
<?php endforeach; ?>
</div></body></html>
