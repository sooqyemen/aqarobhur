@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');

:root {
  /* ألوان الهوية (أزرق ملكي وذهبي) */
  --bg-main: #f8fafc;       /* خلفية رمادية فاتحة جداً */
  --bg-surface: #ffffff;    /* خلفية الكروت */
  
  --primary: #1e40af;       /* أزرق غامق (Blue-800) */
  --primary-light: #eff6ff; /* أزرق فاتح جداً للخلفيات */
  --accent: #b45309;        /* ذهبي/برونزي */
  
  --text-main: #0f172a;     /* أسود مزرق (Slate-900) */
  --text-muted: #64748b;    /* رمادي للنصوص الفرعية */
  --border: #e2e8f0;        /* لون الحدود */
  
  /* ألوان الحالات (للتوافق مع format.js) */
  --success-bg: #dcfce7; --success-text: #166534;
  --danger-bg: #fee2e2;  --danger-text: #991b1b;
  --warn-bg: #ffedd5;    --warn-text: #9a3412;
}

* { box-sizing: border-box; }

html, body {
  margin: 0; padding: 0;
  background: var(--bg-main);
  color: var(--text-main);
  font-family: 'Tajawal', sans-serif;
  direction: rtl;
  -webkit-font-smoothing: antialiased;
}

a { text-decoration: none; color: inherit; transition: 0.2s; }
ul { list-style: none; padding: 0; margin: 0; }

.container {
  width: min(1200px, calc(100% - 32px));
  margin: 0 auto;
}

/* الأزرار */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 18px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid var(--border);
  background: #fff;
}
.btn:hover { background: #f1f5f9; transform: translateY(-1px); }

.btn-primary {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
  box-shadow: 0 4px 6px -1px rgba(30, 64, 175, 0.2);
}
.btn-primary:hover { background: #1e3a8a; }

/* --- تنسيقات Badges (مهم جداً لملف format.js) --- */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 700;
  background: #f3f4f6;
  color: var(--text-muted);
}
.badge.ok { background: var(--success-bg); color: var(--success-text); }
.badge.sold { background: var(--danger-bg); color: var(--danger-text); }
.badge.warn { background: var(--warn-bg); color: var(--warn-text); }
