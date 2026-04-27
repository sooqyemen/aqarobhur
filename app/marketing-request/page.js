'use client';

import { useState } from 'react';
import { buildWhatsAppLink } from '@/components/WhatsAppBar';
import PageHeader from '@/components/PageHeader';
import DateInputs from '@/components/DateInputs';

export default function MarketingRequestPage() {
  const [formData, setFormData] = useState({
    contractType: 'عقد وساطة بيع',
    ownerRole: 'مالك العقار',
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
    area: '',
    price: '',
    planNumber: '',
    parcelNumber: '',
    streetWidth: '',
    facade: '',
    marketingDuration: '30 يوم',
    commission: '',
    details: '',
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    const ownerDob = `${formData.ownerDobYear}/${formData.ownerDobMonth}/${formData.ownerDobDay}`;
    const deedDate = `${formData.deedYear}/${formData.deedMonth}/${formData.deedDay}`;
    const priceTitle = formData.contractType === 'عقد وساطة إيجار' ? 'قيمة الإيجار السنوي المطلوبة' : 'السعر المطلوب للبيع';

    const text = `السلام عليكم، أرغب في تقديم طلب عقد وساطة عبر عقار أبحر 🏢:
📄 *نوع عقد الوساطة المطلوب:* ${formData.contractType}

👤 *بيانات مقدم الطلب:*
- الصفة: ${formData.ownerRole}
- الاسم: ${formData.name}
- رقم الجوال: ${formData.phone}
- رقم الهوية: ${formData.nationalId}
- تاريخ الميلاد: ${ownerDob}

📜 *بيانات الصك والعقار:*
- رقم الصك: ${formData.deedNumber}
- تاريخ الصك: ${deedDate}
- نوع العقار: ${formData.propertyType}
- المدينة/الحي: ${formData.location}
- المساحة: ${formData.area} م²
- ${priceTitle}: ${formData.price} ريال
- رقم المخطط: ${formData.planNumber || 'غير مذكور'}
- رقم القطعة: ${formData.parcelNumber || 'غير مذكور'}
- عرض الشارع: ${formData.streetWidth || 'غير مذكور'}
- الواجهة: ${formData.facade || 'غير مذكور'}

📌 *بيانات التسويق:*
- مدة التسويق المطلوبة: ${formData.marketingDuration || 'غير محددة'}
- السعي/العمولة المتفق عليها: ${formData.commission || 'حسب الاتفاق'}

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

  const isRentContract = formData.contractType === 'عقد وساطة إيجار';
  const priceLabel = isRentContract ? 'قيمة الإيجار السنوي المطلوبة *' : 'السعر المطلوب للبيع *';
  const pricePlaceholder = isRentContract ? 'مثال: 50000' : 'مثال: 1200000';

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
                <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: 'var(--text)' }}>2. بيانات مقدم الطلب</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>صفة مقدم الطلب *</label>
                    <select name="ownerRole" className="input" required value={formData.ownerRole} onChange={handleChange}>
                      <option value="مالك العقار">مالك العقار</option>
                      <option value="وكيل عن المالك">وكيل عن المالك</option>
                      <option value="مفوض من المالك">مفوض من المالك</option>
                    </select>
                  </div>
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
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>المساحة بالمتر المربع *</label>
                    <input type="number" name="area" className="input" placeholder="مثال: 625" required value={formData.area} onChange={handleChange} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>{priceLabel}</label>
                    <input type="number" name="price" className="input" placeholder={pricePlaceholder} required value={formData.price} onChange={handleChange} />
                  </div>
                </div>
              </div>

              <hr style={{ border: '0', borderTop: '1px solid var(--border)', margin: '0' }} />

              <div>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: 'var(--text)' }}>4. بيانات إضافية تساعد في الترخيص والتسويق</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>رقم المخطط (اختياري)</label>
                    <input type="text" name="planNumber" className="input" placeholder="مثال: 1/ب" value={formData.planNumber} onChange={handleChange} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>رقم القطعة (اختياري)</label>
                    <input type="text" name="parcelNumber" className="input" placeholder="مثال: 245" value={formData.parcelNumber} onChange={handleChange} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>عرض الشارع (اختياري)</label>
                    <input type="text" name="streetWidth" className="input" placeholder="مثال: 20 متر" value={formData.streetWidth} onChange={handleChange} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>الواجهة (اختياري)</label>
                    <select name="facade" className="input" value={formData.facade} onChange={handleChange}>
                      <option value="">اختر الواجهة</option>
                      <option value="شمالية">شمالية</option>
                      <option value="جنوبية">جنوبية</option>
                      <option value="شرقية">شرقية</option>
                      <option value="غربية">غربية</option>
                      <option value="شمالية شرقية">شمالية شرقية</option>
                      <option value="شمالية غربية">شمالية غربية</option>
                      <option value="جنوبية شرقية">جنوبية شرقية</option>
                      <option value="جنوبية غربية">جنوبية غربية</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>مدة التسويق المطلوبة (اختياري)</label>
                    <select name="marketingDuration" className="input" value={formData.marketingDuration} onChange={handleChange}>
                      <option value="30 يوم">30 يوم</option>
                      <option value="60 يوم">60 يوم</option>
                      <option value="90 يوم">90 يوم</option>
                      <option value="حسب ما يحدده المكتب مع المالك">حسب ما يحدده المكتب مع المالك</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>السعي / العمولة المتفق عليها (اختياري)</label>
                    <input type="text" name="commission" className="input" placeholder="مثال: حسب النظام أو حسب الاتفاق" value={formData.commission} onChange={handleChange} />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>تفاصيل إضافية (اختياري)</label>
                <textarea name="details" className="input" placeholder="أي معلومات إضافية تساعدنا في إدخال الطلب وإصدار العقد والترخيص..." style={{ minHeight: '110px', resize: 'vertical' }} value={formData.details} onChange={handleChange}></textarea>
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
