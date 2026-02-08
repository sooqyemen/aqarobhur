import ChipsRow from '@/components/ChipsRow';

const DEAL = [
  { label: 'بيع', value: 'sale' },
  { label: 'إيجار', value: 'rent' },
];

const TYPES = [
  { label: 'أرض', value: 'أرض' },
  { label: 'فيلا', value: 'فيلا' },
  { label: 'شقة', value: 'شقة' },
  { label: 'عمارة', value: 'عمارة' },
];

const hasNeighborhood = !!filters.neighborhood;   // بعد اختيار الحي
const hasDeal = !!filters.dealType;

{/* بعد الحي */}
<ChipsRow
  value={filters.dealType}
  options={DEAL}
  disabled={!hasNeighborhood}
  onChange={(v) => setFilters((p) => ({ ...p, dealType: v, propertyType: '' }))}
/>

{/* بعد بيع/إيجار */}
<ChipsRow
  value={filters.propertyType}
  options={TYPES}
  disabled={!hasNeighborhood || !hasDeal}
  onChange={(v) => setFilters((p) => ({ ...p, propertyType: v }))}
/>
