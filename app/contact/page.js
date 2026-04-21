// app/contact/page.jsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ContactPage() {
  const rawPhone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '966597520693';
  const phone = String(rawPhone).trim();
  const waDigits = phone.replace(/^0/, '966').replace(/\D/g, '');
  const whatsappLink = `https://wa.me/${waDigits}`;

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: '',
  });
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitStatus('loading');
    // هنا يمكن إرسال البيانات إلى API أو خدمة مثل EmailJS أو Firebase
    // سنحاكي نجاح الإرسال بعد ثانية
    setTimeout(() => {
      setSubmitStatus('success');
      setFormData({ name: '', phone: '', email: '', message: '' });
    }, 1000);
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
      
      <main className="contactPage">
        {/* Hero Section */}
        <section className="contactHero">
          <div className="container">
            <div className="heroContent">
              <h1 className="heroTitle">اتصل بنا</h1>
              <p className="heroSubtitle">
                فريق عقار أبحر في خدمتك على مدار الساعة. تواصل معنا لأي استفسار أو مساعدة.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Info Cards */}
        <section className="contactInfoSection">
          <div className="container">
            <div className="infoGrid">
              <div className="infoCard">
                <span className="material-icons-outlined">phone</span>
                <h3>اتصل بنا</h3>
                <p dir="ltr">{phone}</p>
                <a href={`tel:${phone}`} className="cardLink">اتصل الآن</a>
              </div>
              <div className="infoCard">
                <span className="material-icons-outlined">chat</span>
                <h3>واتساب</h3>
                <p dir="ltr">{phone}</p>
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="cardLink">راسلنا واتساب</a>
              </div>
              <div className="infoCard">
                <span className="material-icons-outlined">email</span>
                <h3>البريد الإلكتروني</h3>
                <p>info@abhar.sa</p>
                <a href="mailto:info@abhar.sa" className="cardLink">أرسل بريداً</a>
              </div>
              <div className="infoCard">
                <span className="material-icons-outlined">location_on</span>
                <h3>موقعنا</h3>
                <p>جدة - حي أبحر الشمالية</p>
                <a href="https://maps.google.com/?q=21.712,39.107" target="_blank" rel="noopener noreferrer" className="cardLink">افتح الخريطة</a>
              </div>
            </div>
          </div>
        </section>

        {/* Map & Form Section */}
        <section className="mapFormSection">
          <div className="container">
            <div className="mapFormGrid">
              <div className="mapCard">
                <iframe
                  title="موقع مكتب عقار أبحر"
                  src="https://maps.app.goo.gl/AP3p39NCYNXqE4YKA?g_st=ic"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
              <div className="formCard">
                <h2 className="formTitle">أرسل لنا رسالة</h2>
                <p className="formSubtitle">سنعود إليك في أقرب وقت ممكن</p>
                
                {submitStatus === 'success' ? (
                  <div className="successMessage">
                    <span className="material-icons-outlined">check_circle</span>
                    <h3>تم الإرسال بنجاح!</h3>
                    <p>شكراً لتواصلك معنا. سنقوم بالرد عليك قريباً.</p>
                    <button onClick={() => setSubmitStatus(null)} className="btn btnPrimary">
                      إرسال رسالة أخرى
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="contactForm">
                    <div className="formGroup">
                      <label htmlFor="name">الاسم الكامل *</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="أدخل اسمك الكامل"
                      />
                    </div>
                    <div className="formGroup">
                      <label htmlFor="phone">رقم الجوال *</label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        placeholder="05xxxxxxxx"
                        dir="ltr"
                      />
                    </div>
                    <div className="formGroup">
                      <label htmlFor="email">البريد الإلكتروني</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="example@domain.com"
                        dir="ltr"
                      />
                    </div>
                    <div className="formGroup">
                      <label htmlFor="message">الرسالة *</label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        placeholder="اكتب استفسارك أو رسالتك هنا..."
                        rows="4"
                      ></textarea>
                    </div>
                    <button type="submit" className="btn btnPrimary submitBtn" disabled={submitStatus === 'loading'}>
                      {submitStatus === 'loading' ? 'جاري الإرسال...' : 'إرسال الرسالة'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Office Hours & Social */}
        <section className="extraInfo">
          <div className="container">
            <div className="extraGrid">
              <div className="hoursCard">
                <h3>
                  <span className="material-icons-outlined">schedule</span>
                  ساعات العمل
                </h3>
                <ul>
                  <li><span>السبت - الخميس:</span> 9:00 صباحاً - 9:00 مساءً</li>
                  <li><span>الجمعة:</span> مغلق</li>
                </ul>
              </div>
              <div className="socialCard">
                <h3>
                  <span className="material-icons-outlined">share</span>
                  تابعنا على
                </h3>
                <div className="socialLinksLarge">
                  <a href="https://x.com/abhar" target="_blank" rel="noopener noreferrer" aria-label="تويتر">
                    <span className="material-icons-outlined">flutter_dash</span>
                    <span>تويتر</span>
                  </a>
                  <a href="https://instagram.com/abhar" target="_blank" rel="noopener noreferrer" aria-label="انستغرام">
                    <span className="material-icons-outlined">photo_camera</span>
                    <span>انستغرام</span>
                  </a>
                  <a href="https://linkedin.com/company/abhar" target="_blank" rel="noopener noreferrer" aria-label="لينكد إن">
                    <span className="material-icons-outlined">business</span>
                    <span>لينكد إن</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <style jsx>{`
        .contactPage {
          background: var(--bg);
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        /* Hero */
        .contactHero {
          background: linear-gradient(135deg, #0f766e 0%, #115e59 100%);
          color: white;
          padding: 60px 0;
          text-align: center;
        }

        .heroContent {
          max-width: 700px;
          margin: 0 auto;
        }

        .heroTitle {
          font-size: clamp(36px, 5vw, 48px);
          font-weight: 900;
          margin-bottom: 16px;
        }

        .heroSubtitle {
          font-size: 18px;
          opacity: 0.9;
          line-height: 1.7;
        }

        /* Info Cards */
        .contactInfoSection {
          padding: 60px 0 30px;
        }

        .infoGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .infoCard {
          background: white;
          border-radius: 24px;
          padding: 30px 20px;
          text-align: center;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .infoCard:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-md);
        }

        .infoCard .material-icons-outlined {
          font-size: 40px;
          color: var(--primary);
          margin-bottom: 16px;
        }

        .infoCard h3 {
          font-size: 20px;
          font-weight: 800;
          margin-bottom: 12px;
          color: var(--text);
        }

        .infoCard p {
          color: var(--muted);
          margin-bottom: 20px;
          font-size: 16px;
          font-weight: 500;
        }

        .cardLink {
          display: inline-block;
          padding: 10px 24px;
          background: var(--primary);
          color: white;
          border-radius: 50px;
          font-weight: 700;
          font-size: 14px;
          text-decoration: none;
          transition: background 0.2s;
        }

        .cardLink:hover {
          background: #0a5c56;
        }

        /* Map & Form Grid */
        .mapFormSection {
          padding: 40px 0 60px;
        }

        .mapFormGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }

        .mapCard {
          border-radius: 24px;
          overflow: hidden;
          box-shadow: var(--shadow-md);
          border: 1px solid var(--border);
          min-height: 450px;
          background: #eef2f6;
        }

        .formCard {
          background: white;
          border-radius: 24px;
          padding: 32px;
          box-shadow: var(--shadow-md);
          border: 1px solid var(--border);
        }

        .formTitle {
          font-size: 28px;
          font-weight: 800;
          margin-bottom: 8px;
          color: var(--text);
        }

        .formSubtitle {
          color: var(--muted);
          margin-bottom: 24px;
        }

        .contactForm {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .formGroup {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .formGroup label {
          font-weight: 700;
          color: var(--text);
        }

        .formGroup input,
        .formGroup textarea {
          padding: 14px 16px;
          border: 1px solid var(--border);
          border-radius: 16px;
          font-size: 16px;
          transition: border-color 0.2s, box-shadow 0.2s;
          background: white;
        }

        .formGroup input:focus,
        .formGroup textarea:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1);
          outline: none;
        }

        .submitBtn {
          width: 100%;
          padding: 16px;
          font-size: 18px;
          margin-top: 10px;
          border: none;
          cursor: pointer;
        }

        .submitBtn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .successMessage {
          text-align: center;
          padding: 20px 0;
        }

        .successMessage .material-icons-outlined {
          font-size: 64px;
          color: var(--success);
          margin-bottom: 16px;
        }

        .successMessage h3 {
          font-size: 24px;
          margin-bottom: 12px;
        }

        .successMessage p {
          color: var(--muted);
          margin-bottom: 24px;
        }

        /* Extra Info */
        .extraInfo {
          padding: 0 0 60px;
        }

        .extraGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }

        .hoursCard,
        .socialCard {
          background: white;
          border-radius: 24px;
          padding: 28px;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border);
        }

        .hoursCard h3,
        .socialCard h3 {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 22px;
          font-weight: 800;
          margin-bottom: 20px;
          color: var(--text);
        }

        .hoursCard ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .hoursCard li {
          padding: 12px 0;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          color: var(--muted);
        }

        .hoursCard li:last-child {
          border-bottom: none;
        }

        .hoursCard li span {
          font-weight: 700;
          color: var(--text);
        }

        .socialLinksLarge {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .socialLinksLarge a {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          background: var(--bg-soft);
          border-radius: 16px;
          text-decoration: none;
          color: var(--text);
          font-weight: 600;
          transition: all 0.2s;
          border: 1px solid transparent;
        }

        .socialLinksLarge a:hover {
          background: white;
          border-color: var(--primary);
          transform: translateX(-5px);
        }

        .socialLinksLarge .material-icons-outlined {
          color: var(--primary);
        }

        /* Responsive */
        @media (max-width: 900px) {
          .infoGrid {
            grid-template-columns: repeat(2, 1fr);
          }
          .mapFormGrid {
            grid-template-columns: 1fr;
          }
          .extraGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .infoGrid {
            grid-template-columns: 1fr;
          }
          .heroTitle {
            font-size: 32px;
          }
          .heroSubtitle {
            font-size: 16px;
          }
          .formCard {
            padding: 24px;
          }
        }
      `}</style>
    </>
  );
}  ابغى احدث موقع المكتب https://maps.app.goo.gl/beujkMW6Z6ogPhoE8?g_st=ic
