<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') { header('Location: login.php'); exit(); }
$admin_id = $_SESSION['user_id'];
$success='';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $act = $_POST['action'];
    if ($act === 'add') {
        $ins = $pdo->prepare("INSERT INTO school_events (title,description,event_date,event_time,location,event_type,target_audience) VALUES (?,?,?,?,?,?,?)");
        $ins->execute([$_POST['title'],$_POST['description'],$_POST['event_date'],$_POST['event_time']??null,$_POST['location'],$_POST['event_type'],$_POST['target_audience']]);
        $success = 'Event added!';
    } elseif ($act === 'delete') {
        $del = $pdo->prepare("DELETE FROM school_events WHERE id=?"); $del->execute([(int)$_POST['id']]); $success = 'Deleted!';
    } elseif ($act === 'toggle') {
        $upd = $pdo->prepare("UPDATE school_events SET is_active = NOT is_active WHERE id=?"); $upd->execute([(int)$_POST['id']]); $success = 'Updated!';
    }
}
$stmt = $pdo->query("SELECT * FROM school_events ORDER BY event_date DESC");
$events = $stmt->fetchAll(PDO::FETCH_ASSOC);
$type_icons=['Academic'=>'📚','Sports'=>'⚽','Cultural'=>'🎭','Holiday'=>'🌴','Examination'=>'✏️','Meeting'=>'🤝','Ceremony'=>'🎓','Other'=>'📌'];
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>School Events - ESSJT Admin</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f5f5}
.header{background:linear-gradient(135deg,#e91e63,#f06292);color:white;padding:15px 30px;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:1.4em}.back-btn{background:white;color:#e91e63;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600}
.container{max-width:1000px;margin:30px auto;padding:0 20px}
.form-card{background:white;padding:25px;border-radius:12px;margin-bottom:25px;box-shadow:0 4px 15px rgba(0,0,0,.08)}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:15px}.form-group{margin-bottom:15px}
label{display:block;font-weight:600;color:#555;margin-bottom:6px}
input,select,textarea{width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:.95em;font-family:inherit}
textarea{height:80px;resize:vertical}
.submit-btn{padding:12px 30px;background:#e91e63;color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer}
.event-card{background:white;border-radius:12px;padding:20px;margin-bottom:15px;box-shadow:0 4px 15px rgba(0,0,0,.08);display:flex;gap:20px}
.event-date-box{background:linear-gradient(135deg,#e91e63,#f06292);color:white;border-radius:10px;padding:12px;text-align:center;min-width:70px}
.event-date-box .day{font-size:1.8em;font-weight:700;line-height:1}.event-date-box .mon{font-size:.8em}
.event-body{flex:1}.event-body h4{color:#333;margin-bottom:6px}.event-body p{color:#555;font-size:.9em;line-height:1.5}
.event-meta{color:#999;font-size:.82em;margin-top:8px}.actions{display:flex;gap:8px;margin-top:10px}
.del-btn{background:#ffebee;color:#e53935;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:600;font-size:.85em}
.tog-btn{background:#e8f5e9;color:#2e7d32;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:600;font-size:.85em}
.inactive{opacity:.6}.success{background:#e8f5e9;color:#2e7d32;padding:12px;border-radius:8px;margin-bottom:15px}
</style></head><body>
<div class="header">
    <div style="display:flex;align-items:center;gap:15px">
        <img src="../assets/essjt-logo.png" style="width:45px;height:45px;object-fit:contain" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <h1>🎉 Manage School Events</h1>
    </div>
    <a href="control_panel.php" class="back-btn">← Back to Panel</a>
</div>
<div class="container">
<?php if ($success): ?><div class="success">✅ <?php echo $success; ?></div><?php endif; ?>
<div class="form-card">
    <h3 style="margin-bottom:20px">➕ Add New Event</h3>
    <form method="POST">
        <input type="hidden" name="action" value="add">
        <div class="form-group"><label>Event Title</label><input type="text" name="title" required placeholder="Event name..."></div>
        <div class="form-group"><label>Description</label><textarea name="description" required placeholder="Describe the event..."></textarea></div>
        <div class="form-row">
            <div class="form-group"><label>Date</label><input type="date" name="event_date" required></div>
            <div class="form-group"><label>Time</label><input type="time" name="event_time"></div>
        </div>
        <div class="form-group"><label>Location</label><input type="text" name="location" placeholder="e.g. Main Hall"></div>
        <div class="form-row">
            <div class="form-group"><label>Type</label>
                <select name="event_type"><option value="Academic">📚 Academic</option><option value="Sports">⚽ Sports</option><option value="Cultural">🎭 Cultural</option><option value="Examination">✏️ Examination</option><option value="Holiday">🌴 Holiday</option><option value="Meeting">🤝 Meeting</option><option value="Ceremony">🎓 Ceremony</option><option value="Other">📌 Other</option></select>
            </div>
            <div class="form-group"><label>Target Audience</label>
                <select name="target_audience"><option value="All">All</option><option value="Students">Students</option><option value="Teachers">Teachers</option></select>
            </div>
        </div>
        <button type="submit" class="submit-btn">🎉 Add Event</button>
    </form>
</div>
<h3 style="margin-bottom:15px;color:#333">📋 All Events (<?php echo count($events); ?>)</h3>
<?php if (empty($events)): ?>
    <div style="text-align:center;padding:40px;background:white;border-radius:12px;color:#999">No events yet.</div>
<?php else: foreach ($events as $e):
    $icon = $type_icons[$e['event_type']]??'📌';
    $dt   = new DateTime($e['event_date']);
?>
<div class="event-card <?php echo !$e['is_active']?'inactive':''; ?>">
    <div class="event-date-box">
        <div class="day"><?php echo $dt->format('d'); ?></div>
        <div class="mon"><?php echo $dt->format('M'); ?></div>
        <div class="mon"><?php echo $dt->format('Y'); ?></div>
    </div>
    <div class="event-body">
        <h4><?php echo $icon.' '.htmlspecialchars($e['title']); ?></h4>
        <p><?php echo htmlspecialchars($e['description']); ?></p>
        <div class="event-meta">
            <?php if ($e['event_time']): ?>🕐 <?php echo date('h:i A',strtotime($e['event_time'])); ?> &bull; <?php endif; ?>
            <?php if ($e['location']): ?>📍 <?php echo $e['location']; ?> &bull; <?php endif; ?>
            👥 <?php echo $e['target_audience']; ?> &bull; Status: <strong><?php echo $e['is_active']?'Active':'Inactive'; ?></strong>
        </div>
        <div class="actions">
            <form method="POST" style="display:inline"><input type="hidden" name="action" value="toggle"><input type="hidden" name="id" value="<?php echo $e['id']; ?>"><button type="submit" class="tog-btn"><?php echo $e['is_active']?'🔒 Hide':'👁️ Show'; ?></button></form>
            <form method="POST" style="display:inline"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?php echo $e['id']; ?>"><button type="submit" class="del-btn" onclick="return confirm('Delete?')">🗑️ Delete</button></form>
        </div>
    </div>
</div>
<?php endforeach; endif; ?>
</div></body></html>
