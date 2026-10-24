// ==========================================
// ESSJT Admin Panel JavaScript
// ==========================================

// Mobile Sidebar Toggle
const mobileSidebarToggle = () => {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
};

// Smooth Scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Toast Notifications
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${type === 'success' ? '✓' : '✕'}</span>
            <span class="toast-message">${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('toast-show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('toast-show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Confirm Delete
function confirmDelete(message = 'Are you sure you want to delete this item?') {
    return confirm(message);
}

// Data Table Search
function searchTable(inputId, tableId) {
    const input = document.getElementById(inputId);
    const table = document.getElementById(tableId);
    
    if (!input || !table) return;
    
    input.addEventListener('keyup', function() {
        const filter = this.value.toLowerCase();
        const rows = table.getElementsByTagName('tr');
        
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(filter) ? '' : 'none';
        }
    });
}

// Print Page
function printPage() {
    window.print();
}

// Export to CSV
function exportToCSV(tableId, filename = 'export.csv') {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    let csv = [];
    const rows = table.querySelectorAll('tr');
    
    for (let row of rows) {
        let cols = row.querySelectorAll('td, th');
        let csvRow = [];
        for (let col of cols) {
            csvRow.push('"' + col.textContent.replace(/"/g, '""') + '"');
        }
        csv.push(csvRow.join(','));
    }
    
    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
}

// Form Validation
function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return true;
    
    const inputs = form.querySelectorAll('[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('error');
            isValid = false;
        } else {
            input.classList.remove('error');
        }
    });
    
    if (!isValid) {
        showToast('Please fill in all required fields', 'error');
    }
    
    return isValid;
}

// Auto-save Draft
let autoSaveTimer;
function enableAutoSave(formId, interval = 30000) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    autoSaveTimer = setInterval(() => {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        localStorage.setItem(`draft_${formId}`, JSON.stringify(data));
        showToast('Draft saved', 'success');
    }, interval);
}

// Load Draft
function loadDraft(formId) {
    const draft = localStorage.getItem(`draft_${formId}`);
    if (!draft) return;
    
    const data = JSON.parse(draft);
    const form = document.getElementById(formId);
    if (!form) return;
    
    for (let key in data) {
        const input = form.elements[key];
        if (input) input.value = data[key];
    }
}

// Clear Draft
function clearDraft(formId) {
    localStorage.removeItem(`draft_${formId}`);
}

console.log('✅ ESSJT Admin JS Loaded');