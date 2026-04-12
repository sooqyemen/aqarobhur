'use client';

import { useState } from 'react';
import { buildWhatsAppLink } from '@/components/WhatsAppBar';
import PageHeader from '@/components/PageHeader';
import DateInputs from '@/components/DateInputs';

export default function MarketingRequestPage() {
  const [formData, setFormData] = useState({
    contractType: 'عقد وساطة وتسويق وبيع', name: '', phone: '', nationalId: '',
    ownerDobDay: '', ownerDobMonth: '', ownerDobYear: '',
    deedNumber: '', deedDay: '', deedMonth: '', deedYear: '',
    propertyType: 'شقة', location: '', details: ''
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    const ownerDob = `${formData.ownerDobYear}/${formData.ownerDobMonth}/${formData.ownerDobDay}`;
    const deedDate = `${formData.deedYear}/${formData.deedMonth}/${formData.deedDay}`;

    const text = `السلام عليكم، أرغب في إصدار عقد وساطة عبر عقار أبحر 🏢:
📄 *نوع العقد المطلوب:* ${formData.contractType}

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

📝 *تفاصيل إضافية:* ${formData.details || 'لا يوجد'}`;

    const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '966597520693';
    const waLink = buildWhatsAppLink({ phone, text });
    window.open(waLink, '_blank');
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
      <div style={{ padding: '60px 0', minHeight: '80vh', direction: 'rtl' }}>
        <div className="container" style={{ maxWidth: '850px' }}>
          
          <PageHeader 
            icon="description" 
            title="طلب إصدار عقد وساطة وتسويق" 
            description="نرجو تعبئة البيانات بدقة لتسهيل إصدار عقد الوساطة الرسمي عبر منصة الهيئة العامة للعقار."
            badgeText="نحن وسيط عقاري معتمد لدى الهيئة العامة للعقار"
          />

          <div className="card" style={{ padding: '35px' }}>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '30px' }}>
              
              <div>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 900, fontSize: '16px', color: 'var(--primary)' }}>1. حدد نوع العقد المطلوب *</label>
                <select name="contractType" className="input" required value={formData.contractType} onChange={handleChange} style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                  <option value="عقد وساطة وتسويق وبيع">عقد وساطة وتسويق وبيع</option><option value="عقد وساطة وتسويق إيجار">عقد وساطة وتسويق إيجار</option>
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
                      <option value="شقة">شقة</option><option value="فيلا">فيلا</option><option value="أرض">أرض</option><option value="عمارة">عمارة</option><option value="محل تجاري">محل تجاري</option><option value="مكتب">مكتب</option>
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
                <textarea name="details" className="input" placeholder="مساحة العقار، السعر المطلوب..." style={{ minHeight: '100px', resize: 'vertical' }} value={formData.details} onChange={handleChange}></textarea>
              </div>

              <div style={{ marginTop: '10px' }}>
                <button type="submit" className="btn btnPrimary" style={{ width: '100%', fontSize: '18px', padding: '16px' }}>إرسال الطلب واعتماد البيانات <span className="material-icons-outlined">verified</span></button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </>
  );
}
