import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  PiggyBank,
  CreditCard,
  Trophy,
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Search,
  User,
  Calendar,
  Hash,
  Percent,
  Wallet,
  Building2,
  FileText,
  ChevronLeft,
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

const ASSET_CATEGORIES = [
  {
    id: 'insurance',
    name: 'ביטוחים',
    icon: Shield,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    examples: 'ביטוח בריאות, חיים, משכנתא, רכב, דירה...',
  },
  {
    id: 'pension_savings',
    name: 'פנסיה וגמל',
    icon: PiggyBank,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    examples: 'קרן פנסיה, קופת גמל, קרן השתלמות, גמל להשקעה...',
  },
  {
    id: 'subscriptions',
    name: 'מנויים',
    icon: CreditCard,
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    examples: 'נטפליקס, ספוטיפיי, ענן, חדר כושר, עיתון...',
  },
  {
    id: 'activities',
    name: 'חוגים',
    icon: Trophy,
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    examples: 'שחייה, כדורגל, רובוטיקה, פסנתר, ג׳ודו...',
  },
  {
    id: 'other',
    name: 'אחר',
    icon: Briefcase,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    examples: 'נכס או התחייבות נוספת...',
  },
];

const createEmptyAsset = () => ({
  id: '',
  category: 'insurance',
  title: '',
  provider: '',
  owner: '',
  policy_or_account_number: '',
  monthly_cost: '',
  deposit_fee_pct: '',
  accumulation_fee_pct: '',
  current_balance: '',
  investment_track: '',
  end_date: '',
  notes: '',
});

const getDaysUntil = (dateStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [y, m, d] = parts;
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
};

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const hasPolicyNumberField = (category) =>
  category === 'insurance' || category === 'pension_savings' || category === 'other';

const hasEndDateField = (category) => category !== 'activities';

