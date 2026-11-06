<?php
$stmt_t = $pdo->query("SELECT username, full_name, logged_in_at FROM login_activity WHERE role='teacher' ORDER BY logged_in_at DESC LIMIT 8");
$recent_teachers = $stmt_t->fetchAll(PDO::FETCH_ASSOC);
$stmt_s = $pdo->query("SELECT username, full_name, logged_in_at FROM login_activity WHERE role='student' ORDER BY logged_in_at DESC LIMIT 8");
$recent_students = $stmt_s->fetchAll(PDO::FETCH_ASSOC);
function time_ago($ts) {
    $d = time() - strtotime($ts);
    if ($d < 60) return 'Just now';
    if ($d < 3600) return round($d/60).'m ago';
    if ($d < 86400) return round($d/3600).'h ago';
    return date('d M H:i', strtotime($ts));
}
?>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:6px">
<div>
<h4 style="color:#444;font-size:.92em;margin-bottom:12px;font-weight:700">👨‍🏫 Recently Logged-in Teachers</h4>
<?php if (empty($recent_teachers)): ?>
<p style="color:#bbb;font-size:.85em;text-align:center;padding:15px">No teacher logins yet</p>
<?php else: foreach ($recent_teachers as $t):
    $initials = strtoupper(substr(preg_replace('/[^A-Za-z ]/','',$t['full_name']),0,2));
?>
<div style="display:flex;align-items:center;gap:9px;padding:8px 0;border-bottom:1px solid #f5f5f5">
    <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#1565c0,#42a5f5);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:.82em;flex-shrink:0"><?php echo $initials; ?></div>
    <div style="flex:1"><div style="font-weight:600;font-size:.85em;color:#333"><?php echo htmlspecialchars($t['full_name']); ?></div><div style="font-size:.75em;color:#888"><?php echo $t['username']; ?></div></div>
    <div style="font-size:.75em;color:#1565c0;white-space:nowrap"><?php echo time_ago($t['logged_in_at']); ?></div>
</div>
<?php endforeach; endif; ?>
</div>
<div>
<h4 style="color:#444;font-size:.92em;margin-bottom:12px;font-weight:700">🎓 Recently Logged-in Students</h4>
<?php if (empty($recent_students)): ?>
<p style="color:#bbb;font-size:.85em;text-align:center;padding:15px">No student logins yet</p>
<?php else: foreach ($recent_students as $s):
    $initials = strtoupper(substr(preg_replace('/[^A-Za-z ]/','',$s['full_name']),0,2));
?>
<div style="display:flex;align-items:center;gap:9px;padding:8px 0;border-bottom:1px solid #f5f5f5">
    <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#2e7d32,#66bb6a);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:.82em;flex-shrink:0"><?php echo $initials; ?></div>
    <div style="flex:1"><div style="font-weight:600;font-size:.85em;color:#333"><?php echo htmlspecialchars($s['full_name']); ?></div><div style="font-size:.75em;color:#888"><?php echo $s['username']; ?></div></div>
    <div style="font-size:.75em;color:#2e7d32;white-space:nowrap"><?php echo time_ago($s['logged_in_at']); ?></div>
</div>
<?php endforeach; endif; ?>
</div>
</div>
