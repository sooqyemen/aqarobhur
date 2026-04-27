'use client';

import { useState } from 'react';
import { buildWhatsAppLink } from '@/components/WhatsAppBar';
import PageHeader from '@/components/PageHeader';
import DateInputs from '@/components/DateInputs';
import { createRequest } from '@/lib/requestService';

const initialFormData = {
  ownerId: '',
  ownerPhone: '',
  ownerDobDay: '',
  ownerDobMonth: '',
  ownerDobYear: '',
  tenantId: '',
  tenantPhone: '',
  tenantDobDay: '',
  tenantDobMonth: '',
  tenantDobYear: '',
  deedNumber: '',
  deedDay: '',
  deedMonth: '',
  deedYear: '',
  propertyType: 'شقة',
  startDay: '',
  startMonth: '',
  startYear: '',
  contractDuration: 'سنة واحدة',
  rentAmount: '',
  paymentFrequency: 'شهري',
  electricityStatus: 'مستقل برقم حساب',
  electricityNumber: '',
  details: '',
};

export default function EjarRequestPage() {
  const [formData, setFormData] = useState(initialFormData);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const buildPayload = () => {
    const ownerDob = `${formData.ownerDobYear}/${formData.ownerDobMonth}/${formData.ownerDobDay}`;
    const tenantDob = `${formData.tenantDobYear}/${formData.tenantDobMonth}/${formData.tenantDobDay}`;
    const deedDate = `${formData.deedYear}/${formData.deedMonth}/${formData.deedDay}`;
    const startDate = `${formData.startYear}/${formData.startMonth}/${formData.startDay}`;

    const waText = `السلام عليكم، أرغب في توثيق عقد إيجار عبر عقار أبحر 🤝:
👤 *بيانات المالك:*
- الهوية/الإقامة: ${formData.ownerId}
- تاريخ الميلاد: ${ownerDob}
- رقم الجوال: ${formData.ownerPhone}

👤 *بيانات المستأجر:*
- الهوية/الإقامة: ${formData.tenantId}
- تاريخ الميلاد: ${tenantDob}
- رقم الجوال: ${formData.tenantPhone}

📜 *بيانات الصك والعقار:*
- رقم الصك: ${formData.deedNumber}
- تاريخ الصك: ${deedDate}
- نوع العقار: ${formData.propertyType}

📅 *تفاصيل العقد:*
- بداية العقد: ${startDate}
- مدة العقد: ${formData.contractDuration}
- قيمة الإيجار: ${formData.rentAmount} ريال
- آلية الدفع: ${formData.paymentFrequency}

⚡ *الكهرباء:*
- الحالة: ${formData.electricityStatus}
${formData.electricityStatus === 'مستقل برقم حساب' ? `- رقم الحساب: ${formData.electricityNumber}` : ''}

📝 *ملاحظات إضافية:* ${formData.details || 'لا يوجد'}

📎 *(سأقوم بإرفاق صورة الصك في الرسالة التالية)*`;

    return {
      requestKind: 'ejar_contract',
      sourceType: 'توثيق عقد إيجار',
      source: 'ejar-request-page',
      dealType: 'rent',
      propertyType: formData.propertyType,
      name: 'طلب توثيق عقد إيجار',
      phone: formData.ownerPhone || formData.tenantPhone,
      ownerId: formData.ownerId,
      ownerPhone: formData.ownerPhone,
      ownerDob,
      tenantId: formData.tenantId,
      tenantPhone: formData.tenantPhone,
      tenantDob,
      deedNumber: formData.deedNumber,
      deedDate,
      startDate,
      contractDuration: formData.contractDuration,
      rentAmount: formData.rentAmount ? Number(formData.rentAmount) : null,
      budgetMin: formData.rentAmount ? Number(formData.rentAmount) : null,
      budgetMax: formData.rentAmount ? Number(formData.rentAmount) : null,
      paymentFrequency: formData.paymentFrequency,
      electricityStatus: formData.electricityStatus,
      electricityNumber: formData.electricityNumber,
      note: formData.details,
      rawText: waText,
      waText,
      status: 'new',
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSuccessMessage('');

    try {
      const payload = buildPayload();
      await createRequest(payload);
      setSuccessMessage('تم حفظ طلب توثيق عقد الإيجار في لوحة التحكم بنجاح. يمكن للعميل الآن إرسال نسخة واتساب اختيارياً.');

      const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '966597520693';
      const waLink = buildWhatsAppLink({ phone, text: payload.waText });
      window.open(waLink, '_blank');
      setFormData(initialFormData);
    } catch (error) {
      setSaveError('تعذر حفظ طلب توثيق عقد الإيجار في لوحة التحكم. يرجى المحاولة مرة أخرى أو التواصل معنا مباشرة.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
      <div style={{ padding: '60px 0', minHeight: '80vh', direction: 'rtl' }}>
        <div className="container" style={{ maxWidth: '900px' }}>
          <PageHeader
            icon="assignment"
            title="طلب توثيق عقد إيجار"
            description="يرجى تعبئة البيانات أدناه بدقة. يتم حفظ الطلب مباشرة في لوحة التحكم، ثم يمكن إرسال نسخة واتساب اختيارياً."
            badgeText="نقدم خدمة توثيق عقود الإيجار"
          />

          <div className="card" style={{ padding: '35px' }}>
            {successMessage && (
              <div className="alert successAlert">
                <span className="material-icons-outlined">check_circle</span>
                {successMessage}
              </div>
            )}

            {saveError && (
              <div className="alert errorAlert">
                <span className="material-icons-outlined">error</span>
                {saveError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '30px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="responsive-grid">
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-icons-outlined">person</span> بيانات المالك
                  </h3>
                  <div style={{ display: 'grid', gap: '15px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: 800, fontSize: '13px' }}>رقم الهوية / الإقامة *</label>
                      <input type="number" name="ownerId" className="input" required value={formData.ownerId} onChange={handleChange} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: 800, fontSize: '13px' }}>تاريخ الميلاد *</label>
                      <DateInputs dayName="ownerDobDay" monthName="ownerDobMonth" yearName="ownerDobYear" dayVal={formData.ownerDobDay} monthVal={formData.ownerDobMonth} yearVal={formData.ownerDobYear} handleChange={handleChange} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: 800, fontSize: '13px' }}>رقم الجوال (المرتبط بأبشر) *</label>
                      <input type="tel" name="ownerPhone" className="input" placeholder="05XXXXXXXX" required value={formData.ownerPhone} onChange={handleChange} />
                    </div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#d8b25f', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-icons-outlined">person_outline</span> بيانات المستأجر
                  </h3>
                  <div style={{ display: 'grid', gap: '15px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: 800, fontSize: '13px' }}>رقم الهوية / الإقامة *</label>
                      <input type="number" name="tenantId" className="input" required value={formData.tenantId} onChange={handleChange} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: 800, fontSize: '13px' }}>تاريخ الميلاد *</label>
                      <DateInputs dayName="tenantDobDay" monthName="tenantDobMonth" yearName="tenantDobYear" dayVal={formData.tenantDobDay} monthVal={formData.tenantDobMonth} yearVal={formData.tenantDobYear} handleChange={handleChange} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: 800, fontSize: '13px' }}>رقم الجوال (المرتبط بأبشر) *</label>
                      <input type="tel" name="tenantPhone" className="input" placeholder="05XXXXXXXX" required value={formData.tenantPhone} onChange={handleChange} />
                    </div>
                  </div>
                </div>
              </div>

              <hr style={{ border: '0', borderTop: '1px solid var(--border)', margin: '0' }} />

              <div>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: 'var(--text)' }}>بيانات الصك والعقار</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>رقم الصك *</label>
                    <input type="number" name="deedNumber" className="input" required value={formData.deedNumber} onChange={handleChange} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>تاريخ الصك *</label>
                    <DateInputs dayName="deedDay" monthName="deedMonth" yearName="deedYear" dayVal={formData.deedDay} monthVal={formData.deedMonth} yearVal={formData.deedYear} handleChange={handleChange} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>نوع العقار *</label>
                    <select name="propertyType" className="input" required value={formData.propertyType} onChange={handleChange}>
                      <option value="شقة">شقة</option><option value="فيلا">فيلا</option><option value="ملحق">ملحق</option><option value="عمارة كاملة">عمارة كاملة</option><option value="محل تجاري">محل تجاري</option><option value="مكتب">مكتب</option><option value="أرض">أرض</option><option value="غرفة">غرفة</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>إرفاق صورة الصك</label>
                    <input type="file" accept="image/*,.pdf" className="input" style={{ padding: '10px' }} />
                  </div>
                </div>
              </div>

              <hr style={{ border: '0', borderTop: '1px solid var(--border)', margin: '0' }} />

              <div>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: 'var(--text)' }}>تفاصيل العقد المالي</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>تاريخ بداية العقد *</label>
                    <DateInputs dayName="startDay" monthName="startMonth" yearName="startYear" dayVal={formData.startDay} monthVal={formData.startMonth} yearVal={formData.startYear} handleChange={handleChange} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>مدة العقد *</label>
                    <input type="text" name="contractDuration" className="input" placeholder="مثال: سنة، 6 أشهر، سنتين" required value={formData.contractDuration} onChange={handleChange} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>قيمة الإيجار (ريال) *</label>
                    <input type="number" name="rentAmount" className="input" placeholder="الإجمالي" required value={formData.rentAmount} onChange={handleChange} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>آلية الدفع (الدفعات) *</label>
                    <select name="paymentFrequency" className="input" required value={formData.paymentFrequency} onChange={handleChange}>
                      <option value="شهري">شهري</option><option value="ربع سنوي (كل 3 أشهر)">ربع سنوي (كل 3 أشهر)</option><option value="نصف سنوي (دفعتين)">نصف سنوي (دفعتين)</option><option value="سنوي (دفعة واحدة)">سنوي (دفعة واحدة)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>حالة عداد الكهرباء *</label>
                  <select name="electricityStatus" className="input" required value={formData.electricityStatus} onChange={handleChange} style={{ marginBottom: '15px' }}>
                    <option value="مستقل برقم حساب">مستقل برقم حساب</option><option value="شامل قيمة الإيجار">شامل قيمة الإيجار</option><option value="مشترك (يتم القسمة)">مشترك (يتم القسمة)</option>
                  </select>
                  {formData.electricityStatus === 'مستقل برقم حساب' && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>رقم حساب الكهرباء *</label>
                      <input type="number" name="electricityNumber" className="input" required value={formData.electricityNumber} onChange={handleChange} />
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>ملاحظات واشتراطات إضافية (اختياري)</label>
                  <textarea name="details" className="input" placeholder="أي التزامات على المستأجر أو المالك..." style={{ minHeight: '120px', resize: 'vertical' }} value={formData.details} onChange={handleChange}></textarea>
                </div>
              </div>

              <div style={{ marginTop: '20px' }}>
                <button type="submit" className="btn btnPrimary" disabled={saving} style={{ width: '100%', fontSize: '18px', padding: '16px' }}>
                  {saving ? 'جاري حفظ طلب التوثيق...' : 'حفظ طلب التوثيق وإرساله'}
                  <span className="material-icons-outlined">receipt_long</span>
                </button>
                <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--muted)', marginTop: '14px' }}>سيتم حفظ الطلب في لوحة التحكم، ثم يمكن إرسال نسخة واتساب اختيارياً.</p>
              </div>
            </form>
          </div>
        </div>
      </div>
      <style jsx>{`
        @media (max-width: 768px) { .responsive-grid { grid-template-columns: 1fr !important; } }
        .alert { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-radius: 14px; margin-bottom: 22px; font-weight: 800; line-height: 1.8; }
        .successAlert { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
        .errorAlert { background: #fff5f5; color: #c53030; border: 1px solid #fed7d7; }
      `}</style>
    </>
  );
}
