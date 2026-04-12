'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytesResumable } from 'firebase/storage';

import AdminGuard from '@/components/admin/AdminGuard';
import AdminShell from '@/components/admin/AdminShell';
import { formatPriceSAR, statusBadge } from '@/lib/format';
import { getFirebase } from '@/lib/firebaseClient';
import { adminDeleteListing, adminUpdateListing, fetchListingById, getListingMedia } from '@/lib/listings';
import { DEAL_TYPES, NEIGHBORHOODS, PROPERTY_CLASSES, PROPERTY_TYPES, STATUS_OPTIONS } from '@/lib/taxonomy';

const MAX_FILES = 30;

function cleanString(value) { return String(value || '').trim(); }

function toNum(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

function isVideo(entry) {
  const kind = cleanString(entry?.kind).toLowerCase();
  if (kind === 'video') return true;
  const url = cleanString(entry?.url).toLowerCase();
  return ['.mp4', '.mov', '.webm', '.m4v'].some((ext) => url.includes(ext));
}

function safeFileName(file) { return cleanString(file?.name || 'file').replace(/[^\w.\-]+/g, '_'); }

function mediaEqual(a, b) {
  if (!a || !b) return false;
  if (a.refPath && b.refPath) return a.refPath === b.refPath;
  return a.url === b.url;
}

function mapListingToForm(item) {
  return {
    title: cleanString(item?.title),
    neighborhood: cleanString(item?.neighborhood),
    plan: cleanString(item?.plan),
    part: cleanString(item?.part),
    dealType: cleanString(item?.dealType || 'sale'),
    propertyType: cleanString(item?.propertyType || 'أرض'),
    propertyClass: cleanString(item?.propertyClass),
    price: item?.price ?? '',
    area: item?.area ?? '',
    status: cleanString(item?.status || 'available'),
    licenseNumber: cleanString(item?.licenseNumber || item?.license),
    contactPhone: cleanString(item?.contactPhone || item?.phone || item?.mobile || item?.whatsapp),
    description: cleanString(item?.description),
    lat: item?.lat ?? '',
    lng: item?.lng ?? '',
  };
}

function InfoCard({ icon, label, value }) {
  return (
    <div className="infoCard">
      <span className="material-icons-outlined cardIcon">{icon}</span>
      <div className="infoContent">
        <div className="infoLabel">{label}</div>
        <div className="infoValue">{value || '—'}</div>
      </div>
    </div>
  );
}

function MediaTile({ entry, selected, onToggle, onMakePrimary, onDelete }) {
  const video = isVideo(entry);
  return (
    <div className={`mediaTile ${selected ? 'selected' : ''}`}>
      <div className="mediaActionsTop">
         <label className="checkboxLabel">
          <input type="checkbox" checked={selected} onChange={onToggle} />
          <span className="checkmark"></span>
         </label>
      </div>
      <div className="mediaPreview">
        {video ? (
          <video src={entry.url} className="mediaElement" controls preload="metadata" />
        ) : (
          <img src={entry.url} alt={entry.name || 'صورة الإعلان'} className="mediaElement" loading="lazy" />
        )}
      </div>
      <div className="mediaDetails">
        <div className="mediaName" title={entry.name}>{entry.name || 'ملف مرفوع'}</div>
      </div>
      <div className="mediaActionsBottom">
        <button type="button" className="btnSmall" onClick={onMakePrimary} title="جعل هذه الصورة هي الغلاف">
            <span className="material-icons-outlined">star_border</span> رئيسية
        </button>
        <button type="button" className="btnSmall btnDanger" onClick={onDelete} title="حذف هذا الملف">
            <span className="material-icons-outlined">delete_outline</span> حذف
        </button>
      </div>
    </div>
  );
}

export default function AdminListingEditPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = cleanString(params?.id);
  const { storage } = getFirebase();
  const fileInputRef = useRef(null);

  const [listing, setListing] = useState(null);
  const [form, setForm] = useState(() => mapListingToForm(null));
  const [media, setMedia] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); 
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedEntries = useMemo(() => {
    return media.filter((entry) => selectedKeys.includes(entry.refPath || entry.url));
  }, [media, selectedKeys]);

  const load = useCallback(async () => {
    if (!listingId) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchListingById(listingId, { includeLegacy: false });
      if (!data) {
        setError('تعذر العثور على الإعلان المطلوب.');
        setListing(null);
        setMedia([]);
        return;
      }
      setListing(data);
      setForm(mapListingToForm(data));
      setMedia(getListingMedia(data));
      setSelectedKeys([]);
    } catch (e) {
      setError(String(e?.message || 'حدث خطأ أثناء تحميل بيانات الإعلان.'));
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => { setSuccess(''); setError(''); }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const syncMediaToDoc = useCallback(async (nextMedia, { message = '' } = {}) => {
    await adminUpdateListing(listingId, {
      imagesMeta: nextMedia,
      images: nextMedia.map((item) => item.url),
    });
    setMedia(nextMedia);
    setListing((prev) => (prev ? { ...prev, imagesMeta: nextMedia, images: nextMedia.map((item) => item.url) } : prev));
    setSelectedKeys([]);
    if (message) setSuccess(message);
  }, [listingId]);

  const updateFormField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveDetails = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (!cleanString(form.title)) throw new Error('الرجاء كتابة عنوان الإعلان أولاً.');
      if (!cleanString(form.neighborhood)) throw new Error('الرجاء اختيار الحي العقاري.');

      const patch = {
        title: cleanString(form.title),
        neighborhood: cleanString(form.neighborhood),
        plan: cleanString(form.plan),
        part: cleanString(form.part),
        dealType: cleanString(form.dealType || 'sale'),
        propertyType: cleanString(form.propertyType || 'أرض'),
        propertyClass: cleanString(form.propertyClass),
        price: toNum(form.price),
        area: toNum(form.area),
        status: cleanString(form.status || 'available'),
        licenseNumber: cleanString(form.licenseNumber),
        contactPhone: cleanString(form.contactPhone),
        description: cleanString(form.description),
        lat: toNum(form.lat),
        lng: toNum(form.lng),
      };

      await adminUpdateListing(listingId, patch);
      setListing((prev) => (prev ? { ...prev, ...patch } : prev));
      setSuccess('تم تحديث بيانات الإعلان بنجاح.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(String(e?.message || 'تعذر حفظ التعديلات. يرجى المحاولة مجدداً.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleEntry = (entry) => {
    const key = entry.refPath || entry.url;
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  };

  const selectAll = () => setSelectedKeys(media.map((entry) => entry.refPath || entry.url));
  const clearSelection = () => setSelectedKeys([]);

  const deleteEntries = async (entriesToDelete) => {
    if (!entriesToDelete.length) return setError('الرجاء تحديد صورة واحدة على الأقل للحذف.');
    if (!window.confirm(`هل أنت متأكد من حذف ${entriesToDelete.length} ملف(ات) نهائياً؟`)) return;

    setIsProcessingMedia(true);
    setError('');
    setSuccess('');
    try {
      for (const entry of entriesToDelete) {
        if (entry.refPath) {
          try { await deleteObject(storageRef(storage, entry.refPath)); } catch (_) {}
        }
      }
      const remaining = media.filter((entry) => !entriesToDelete.some((target) => mediaEqual(entry, target)));
      await syncMediaToDoc(remaining, { message: `تم حذف ${entriesToDelete.length} ملف(ات) بنجاح.` });
    } catch (e) {
      setError('تعذر إتمام عملية الحذف لبعض الملفات.');
    } finally {
      setIsProcessingMedia(false);
    }
  };

  const deleteSelected = () => deleteEntries(selectedEntries);

  const makePrimary = async (entry) => {
    setIsProcessingMedia(true);
    try {
      const rest = media.filter((item) => !mediaEqual(item, entry));
      const next = [entry, ...rest]; 
      await syncMediaToDoc(next, { message: 'تم تعيين الصورة لتكون غلاف الإعلان.' });
    } catch (e) {
      setError('تعذر تحديث ترتيب الصور.');
    } finally {
      setIsProcessingMedia(false);
    }
  };

  const uploadFiles = async (event) => {
    const files = Array.from(event.target.files || []).slice(0, MAX_FILES);
    if (!files.length) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError('');
    setSuccess('');

    try {
      const uploaded = [];
      let completedFiles = 0;

      for (const file of files) {
        // تم تغيير المسار ليكون خاص بعقار أبحر
        const path = `aqarobhur_images/listings/${listingId}/${Date.now()}_${Math.random().toString(16).slice(2)}_${safeFileName(file)}`;
        const refObj = storageRef(storage, path);
        const task = uploadBytesResumable(refObj, file);

        await new Promise((resolve, reject) => {
          task.on('state_changed', 
            (snapshot) => {
               const progress = ((completedFiles + (snapshot.bytesTransferred / snapshot.totalBytes)) / files.length) * 100;
               setUploadProgress(Math.round(progress));
            }, 
            reject, 
            resolve
          );
        });

        const url = await getDownloadURL(task.snapshot.ref);
        uploaded.push({
          url,
          refPath: path,
          name: cleanString(file.name),
          kind: cleanString(file.type).startsWith('video/') ? 'video' : 'image',
        });
        
        completedFiles++;
      }

      const next = [...media, ...uploaded];
      await syncMediaToDoc(next, { message: `تم رفع وإضافة ${uploaded.length} ملف(ات) للإعلان بنجاح.` });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      setError('حدث خطأ أثناء رفع الملفات، قد يكون حجم الملف كبيراً جداً.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteListingNow = async () => {
    if (!window.confirm('🚨 تحذير: هذا الإجراء سيقوم بحذف الإعلان وجميع صوره نهائياً. هل أنت متأكد تماماً؟')) return;

    setIsProcessingMedia(true); 
    setError('');
    try {
      for (const entry of media) {
        if (entry.refPath) {
          try { await deleteObject(storageRef(storage, entry.refPath)); } catch (_) {}
        }
      }
      await adminDeleteListing(listingId);
      router.push('/admin/listings');
    } catch (e) {
      setError('حدث خطأ أثناء حذف الإعلان. يرجى المحاولة مرة أخرى.');
      setIsProcessingMedia(false);
    }
  };

  const coverEntry = media[0] || null;
  const cover = coverEntry?.url || '/placeholder-image.jpg';

  const isLocked = saving || isUploading || isProcessingMedia;

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
      
      <AdminGuard title="إدارة الإعلان">
        <AdminShell
          title="تعديل تفاصيل الإعلان"
          description="قم بتحديث بيانات العقار، وإدارة معرض الصور (رفع، حذف، تحديد الغلاف) لضمان ظهور الإعلان بأفضل شكل."
          actions={[
            <Link key="back" href="/admin/listings" className="btnHeaderOutline">العودة للعروض</Link>,
            <Link key="view" href={listingId ? `/listing/${listingId}` : '#'} className="btnHeaderPrimary" target="_blank">معاينة الإعلان</Link>,
          ]}
        >
          {error && <div className="alert alertError"><span className="material-icons-outlined">error</span> {error}</div>}
          {success && <div className="alert alertSuccess"><span className="material-icons-outlined">check_circle</span> {success}</div>}

          {loading ? (
             <div className="panel loadingPanel"><span className="material-icons-outlined spin">refresh</span> جاري تحميل بيانات الإعلان...</div>
          ) : !listing ? (
             <div className="panel emptyPanel"><span className="material-icons-outlined">find_in_page</span> الإعلان غير موجود أو تم حذفه مسبقاً.</div>
          ) : (
            <>
              {/* قسم العرض السريع (Hero Section) */}
              <section className="heroGrid">
                <div className="coverCard">
                  {isVideo(coverEntry) ? (
                    <video src={cover} className="coverImg" controls preload="metadata" />
                  ) : (
                    <img src={cover} alt="صورة الغلاف" className="coverImg" />
                  )}
                  <div className="coverLabel">صورة الغلاف</div>
                </div>

                <div className="panel heroDetails">
                  <div className="heroHeader">
                    <h2 className="heroTitle">{form.title || 'إعلان بدون عنوان'}</h2>
                    <p className="heroLocation"><span className="material-icons-outlined" style={{fontSize: '16px'}}>place</span> {[form.neighborhood, form.plan, form.part].filter(Boolean).join(' — ') || 'الموقع غير محدد بدقة'}</p>
                  </div>

                  <div className="heroTags">
                    <span className="badgeBadge">{form.dealType === 'rent' ? 'متاح للإيجار' : 'متاح للبيع'}</span>
                    <span className="badgeBadge typeBadge">{form.propertyType || 'غير مصنف'}</span>
                    <span>{statusBadge(form.status)}</span>
                  </div>

                  <div className="infoCardsGrid">
                    <InfoCard icon="payments" label="السعر" value={formatPriceSAR(form.price)} />
                    <InfoCard icon="square_foot" label="المساحة" value={form.area ? `${form.area} م²` : '—'} />
                    <InfoCard icon="collections" label="الوسائط" value={`${media.length} ملف`} />
                    <InfoCard icon="phone" label="التواصل" value={form.contactPhone || '—'} />
                  </div>
                </div>
              </section>

              {/* قسم بيانات الإعلان */}
              <section className="panel sectionPanel">
                <div className="sectionHeader">
                  <div className="sectionTitleWrap">
                    <span className="material-icons-outlined titleIcon">edit_document</span>
                    <div>
                        <h3>تفاصيل العقار</h3>
                        <p>قم بتحديث المعلومات الأساسية والسعر والحالة.</p>
                    </div>
                  </div>
                  <button className="btnPrimary" type="button" onClick={saveDetails} disabled={isLocked}>
                    <span className="material-icons-outlined">{saving ? 'autorenew' : 'save'}</span>
                    {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                  </button>
                </div>

                <div className="formGrid">
                  <Field label="عنوان الإعلان (إلزامي)">
                    <input className="input" value={form.title} onChange={(e) => updateFormField('title', e.target.value)} placeholder="مثال: فيلا فاخرة للبيع في المرجان..." />
                  </Field>

                  <Field label="الحي (إلزامي)">
                    <select className="input" value={form.neighborhood} onChange={(e) => updateFormField('neighborhood', e.target.value)}>
                      <option value="">اختر الحي</option>
                      {NEIGHBORHOODS.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </Field>

                  <Field label="نوع الصفقة">
                    <select className="input" value={form.dealType} onChange={(e) => updateFormField('dealType', e.target.value)}>
                      {DEAL_TYPES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                    </select>
                  </Field>

                  <Field label="نوع العقار">
                    <select className="input" value={form.propertyType} onChange={(e) => updateFormField('propertyType', e.target.value)}>
                      {PROPERTY_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </Field>

                  <Field label="التصنيف المتقدم">
                    <select className="input" value={form.propertyClass} onChange={(e) => updateFormField('propertyClass', e.target.value)}>
                      <option value="">بدون تصنيف</option>
                      {PROPERTY_CLASSES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                    </select>
                  </Field>

                  <Field label="حالة الظهور للمستخدمين">
                    <select className="input" value={form.status} onChange={(e) => updateFormField('status', e.target.value)}>
                      {STATUS_OPTIONS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                    </select>
                  </Field>

                  <Field label={`السعر المطلوب (${form.dealType === 'rent' ? 'سنوي' : 'إجمالي'})`}>
                    <div className="inputWithSuffix">
                        <input className="input" inputMode="numeric" value={form.price} onChange={(e) => updateFormField('price', e.target.value.replace(/[^\d]/g, ''))} placeholder="0" />
                        <span className="suffix">ريال</span>
                    </div>
                  </Field>

                  <Field label="المساحة">
                     <div className="inputWithSuffix">
                        <input className="input" inputMode="numeric" value={form.area} onChange={(e) => updateFormField('area', e.target.value.replace(/[^\d]/g, ''))} placeholder="0" />
                        <span className="suffix">م²</span>
                    </div>
                  </Field>

                  <Field label="المخطط (اختياري)">
                    <input className="input" value={form.plan} onChange={(e) => updateFormField('plan', e.target.value)} />
                  </Field>

                  <Field label="الجزء (اختياري)">
                    <input className="input" value={form.part} onChange={(e) => updateFormField('part', e.target.value)} />
                  </Field>

                  <Field label="رقم ترخيص فال">
                    <input className="input" value={form.licenseNumber} onChange={(e) => updateFormField('licenseNumber', e.target.value)} placeholder="مثال: 120000000" />
                  </Field>

                  <Field label="رقم الجوال المباشر للاتصال">
                    <input className="input" inputMode="tel" value={form.contactPhone} onChange={(e) => updateFormField('contactPhone', e.target.value.replace(/[^\d+]/g, ''))} dir="ltr" placeholder="05XXXXXXXX" />
                  </Field>

                  <div className="mapCoordinatesGroup">
                      <Field label="خط العرض (Latitude)">
                        <input className="input" inputMode="decimal" value={form.lat} onChange={(e) => updateFormField('lat', e.target.value)} dir="ltr" />
                      </Field>
                      <Field label="خط الطول (Longitude)">
                        <input className="input" inputMode="decimal" value={form.lng} onChange={(e) => updateFormField('lng', e.target.value)} dir="ltr" />
                      </Field>
                  </div>
                </div>

                <div className="fullWidthField">
                    <Field label="وصف تفصيلي للعقار ومميزاته">
                    <textarea className="input" rows={6} value={form.description} onChange={(e) => updateFormField('description', e.target.value)} placeholder="اكتب هنا جميع التفاصيل التي تهم المشتري أو المستأجر..." />
                    </Field>
                </div>
              </section>

              {/* قسم إدارة الوسائط */}
              <section className="panel sectionPanel">
                <div className="sectionHeader mediaHeaderWrap">
                  <div className="sectionTitleWrap">
                    <span className="material-icons-outlined titleIcon">collections</span>
                    <div>
                        <h3>معرض الوسائط ({media.length})</h3>
                        <p>ارفع صوراً أو مقاطع فيديو للعقار. يمكنك تحديد الغلاف أو حذف الملفات غير المرغوب فيها.</p>
                    </div>
                  </div>
                  
                  <div className="uploadActionWrap">
                      {isUploading && (
                          <div className="uploadProgressWrap">
                              <div className="progressBar"><div className="progressFill" style={{width: `${uploadProgress}%`}}></div></div>
                              <span className="progressText">{uploadProgress}%</span>
                          </div>
                      )}
                      <label className={`btnPrimary uploadBtn ${isLocked ? 'disabled' : ''}`}>
                        <span className="material-icons-outlined">cloud_upload</span>
                        {isUploading ? 'جاري رفع الملفات...' : 'إضافة وسائط جديدة'}
                        <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" onChange={uploadFiles} style={{ display: 'none' }} disabled={isLocked} />
                      </label>
                  </div>
                </div>

                {media.length > 0 && (
                    <div className="mediaToolbar">
                        <div className="toolbarLeft">
                            <button className="btnGhost" type="button" onClick={selectAll} disabled={isLocked}>تحديد الكل</button>
                            <button className="btnGhost" type="button" onClick={clearSelection} disabled={!selectedKeys.length || isLocked}>إلغاء التحديد</button>
                        </div>
                        <div className="toolbarRight">
                            <button className="btnDangerOutline" type="button" onClick={deleteSelected} disabled={!selectedEntries.length || isLocked}>
                            <span className="material-icons-outlined">delete</span>
                            حذف المحدد ({selectedEntries.length})
                            </button>
                        </div>
                    </div>
                )}

                {!media.length ? (
                  <div className="emptyMediaState">
                      <span className="material-icons-outlined">add_photo_alternate</span>
                      <h4>لا توجد أي وسائط لعرضها</h4>
                      <p>قم برفع صور للعقار لزيادة فرص تسويقه بنجاح.</p>
                  </div>
                ) : (
                  <div className="mediaGrid">
                    {media.map((entry, index) => (
                      <MediaTile
                        key={`${entry.refPath || entry.url}_${index}`}
                        entry={entry}
                        selected={selectedKeys.includes(entry.refPath || entry.url)}
                        onToggle={() => toggleEntry(entry)}
                        onMakePrimary={() => makePrimary(entry)}
                        onDelete={() => deleteEntries([entry])}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* قسم الخطر (حذف الإعلان) */}
              <section className="panel dangerPanel">
                <div className="sectionHeader" style={{marginBottom: 0}}>
                  <div className="sectionTitleWrap">
                    <span className="material-icons-outlined titleIcon" style={{color: '#e53e3e', background: '#fff5f5'}}>warning</span>
                    <div>
                        <h3 style={{color: '#e53e3e'}}>حذف الإعلان نهائياً</h3>
                        <p style={{color: '#c53030'}}>هذا الإجراء سيقوم بمسح العقار من قاعدة البيانات بشكل كامل ولا يمكن التراجع عنه.</p>
                    </div>
                  </div>
                  <button className="btnDanger" type="button" onClick={deleteListingNow} disabled={isLocked}>
                    <span className="material-icons-outlined">delete_forever</span>
                    حذف العقار
                  </button>
                </div>
              </section>
            </>
          )}
        </AdminShell>
      </AdminGuard>

      <style jsx>{`
        .panel { background: #ffffff; border-radius: 16px; border: 1px solid #edf2f7; box-shadow: 0 4px 6px rgba(0,0,0,0.02); margin-bottom: 25px; padding: 25px; }
        .loadingPanel, .emptyPanel { text-align: center; color: #718096; padding: 50px 20px; font-size: 16px; font-weight: 600; display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .loadingPanel .spin { animation: spin 1s linear infinite; font-size: 30px; color: var(--primary); }
        .emptyPanel .material-icons-outlined { font-size: 40px; color: #a0aec0; }
        
        .alert { display: flex; align-items: center; gap: 10px; padding: 15px; border-radius: 12px; margin-bottom: 20px; font-weight: 600; animation: fadeIn 0.3s ease-in; }
        .alertError { background: #fff5f5; color: #e53e3e; border: 1px solid #fed7d7; }
        .alertSuccess { background: #f0fff4; color: #38a169; border: 1px solid #c6f6d5; }
        
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

        .btnHeaderOutline { padding: 10px 18px; border-radius: 10px; border: 1px solid #cbd5e0; background: white; color: #4a5568; text-decoration: none; font-weight: 600; transition: all 0.2s; }
        .btnHeaderPrimary { padding: 10px 18px; border-radius: 10px; background: #1a202c; color: white; text-decoration: none; font-weight: 600; transition: background 0.2s; }
        
        .heroGrid { display: grid; grid-template-columns: 1fr; gap: 20px; margin-bottom: 25px; }
        @media (min-width: 900px) { .heroGrid { grid-template-columns: 350px 1fr; } }
        
        .coverCard { border-radius: 16px; overflow: hidden; border: 1px solid #edf2f7; position: relative; height: 100%; min-height: 250px; background: #f7fafc; }
        .coverImg { width: 100%; height: 100%; object-fit: cover; position: absolute; top:0; left:0; }
        .coverLabel { position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); color: white; padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; backdrop-filter: blur(4px); }
        
        .heroDetails { margin-bottom: 0; display: flex; flex-direction: column; gap: 20px; }
        .heroTitle { margin: 0 0 8px 0; font-size: 24px; font-weight: 900; color: #1a202c; }
        .heroLocation { margin: 0; color: #718096; display: flex; align-items: center; gap: 5px; font-weight: 500; }
        
        .heroTags { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding-bottom: 15px; border-bottom: 1px solid #edf2f7; }
        .badgeBadge { padding: 6px 14px; border-radius: 20px; background: #edf2f7; color: #4a5568; font-size: 13px; font-weight: 700; }
        .typeBadge { background: rgba(15, 118, 110, 0.1); color: var(--primary); }
        
        .infoCardsGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 15px; }
        .infoCard { display: flex; align-items: center; gap: 12px; background: #f7fafc; padding: 15px; border-radius: 12px; border: 1px solid #edf2f7; }
        .cardIcon { color: #a0aec0; font-size: 28px; }
        .infoLabel { font-size: 12px; color: #718096; font-weight: 600; margin-bottom: 2px; }
        .infoValue { font-size: 16px; font-weight: 800; color: #2d3748; }

        .sectionHeader { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 25px; }
        .sectionTitleWrap { display: flex; align-items: flex-start; gap: 12px; }
        .titleIcon { color: var(--primary); background: rgba(15, 118, 110, 0.1); padding: 10px; border-radius: 12px; }
        .sectionTitleWrap h3 { margin: 0 0 4px 0; font-size: 20px; font-weight: 800; color: #1a202c; }
        .sectionTitleWrap p { margin: 0; color: #718096; font-size: 14px; }
        
        .btnPrimary { display: flex; align-items: center; gap: 8px; background: var(--primary); color: white; border: none; padding: 12px 20px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: background 0.2s; }
        .btnPrimary:hover:not(:disabled) { background: #0d665f; }
        .btnPrimary:disabled { opacity: 0.7; cursor: not-allowed; }
        .btnPrimary.disabled { opacity: 0.7; pointer-events: none; }
        
        .btnDanger { display: flex; align-items: center; gap: 8px; background: #e53e3e; color: white; border: none; padding: 12px 20px; border-radius: 12px; font-weight: 700; cursor: pointer; }
        .btnDanger:hover:not(:disabled) { background: #c53030; }
        
        .btnDangerOutline { display: flex; align-items: center; gap: 6px; background: white; color: #e53e3e; border: 1px solid #feb2b2; padding: 8px 16px; border-radius: 10px; font-weight: 600; cursor: pointer; }
        .btnDangerOutline:hover:not(:disabled) { background: #fff5f5; }
        
        .btnGhost { background: transparent; color: #4a5568; border: none; font-weight: 600; cursor: pointer; padding: 8px 12px; border-radius: 8px; }
        .btnGhost:hover:not(:disabled) { background: #edf2f7; }

        .formGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .mapCoordinatesGroup { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; grid-column: 1 / -1; background: #f7fafc; padding: 15px; border-radius: 12px; border: 1px dashed #cbd5e0; }
        @media (min-width: 768px) { .mapCoordinatesGroup { grid-column: span 2; } }
        
        .fullWidthField { grid-column: 1 / -1; }
        
        .inputWithSuffix { position: relative; display: flex; align-items: center; }
        .inputWithSuffix .input { padding-left: 50px; }
        .inputWithSuffix .suffix { position: absolute; left: 15px; color: #a0aec0; font-weight: 600; font-size: 14px; pointer-events: none; }
        
        .input { width: 100%; padding: 12px 15px; border: 1px solid #e2e8f0; border-radius: 10px; font-family: inherit; font-size: 15px; color: #2d3748; transition: border-color 0.2s; background: white; }
        .input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1); }
        select.input { appearance: none; background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23A0AEC0%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: left 15px center; background-size: 12px auto; padding-left: 40px; }

        .mediaHeaderWrap { align-items: center; }
        .uploadActionWrap { display: flex; align-items: center; gap: 15px; }
        .uploadProgressWrap { display: flex; align-items: center; gap: 10px; width: 150px; }
        .progressBar { flex: 1; height: 6px; background: #edf2f7; border-radius: 10px; overflow: hidden; }
        .progressFill { height: 100%; background: var(--primary); transition: width 0.3s; }
        .progressText { font-size: 12px; font-weight: 700; color: #4a5568; }
        .uploadBtn { cursor: pointer; margin: 0; }
        
        .mediaToolbar { display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; background: #f7fafc; border-radius: 12px; margin-bottom: 20px; border: 1px solid #edf2f7; flex-wrap: wrap; gap: 10px; }
        .toolbarLeft, .toolbarRight { display: flex; gap: 10px; align-items: center; }
        
        .emptyMediaState { text-align: center; padding: 60px 20px; background: #f7fafc; border: 2px dashed #cbd5e0; border-radius: 16px; color: #718096; }
        .emptyMediaState .material-icons-outlined { font-size: 48px; color: #a0aec0; margin-bottom: 10px; }
        .emptyMediaState h4 { margin: 0 0 5px 0; color: #2d3748; font-size: 18px; }
        
        .mediaGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
        
        .mediaTile { background: white; border: 1px solid #e2e8f0; border-radius: 14px; padding: 10px; display: flex; flex-direction: column; gap: 10px; transition: border-color 0.2s, box-shadow 0.2s; position: relative; }
        .mediaTile:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.05); border-color: #cbd5e0; }
        .mediaTile.selected { border-color: var(--primary); box-shadow: 0 0 0 1px var(--primary); }
        
        .mediaActionsTop { display: flex; justify-content: flex-start; }
        .checkboxLabel { display: flex; align-items: center; cursor: pointer; }
        .checkboxLabel input { display: none; }
        .checkmark { width: 22px; height: 22px; border: 2px solid #cbd5e0; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .checkboxLabel input:checked ~ .checkmark { background: var(--primary); border-color: var(--primary); }
        .checkboxLabel input:checked ~ .checkmark::after { content: '\\e876'; font-family: 'Material Icons Outlined'; color: white; font-size: 16px; }
        
        .mediaPreview { width: 100%; aspect-ratio: 1; border-radius: 10px; overflow: hidden; background: #f7fafc; }
        .mediaElement { width: 100%; height: 100%; object-fit: cover; }
        
        .mediaDetails { display: flex; flex-direction: column; gap: 4px; }
        .mediaName { font-size: 13px; font-weight: 700; color: #2d3748; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; direction: ltr; text-align: right; }
        
        .mediaActionsBottom { display: flex; gap: 8px; margin-top: auto; padding-top: 5px; border-top: 1px solid #edf2f7; }
        .btnSmall { flex: 1; padding: 6px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #e2e8f0; background: white; color: #4a5568; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; }
        .btnSmall:hover { background: #f7fafc; }
        .btnSmall.btnDanger { color: #e53e3e; border-color: #feb2b2; }
        .btnSmall.btnDanger:hover { background: #fff5f5; }

        .dangerPanel { border: 1px solid #fed7d7; }
      `}</style>
    </>
  );
}

function Field({ label, children }) {
  return (
    <div className="fieldWrapper">
      <label className="fieldLabel">{label}</label>
      {children}
      <style jsx>{`
        .fieldWrapper { display: flex; flex-direction: column; gap: 8px; }
        .fieldLabel { font-size: 14px; font-weight: 700; color: #4a5568; }
      `}</style>
    </div>
  );
}
