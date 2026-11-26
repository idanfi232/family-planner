import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  PiggyBank,
  Wifi,
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
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

const ASSET_CATEGORIES = [
  {
    id: 'insurance',
    name: 'ביטוחים',
    icon: Shield,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    accentText: 'text-blue-700',
    examples: 'ביטוח בריאות, חיים, משכנתא, רכב, דירה...',
  },
  {
    id: 'pension_savings',
    name: 'פנסיה וגמל',
    icon: PiggyBank,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    accentText: 'text-emerald-700',
    examples: 'קרן פנסיה, קופת גמל, קרן השתלמות, גמל להשקעה...',
  },
  {
    id: 'telecom_bills',
    name: 'תקשורת וחשבונות',
    icon: Wifi,
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    accentText: 'text-indigo-700',
    examples: 'בזק, סיבים, סלולר, טלוויזיה, חשמל, מים...',
  },
  {
    id: 'other',
    name: 'מינויים ואחר',
    icon: Briefcase,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    accentText: 'text-amber-700',
    examples: 'חדר כושר, שירותי ענן, מינויים קבועים...',
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

export default function PersonalAssetsTab({ members = [] }) {
  const [assets, setAssets] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedOwner, setSelectedOwner] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

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
    const payload = {
      ...editingAsset,
      id,
      title,
      provider: (editingAsset.provider || '').trim(),
      owner: (editingAsset.owner || '').trim(),
      policy_or_account_number: (editingAsset.policy_or_account_number || '').trim(),
      monthly_cost: editingAsset.monthly_cost === '' ? '' : Number(editingAsset.monthly_cost),
      deposit_fee_pct: editingAsset.deposit_fee_pct === '' ? '' : Number(editingAsset.deposit_fee_pct),
      accumulation_fee_pct: editingAsset.accumulation_fee_pct === '' ? '' : Number(editingAsset.accumulation_fee_pct),
      current_balance: editingAsset.current_balance === '' ? '' : Number(editingAsset.current_balance),
      investment_track: (editingAsset.investment_track || '').trim(),
      end_date: editingAsset.end_date || '',
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
      const days = getDaysUntil(item.end_date);
      return days !== null && days <= 45;
    });

    return {
      totalMonthly,
      expiringSoonCount: expiringSoon.length,
    };
  }, [filteredAssets, assets]);

  const activeCategoryMeta =
    ASSET_CATEGORIES.find((c) => c.id === editingAsset.category) || ASSET_CATEGORIES[0];

  return (
    <div className="mx-auto max-w-5xl w-full space-y-4">
      {/* כרטיס כותרת וסיכום */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 border border-violet-200">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">נכסים, ביטוחים והתחייבויות</h2>
              <p className="text-xs text-slate-500">מעקב מרוכז אחר פוליסות, פנסיה וגמל, תקשורת וחבילות</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenAdd(selectedCategory)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" />
            <span>הוסף נכס / שירות</span>
          </button>
        </div>

        {/* מדדי סיכום מהירים */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
            <div className="text-[11px] font-semibold text-slate-500">סה״כ עלות חודשית (מסונן)</div>
            <div className="mt-0.5 text-lg sm:text-xl font-extrabold text-slate-900">
              ₪{summary.totalMonthly.toLocaleString('he-IL')}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
            <div className="text-[11px] font-semibold text-slate-500">פריטים פעילים</div>
            <div className="mt-0.5 text-lg sm:text-xl font-extrabold text-violet-700">
              {filteredAssets.length}
              {filteredAssets.length !== assets.length ? ` / ${assets.length}` : ''}
            </div>
          </div>

          <div
            className={`col-span-2 sm:col-span-1 rounded-xl border p-3 ${
              summary.expiringSoonCount > 0
                ? 'border-amber-300 bg-amber-50/80'
                : 'border-slate-200/80 bg-slate-50/70'
            }`}
          >
            <div className="text-[11px] font-semibold text-slate-500">חבילות/חידושים בקרוב (עד 45 יום)</div>
            <div
              className={`mt-0.5 flex items-center gap-1.5 text-lg sm:text-xl font-extrabold ${
                summary.expiringSoonCount > 0 ? 'text-amber-800' : 'text-slate-700'
              }`}
            >
              {summary.expiringSoonCount > 0 && <AlertTriangle className="h-4 w-4 text-amber-600" />}
              <span>{summary.expiringSoonCount}</span>
            </div>
          </div>
        </div>

        {/* סינון לפי קטגוריה */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
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
              placeholder="חיפוש לפי שם, חברה, מספר פוליסה, מסלול..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pr-9 pl-8 text-xs sm:text-sm text-slate-800 focus:border-violet-500 focus:bg-white focus:outline-none"
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
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 focus:border-violet-500 focus:outline-none"
            >
              <option value="all">כל בני המשפחה</option>
              {members.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* רשימת כרטיסי נכסים */}
      {filteredAssets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center space-y-2">
          <div className="text-sm font-bold text-slate-700">אין עדיין פריטים להצגה</div>
          <p className="text-xs text-slate-500">
            לחץ על &ldquo;הוסף נכס / שירות&rdquo; כדי לתעד ביטוחים, פנסיה/גמל, בזק או מינויים קבועים.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filteredAssets.map((item) => {
            const catMeta = ASSET_CATEGORIES.find((c) => c.id === item.category) || ASSET_CATEGORIES[3];
            const CatIcon = catMeta.icon;
            const daysLeft = getDaysUntil(item.end_date);
            const isExpired = daysLeft !== null && daysLeft < 0;
            const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 45;

            return (
              <div
                key={item.id}
                className={`rounded-2xl border bg-white p-4 shadow-2xs transition-all flex flex-col justify-between gap-3 ${
                  isExpired
                    ? 'border-rose-300 bg-rose-50/30'
                    : isExpiringSoon
                    ? 'border-amber-300 bg-amber-50/30'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-2.5">
                  {/* כותרת כרטיס + כפתור עריכה */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-bold ${catMeta.badgeClass}`}
                        >
                          <CatIcon className="h-3 w-3" />
                          <span>{catMeta.name}</span>
                        </span>

                        {item.owner && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            <User className="h-3 w-3 text-slate-500" />
                            <span>{item.owner}</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-extrabold text-slate-900 truncate">{item.title}</h3>
                      {item.provider && (
                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          <span>{item.provider}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      title="ערוך"
                      className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 shrink-0"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>

                  {/* נתונים פיננסיים / עמלות */}
                  <div className="grid grid-cols-2 gap-2">
                    {item.monthly_cost !== '' && item.monthly_cost !== undefined && (
                      <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-2.5 py-2">
                        <div className="text-[10px] font-semibold text-slate-500">
                          {item.category === 'pension_savings' ? 'הפקדה חודשית' : 'עלות חודשית'}
                        </div>
                        <div className="text-sm font-extrabold text-slate-900">
                          ₪{Number(item.monthly_cost).toLocaleString('he-IL')}
                        </div>
                      </div>
                    )}

                    {item.accumulation_fee_pct !== '' && item.accumulation_fee_pct !== undefined && (
                      <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 px-2.5 py-2">
                        <div className="text-[10px] font-semibold text-emerald-800">דמי ניהול מצבירה</div>
                        <div className="text-sm font-extrabold text-emerald-950">
                          {item.accumulation_fee_pct}%
                        </div>
                      </div>
                    )}

                    {item.deposit_fee_pct !== '' && item.deposit_fee_pct !== undefined && (
                      <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 px-2.5 py-2">
                        <div className="text-[10px] font-semibold text-emerald-800">דמי ניהול מהפקדה</div>
                        <div className="text-sm font-extrabold text-emerald-950">
                          {item.deposit_fee_pct}%
                        </div>
                      </div>
                    )}

                    {item.current_balance !== '' && item.current_balance !== undefined && (
                      <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-2.5 py-2">
                        <div className="text-[10px] font-semibold text-slate-500">יתרה / צבירה</div>
                        <div className="text-sm font-extrabold text-slate-900">
                          ₪{Number(item.current_balance).toLocaleString('he-IL')}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* פרטים משלימים */}
                  <div className="space-y-1 text-xs text-slate-600">
                    {item.policy_or_account_number && (
                      <div className="flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>מספר פוליסה / מנוי:</span>
                        <span className="font-bold text-slate-800 select-all">
                          {item.policy_or_account_number}
                        </span>
                      </div>
                    )}

                    {item.investment_track && (
                      <div className="flex items-center gap-1.5">
                        <Wallet className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>מסלול:</span>
                        <span className="font-semibold text-slate-800">{item.investment_track}</span>
                      </div>
                    )}

                    {item.end_date && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>תאריך סיום / חידוש:</span>
                        <span className="font-bold text-slate-800">{formatDisplayDate(item.end_date)}</span>
                        {isExpired && (
                          <span className="rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                            פג תוקף!
                          </span>
                        )}
                        {isExpiringSoon && (
                          <span className="rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                            בעוד {daysLeft} ימים
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {item.notes && (
                  <div className="rounded-xl bg-slate-50 border border-slate-200/70 px-3 py-2 text-xs text-slate-600">
                    {item.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* מודאל הוספה / עריכה */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-lg font-extrabold text-slate-900">
                {editingAsset.id ? 'עריכת נכס / שירות' : 'הוספת נכס / שירות חדש'}
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
                <label className="block text-xs font-bold text-slate-700 mb-1.5">סוג נכס / קטגוריה</label>
                <div className="grid grid-cols-2 gap-2">
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
                  <label className="block text-xs font-bold text-slate-700">שם הפוליסה / התוכנית / השירות *</label>
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
                  <label className="block text-xs font-bold text-slate-700">חברה / ספק</label>
                  <input
                    type="text"
                    placeholder="למשל: הראל, מגדל, בזק, פלאפון..."
                    value={editingAsset.provider}
                    onChange={(e) => setEditingAsset({ ...editingAsset, provider: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700">משויך ל-</label>
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

                <div>
                  <label className="block text-xs font-bold text-slate-700">מספר פוליסה / חשבון / מנוי</label>
                  <input
                    type="text"
                    placeholder="מספר זיהוי מול הספק..."
                    value={editingAsset.policy_or_account_number}
                    onChange={(e) =>
                      setEditingAsset({ ...editingAsset, policy_or_account_number: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none"
                  />
                </div>
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
                      <label className="block text-xs font-bold text-slate-700">הפקדה חודשית (₪)</label>
                      <input
                        type="number"
                        step="1"
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
                      <label className="block text-xs font-bold text-slate-700">מסלול השקעה</label>
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

                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      {editingAsset.category === 'insurance'
                        ? 'תאריך חידוש / סיום פוליסה'
                        : 'תאריך סיום חבילה / מבצע'}
                    </label>
                    <input
                      type="date"
                      value={editingAsset.end_date}
                      onChange={(e) => setEditingAsset({ ...editingAsset, end_date: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="flex items-center gap-1 text-xs font-bold text-slate-700">
                  <FileText className="h-3.5 w-3.5 text-slate-400" /> הערות, כיסויים חשובים או פרטי סוכן
                </label>
                <textarea
                  rows="2"
                  placeholder="למשל: כולל אמבולטורי וניתוחים, טלפון סוכן, תנאי ביטול..."
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
                  type="button"
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