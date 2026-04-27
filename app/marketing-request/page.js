'use client';

import { useState } from 'react';
import { buildWhatsAppLink } from '@/components/WhatsAppBar';
import PageHeader from '@/components/PageHeader';
import DateInputs from '@/components/DateInputs';

export default function MarketingRequestPage() {
  const [formData, setFormData] = useState({
    contractType: 'عقد وساطة بيع',
    name: '',
    phone: '',
    nationalId: '',
    ownerDobDay: '',
    ownerDobMonth: '',
    ownerDobYear: '',
    deedNumber: '',
    deedDay: '',
    deedMonth: '',
    deedYear: '',
    propertyType: 'شقة',
    location: '',
    details: '',
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    const ownerDob = `${formData.ownerDobYear}/${formData.ownerDobMonth}/${formData.ownerDobDay}`;
    const deedDate = `${formData.deedYear}/${formData.deedMonth}/${formData.deedDay}`;

    const text = `السلام عليكم، أرغب في تقديم طلب عقد وساطة عبر عقار أبحر 🏢:
📄 *نوع عقد الوساطة المطلوب:* ${formData.contractType}

👤 *بيانات المالك:*
- الاسم: ${formData.name}
- رقم الجوال: ${formData.phone}
- رقم الهوية: ${formData.nationalId}
- تاريخ الميلاد: ${ownerDob}

📜 *بيانات الصك والعقار:*
- رقم الصك: ${formData.deedNumber}
- تاريخ الصك: ${deedDate}
- نوع العقار: ${formData.propertyType}
- المدينة/الحي: ${formData.location}

📝 *تفاصيل إضافية:* ${formData.details || 'لا يوجد'}

أرغب من المكتب بمراجعة البيانات وإدخالها في الموقع الرسمي لإصدار عقد الوساطة، ثم متابعة ترخيص الإعلان العقاري بعد اعتماد العقد.`;

    const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '966597520693';
    const waLink = buildWhatsAppLink({ phone, text });
    window.open(waLink, '_blank');
  };

  const serviceSteps = [
    'تعبئة النموذج وإرسال بيانات المالك والعقار إلى المكتب.',
    'مراجعة البيانات والتأكد من اكتمال المتطلبات الأساسية.',
    'إدخال البيانات في الموقع الرسمي لإنشاء عقد الوساطة.',
    'بعد اعتماد عقد الوساطة، يتم متابعة إصدار ترخيص الإعلان العقاري.',
  ];

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
      <div style={{ padding: '60px 0', minHeight: '80vh', direction: 'rtl' }}>
        <div className="container" style={{ maxWidth: '900px' }}>
          <PageHeader
            icon="description"
            title="عقود الوساطة وترخيص الإعلان العقاري"
            description="بصفتنا وسيطًا عقاريًا معتمدًا، نستقبل بيانات المالك والعقار من خلال هذا النموذج، ثم نقوم بمراجعتها وإدخالها في الموقع الرسمي لإنشاء عقد الوساطة، وبعد اعتماد العقد نتابع إصدار ترخيص الإعلان العقاري."
            badgeText="وسيط عقاري معتمد لدى الهيئة العامة للعقار"
          />

          <div
            className="card"
            style={{
              padding: '24px',
              marginBottom: '22px',
              border: '1px solid rgba(214, 179, 91, 0.35)',
              background: 'linear-gradient(135deg, rgba(214,179,91,.10), rgba(255,255,255,.92))',
            }}
          >
            <h2 style={{ margin: '0 0 12px', fontSize: '22px', color: 'var(--text)' }}>طريقة تنفيذ الخدمة</h2>
            <div style={{ display: 'grid', gap: '12px' }}>
              {serviceSteps.map((step, index) => (
                <div
                  key={step}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px',
                    borderRadius: '16px',
                    background: 'rgba(255,255,255,.72)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '999px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      background: 'var(--primary)',
                      color: '#fff',
                      fontWeight: 900,
                    }}
                  >
                    {index + 1}
                  </span>
                  <p style={{ margin: 0, color: 'var(--muted)', fontWeight: 700, lineHeight: 1.8 }}>{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: '35px' }}>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '30px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 900, fontSize: '16px', color: 'var(--primary)' }}>1. حدد نوع عقد الوساطة *</label>
                <select name="contractType" className="input" required value={formData.contractType} onChange={handleChange} style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                  <option value="عقد وساطة بيع">عقد وساطة بيع</option>
                  <option value="عقد وساطة إيجار">عقد وساطة إيجار</option>
                </select>
              </div>

              <hr style={{ border: '0', borderTop: '1px solid var(--border)', margin: '0' }} />

              <div>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: 'var(--text)' }}>2. بيانات المالك</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>الاسم الرباعي *</label>
                    <input type="text" name="name" className="input" placeholder="مطابق للهوية الوطنية" required value={formData.name} onChange={handleChange} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>رقم الجوال *</label>
                    <input type="tel" name="phone" className="input" placeholder="05XXXXXXXX" required value={formData.phone} onChange={handleChange} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>رقم الهوية / الإقامة *</label>
                    <input type="number" name="nationalId" className="input" placeholder="مكون من 10 أرقام" required value={formData.nationalId} onChange={handleChange} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>تاريخ الميلاد *</label>
                    <DateInputs dayName="ownerDobDay" monthName="ownerDobMonth" yearName="ownerDobYear" dayVal={formData.ownerDobDay} monthVal={formData.ownerDobMonth} yearVal={formData.ownerDobYear} handleChange={handleChange} />
                  </div>
                </div>
              </div>

              <hr style={{ border: '0', borderTop: '1px solid var(--border)', margin: '0' }} />

              <div>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: 'var(--text)' }}>3. بيانات الصك والعقار</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>رقم الصك الإلكتروني *</label>
                    <input type="number" name="deedNumber" className="input" placeholder="أدخل رقم الصك" required value={formData.deedNumber} onChange={handleChange} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>تاريخ الصك *</label>
                    <DateInputs dayName="deedDay" monthName="deedMonth" yearName="deedYear" dayVal={formData.deedDay} monthVal={formData.deedMonth} yearVal={formData.deedYear} handleChange={handleChange} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>نوع العقار *</label>
                    <select name="propertyType" className="input" required value={formData.propertyType} onChange={handleChange}>
                      <option value="شقة">شقة</option>
                      <option value="فيلا">فيلا</option>
                      <option value="أرض">أرض</option>
                      <option value="عمارة">عمارة</option>
                      <option value="محل تجاري">محل تجاري</option>
                      <option value="مكتب">مكتب</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>المدينة / الحي *</label>
                    <input type="text" name="location" className="input" placeholder="مثال: جدة، حي الشراع" required value={formData.location} onChange={handleChange} />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>تفاصيل إضافية (اختياري)</label>
                <textarea name="details" className="input" placeholder="مساحة العقار، السعر المطلوب، معلومات إضافية تساعدنا في إدخال الطلب..." style={{ minHeight: '110px', resize: 'vertical' }} value={formData.details} onChange={handleChange}></textarea>
              </div>

              <div style={{ marginTop: '10px' }}>
                <button type="submit" className="btn btnPrimary" style={{ width: '100%', fontSize: '18px', padding: '16px' }}>
                  إرسال النموذج إلى المكتب
                  <span className="material-icons-outlined">send</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
