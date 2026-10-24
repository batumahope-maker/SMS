<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ESSJT - Loading...</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        .splash-container {
            text-align: center;
            color: white;
            position: relative;
            z-index: 10;
        }

        .logo-wrapper {
            width: 180px;
            height: 180px;
            margin: 0 auto 30px;
            position: relative;
            animation: logoAppear 1s ease-out, logoPulse 2s ease-in-out infinite 1s;
        }

        @keyframes logoAppear {
            from {
                opacity: 0;
                transform: scale(0.5);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }

        @keyframes logoPulse {
            0%, 100% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.05);
            }
        }

        .logo-wrapper img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            filter: drop-shadow(0 0 30px rgba(255,255,255,0.5));
        }

        .school-name {
            font-size: 2.5em;
            font-weight: 700;
            margin-bottom: 10px;
            opacity: 0;
            animation: slideUp 0.8s ease-out 0.3s forwards;
        }

        .school-subtitle {
            font-size: 1.2em;
            opacity: 0.9;
            margin-bottom: 5px;
            opacity: 0;
            animation: slideUp 0.8s ease-out 0.5s forwards;
        }

        .tagline {
            font-size: 1em;
            opacity: 0.7;
            margin-bottom: 40px;
            opacity: 0;
            animation: slideUp 0.8s ease-out 0.7s forwards;
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .loading-section {
            opacity: 0;
            animation: slideUp 0.8s ease-out 0.9s forwards;
        }

        .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            margin: 0 auto 20px;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .loading-text {
            font-size: 1.1em;
            margin-bottom: 20px;
            animation: fade 1.5s ease-in-out infinite;
        }

        @keyframes fade {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .progress-container {
            width: 300px;
            height: 6px;
            background: rgba(255,255,255,0.2);
            border-radius: 10px;
            margin: 0 auto;
            overflow: hidden;
        }

        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #38ef7d, #00f2fe, #f093fb);
            background-size: 200% 100%;
            border-radius: 10px;
            width: 0%;
            animation: fillProgress 3s ease-out forwards, shimmer 1.5s ease-in-out infinite;
        }

        @keyframes fillProgress {
            to { width: 100%; }
        }

        @keyframes shimmer {
            to { background-position: 200% 0; }
        }

        /* Floating particles background */
        .particles {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
        }

        .particle {
            position: absolute;
            width: 10px;
            height: 10px;
            background: rgba(255,255,255,0.3);
            border-radius: 50%;
            animation: float 10s linear infinite;
        }

        @keyframes float {
            0% {
                transform: translateY(100vh) translateX(0);
                opacity: 0;
            }
            10% {
                opacity: 1;
            }
            90% {
                opacity: 1;
            }
            100% {
                transform: translateY(-10vh) translateX(100px);
                opacity: 0;
            }
        }

        .particle:nth-child(1) { left: 10%; animation-delay: 0s; animation-duration: 8s; }
        .particle:nth-child(2) { left: 20%; animation-delay: 1s; animation-duration: 10s; }
        .particle:nth-child(3) { left: 30%; animation-delay: 2s; animation-duration: 9s; }
        .particle:nth-child(4) { left: 40%; animation-delay: 0.5s; animation-duration: 11s; }
        .particle:nth-child(5) { left: 50%; animation-delay: 1.5s; animation-duration: 8.5s; }
        .particle:nth-child(6) { left: 60%; animation-delay: 2.5s; animation-duration: 10.5s; }
        .particle:nth-child(7) { left: 70%; animation-delay: 1s; animation-duration: 9.5s; }
        .particle:nth-child(8) { left: 80%; animation-delay: 0.8s; animation-duration: 11.5s; }
        .particle:nth-child(9) { left: 90%; animation-delay: 2.2s; animation-duration: 8.8s; }

        @media (max-width: 768px) {
            .school-name {
                font-size: 2em;
            }

            .school-subtitle {
                font-size: 1em;
            }

            .progress-container {
                width: 250px;
            }
        }
    </style>
</head>
<body>
    <!-- Floating particles -->
    <div class="particles">
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
    </div>

    <div class="splash-container">
        <div class="logo-wrapper">
            <img src="assets/essjt-logo.png" alt="ESSJT Logo">
        </div>

        <h1 class="school-name">ESSJT</h1>
        <p class="school-subtitle">École Secondaire Saint Joseph le Travailleur</p>
        <p class="tagline">School Management System</p>

        <div class="loading-section">
            <div class="spinner"></div>
            <p class="loading-text">Loading...</p>
            <div class="progress-container">
                <div class="progress-bar"></div>
            </div>
        </div>
    </div>

    <script>
        // Redirect to main page after 3 seconds
        setTimeout(function() {
            window.location.href = 'index.php';
        }, 3000);
    </script>
</body>
</html>
