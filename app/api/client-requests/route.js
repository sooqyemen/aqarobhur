import { NextResponse } from 'next/server';
import { createRequest } from '@/lib/listings';

const WHATSAPP_NUMBER = String(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '966597520693').replace(/\D/g, '');

export async function POST(request) {
  try {
    const body = await request.json();

    const payload = {
      dealType: String(body?.dealType || '').trim(),
      propertyType: String(body?.propertyType || '').trim(),
      neighborhood: String(body?.neighborhood || '').trim(),
      plan: String(body?.plan || '').trim(),
      part: String(body?.part || '').trim(),
      budgetMin: body?.budgetMin ?? null,
      budgetMax: body?.budgetMax ?? null,
      areaMin: body?.areaMin ?? null,
      areaMax: body?.areaMax ?? null,
      name: String(body?.name || '').trim(),
      phone: String(body?.phone || '').trim(),
      note: String(body?.note || body?.notes || '').trim(),
      waText: String(body?.waText || '').trim(),
      status: 'new',
      source: String(body?.source || 'smart_agent').trim(),
      sourceType: 'العقاري الذكي',
    };

    if (!payload.propertyType) {
      return NextResponse.json({ error: 'نوع العقار مطلوب.' }, { status: 400 });
    }

    if (!payload.name || !payload.phone) {
      return NextResponse.json({ error: 'الاسم ورقم الجوال مطلوبان.' }, { status: 400 });
    }

    const id = await createRequest(payload);

    const waText = [
      'السلام عليكم',
      'تم تسجيل طلبك في عقار أبحر بنجاح.',
      `رقم الطلب: ${id}`,
      payload.note ? `ملاحظات الطلب: ${payload.note}` : '',
      'وسنتواصل معك ونوفر لك المناسب بأقرب وقت.',
    ].filter(Boolean).join('\n');

    const whatsappLink = WHATSAPP_NUMBER
      ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waText)}`
      : '';

    return NextResponse.json({
      ok: true,
      id,
      message: 'تم تسجيل طلبك بنجاح، وسنتواصل معك ونوفر لك المناسب بأقرب وقت.',
      whatsappLink,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'تعذر حفظ طلب العميل.' },
      { status: 500 }
    );
  }
}
