<?php
session_start();
require_once '../config.php';
if (!isset($_SESSION['user_id'])) { header('Location: index.php'); exit(); }
$result = db_query("SELECT * FROM school_events WHERE is_active=true ORDER BY event_date ASC");
$events = db_fetch_all($result);
$type_icons = ['Academic'=>'📚','Sports'=>'⚽','Cultural'=>'🎭','Holiday'=>'🌴','Examination'=>'✏️','Meeting'=>'🤝','Other'=>'📌'];
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>School Events - ESSJT</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f5f5}
.header{background:linear-gradient(135deg,#e91e63,#f06292);color:white;padding:15px 30px;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:1.4em}.back-btn{background:white;color:#e91e63;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600}
.container{max-width:900px;margin:30px auto;padding:0 20px}
.event{background:white;border-radius:12px;padding:20px;margin-bottom:20px;box-shadow:0 4px 15px rgba(0,0,0,0.08);display:flex;gap:20px}
.event-date{background:linear-gradient(135deg,#e91e63,#f06292);color:white;border-radius:12px;padding:15px;text-align:center;min-width:80px}
.event-date .day{font-size:2em;font-weight:700;line-height:1}
.event-date .month{font-size:0.85em;opacity:0.9}
.event-body h3{color:#333;margin-bottom:8px}
.event-body p{color:#555;line-height:1.6;margin-bottom:10px}
.event-meta{display:flex;gap:15px;flex-wrap:wrap;font-size:0.85em;color:#777}
.past{opacity:0.6}.empty{text-align:center;padding:60px;color:#999}
</style></head><body>
<div class="header">
    <div style="display:flex;align-items:center;gap:15px">
        <img src="../assets/essjt-logo.png" style="width:45px;height:45px;object-fit:contain" onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        <h1>🎉 School Events</h1>
    </div>
    <a href="dashboard.php" class="back-btn">← Back to Dashboard</a>
</div>
<div class="container">
<?php if (empty($events)): ?>
    <div class="empty">📭 No events scheduled. Check back soon!</div>
<?php else: foreach ($events as $e):
    $past = strtotime($e['event_date']) < time();
    $icon = $type_icons[$e['event_type']] ?? '📌';
    $dt   = new DateTime($e['event_date']);
?>
    <div class="event <?php echo $past ? 'past' : ''; ?>">
        <div class="event-date">
            <div class="day"><?php echo $dt->format('d'); ?></div>
            <div class="month"><?php echo $dt->format('M Y'); ?></div>
        </div>
        <div class="event-body">
            <h3><?php echo $icon; ?> <?php echo htmlspecialchars($e['title']); ?> <?php echo $past ? '<span style="color:#999;font-size:0.8em">(Past)</span>' : '<span style="color:#4caf50;font-size:0.8em">● Upcoming</span>'; ?></h3>
            <p><?php echo htmlspecialchars($e['description']); ?></p>
            <div class="event-meta">
                <?php if ($e['event_time']): ?><span>🕐 <?php echo date('h:i A', strtotime($e['event_time'])); ?></span><?php endif; ?>
                <?php if ($e['location']): ?><span>📍 <?php echo htmlspecialchars($e['location']); ?></span><?php endif; ?>
                <span>👥 <?php echo $e['target_audience']; ?></span>
                <span>🏷️ <?php echo $e['event_type']; ?></span>
            </div>
        </div>
    </div>
<?php endforeach; endif; ?>
</div></body></html>
