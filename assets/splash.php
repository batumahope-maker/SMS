<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ESSJT - School Management System</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        .splash-container {
            text-align: center;
            animation: fadeIn 1s ease-in;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-30px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .logo-wrapper {
            margin-bottom: 30px;
            animation: bounce 2s ease-in-out infinite;
        }

        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
        }

        .logo {
            width: 180px;
            height: 180px;
            object-fit: contain;
            filter: drop-shadow(0 10px 30px rgba(0,0,0,0.3));
            border-radius: 20px;
            background: white;
            padding: 20px;
        }

        h1 {
            color: white;
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 8px rgba(0,0,0,0.3);
            letter-spacing: 1px;
        }

        .subtitle {
            color: rgba(255,255,255,0.95);
            font-size: 1.2em;
            margin-bottom: 40px;
            font-weight: 300;
        }

        .school-name {
            color: rgba(255,255,255,0.9);
            font-size: 0.95em;
            margin-bottom: 50px;
            font-style: italic;
        }

        .portal-buttons {
            display: flex;
            gap: 20px;
            justify-content: center;
            flex-wrap: wrap;
            animation: slideUp 1s ease-out 0.5s both;
        }

        @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .portal-btn {
            background: white;
            color: #667eea;
            padding: 18px 40px;
            border-radius: 15px;
            text-decoration: none;
            font-weight: 700;
            font-size: 1.1em;
            box-shadow: 0 8px 25px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
            display: inline-block;
            min-width: 180px;
        }

        .portal-btn:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(0,0,0,0.3);
        }

        .portal-btn.student {
            background: linear-gradient(135deg, #11998e, #38ef7d);
            color: white;
        }

        .portal-btn.teacher {
            background: linear-gradient(135deg, #1a73e8, #42a5f5);
            color: white;
        }

        .portal-btn.admin {
            background: linear-gradient(135deg, #9c27b0, #e040fb);
            color: white;
        }

        .icon {
            font-size: 1.4em;
            margin-right: 8px;
        }

        .loading {
            margin-top: 30px;
            color: white;
            font-size: 0.9em;
            opacity: 0;
            animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
        }

        @media (max-width: 768px) {
            h1 {
                font-size: 1.8em;
            }
            
            .logo {
                width: 140px;
                height: 140px;
            }
            
            .portal-buttons {
                flex-direction: column;
                align-items: center;
            }
            
            .portal-btn {
                width: 250px;
            }
        }

        .version {
            position: fixed;
            bottom: 20px;
            right: 20px;
            color: rgba(255,255,255,0.6);
            font-size: 0.8em;
        }
    </style>
</head>
<body>
    <div class="splash-container">
        <div class="logo-wrapper">
            <img src="assets/essjt-logo.png" 
                 class="logo" 
                 alt="ESSJT Logo"
                 onerror="this.src='https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png'">
        </div>

        <h1>🎓 ESSJT Portal</h1>
        <div class="subtitle">School Management System</div>
        <div class="school-name">École Secondaire Saint Joseph le Travailleur</div>

        <div class="portal-buttons">
            <a href="student/" class="portal-btn student">
                <span class="icon">👨‍🎓</span>
                Student Portal
            </a>
            <a href="teacher/" class="portal-btn teacher">
                <span class="icon">👨‍🏫</span>
                Teacher Portal
            </a>
            <a href="admin/" class="portal-btn admin">
                <span class="icon">🔐</span>
                Admin Portal
            </a>
        </div>

        <div class="loading">● ● ● Loading System ● ● ●</div>
    </div>

    <div class="version">v1.0 - 2026</div>

    <script>
        // Add smooth scroll
        document.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const href = this.getAttribute('href');
                
                // Fade out effect
                document.querySelector('.splash-container').style.opacity = '0';
                document.querySelector('.splash-container').style.transform = 'scale(0.95)';
                document.querySelector('.splash-container').style.transition = 'all 0.5s ease';
                
                // Navigate after animation
                setTimeout(() => {
                    window.location.href = href;
                }, 500);
            });
        });
    </script>
</body>
</html>
