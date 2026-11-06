<?php
// Redirect to login after 3 seconds
header("Refresh: 3; url=login.php");
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Portal - ESSJT</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        .splash-container {
            text-align: center;
            animation: fadeIn 0.8s ease-in;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
        }

        .logo-wrapper {
            margin-bottom: 30px;
            animation: bounce 1.5s ease-in-out infinite;
        }

        @keyframes bounce {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(5deg); }
        }

        .logo {
            width: 160px;
            height: 160px;
            object-fit: contain;
            filter: drop-shadow(0 10px 30px rgba(0,0,0,0.3));
            border-radius: 50%;
            background: white;
            padding: 25px;
            animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }

        h1 {
            color: white;
            font-size: 2.8em;
            margin-bottom: 15px;
            text-shadow: 3px 3px 10px rgba(0,0,0,0.3);
            animation: slideDown 0.8s ease-out;
        }

        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-30px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .portal-badge {
            background: rgba(255,255,255,0.95);
            color: #11998e;
            padding: 12px 30px;
            border-radius: 30px;
            display: inline-block;
            font-weight: 700;
            font-size: 1.1em;
            margin-bottom: 25px;
            box-shadow: 0 8px 20px rgba(0,0,0,0.2);
            animation: slideUp 0.8s ease-out 0.3s both;
        }

        @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .school-name {
            color: rgba(255,255,255,0.95);
            font-size: 1.1em;
            margin-bottom: 35px;
            font-weight: 300;
            animation: slideUp 0.8s ease-out 0.5s both;
        }

        .loading {
            color: white;
            font-size: 1em;
            margin-top: 30px;
            animation: blink 1.5s ease-in-out infinite;
        }

        @keyframes blink {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
        }

        .spinner {
            width: 50px;
            height: 50px;
            border: 5px solid rgba(255,255,255,0.3);
            border-top: 5px solid white;
            border-radius: 50%;
            margin: 20px auto;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .progress-bar {
            width: 200px;
            height: 4px;
            background: rgba(255,255,255,0.3);
            border-radius: 10px;
            margin: 20px auto;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: white;
            width: 0%;
            animation: progress 3s ease-out forwards;
        }

        @keyframes progress {
            to { width: 100%; }
        }
    </style>
</head>
<body>
    <div class="splash-container">
        <div class="logo-wrapper">
            <img src="../assets/essjt-logo.png" 
                 class="logo" 
                 alt="ESSJT Logo"
                 onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        </div>

        <h1>🎓 ESSJT</h1>
        <div class="portal-badge">👨‍🎓 Student Portal</div>
        <div class="school-name">École Secondaire Saint Joseph le Travailleur</div>
        
        <div class="spinner"></div>
        <div class="loading">Loading Student Portal...</div>
        <div class="progress-bar">
            <div class="progress-fill"></div>
        </div>
    </div>

    <script>
        // Redirect after 2.5 seconds
        setTimeout(() => {
            document.body.style.opacity = '0';
            document.body.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                window.location.href = 'login.php';
            }, 500);
        }, 2500);
    </script>
</body>
</html>