export default function PersonalAssetsTab({ members = [] }) {
  const [assets, setAssets] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedOwner, setSelectedOwner] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [viewingAsset, setViewingAsset] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(createEmptyAsset());

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'personal_assets'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'he'));
      setAssets(list);
    });
    return () => unsub();
  }, []);

  const handleOpenAdd = (defaultCategory = 'insurance') => {
    setEditingAsset({
      ...createEmptyAsset(),
      category: defaultCategory === 'all' ? 'insurance' : defaultCategory,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (asset) => {
    setViewingAsset(null);
    setEditingAsset({
      ...createEmptyAsset(),
      ...asset,
    });
    setIsModalOpen(true);
  };

  const handleSaveAsset = async (e) => {
    e.preventDefault();
    const title = (editingAsset.title || '').trim();
    if (!title) return;

    const id = editingAsset.id || `asset_${Date.now()}`;
    const showPolicy = hasPolicyNumberField(editingAsset.category);
    const showEndDate = hasEndDateField(editingAsset.category);

    const payload = {
      ...editingAsset,
      id,
      title,
      provider: (editingAsset.provider || '').trim(),
      owner: (editingAsset.owner || '').trim(),
      policy_or_account_number: showPolicy
        ? (editingAsset.policy_or_account_number || '').trim()
        : '',
      monthly_cost: editingAsset.monthly_cost === '' ? '' : Number(editingAsset.monthly_cost),
      deposit_fee_pct: editingAsset.deposit_fee_pct === '' ? '' : Number(editingAsset.deposit_fee_pct),
      accumulation_fee_pct:
        editingAsset.accumulation_fee_pct === '' ? '' : Number(editingAsset.accumulation_fee_pct),
      current_balance:
        editingAsset.current_balance === '' ? '' : Number(editingAsset.current_balance),
      investment_track: (editingAsset.investment_track || '').trim(),
      end_date: showEndDate ? editingAsset.end_date || '' : '',
      notes: (editingAsset.notes || '').trim(),
      updated_at: Date.now(),
    };

    await setDoc(doc(db, 'personal_assets', id), payload);
    setIsModalOpen(false);
  };

  const handleDeleteAsset = async (asset) => {
    if (!asset?.id) return;
    await deleteDoc(doc(db, 'personal_assets', asset.id));
    setIsModalOpen(false);
    setViewingAsset(null);
  };

  const filteredAssets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return assets.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (selectedOwner !== 'all' && item.owner !== selectedOwner) return false;
      if (q) {
        const hay = [
          item.title,
          item.provider,
          item.owner,
          item.policy_or_account_number,
          item.investment_track,
          item.notes,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [assets, selectedCategory, selectedOwner, searchQuery]);

  const summary = useMemo(() => {
    const totalMonthly = filteredAssets.reduce((sum, item) => {
      const val = Number(item.monthly_cost);
      return Number.isFinite(val) && val > 0 ? sum + val : sum;
    }, 0);

    const expiringSoon = assets.filter((item) => {
      if (!hasEndDateField(item.category)) return false;
      const days = getDaysUntil(item.end_date);
      return days !== null && days <= 45;
    });

    return {
      totalMonthly,
      activeCount: filteredAssets.length,
      expiringSoonCount: expiringSoon.length,
    };
  }, [filteredAssets, assets]);

  const activeCategoryMeta =
    ASSET_CATEGORIES.find((c) => c.id === editingAsset.category) || ASSET_CATEGORIES[0];

  const viewingCatMeta = viewingAsset
    ? ASSET_CATEGORIES.find((c) => c.id === viewingAsset.category) || ASSET_CATEGORIES[4]
    : null;
  const ViewingIcon = viewingCatMeta?.icon;
  const viewingDaysLeft = viewingAsset ? getDaysUntil(viewingAsset.end_date) : null;

  return (
    <div className="mx-auto max-w-5xl w-full space-y-3.5">
      {/* כרטיס כותרת, סיכום קומפקטי וסינון */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700 border border-violet-200">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900">נכסים, ביטוחים והתחייבויות</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                  {summary.activeCount} פעילים
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenAdd(selectedCategory)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" />
            <span>הוסף פריט</span>
          </button>
        </div>

        {/* שורת סיכום קומפקטית: עלות חודשית + התראת חידושים קטנה */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2">
          <div>
            <div className="text-[11px] font-semibold text-slate-500">סה״כ עלות חודשית</div>
            <div className="text-lg font-extrabold text-slate-900 leading-tight">
              ₪{summary.totalMonthly.toLocaleString('he-IL')}
            </div>
          </div>

          {summary.expiringSoonCount > 0 && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>חידושים בקרוב: {summary.expiringSoonCount}</span>
            </button>
          )}
        </div>

        {/* צ'יפים לסינון לפי קטגוריה */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            הכל ({assets.length})
          </button>

          {ASSET_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = assets.filter((a) => a.category === cat.id).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-violet-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{cat.name}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-white text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* חיפוש וסינון לפי משויך */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש לפי שם, ספק, אחראי או הערות..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 py-1.5 pr-9 pl-8 text-xs sm:text-sm text-slate-800 focus:border-violet-500 focus:bg-white focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {members.length > 0 && (
            <select
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 focus:border-violet-500 focus:outline-none"
            >
              <option value="all">כל האחראים / בני המשפחה</option>
              {members.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* רשימת שורות קומפקטיות */}
      {filteredAssets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center space-y-1.5">
          <div className="text-sm font-bold text-slate-700">אין פריטים להצגה</div>
          <p className="text-xs text-slate-500">
            לחץ על &ldquo;הוסף פריט&rdquo; כדי להוסיף ביטוח, פנסיה/גמל, מנוי, חוג או פריט אחר.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          {filteredAssets.map((item) => {
            const catMeta =
              ASSET_CATEGORIES.find((c) => c.id === item.category) || ASSET_CATEGORIES[4];
            const CatIcon = catMeta.icon;
            const daysLeft = hasEndDateField(item.category) ? getDaysUntil(item.end_date) : null;
            const isAlertDate = daysLeft !== null && daysLeft <= 45;
            const hasMonthly =
              item.monthly_cost !== '' &&
              item.monthly_cost !== undefined &&
              Number(item.monthly_cost) > 0;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setViewingAsset(item)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-right hover:bg-slate-50/90 active:bg-violet-50/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${catMeta.badgeClass}`}
                  >
                    <CatIcon className="h-4 w-4" />
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-bold text-slate-900">{item.title}</span>
                      {isAlertDate && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" title="חידוש בקרוב" />
                      )}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {item.owner || 'ללא אחראי'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {hasMonthly && (
                    <span className="text-sm font-extrabold text-slate-900">
                      ₪{Number(item.monthly_cost).toLocaleString('he-IL')}
                    </span>
                  )}
                  <ChevronLeft className="h-4 w-4 text-slate-400" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* חלונית תצוגה מורחבת בלחיצה על פריט */}
      {viewingAsset && viewingCatMeta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setViewingAsset(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${viewingCatMeta.badgeClass}`}
                >
                  {ViewingIcon && <ViewingIcon className="h-4 w-4" />}
                </span>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-slate-500">{viewingCatMeta.name}</span>
                  <h3 className="text-base font-extrabold text-slate-900 truncate">
                    {viewingAsset.title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingAsset(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs sm:text-sm">
              {viewingAsset.owner && (
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <User className="h-4 w-4 text-slate-400" />
                    אחראי / משויך
                  </span>
                  <span className="font-bold text-slate-900">{viewingAsset.owner}</span>
                </div>
              )}

              {viewingAsset.provider && (
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    חברה / ספק
                  </span>
                  <span className="font-bold text-slate-900">{viewingAsset.provider}</span>
                </div>
              )}

              {viewingAsset.monthly_cost !== '' && viewingAsset.monthly_cost !== undefined && (
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">
                    {viewingAsset.category === 'pension_savings' ? 'הפקדה חודשית' : 'עלות חודשית'}
                  </span>
                  <span className="font-extrabold text-slate-900">
                    ₪{Number(viewingAsset.monthly_cost).toLocaleString('he-IL')}
                  </span>
                </div>
              )}

              {hasPolicyNumberField(viewingAsset.category) &&
                viewingAsset.policy_or_account_number && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="inline-flex items-center gap-1.5 text-slate-500">
                      <Hash className="h-4 w-4 text-slate-400" />
                      מספר פוליסה / חשבון
                    </span>
                    <span className="font-bold text-slate-900 select-all">
                      {viewingAsset.policy_or_account_number}
                    </span>
                  </div>
                )}

              {viewingAsset.category === 'pension_savings' && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {viewingAsset.accumulation_fee_pct !== '' &&
                    viewingAsset.accumulation_fee_pct !== undefined && (
                      <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 p-2.5">
                        <div className="text-[11px] font-semibold text-emerald-800">
                          דמי ניהול מצבירה
                        </div>
                        <div className="text-sm font-extrabold text-emerald-950">
                          {viewingAsset.accumulation_fee_pct}%
                        </div>
                      </div>
                    )}

                  {viewingAsset.deposit_fee_pct !== '' &&
                    viewingAsset.deposit_fee_pct !== undefined && (
                      <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 p-2.5">
                        <div className="text-[11px] font-semibold text-emerald-800">
                          דמי ניהול מהפקדה
                        </div>
                        <div className="text-sm font-extrabold text-emerald-950">
                          {viewingAsset.deposit_fee_pct}%
                        </div>
                      </div>
                    )}

                  {viewingAsset.current_balance !== '' &&
                    viewingAsset.current_balance !== undefined && (
                      <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-2.5">
                        <div className="text-[11px] font-semibold text-slate-500">יתרה / צבירה</div>
                        <div className="text-sm font-extrabold text-slate-900">
                          ₪{Number(viewingAsset.current_balance).toLocaleString('he-IL')}
                        </div>
                      </div>
                    )}

                  {viewingAsset.investment_track && (
                    <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-2.5">
                      <div className="text-[11px] font-semibold text-slate-500">מסלול השקעה</div>
                      <div className="text-sm font-bold text-slate-900">
                        {viewingAsset.investment_track}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {hasEndDateField(viewingAsset.category) && viewingAsset.end_date && (
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    תאריך סיום / חידוש
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900">
                      {formatDisplayDate(viewingAsset.end_date)}
                    </span>
                    {viewingDaysLeft !== null && viewingDaysLeft < 0 && (
                      <span className="rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                        פג תוקף
                      </span>
                    )}
                    {viewingDaysLeft !== null && viewingDaysLeft >= 0 && viewingDaysLeft <= 45 && (
                      <span className="rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                        בעוד {viewingDaysLeft} ימים
                      </span>
                    )}
                  </div>
                </div>
              )}

              {viewingAsset.notes && (
                <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 text-xs text-slate-700 whitespace-pre-wrap">
                  {viewingAsset.notes}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t bg-slate-50 px-5 py-3.5">
              <button
                type="button"
                onClick={() => handleDeleteAsset(viewingAsset)}
                className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" />
                <span>מחק</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(viewingAsset)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>ערוך</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* מודאל הוספה / עריכה */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-lg font-extrabold text-slate-900">
                {editingAsset.id ? 'עריכת פריט' : 'הוספת פריט חדש'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">קטגוריה</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ASSET_CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = editingAsset.category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setEditingAsset({ ...editingAsset, category: cat.id })}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                          isSelected
                            ? 'border-violet-600 bg-violet-600 text-white shadow-2xs'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700">כותרת / שם הפריט *</label>
                  <input
                    type="text"
                    required
                    placeholder={activeCategoryMeta.examples}
                    value={editingAsset.title}
                    onChange={(e) => setEditingAsset({ ...editingAsset, title: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">אחראי / משויך</label>
                  <select
                    value={editingAsset.owner}
                    onChange={(e) => setEditingAsset({ ...editingAsset, owner: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none"
                  >
                    <option value="">משפחתי / כללי</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700">חברה / ספק / מדריך</label>
                  <input
                    type="text"
                    placeholder="למשל: הראל, מגדל, נטפליקס, מועדון שחייה..."
                    value={editingAsset.provider}
                    onChange={(e) => setEditingAsset({ ...editingAsset, provider: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none"
                  />
                </div>

                {hasPolicyNumberField(editingAsset.category) && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700">מספר פוליסה / חשבון</label>
                    <input
                      type="text"
                      placeholder="מספר זיהוי מול הספק..."
                      value={editingAsset.policy_or_account_number}
                      onChange={(e) =>
                        setEditingAsset({
                          ...editingAsset,
                          policy_or_account_number: e.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* שדות מותאמים לפנסיה וגמל */}
              {editingAsset.category === 'pension_savings' ? (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="flex items-center gap-1 text-xs font-bold text-emerald-800">
                        <Percent className="h-3.5 w-3.5" /> דמי ניהול מצבירה (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="למשל: 0.15"
                        value={editingAsset.accumulation_fee_pct}
                        onChange={(e) =>
                          setEditingAsset({ ...editingAsset, accumulation_fee_pct: e.target.value })
                        }
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-1 text-xs font-bold text-emerald-800">
                        <Percent className="h-3.5 w-3.5" /> דמי ניהול מהפקדה (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="למשל: 1.0"
                        value={editingAsset.deposit_fee_pct}
                        onChange={(e) =>
                          setEditingAsset({ ...editingAsset, deposit_fee_pct: e.target.value })
                        }
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700">הפקדה / עלות חודשית (₪)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="אופציונלי"
                        value={editingAsset.monthly_cost}
                        onChange={(e) => setEditingAsset({ ...editingAsset, monthly_cost: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700">יתרה / צבירה (₪)</label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        placeholder="אופציונלי"
                        value={editingAsset.current_balance}
                        onChange={(e) =>
                          setEditingAsset({ ...editingAsset, current_balance: e.target.value })
                        }
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-1 text-xs font-bold text-slate-700">
                        <Wallet className="h-3.5 w-3.5 text-slate-400" /> מסלול השקעה
                      </label>
                      <input
                        type="text"
                        placeholder="למשל: S&P 500, כללי..."
                        value={editingAsset.investment_track}
                        onChange={(e) =>
                          setEditingAsset({ ...editingAsset, investment_track: e.target.value })
                        }
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      תאריך תום הטבת דמי ניהול / מועד נזילות
                    </label>
                    <input
                      type="date"
                      value={editingAsset.end_date}
                      onChange={(e) => setEditingAsset({ ...editingAsset, end_date: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">עלות חודשית (₪)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="למשל: 119"
                      value={editingAsset.monthly_cost}
                      onChange={(e) => setEditingAsset({ ...editingAsset, monthly_cost: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none"
                    />
                  </div>

                  {hasEndDateField(editingAsset.category) && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700">
                        {editingAsset.category === 'insurance'
                          ? 'תאריך חידוש / סיום פוליסה'
                          : 'תאריך סיום / חידוש'}
                      </label>
                      <input
                        type="date"
                        value={editingAsset.end_date}
                        onChange={(e) => setEditingAsset({ ...editingAsset, end_date: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="flex items-center gap-1 text-xs font-bold text-slate-700">
                  <FileText className="h-3.5 w-3.5 text-slate-400" /> הערות
                </label>
                <textarea
                  rows="2"
                  placeholder="פרטים נוספים, ימים/שעות, תנאי ביטול..."
                  value={editingAsset.notes}
                  onChange={(e) => setEditingAsset({ ...editingAsset, notes: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none"
                />
              </div>
            </form>

            <div className="border-t bg-slate-50 px-6 py-4 rounded-b-2xl flex items-center justify-between">
              {editingAsset.id ? (
                <button
                  type="button"
                  onClick={() => handleDeleteAsset(editingAsset)}
                  className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>מחק</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  onClick={handleSaveAsset}
                  className="rounded-xl bg-violet-600 px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-violet-700"
                >
                  שמור
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}