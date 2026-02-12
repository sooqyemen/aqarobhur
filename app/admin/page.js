diff --git a/app/admin/page.js b/app/admin/page.js
index 7d4ef27fb6c457580e9d7064d1d7e4b2f27fec03..ec8dcd7fdd656a70b3a95bdb4a92c24397888409 100644
--- a/app/admin/page.js
+++ b/app/admin/page.js
@@ -20,50 +20,65 @@ const LISTINGS_COLLECTION = 'abhur_listings';
 const MAX_FILES = 30; // بدون ما نعرضه للمستخدم
 
 function Field({ label, children, hint }) {
   return (
     <div>
       <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>{label}</div>
       {children}
       {hint ? <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{hint}</div> : null}
     </div>
   );
 }
 
 function uniq(arr) {
   return Array.from(new Set((arr || []).map((x) => String(x || '').trim()).filter(Boolean)));
 }
 
 function toNumberOrNull(v) {
   const n = Number(String(v ?? '').replace(/,/g, '').trim());
   return Number.isFinite(n) ? n : null;
 }
 
 function toTextOrEmpty(v) {
   return v == null ? '' : String(v);
 }
 
+function toBooleanOrNull(v) {
+  if (v === true || v === false) return v;
+  const s = String(v ?? '').trim().toLowerCase();
+  if (!s) return null;
+  if (['true', '1', 'yes', 'y', 'نعم'].includes(s)) return true;
+  if (['false', '0', 'no', 'n', 'لا'].includes(s)) return false;
+  return null;
+}
+
+function boolToSelectValue(v) {
+  if (v === true) return 'yes';
+  if (v === false) return 'no';
+  return '';
+}
+
 function extractStoragePathFromDownloadURL(url) {
   // https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<path>?alt=media&token=...
   try {
     const u = new URL(url);
     const idx = u.pathname.indexOf('/o/');
     if (idx === -1) return '';
     const encoded = u.pathname.slice(idx + 3);
     return decodeURIComponent(encoded);
   } catch {
     return '';
   }
 }
 
 function extractLatLngFromUrl(url) {
   // يدعم روابط قوقل ماب الشائعة:
   // - .../@lat,lng,..
   // - ?q=lat,lng
   // - ?query=lat,lng
   try {
     const s = String(url || '').trim();
     if (!s) return { lat: null, lng: null };
 
     // @lat,lng
     const m1 = s.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
     if (m1) return { lat: Number(m1[1]), lng: Number(m1[2]) };
@@ -403,50 +418,62 @@ export default function AdminPage() {
   const [actionBusyId, setActionBusyId] = useState('');
 
   // ✅ ملفات الصور قبل الرفع
   // { id, file, preview, selected, progress, status: 'ready'|'uploading'|'done'|'error', error? }
   const [queue, setQueue] = useState([]);
   const [uploading, setUploading] = useState(false);
   const [uploadErr, setUploadErr] = useState('');
   const fileInputRef = useRef(null);
 
   const emptyForm = useMemo(
     () => ({
       title: '',
       neighborhood: '',
       plan: '',
       part: '',
       dealType: 'sale',
       propertyType: 'أرض',
       propertyClass: '',
       area: '',
       price: '',
       status: 'available',
       direct: true,
       websiteUrl: '', // رابط موقع العقار
       lat: '', // ✅ يتم حفظه تلقائيًا من الخريطة/الرابط
       lng: '', // ✅ يتم حفظه تلقائيًا من الخريطة/الرابط
+      bedrooms: '',
+      bathrooms: '',
+      floor: '',
+      lounges: '',
+      majlis: '',
+      kitchen: '',
+      maidRoom: '',
+      driverRoom: '',
+      yard: '',
+      streetWidth: '',
+      facade: '',
+      age: '',
       description: '',
       images: [], // URLs
     }),
     []
   );
 
   const [form, setForm] = useState(emptyForm);
   const [list, setList] = useState([]);
   const [loadingList, setLoadingList] = useState(false);
 
   const isAdmin = useMemo(() => isAdminUser(user), [user]);
 
   useEffect(() => {
     if (!auth) return;
     return onAuthStateChanged(auth, (u) => setUser(u || null));
   }, [auth]);
 
   // تنظيف object URLs
   useEffect(() => {
     return () => {
       queue.forEach((q) => {
         try {
           if (q?.preview) URL.revokeObjectURL(q.preview);
         } catch {}
       });
@@ -642,50 +669,62 @@ const url = await getDownloadURL(task.snapshot.ref);
     const urlFromItem = toTextOrEmpty(item.websiteUrl || item.website || item.url || '');
     const fromUrl = extractLatLngFromUrl(urlFromItem);
 
     const latFromItem = toNumberOrNull(item.lat);
     const lngFromItem = toNumberOrNull(item.lng);
 
     const latFinal = isFiniteNumber(latFromItem) ? latFromItem : (isFiniteNumber(fromUrl.lat) ? fromUrl.lat : null);
     const lngFinal = isFiniteNumber(lngFromItem) ? lngFromItem : (isFiniteNumber(fromUrl.lng) ? fromUrl.lng : null);
 
     setForm({
       ...emptyForm,
       title: toTextOrEmpty(item.title),
       neighborhood: toTextOrEmpty(item.neighborhood),
       plan: toTextOrEmpty(item.plan),
       part: toTextOrEmpty(item.part),
       dealType: toTextOrEmpty(item.dealType || 'sale'),
       propertyType: toTextOrEmpty(item.propertyType || 'أرض'),
       propertyClass: toTextOrEmpty(item.propertyClass || ''),
       area: item.area == null ? '' : String(item.area),
       price: item.price == null ? '' : String(item.price),
       status: toTextOrEmpty(item.status || 'available'),
       direct: !!item.direct,
       websiteUrl: urlFromItem,
       lat: latFinal == null ? '' : String(round6(latFinal)),
       lng: lngFinal == null ? '' : String(round6(lngFinal)),
+      bedrooms: item.bedrooms == null ? '' : String(item.bedrooms),
+      bathrooms: item.bathrooms == null ? '' : String(item.bathrooms),
+      floor: item.floor == null ? '' : String(item.floor),
+      lounges: item.lounges == null ? '' : String(item.lounges),
+      majlis: item.majlis == null ? '' : String(item.majlis),
+      kitchen: boolToSelectValue(toBooleanOrNull(item.kitchen)),
+      maidRoom: boolToSelectValue(toBooleanOrNull(item.maidRoom)),
+      driverRoom: boolToSelectValue(toBooleanOrNull(item.driverRoom)),
+      yard: boolToSelectValue(toBooleanOrNull(item.yard)),
+      streetWidth: item.streetWidth == null ? '' : String(item.streetWidth),
+      facade: toTextOrEmpty(item.facade),
+      age: item.age == null ? '' : String(item.age),
       description: toTextOrEmpty(item.description),
       images: uniq(images),
     });
 
     clearQueue();
     setTab('create');
     window?.scrollTo?.({ top: 0, behavior: 'smooth' });
   }
 
   function removeImageFromForm(url) {
     setForm((p) => ({ ...p, images: (p.images || []).filter((u) => u !== url) }));
   }
 
   function setCoords(lat, lng, { updateUrl = true } = {}) {
     const a = round6(lat);
     const b = round6(lng);
     setForm((p) => ({
       ...p,
       lat: String(a),
       lng: String(b),
       websiteUrl: updateUrl ? buildGoogleMapsUrl(a, b) : p.websiteUrl,
     }));
   }
 
   function clearCoords() {
@@ -702,50 +741,62 @@ const url = await getDownloadURL(task.snapshot.ref);
       // ✅ أولاً: نعتمد إحداثيات الخريطة إن وجدت
       const latFromForm = toNumberOrNull(form.lat);
       const lngFromForm = toNumberOrNull(form.lng);
 
       let lat = isFiniteNumber(latFromForm) ? latFromForm : null;
       let lng = isFiniteNumber(lngFromForm) ? lngFromForm : null;
 
       // ✅ ثانياً: لو ما فيه إحداثيات من الخريطة، نجرب نلتقطها من الرابط
       if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) {
         const fromUrl = extractLatLngFromUrl(websiteUrl);
         if (isFiniteNumber(fromUrl.lat) && isFiniteNumber(fromUrl.lng)) {
           lat = fromUrl.lat;
           lng = fromUrl.lng;
         }
       }
 
       const hasCoords = isFiniteNumber(lat) && isFiniteNumber(lng);
 
       // ✅ لو عندنا إحداثيات ولا يوجد رابط، نبنيه تلقائيًا
       const finalWebsiteUrl = websiteUrl || (hasCoords ? buildGoogleMapsUrl(lat, lng) : '');
 
       const payload = {
         ...form,
         area: toNumberOrNull(form.area),
         price: toNumberOrNull(form.price),
+        bedrooms: toNumberOrNull(form.bedrooms),
+        bathrooms: toNumberOrNull(form.bathrooms),
+        floor: toNumberOrNull(form.floor),
+        lounges: toNumberOrNull(form.lounges),
+        majlis: toNumberOrNull(form.majlis),
+        streetWidth: toNumberOrNull(form.streetWidth),
+        age: toNumberOrNull(form.age),
+        kitchen: toBooleanOrNull(form.kitchen),
+        maidRoom: toBooleanOrNull(form.maidRoom),
+        driverRoom: toBooleanOrNull(form.driverRoom),
+        yard: toBooleanOrNull(form.yard),
+        facade: toTextOrEmpty(form.facade).trim(),
         images,
         websiteUrl: finalWebsiteUrl,
         ...(hasCoords ? { lat: round6(lat), lng: round6(lng) } : {}),
       };
 
       if (editingId) {
         await adminUpdateListing(editingId, payload);
         alert('تم تحديث الإعلان ✅');
         await loadList();
       } else {
         const id = await adminCreateListing(payload);
         setCreatedId(id);
         alert('تمت إضافة الإعلان ✅');
       }
 
       resetToCreate();
     } catch (err) {
       alert('حصل خطأ أثناء حفظ الإعلان. راجع إعداد Firebase وقواعد Firestore.');
       console.error(err);
     } finally {
       setBusy(false);
     }
   }
 
   async function loadList() {
@@ -867,50 +918,53 @@ const url = await getDownloadURL(task.snapshot.ref);
     );
   }
 
   if (!isAdmin) {
     return (
       <div className="container" style={{ paddingTop: 16 }}>
         <h1 style={{ margin: '6px 0 4px' }}>غير مصرح</h1>
         <div className="muted">هذا الحساب ليس ضمن قائمة الأدمن.</div>
         <section className="card" style={{ marginTop: 12 }}>
           <div className="muted">الإيميل: {user.email || '—'}</div>
           <div className="muted" style={{ marginTop: 8 }}>
             أضف الإيميل داخل <code>NEXT_PUBLIC_ADMIN_EMAILS</code> في Vercel ثم أعد النشر.
           </div>
 
           <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
             <button className="btn" onClick={logout}>تسجيل خروج</button>
           </div>
         </section>
       </div>
     );
   }
 
   const latNum = toNumberOrNull(form.lat);
   const lngNum = toNumberOrNull(form.lng);
   const hasCoords = isFiniteNumber(latNum) && isFiniteNumber(lngNum);
+  const isApartment = form.propertyType === 'شقة';
+  const isVilla = form.propertyType === 'فيلا';
+  const isLand = form.propertyType === 'أرض';
 
   return (
     <div className="container" style={{ paddingTop: 16 }}>
       <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
         <div>
           <h1 style={{ margin: '6px 0 0' }}>لوحة الأدمن</h1>
           <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>{user.email}</div>
         </div>
         <button className="btn" onClick={logout}>تسجيل خروج</button>
       </div>
 
       <section className="card" style={{ marginTop: 12 }}>
         <div className="row">
           <button className={tab === 'create' ? 'btnPrimary' : 'btn'} onClick={() => setTab('create')}>إضافة/تعديل عرض</button>
           <button className={tab === 'manage' ? 'btnPrimary' : 'btn'} onClick={() => setTab('manage')}>إدارة العروض</button>
         </div>
       </section>
 
       {tab === 'create' ? (
         <section className="card" style={{ marginTop: 12 }}>
           <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
             <div style={{ fontWeight: 900 }}>{editingId ? 'تعديل الإعلان' : 'إضافة إعلان'}</div>
             {editingId ? <button className="btn" onClick={resetToCreate}>إلغاء التعديل</button> : null}
           </div>
 
@@ -923,78 +977,193 @@ const url = await getDownloadURL(task.snapshot.ref);
           <div className="grid" style={{ marginTop: 10 }}>
             <div className="col-6">
               <Field label="عنوان العرض">
                 <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: فيلا للبيع في حي الزمرد" />
               </Field>
             </div>
 
             <div className="col-3">
               <Field label="الحي">
                 <select className="select" value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}>
                   <option value="">اختر</option>
                   {NEIGHBORHOODS.map((n) => <option key={n} value={n}>{n}</option>)}
                 </select>
               </Field>
             </div>
 
             <div className="col-3">
               <Field label="مباشر">
                 <select className="select" value={form.direct ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, direct: e.target.value === 'yes' })}>
                   <option value="yes">نعم</option>
                   <option value="no">وسيط/وكيل</option>
                 </select>
               </Field>
             </div>
 
-            <div className="col-3">
-              <Field label="المخطط">
-                <input className="input" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} placeholder="مثال: مخطط الخالدية السياحي272/ب" />
-              </Field>
-            </div>
+            {isLand ? (
+              <>
+                <div className="col-3">
+                  <Field label="المخطط">
+                    <input className="input" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} placeholder="مثال: مخطط الخالدية السياحي272/ب" />
+                  </Field>
+                </div>
 
-            <div className="col-3">
-              <Field label="الجزء">
-                <input className="input" value={form.part} onChange={(e) => setForm({ ...form, part: e.target.value })} placeholder="مثال: الجزء ج " />
-              </Field>
-            </div>
+                <div className="col-3">
+                  <Field label="الجزء">
+                    <input className="input" value={form.part} onChange={(e) => setForm({ ...form, part: e.target.value })} placeholder="مثال: الجزء ج " />
+                  </Field>
+                </div>
+              </>
+            ) : null}
 
             <div className="col-3">
               <Field label="بيع/إيجار">
                 <select className="select" value={form.dealType} onChange={(e) => setForm({ ...form, dealType: e.target.value })}>
                   {DEAL_TYPES.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
                 </select>
               </Field>
             </div>
 
             <div className="col-3">
               <Field label="نوع العقار">
                 <select className="select" value={form.propertyType} onChange={(e) => setForm({ ...form, propertyType: e.target.value })}>
                   {PROPERTY_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
                 </select>
               </Field>
             </div>
 
+
+            {isApartment ? (
+              <>
+                <div className="col-3">
+                  <Field label="الدور">
+                    <input className="input" inputMode="numeric" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} placeholder="مثال: 3" />
+                  </Field>
+                </div>
+                <div className="col-3">
+                  <Field label="عدد الغرف">
+                    <input className="input" inputMode="numeric" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} placeholder="مثال: 4" />
+                  </Field>
+                </div>
+                <div className="col-3">
+                  <Field label="عدد الصالات">
+                    <input className="input" inputMode="numeric" value={form.lounges} onChange={(e) => setForm({ ...form, lounges: e.target.value })} placeholder="مثال: 1" />
+                  </Field>
+                </div>
+                <div className="col-3">
+                  <Field label="عدد المجالس">
+                    <input className="input" inputMode="numeric" value={form.majlis} onChange={(e) => setForm({ ...form, majlis: e.target.value })} placeholder="مثال: 1" />
+                  </Field>
+                </div>
+                <div className="col-3">
+                  <Field label="عدد دورات المياه">
+                    <input className="input" inputMode="numeric" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} placeholder="مثال: 3" />
+                  </Field>
+                </div>
+                <div className="col-3">
+                  <Field label="مطبخ راكب؟">
+                    <select className="select" value={form.kitchen} onChange={(e) => setForm({ ...form, kitchen: e.target.value })}>
+                      <option value="">غير محدد</option>
+                      <option value="yes">نعم</option>
+                      <option value="no">لا</option>
+                    </select>
+                  </Field>
+                </div>
+                <div className="col-3">
+                  <Field label="غرفة خادمة؟">
+                    <select className="select" value={form.maidRoom} onChange={(e) => setForm({ ...form, maidRoom: e.target.value })}>
+                      <option value="">غير محدد</option>
+                      <option value="yes">نعم</option>
+                      <option value="no">لا</option>
+                    </select>
+                  </Field>
+                </div>
+              </>
+            ) : null}
+
+            {isVilla ? (
+              <>
+                <div className="col-3">
+                  <Field label="عمر العقار">
+                    <input className="input" inputMode="numeric" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="مثال: 8" />
+                  </Field>
+                </div>
+                <div className="col-3">
+                  <Field label="عرض الشارع">
+                    <input className="input" inputMode="numeric" value={form.streetWidth} onChange={(e) => setForm({ ...form, streetWidth: e.target.value })} placeholder="مثال: 20" />
+                  </Field>
+                </div>
+                <div className="col-3">
+                  <Field label="الواجهة">
+                    <input className="input" value={form.facade} onChange={(e) => setForm({ ...form, facade: e.target.value })} placeholder="مثال: شمالية" />
+                  </Field>
+                </div>
+                <div className="col-3">
+                  <Field label="عدد الغرف">
+                    <input className="input" inputMode="numeric" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} placeholder="مثال: 6" />
+                  </Field>
+                </div>
+                <div className="col-3">
+                  <Field label="عدد الصالات">
+                    <input className="input" inputMode="numeric" value={form.lounges} onChange={(e) => setForm({ ...form, lounges: e.target.value })} placeholder="مثال: 2" />
+                  </Field>
+                </div>
+                <div className="col-3">
+                  <Field label="عدد دورات المياه">
+                    <input className="input" inputMode="numeric" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} placeholder="مثال: 5" />
+                  </Field>
+                </div>
+                <div className="col-3">
+                  <Field label="غرفة خادمة؟">
+                    <select className="select" value={form.maidRoom} onChange={(e) => setForm({ ...form, maidRoom: e.target.value })}>
+                      <option value="">غير محدد</option>
+                      <option value="yes">نعم</option>
+                      <option value="no">لا</option>
+                    </select>
+                  </Field>
+                </div>
+                <div className="col-3">
+                  <Field label="غرفة سائق؟">
+                    <select className="select" value={form.driverRoom} onChange={(e) => setForm({ ...form, driverRoom: e.target.value })}>
+                      <option value="">غير محدد</option>
+                      <option value="yes">نعم</option>
+                      <option value="no">لا</option>
+                    </select>
+                  </Field>
+                </div>
+                <div className="col-3">
+                  <Field label="حوش؟">
+                    <select className="select" value={form.yard} onChange={(e) => setForm({ ...form, yard: e.target.value })}>
+                      <option value="">غير محدد</option>
+                      <option value="yes">نعم</option>
+                      <option value="no">لا</option>
+                    </select>
+                  </Field>
+                </div>
+              </>
+            ) : null}
+
             <div className="col-3">
               <Field label="سكني/تجاري" hint="اختياري — إذا تركته (تلقائي) سيتحدد حسب نوع العقار.">
                 <select className="select" value={form.propertyClass} onChange={(e) => setForm({ ...form, propertyClass: e.target.value })}>
                   <option value="">تلقائي</option>
                   {PROPERTY_CLASSES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                 </select>
               </Field>
             </div>
 
             <div className="col-3">
               <Field label="المساحة (م²)">
                 <input className="input" inputMode="numeric" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="مثال: 312" />
               </Field>
             </div>
 
             <div className="col-3">
               <Field label="السعر">
                 <input className="input" inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="مثال: 1350000" />
               </Field>
             </div>
 
             <div className="col-3">
               <Field label="الحالة">
                 <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                   {STATUS_OPTIONS.filter((s) => ['available', 'reserved', 'sold', 'rented'].includes(s.key)).map((s) => (
