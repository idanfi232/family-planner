import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ShoppingCart, Home, Plus, Minus, Check, Trash2, AlertTriangle, X, CheckCircle2, Tag, FolderPlus } from 'lucide-react';

const GENERAL_CATEGORY = 'כללי';

const DEFAULT_CATEGORIES = [
  'ירקות ופירות',
  'חלב, ביצים ומעדנייה',
  'בשר, עוף ודגים',
  'מאפים ולחם',
  'יבשים, פסטה ושימורים',
  'חטיפים, ממתקים ודגני בוקר',
  'משקאות',
  'קפואים',
  'ניקיון וכביסה',
  'פארם, תינוקות ובעלי חיים',
  GENERAL_CATEGORY,
];

const normalizeItemName = (name = '') => name.trim().toLowerCase().replace(/\s+/g, ' ');

const normalizeCategoryName = (cat = '') => {
  const clean = String(cat || '').trim().replace(/\s+/g, ' ');
  if (!clean || clean === 'כללי / אחר') return GENERAL_CATEGORY;
  return clean;
};

export default function ShoppingAndPantryTab() {
  const [subTab, setSubTab] = useState('pantry'); // 'pantry' (ברירת מחדל) | 'shopping'

  const [pantryItems, setPantryItems] = useState([]);
  const [shoppingItems, setShoppingItems] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);

  const [newShoppingName, setNewShoppingName] = useState('');
  const [newShoppingQty, setNewShoppingQty] = useState(1);

  const [newPantryName, setNewPantryName] = useState('');
  const [newPantryQty, setNewPantryQty] = useState(1);
  const [pantryError, setPantryError] = useState('');

  const [restockPrompt, setRestockPrompt] = useState(null);
  const [addedToast, setAddedToast] = useState(null);

  // ניהול פריט פתוח להצגת שם מלא + בחירה/הוספת קטגוריה
  const [expandedItemKey, setExpandedItemKey] = useState(null);
  const [newCategoryDraft, setNewCategoryDraft] = useState('');
  const [creatingCategoryForKey, setCreatingCategoryForKey] = useState(null);

  // מעקב אחר נקודת התחלה של החלקה (Swipe) במובייל
  const touchStartRef = useRef(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showAddedFeedback = (itemName) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setAddedToast(itemName);
    toastTimerRef.current = setTimeout(() => {
      setAddedToast(null);
    }, 2500);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    const tag = e.target?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      touchStartRef.current = null;
      return;
    }
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e) => {
    if (!touchStartRef.current || e.changedTouches.length !== 1) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(deltaX) < 60 || Math.abs(deltaX) < Math.abs(deltaY) * 1.5) {
      return;
    }

    if (deltaX < 0 && subTab === 'pantry') {
      setSubTab('shopping');
    } else if (deltaX > 0 && subTab === 'shopping') {
      setSubTab('pantry');
    }
  };

  useEffect(() => {
    const unsubPantry = onSnapshot(collection(db, 'pantry_items'), (snap) => {
      const list = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          category: normalizeCategoryName(data.category),
        };
      });
      list.sort((a, b) => a.name.localeCompare(b.name, 'he'));
      setPantryItems(list);
    });

    const unsubShopping = onSnapshot(collection(db, 'shopping_items'), (snap) => {
      const list = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          category: normalizeCategoryName(data.category),
        };
      });
      list.sort((a, b) => a.name.localeCompare(b.name, 'he'));
      setShoppingItems(list);
    });

    const unsubCatalog = onSnapshot(collection(db, 'product_catalog'), (snap) => {
      const list = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          category: normalizeCategoryName(data.category),
        };
      });
      list.sort((a, b) => a.name.localeCompare(b.name, 'he'));
      setCatalog(list);
    });

    const unsubCategories = onSnapshot(collection(db, 'product_categories'), (snap) => {
      const names = snap.docs
        .map(d => normalizeCategoryName(d.data()?.name || d.id))
        .filter(Boolean);
      setCustomCategories(Array.from(new Set(names)));
    });

    return () => {
      unsubPantry();
      unsubShopping();
      unsubCatalog();
      unsubCategories();
    };
  }, []);

  const allCategories = useMemo(() => {
    const baseWithoutGeneral = DEFAULT_CATEGORIES.filter(c => c !== GENERAL_CATEGORY);
    const extras = new Set([
      ...customCategories,
      ...pantryItems.map(i => normalizeCategoryName(i.category)),
      ...shoppingItems.map(i => normalizeCategoryName(i.category)),
      ...catalog.map(i => normalizeCategoryName(i.category)),
    ]);

    extras.delete(GENERAL_CATEGORY);
    baseWithoutGeneral.forEach(c => extras.delete(c));

    const sortedExtras = Array.from(extras).sort((a, b) => a.localeCompare(b, 'he'));
    return [...baseWithoutGeneral, ...sortedExtras, GENERAL_CATEGORY];
  }, [customCategories, pantryItems, shoppingItems, catalog]);

  const resolveCategoryForName = (rawName, explicitCategory = null) => {
    if (explicitCategory) {
      return normalizeCategoryName(explicitCategory);
    }
    const norm = normalizeItemName(rawName);
    const fromPantry = pantryItems.find(p => normalizeItemName(p.name) === norm);
    if (fromPantry?.category) return normalizeCategoryName(fromPantry.category);

    const fromShopping = shoppingItems.find(s => normalizeItemName(s.name) === norm);
    if (fromShopping?.category) return normalizeCategoryName(fromShopping.category);

    const fromCatalog = catalog.find(c => normalizeItemName(c.name) === norm);
    if (fromCatalog?.category) return normalizeCategoryName(fromCatalog.category);

    return GENERAL_CATEGORY;
  };

  const saveToCatalog = async (rawName, category = GENERAL_CATEGORY) => {
    const cleanName = rawName.trim();
    if (!cleanName) return;
    const cleanCategory = normalizeCategoryName(category);
    const existing = catalog.find(c => normalizeItemName(c.name) === normalizeItemName(cleanName));

    if (!existing) {
      const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await setDoc(doc(db, 'product_catalog', id), { id, name: cleanName, category: cleanCategory });
    } else if (cleanCategory !== GENERAL_CATEGORY || !existing.category) {
      await updateDoc(doc(db, 'product_catalog', existing.id), { category: cleanCategory });
    }
  };

  const ensureCategoryExists = async (rawCategory) => {
    const cleanCat = normalizeCategoryName(rawCategory);
    if (!cleanCat || cleanCat === GENERAL_CATEGORY || DEFAULT_CATEGORIES.includes(cleanCat)) {
      return cleanCat || GENERAL_CATEGORY;
    }

    const alreadyInCustom = customCategories.some(
      c => normalizeItemName(c) === normalizeItemName(cleanCat)
    );
    if (!alreadyInCustom) {
      const docId = `cat_group_${encodeURIComponent(normalizeItemName(cleanCat))}`;
      await setDoc(doc(db, 'product_categories', docId), {
        name: cleanCat,
        createdAt: Date.now(),
      }, { merge: true });
    }
    return cleanCat;
  };

  const handleAssignItemCategory = async (targetCollection, item, rawCategory) => {
    const cleanCat = await ensureCategoryExists(rawCategory);
    await updateDoc(doc(db, targetCollection, item.id), {
      category: cleanCat,
    });
    await saveToCatalog(item.name, cleanCat);
  };

  const handleCreateAndAssignCategory = async (e, targetCollection, item, itemKey) => {
    e.preventDefault();
    const trimmed = newCategoryDraft.trim();
    if (!trimmed) return;
    await handleAssignItemCategory(targetCollection, item, trimmed);
    setNewCategoryDraft('');
    setCreatingCategoryForKey(null);
    setExpandedItemKey(itemKey);
  };

  const toggleItemExpansion = (itemKey) => {
    setCreatingCategoryForKey(null);
    setNewCategoryDraft('');
    setExpandedItemKey(prev => (prev === itemKey ? null : itemKey));
  };

  const handleAddShoppingItem = async (e, overrideName = null, overrideQty = 1, notifyUser = false, overrideCategory = null) => {
    if (e) e.preventDefault();
    const name = (overrideName !== null ? overrideName : newShoppingName).trim();
    const qty = Math.max(1, Number(overrideName !== null ? overrideQty : newShoppingQty) || 1);
    if (!name) return;

    const existing = shoppingItems.find(item => normalizeItemName(item.name) === normalizeItemName(name));
    const resolvedCat = resolveCategoryForName(name, overrideCategory || existing?.category);

    await saveToCatalog(name, resolvedCat);

    if (existing) {
      await updateDoc(doc(db, 'shopping_items', existing.id), {
        quantity: (existing.quantity || 1) + qty,
        category: normalizeCategoryName(existing.category || resolvedCat),
      });
    } else {
      const id = `shop_${Date.now()}`;
      await setDoc(doc(db, 'shopping_items', id), {
        id,
        name,
        quantity: qty,
        category: resolvedCat,
        createdAt: Date.now(),
      });
    }

    if (notifyUser) {
      showAddedFeedback(name);
    }

    if (overrideName === null) {
      setNewShoppingName('');
      setNewShoppingQty(1);
    }
  };

  const handleIncreaseShoppingItemQty = async (item) => {
    await updateDoc(doc(db, 'shopping_items', item.id), {
      quantity: (Number(item.quantity) || 1) + 1
    });
  };

  const handleDecreaseShoppingItemQty = async (item) => {
    const currentQty = Number(item.quantity) || 1;
    if (currentQty <= 1) return;
    await updateDoc(doc(db, 'shopping_items', item.id), {
      quantity: currentQty - 1
    });
  };

  const handleAddPantryItem = async (e) => {
    e.preventDefault();
    setPantryError('');
    const name = newPantryName.trim();
    const qty = Math.max(1, Number(newPantryQty) || 1);
    if (!name) return;

    const existing = pantryItems.find(item => normalizeItemName(item.name) === normalizeItemName(name));
    if (existing) {
      setPantryError(`הפריט "${existing.name}" כבר קיים במלאי — לא ניתן להוסיף כפילות.`);
      return;
    }

    const resolvedCat = resolveCategoryForName(name);
    await saveToCatalog(name, resolvedCat);

    const id = `pantry_${Date.now()}`;
    await setDoc(doc(db, 'pantry_items', id), {
      id,
      name,
      quantity: qty,
      category: resolvedCat,
      lowStock: false
    });

    setNewPantryName('');
    setNewPantryQty(1);
  };

  const handleDecreasePantry = async (item) => {
    const currentQty = Math.max(0, Number(item.quantity) || 0);
    if (currentQty <= 0) return;

    const nextQty = currentQty - 1;
    await updateDoc(doc(db, 'pantry_items', item.id), {
      quantity: nextQty
    });

    if (nextQty === 0) {
      setRestockPrompt({ name: item.name, category: item.category, isOutOfStock: true });
    }
  };

  const handleIncreasePantry = async (item) => {
    const nextQty = (Number(item.quantity) || 0) + 1;
    await updateDoc(doc(db, 'pantry_items', item.id), {
      quantity: nextQty
    });
  };

  const handleDeletePantryItem = async (id) => {
    await deleteDoc(doc(db, 'pantry_items', id));
  };

  const handleToggleLowStock = async (item) => {
    await updateDoc(doc(db, 'pantry_items', item.id), {
      lowStock: !Boolean(item.lowStock)
    });
  };

  const handleCompleteShoppingItem = async (shopItem) => {
    const boughtQty = Number(shopItem.quantity) || 1;
    const itemCategory = normalizeCategoryName(shopItem.category);
    const existingPantry = pantryItems.find(
      p => normalizeItemName(p.name) === normalizeItemName(shopItem.name)
    );

    if (existingPantry) {
      await updateDoc(doc(db, 'pantry_items', existingPantry.id), {
        quantity: (Number(existingPantry.quantity) || 0) + boughtQty,
        category: itemCategory !== GENERAL_CATEGORY ? itemCategory : normalizeCategoryName(existingPantry.category),
        lowStock: false
      });
    } else {
      const id = `pantry_${Date.now()}`;
      await setDoc(doc(db, 'pantry_items', id), {
        id,
        name: shopItem.name,
        quantity: boughtQty,
        category: itemCategory,
        lowStock: false
      });
    }

    await deleteDoc(doc(db, 'shopping_items', shopItem.id));
  };

  const handleDeleteShoppingItem = async (id) => {
    await deleteDoc(doc(db, 'shopping_items', id));
  };

  const pantryFilterQuery = newPantryName.trim().toLowerCase();
  const filteredPantryItems = useMemo(() => {
    if (!pantryFilterQuery) return pantryItems;
    return pantryItems.filter(item => item.name.toLowerCase().includes(pantryFilterQuery));
  }, [pantryItems, pantryFilterQuery]);

  const shoppingFilterQuery = newShoppingName.trim().toLowerCase();
  const filteredShoppingItems = useMemo(() => {
    if (!shoppingFilterQuery) return shoppingItems;
    return shoppingItems.filter(item => item.name.toLowerCase().includes(shoppingFilterQuery));
  }, [shoppingItems, shoppingFilterQuery]);

  const groupedShoppingSections = useMemo(() => {
    const map = new Map();
    filteredShoppingItems.forEach(item => {
      const cat = normalizeCategoryName(item.category);
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat).push(item);
    });

    const orderedCategories = [
      ...allCategories.filter(cat => map.has(cat)),
      ...Array.from(map.keys())
        .filter(cat => !allCategories.includes(cat))
        .sort((a, b) => a.localeCompare(b, 'he')),
    ];

    return orderedCategories.map(category => ({
      category,
      items: [...map.get(category)].sort((a, b) => a.name.localeCompare(b.name, 'he')),
    }));
  }, [filteredShoppingItems, allCategories]);

  const renderCategoryEditor = (targetCollection, item, itemKey, accent = 'emerald') => {
    const currentCat = normalizeCategoryName(item.category);
    const isCreatingHere = creatingCategoryForKey === itemKey;
    const focusRing = accent === 'blue' ? 'focus:border-blue-500' : 'focus:border-emerald-500';
    const addBtnStyle =
      accent === 'blue'
        ? 'bg-blue-600 hover:bg-blue-700 text-white'
        : 'bg-emerald-600 hover:bg-emerald-700 text-white';

    return (
      <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <Tag className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-500 shrink-0">קטגוריה:</span>
            <select
              value={currentCat}
              onChange={(e) => handleAssignItemCategory(targetCollection, item, e.target.value)}
              className={`min-w-0 flex-1 max-w-[230px] rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none ${focusRing}`}
            >
              {allCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setCreatingCategoryForKey(prev => (prev === itemKey ? null : itemKey));
              setNewCategoryDraft('');
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 shrink-0"
          >
            <FolderPlus className="h-3 w-3 text-slate-600" />
            <span>קטגוריה חדשה</span>
          </button>
        </div>

        {isCreatingHere && (
          <form
            onSubmit={(e) => handleCreateAndAssignCategory(e, targetCollection, item, itemKey)}
            className="flex items-center gap-1.5"
          >
            <input
              type="text"
              value={newCategoryDraft}
              onChange={(e) => setNewCategoryDraft(e.target.value)}
              placeholder="שם קטגוריה חדשה..."
              autoFocus
              className={`flex-1 min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 focus:outline-none ${focusRing}`}
            />
            <button
              type="submit"
              className={`rounded-lg px-2.5 py-1 text-xs font-bold shrink-0 ${addBtnStyle}`}
            >
              שמור
            </button>
          </form>
        )}
      </div>
    );
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="mx-auto max-w-3xl w-full select-none sm:select-auto"
    >
      <datalist id="product-catalog-list">
        {catalog.map(item => (
          <option key={item.id} value={item.name} />
        ))}
      </datalist>

      {/* כל החלק העליון שמעל רשימת המוצרים מקובע יחד בזמן גלילה */}
      <div className="sticky top-[88px] sm:top-[108px] z-20 space-y-3 bg-slate-50/95 pt-1 pb-3 backdrop-blur-md">
        {/* בורר טאבי משנה: מלאי (ברירת מחדל) / רשימת קניות */}
        <div className="flex items-center justify-center">
          <div className="inline-flex w-full sm:w-auto rounded-2xl border border-slate-200 bg-slate-100 p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setSubTab('pantry')}
              className={`flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl px-5 py-2 text-xs sm:text-sm font-bold transition-all ${
                subTab === 'pantry'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Home className="h-4 w-4" />
              <span>מלאי בבית</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                subTab === 'pantry' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200/80 text-slate-600'
              }`}>
                {pantryItems.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('shopping')}
              className={`flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl px-5 py-2 text-xs sm:text-sm font-bold transition-all ${
                subTab === 'shopping'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              <span>רשימת קניות</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                subTab === 'shopping' ? 'bg-blue-50 text-blue-700' : 'bg-slate-200/80 text-slate-600'
              }`}>
                {shoppingItems.length}
              </span>
            </button>
          </div>
        </div>

        {addedToast && (
          <div
            role="status"
            className="flex items-center justify-between gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-emerald-900 shadow-sm"
          >
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="truncate">הפריט &ldquo;{addedToast}&rdquo; נוסף לרשימת הקניות בהצלחה</span>
            </div>
            <button
              type="button"
              onClick={() => setAddedToast(null)}
              title="סגור הודעה"
              className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {restockPrompt && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 shadow-sm">
            <div className="text-xs sm:text-sm font-semibold text-amber-900">
              <span className="underline">{restockPrompt.name}</span> הסתיים במלאי (מסומן כחסר). להוסיף לרשימת הקניות?
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await handleAddShoppingItem(null, restockPrompt.name, 1, true, restockPrompt.category);
                  setRestockPrompt(null);
                }}
                className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
              >
                כן, הוסף לקניות
              </button>
              <button
                type="button"
                onClick={() => setRestockPrompt(null)}
                className="rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
              >
                לא צריך
              </button>
            </div>
          </div>
        )}

        {subTab === 'pantry' ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Home className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">מה יש בבית (מלאי)</h2>
                  <p className="text-xs text-slate-500">חיפוש מהיר, סימון סיום ועדכון כמויות</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                {pantryFilterQuery
                  ? `${filteredPantryItems.length} / ${pantryItems.length}`
                  : `${pantryItems.length} מוצרים`}
              </span>
            </div>

            <form onSubmit={handleAddPantryItem} className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="relative flex-1 min-w-0">
                <input
                  type="text"
                  list="product-catalog-list"
                  value={newPantryName}
                  onChange={(e) => {
                    setNewPantryName(e.target.value);
                    if (pantryError) setPantryError('');
                  }}
                  placeholder="חפש במלאי או הוסף מוצר חדש..."
                  className="w-full min-w-0 rounded-xl border border-slate-300 bg-slate-50 py-2 pr-3 pl-7 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none"
                />
                {newPantryName && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewPantryName('');
                      if (pantryError) setPantryError('');
                    }}
                    title="נקה חיפוש"
                    className="absolute left-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center rounded-xl border border-slate-300 bg-slate-50 p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setNewPantryQty(q => Math.max(1, (Number(q) || 1) - 1))}
                  title="הפחת כמות להוספה"
                  className="flex h-7 w-6 items-center justify-center rounded-lg text-slate-600 hover:bg-white hover:text-slate-900"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="min-w-[1.4rem] text-center text-xs sm:text-sm font-bold text-slate-900">
                  {Math.max(1, Number(newPantryQty) || 1)}
                </span>
                <button
                  type="button"
                  onClick={() => setNewPantryQty(q => Math.max(1, Number(q) || 1) + 1)}
                  title="הוסף כמות להוספה"
                  className="flex h-7 w-6 items-center justify-center rounded-lg text-slate-600 hover:bg-white hover:text-slate-900"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              <button
                type="submit"
                title="הוסף למלאי"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>

            {pantryError && (
              <div
                role="alert"
                className="mt-2.5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{pantryError}</span>
              </div>
            )}

            {pantryFilterQuery && (
              <div className="mt-2.5 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600 border border-slate-200/80">
                <span>
                  מסנן לפי: <strong className="text-slate-800">&ldquo;{newPantryName.trim()}&rdquo;</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setNewPantryName('');
                    if (pantryError) setPantryError('');
                  }}
                  className="font-semibold text-emerald-700 hover:underline"
                >
                  הצג הכל
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">רשימת קניות</h2>
                  <p className="text-xs text-slate-500">מסודר לפי קטגוריה וא'-ב' • סימון V יעביר למלאי</p>
                </div>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                {shoppingFilterQuery
                  ? `${filteredShoppingItems.length} / ${shoppingItems.length}`
                  : `${shoppingItems.length} פריטים`}
              </span>
            </div>

            <form onSubmit={(e) => handleAddShoppingItem(e)} className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="relative flex-1 min-w-0">
                <input
                  type="text"
                  list="product-catalog-list"
                  value={newShoppingName}
                  onChange={(e) => setNewShoppingName(e.target.value)}
                  placeholder="חפש בקניות או הוסף מוצר..."
                  className="w-full min-w-0 rounded-xl border border-slate-300 bg-slate-50 py-2 pr-3 pl-7 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                />
                {newShoppingName && (
                  <button
                    type="button"
                    onClick={() => setNewShoppingName('')}
                    title="נקה חיפוש"
                    className="absolute left-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center rounded-xl border border-slate-300 bg-slate-50 p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setNewShoppingQty(q => Math.max(1, (Number(q) || 1) - 1))}
                  title="הפחת כמות להוספה"
                  className="flex h-7 w-6 items-center justify-center rounded-lg text-slate-600 hover:bg-white hover:text-slate-900"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="min-w-[1.4rem] text-center text-xs sm:text-sm font-bold text-slate-900">
                  {Math.max(1, Number(newShoppingQty) || 1)}
                </span>
                <button
                  type="button"
                  onClick={() => setNewShoppingQty(q => Math.max(1, Number(q) || 1) + 1)}
                  title="הוסף כמות להוספה"
                  className="flex h-7 w-6 items-center justify-center rounded-lg text-slate-600 hover:bg-white hover:text-slate-900"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              <button
                type="submit"
                title="הוסף לרשימת קניות"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>

            {shoppingFilterQuery && (
              <div className="mt-2.5 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600 border border-slate-200/80">
                <span>
                  מסנן לפי: <strong className="text-slate-800">&ldquo;{newShoppingName.trim()}&rdquo;</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setNewShoppingName('')}
                  className="font-semibold text-blue-700 hover:underline"
                >
                  הצג הכל
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* רשימת הפריטים הנגללת מתחת לחלק העליון המקובע */}
      {subTab === 'pantry' ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs">
          {pantryItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">
              עדיין לא הוזנו פריטים למלאי הבית
            </div>
          ) : filteredPantryItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">
              לא נמצאו פריטים במלאי התואמים ל- &ldquo;{newPantryName.trim()}&rdquo;
            </div>
          ) : (
            <ul className="space-y-2">
              {filteredPantryItems.map(item => {
                const qty = Math.max(0, Number(item.quantity) || 0);
                const isOutOfStock = qty === 0;
                const isLowStock = Boolean(item.lowStock) && !isOutOfStock;
                const itemKey = `pantry_${item.id}`;
                const isExpanded = expandedItemKey === itemKey;

                const rowStyle = isOutOfStock
                  ? 'border-rose-200 bg-rose-50/70'
                  : isLowStock
                  ? 'border-amber-300 bg-amber-50/70'
                  : 'border-slate-200/80 bg-white';

                return (
                  <li
                    key={item.id}
                    className={`rounded-xl border px-3 py-2.5 transition-colors ${rowStyle}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      {/* שם הפריט (לחיצה מציגה שם מלא ופותחת קטגוריה) */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => toggleItemExpansion(itemKey)}
                          title="לחץ להצגת שם מלא וניהול קטגוריה"
                          className={`text-right text-sm font-semibold ${
                            isExpanded ? 'whitespace-normal break-words' : 'truncate'
                          } ${
                            isOutOfStock
                              ? 'text-rose-900'
                              : isLowStock
                              ? 'text-amber-950'
                              : 'text-slate-800'
                          }`}
                        >
                          {item.name}
                        </button>

                        {isOutOfStock && (
                          <span className="inline-flex shrink-0 items-center rounded-md border border-rose-300 bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                            חסר
                          </span>
                        )}
                      </div>

                      {/* כפתורי פעולה (אייקונים בלבד) וכמויות */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleAddShoppingItem(null, item.name, 1, true, item.category)}
                          title="הוסף פריט לרשימת הקניות"
                          aria-label="הוסף פריט לרשימת הקניות"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 transition-colors hover:bg-blue-100"
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleLowStock(item)}
                          title={item.lowStock ? 'בטל סימון מתקרב לסיום' : 'סמן כמתקרב לסיום'}
                          aria-label={item.lowStock ? 'בטל סימון מתקרב לסיום' : 'סמן כמתקרב לסיום'}
                          className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${
                            item.lowStock
                              ? 'border-amber-400 bg-amber-200/80 text-amber-950 hover:bg-amber-300/70'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800'
                          }`}
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDecreasePantry(item)}
                            disabled={qty === 0}
                            title={qty === 0 ? 'הכמות כבר 0 (חסר)' : 'הפחת כמות'}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>

                          <span
                            className={`min-w-[1.5rem] text-center text-sm font-bold ${
                              isOutOfStock
                                ? 'text-rose-700'
                                : isLowStock
                                ? 'text-amber-800'
                                : 'text-slate-900'
                            }`}
                          >
                            {qty}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleIncreasePantry(item)}
                            title="הוסף יחידה"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeletePantryItem(item.id)}
                          title="מחק מוצר מהמלאי"
                          aria-label="מחק מוצר מהמלאי"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && renderCategoryEditor('pantry_items', item, itemKey, 'emerald')}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : (
        <section className="space-y-3">
          {shoppingItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-8 text-center text-xs text-slate-400">
              רשימת הקניות ריקה כרגע
            </div>
          ) : groupedShoppingSections.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-8 text-center text-xs text-slate-400">
              לא נמצאו פריטים ברשימת הקניות התואמים ל- &ldquo;{newShoppingName.trim()}&rdquo;
            </div>
          ) : (
            groupedShoppingSections.map(group => (
              <div
                key={group.category}
                className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs"
              >
                <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-800">
                    {group.category}
                  </h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                    {group.items.length}
                  </span>
                </div>

                <ul className="divide-y divide-slate-100">
                  {group.items.map(item => {
                    const qty = Math.max(1, Number(item.quantity) || 1);
                    const itemKey = `shop_${item.id}`;
                    const isExpanded = expandedItemKey === itemKey;

                    return (
                      <li key={item.id} className="py-2.5 first:pt-1 last:pb-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => handleCompleteShoppingItem(item)}
                              title="נקנה! העבר למלאי הבית"
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500 bg-white text-emerald-600 transition-colors hover:bg-emerald-500 hover:text-white"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleItemExpansion(itemKey)}
                              title="לחץ להצגת שם מלא וניהול קטגוריה"
                              className={`text-right text-sm font-semibold text-slate-800 ${
                                isExpanded ? 'whitespace-normal break-words' : 'truncate'
                              }`}
                            >
                              {item.name}
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleDecreaseShoppingItemQty(item)}
                              disabled={qty <= 1}
                              title={qty <= 1 ? 'כמות מינימלית 1' : 'הפחת כמות'}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>

                            <span className="min-w-[1.75rem] text-center text-sm font-bold text-blue-700">
                              {qty}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleIncreaseShoppingItemQty(item)}
                              title="הוסף יחידה"
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteShoppingItem(item.id)}
                              title="הסר מהרשימה"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {isExpanded && renderCategoryEditor('shopping_items', item, itemKey, 'blue')}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </section>
      )}
    </div>
  );
}