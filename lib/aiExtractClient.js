// lib/aiExtractClient.js

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function extractPropertyFromText(text) {
  if (!text) throw new Error("No text provided");

  const response = await client.responses.create({
    model: "gpt-5-mini",
    input: `
    أنت مساعد عقاري ذكي في جدة.

    استخرج بيانات العقار من النص التالي، وحاول فهمه حتى لو كان غير مرتب:

    "${text}"

    ملاحظات:
    - إذا لم تجد قيمة ضع null
    - السعر رقم فقط بدون عملة
    - المساحة رقم فقط
    - نوع العملية: sale أو rent
    `,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "property_extraction",
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            type: { type: "string" }, // أرض - فيلا - شقة
            purpose: { type: "string" }, // sale / rent
            city: { type: "string" },
            district: { type: "string" },
            price: { type: "number" },
            area: { type: "number" },
            rooms: { type: "number" },
            bathrooms: { type: "number" },
            streetWidth: { type: "number" },
            facade: { type: "string" },
            contact: { type: "string" },
            description: { type: "string" }
          },
          required: ["type", "purpose"]
        }
      }
    }
  });

  const jsonText = response.output[0].content[0].text;

  return JSON.parse(jsonText);
}


// ✅ حساب نسبة الثقة
export function calculateConfidence(data) {
  let score = 0;

  if (data.price) score += 15;
  if (data.city) score += 10;
  if (data.district) score += 10;
  if (data.type) score += 15;
  if (data.purpose) score += 15;
  if (data.area) score += 10;
  if (data.contact) score += 10;
  if (data.rooms) score += 5;
  if (data.bathrooms) score += 5;
  if (data.streetWidth) score += 5;
  if (data.facade) score += 5;

  return score; // من 100
}
