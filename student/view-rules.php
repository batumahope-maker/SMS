<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id'])) { header('Location: login.php'); exit(); }
$stmt = $pdo->prepare("SELECT * FROM school_rules WHERE is_active = 1 ORDER BY category, rule_number");
$stmt->execute();
$rules = $stmt->fetchAll(PDO::FETCH_ASSOC);
$by_cat = [];
foreach ($rules as $r) $by_cat[$r['category']][] = $r;
$sev_colors = ['Critical'=>'#e53935','Serious'=>'#ff9800','Warning'=>'#ffc107','Info'=>'#1a73e8'];
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>School Rules - ESSJT</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f5f5}
.header{background:linear-gradient(135deg,#9c27b0,#e040fb);color:white;padding:15px 30px;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:1.4em}.back-btn{background:white;color:#9c27b0;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600}
.container{max-width:900px;margin:30px auto;padding:0 20px}
.category{background:white;border-radius:12px;margin-bottom:25px;box-shadow:0 4px 15px rgba(0,0,0,0.08);overflow:hidden}
.cat-header{background:linear-gradient(135deg,#9c27b0,#e040fb);color:white;padding:15px 20px;font-size:1.1em;font-weight:700}
.rule{padding:18px 20px;border-bottom:1px solid #f0f0f0;display:flex;gap:15px;align-items:flex-start}
.rule:last-child{border-bottom:none}
.rule-num{background:#9c27b0;color:white;border-radius:8px;padding:4px 10px;font-size:0.85em;font-weight:700;white-space:nowrap}
.rule-body h4{color:#333;margin-bottom:5px}.rule-body p{color:#555;font-size:0.95em;line-height:1.6}
.sev-badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:0.75em;font-weight:700;color:white;margin-top:6px}
</style></head><body>
<div class="header">
    <div style="display:flex;align-items:center;gap:15px">
        <img src="../assets/essjt-logo.png" style="width:45px;height:45px;object-fit:contain" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <h1>📜 School Rules & Regulations</h1>
    </div>
    <a href="dashboard.php" class="back-btn">← Back to Dashboard</a>
</div>
<div class="container">
<?php foreach ($by_cat as $cat => $cat_rules): ?>
    <div class="category">
        <div class="cat-header">📌 <?php echo $cat; ?> Rules</div>
        <?php foreach ($cat_rules as $r): $color = $sev_colors[$r['severity']] ?? '#999'; ?>
        <div class="rule">
            <span class="rule-num"><?php echo htmlspecialchars($r['rule_number']); ?></span>
            <div class="rule-body">
                <h4><?php echo htmlspecialchars($r['title']); ?></h4>
                <p><?php echo htmlspecialchars($r['description']); ?></p>
                <span class="sev-badge" style="background:<?php echo $color; ?>"><?php echo $r['severity']; ?></span>
                <span style="font-size:0.8em;color:#999;margin-left:8px">Applies to: <?php echo $r['applies_to']; ?></span>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
<?php endforeach; ?>
</div></body></html>
