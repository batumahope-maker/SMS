<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ESSJT - School Management Portal</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            min-height: 100vh; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            padding: 20px; 
        }
        .container { 
            background: white; 
            padding: 60px 40px; 
            border-radius: 24px; 
            box-shadow: 0 20px 60px rgba(0,0,0,0.3); 
            text-align: center; 
            max-width: 900px; 
            width: 100%;
        }
        .logo { margin-bottom: 30px; }
        .logo img { 
            width: 120px; 
            height: 120px; 
            border-radius: 50%; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        h1 { 
            color: #1a202c; 
            font-size: 3rem; 
            margin: 20px 0 10px 0; 
            font-weight: 700;
        }
        .subtitle { 
            color: #718096; 
            font-size: 1.3rem; 
            margin-bottom: 20px; 
            font-weight: 400;
        }
        .tagline {
            color: #4a5568;
            font-size: 1.1rem;
            margin-bottom: 50px;
        }
        .portal-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 25px; 
            margin: 40px 0;
        }
        .portal-card { 
            padding: 40px 30px; 
            border-radius: 16px; 
            text-decoration: none; 
            color: white; 
            font-weight: 600; 
            font-size: 1.2rem; 
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            position: relative;
            overflow: hidden;
        }
        .portal-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%);
            opacity: 0;
            transition: opacity 0.3s;
        }
        .portal-card:hover::before { opacity: 1; }
        .portal-card:hover { 
            transform: translateY(-8px); 
            box-shadow: 0 12px 24px rgba(0,0,0,0.2);
        }
        .student-card { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
        .teacher-card { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
        .admin-card { background: linear-gradient(135deg, #8B0000 0%, #a52a2a 100%); }
        .icon { 
            font-size: 3.5rem; 
            margin-bottom: 20px; 
            display: block;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        }
        .portal-card .title { 
            font-size: 1.5rem; 
            font-weight: 700;
            margin-bottom: 8px;
        }
        .portal-card .description {
            font-size: 0.95rem;
            opacity: 0.95;
            font-weight: 400;
        }
        .footer { 
            margin-top: 50px; 
            padding-top: 30px; 
            border-top: 1px solid #e2e8f0;
        }
        .footer a { 
            color: #8B0000; 
            font-weight: 600; 
            text-decoration: none; 
            font-size: 1.1rem;
            transition: color 0.3s;
        }
        .footer a:hover { color: #a52a2a; }
        .badge {
            display: inline-block;
            background: #fef3c7;
            color: #92400e;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <img src="https://essjt.org.rw/wp-content/uploads/2023/08/cropped-LOGO-ESSJT-1.png" alt="ESSJT Logo">
        </div>
        
        <h1>ESSJT Portal</h1>
        <p class="subtitle">École Secondaire Saint Joseph de Twumba</p>
        <p class="tagline">Comprehensive School Management System</p>
        
        <div class="badge">🔐 Secure Login Portal</div>
        
        <div class="portal-grid">
            <a href="/essjt/student" class="portal-card student-card">
                <span class="icon">👨‍🎓</span>
                <div class="title">Student Portal</div>
                <div class="description">Access your grades, attendance & fees</div>
            </a>
            
            <a href="/essjt/teacher" class="portal-card teacher-card">
                <span class="icon">👨‍🏫</span>
                <div class="title">Teacher Portal</div>
                <div class="description">Manage classes, marks & attendance</div>
            </a>
            
            <a href="/essjt/admin" class="portal-card admin-card">
                <span class="icon">👨‍💼</span>
                <div class="title">Admin Portal</div>
                <div class="description">Complete system administration</div>
            </a>
        </div>
        
        <div class="footer">
            <a href="https://essjt.org.rw" target="_blank">🌐 Visit School Website →</a>
        </div>
    </div>
</body>
</html>
