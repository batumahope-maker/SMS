# 🔧 COMPLETE INSTALLATION GUIDE - ESSJT PORTAL

## 📋 WHAT YOU NEED:

✅ 6 Files to download
✅ 1 Folder to create
✅ 5 Minutes to complete

---

## 🚀 STEP-BY-STEP INSTALLATION:

### **STEP 1: Create Assets Folder**

1. Go to: `C:\xampp\htdocs\essjt\`
2. Create a NEW folder called: `assets`
3. Result: `C:\xampp\htdocs\essjt\assets\`

---

### **STEP 2: Copy Logo Image**

1. Download: `essjt-logo.png`
2. Copy to: `C:\xampp\htdocs\essjt\assets\essjt-logo.png`
3. **VERIFY:** You should see the file at exactly this path:
   ```
   C:\xampp\htdocs\essjt\assets\essjt-logo.png
   ```

---

### **STEP 3: Copy Main Pages**

Copy these 5 PHP files to ROOT folder (`C:\xampp\htdocs\essjt\`):

```
✅ index.php → C:\xampp\htdocs\essjt\index.php (REPLACE OLD ONE)
✅ splash.php → C:\xampp\htdocs\essjt\splash.php (REPLACE OLD ONE)
✅ student-login.php → C:\xampp\htdocs\essjt\student-login.php (REPLACE)
✅ teacher-login.php → C:\xampp\htdocs\essjt\teacher-login.php (REPLACE)
```

---

### **STEP 4: Copy Admin Login**

```
✅ admin-login.php → C:\xampp\htdocs\essjt\admin-login.php (REPLACE)
```

---

### **STEP 5: Clear Browser Cache**

1. Press: `Ctrl + Shift + Delete`
2. Select: "Cached images and files"
3. Click: "Clear data"
4. Close ALL browser windows

---

### **STEP 6: Test**

1. Open fresh browser window
2. Go to: `http://localhost/essjt/`
3. You should see:
   - ✅ ESSJT Logo (school crest image)
   - ✅ "École Secondaire Saint Joseph le Travailleur"
   - ✅ Three portal cards working

---

## ❌ TROUBLESHOOTING:

### **Problem 1: Logo Shows "ESSJT Logo" Text Instead of Image**

**Cause:** Logo file is not in the right place

**Solution:**
1. Check if `C:\xampp\htdocs\essjt\assets\` folder exists
2. Check if `essjt-logo.png` is inside that folder
3. The full path should be: `C:\xampp\htdocs\essjt\assets\essjt-logo.png`

---

### **Problem 2: Still Shows "de Twumba"**

**Cause:** Old index.php file is still there

**Solution:**
1. DELETE the old `C:\xampp\htdocs\essjt\index.php`
2. Copy the NEW `index.php` file
3. Clear browser cache (Ctrl + Shift + Delete)
4. Refresh page (Ctrl + F5)

---

### **Problem 3: Portal Cards Go to Folder Indexes**

**Cause:** Old index.php or missing redirect files

**Solution:**
1. Make sure you replaced `index.php`
2. Check if these files exist:
   - `C:\xampp\htdocs\essjt\student\index.php`
   - `C:\xampp\htdocs\essjt\teacher\index.php`
   - `C:\xampp\htdocs\essjt\admin\index.php`

---

## 📂 FINAL FOLDER STRUCTURE:

```
C:\xampp\htdocs\essjt\
├── assets\
│   └── essjt-logo.png ← LOGO MUST BE HERE!
├── admin\
│   └── (all admin files)
├── student\
│   └── index.php (redirect)
├── teacher\
│   └── index.php (redirect)
├── index.php ← NEW VERSION
├── splash.php ← NEW VERSION
├── admin-login.php ← NEW VERSION
├── student-login.php ← NEW VERSION
└── teacher-login.php ← NEW VERSION
```

---

## ✅ VERIFICATION CHECKLIST:

After installation, verify:

- [ ] Logo image shows (not just text)
- [ ] School name says "le Travailleur" (not "de Twumba")
- [ ] Clicking "Student Portal" goes to green login page
- [ ] Clicking "Teacher Portal" goes to blue login page
- [ ] Clicking "Admin Portal" goes to red login page
- [ ] All pages show the ESSJT crest logo

---

## 🎯 IF STILL NOT WORKING:

1. Take screenshot of your `C:\xampp\htdocs\essjt\` folder
2. Take screenshot of your `C:\xampp\htdocs\essjt\assets\` folder
3. Show me both screenshots
4. I'll help you fix it!

---

## 📞 NEED HELP?

Show me:
- Screenshot of the error
- Screenshot of your essjt folder
- Screenshot of your assets folder

I'll fix it immediately!
