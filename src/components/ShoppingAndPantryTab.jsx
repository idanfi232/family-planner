import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ShoppingCart, Home, Plus, Minus, Check, Trash2, Sparkles, AlertTriangle, X } from 'lucide-react';

export default function ShoppingAndPantryTab() {
  const [subTab, setSubTab] = useState('pantry'); // 'pantry' (ברירת מחדל) | 'shopping'

  const [pantryItems, setPantryItems] = useState([]);
  const [shoppingItems, setShoppingItems] = useState([]);
  const [catalog, setCatalog] = useState([]);

  const [newShoppingName, setNewShoppingName] = useState('');
  const [newShoppingQty, setNewShoppingQty] = useState(1);

  const [newPantryName, setNewPantryName] = useState('');
  const [newPantryQty, setNewPantryQty] = useState(1);

  const [restockPrompt, setRestockPrompt] = useState(null);

  useEffect(() => {
    const unsubPantry = onSnapshot(collection(db, 'pantry_items'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => a.name.localeCompare(b.name, 'he'));
      setPantryItems(list);
    });

    const unsubShopping = onSnapshot(collection(db, 'shopping_items'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setShoppingItems(list);
    });

    const unsubCatalog = onSnapshot(collection(db, 'product_catalog'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => a.name.localeCompare(b.name, 'he'));
      setCatalog(list);
    });

    return () => {
      unsubPantry();
      unsubShopping();
      unsubCatalog();
    };
  }, []);

  const saveToCatalog = async (rawName) => {
    const cleanName = rawName.trim();
    if (!cleanName) return;
    const exists = catalog.some(c => c.name.toLowerCase() === cleanName.toLowerCase());
    if (!exists) {
      const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await setDoc(doc(db, 'product_catalog', id), { id, name: cleanName });
    }
  };

  const handleAddShoppingItem = async (e, overrideName = null, overrideQty = 1) => {
    if (e) e.preventDefault();
    const name = (overrideName !== null ? overrideName : newShoppingName).trim();
    const qty = Math.max(1, Number(overrideName !== null ? overrideQty : newShoppingQty) || 1);
    if (!name) return;

    await saveToCatalog(name);

    const existing = shoppingItems.find(item => item.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      await updateDoc(doc(db, 'shopping_items', existing.id), {
        quantity: (existing.quantity || 1) + qty
      });
    } else {
      const id = `shop_${Date.now()}`;
      await setDoc(doc(db, 'shopping_items', id), {
        id,
        name,
        quantity: qty,
        createdAt: Date.now()
      });
    }

    if (overrideName === null) {
      setNewShoppingName('');
      setNewShoppingQty(1);
    }
  };

  const handleAddPantryItem = async (e) => {
    e.preventDefault();
    const name = newPantryName.trim();
    const qty = Math.max(1, Number(newPantryQty) || 1);
    if (!name) return;

    await saveToCatalog(name);

    const existing = pantryItems.find(item => item.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      const nextQty = (Number(existing.quantity) || 0) + qty;
      await updateDoc(doc(db, 'pantry_items', existing.id), {
        quantity: nextQty,
        ...(nextQty > 0 ? { lowStock: false } : {})
      });
    } else {
      const id = `pantry_${Date.now()}`;
      await setDoc(doc(db, 'pantry_items', id), {
        id,
        name,
        quantity: qty,
        lowStock: false
      });
    }

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
    setRestockPrompt({ name: item.name, isOutOfStock: nextQty === 0 });
  };

  const handleIncreasePantry = async (item) => {
    const nextQty = (Number(item.quantity) || 0) + 1;
    await updateDoc(doc(db, 'pantry_items', item.id), {
      quantity: nextQty
    });
  };

  const handleToggleLowStock = async (item) => {
    await updateDoc(doc(db, 'pantry_items', item.id), {
      lowStock: !Boolean(item.lowStock)
    });
  };

  const handleCompleteShoppingItem = async (shopItem) => {
    const boughtQty = Number(shopItem.quantity) || 1;
    const existingPantry = pantryItems.find(
      p => p.name.toLowerCase() === shopItem.name.toLowerCase()
    );

    if (existingPantry) {
      await updateDoc(doc(db, 'pantry_items', existingPantry.id), {
        quantity: (Number(existingPantry.quantity) || 0) + boughtQty,
        lowStock: false
      });
    } else {
      const id = `pantry_${Date.now()}`;
      await setDoc(doc(db, 'pantry_items', id), {
        id,
        name: shopItem.name,
        quantity: boughtQty,
        lowStock: false
      });
    }

    await deleteDoc(doc(db, 'shopping_items', shopItem.id));
  };

  const handleDeleteShoppingItem = async (id) => {
    await deleteDoc(doc(db, 'shopping_items', id));
  };

  const quickSuggestions = useMemo(() => {
    const inShopping = new Set(shoppingItems.map(s => s.name.toLowerCase()));
    return catalog.filter(c => !inShopping.has(c.name.toLowerCase())).slice(0, 12);
  }, [catalog, shoppingItems]);

  const pantryFilterQuery = newPantryName.trim().toLowerCase();
  const filteredPantryItems = useMemo(() => {
    if (!pantryFilterQuery) return pantryItems;
    return pantryItems.filter(item => item.name.toLowerCase().includes(pantryFilterQuery));
  }, [pantryItems, pantryFilterQuery]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <datalist id="product-catalog-list">
        {catalog.map(item => (
          <option key={item.id} value={item.name} />
        ))}
      </datalist>

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

      {restockPrompt && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 shadow-sm">
          <div className="text-xs sm:text-sm font-semibold text-amber-900">
            {restockPrompt.isOutOfStock ? (
              <>
                <span className="underline">{restockPrompt.name}</span> הסתיים במלאי (מסומן כחסר). להוסיף לרשימת הקניות?
              </>
            ) : (
              <>
                הורדת <span className="underline">{restockPrompt.name}</span> מהמלאי. להוסיף לרשימת הקניות?
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                await handleAddShoppingItem(null, restockPrompt.name, 1);
                setRestockPrompt(null);
              }}
              className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
            >
              כן, הוסף לקניות
            </button>
            <button
              onClick={() => setRestockPrompt(null)}
              className="rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
            >
              לא צריך
            </button>
          </div>
        </div>
      )}

      {subTab === 'pantry' ? (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-xs">
          {/* אזור כותרת וחיפוש מקובע בראש בזמן גלילה */}
          <div className="sticky top-[49px] sm:top-[61px] z-20 rounded-t-2xl border-b border-slate-200/80 bg-white/95 p-4 sm:p-5 backdrop-blur-md">
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

            <form onSubmit={handleAddPantryItem} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  list="product-catalog-list"
                  value={newPantryName}
                  onChange={(e) => setNewPantryName(e.target.value)}
                  placeholder="חפש במלאי או הוסף מוצר חדש..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pr-3 pl-8 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none"
                />
                {newPantryName && (
                  <button
                    type="button"
                    onClick={() => setNewPantryName('')}
                    title="נקה חיפוש"
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <input
                type="number"
                min="1"
                value={newPantryQty}
                onChange={(e) => setNewPantryQty(e.target.value)}
                className="w-16 rounded-xl border border-slate-300 bg-slate-50 px-2 py-2 text-center text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none"
                title="כמות"
              />
              <button
                type="submit"
                title="הוסף למלאי"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>

            {pantryFilterQuery && (
              <div className="mt-2.5 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600 border border-slate-200/80">
                <span>
                  מסנן לפי: <strong className="text-slate-800">&ldquo;{newPantryName.trim()}&rdquo;</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setNewPantryName('')}
                  className="font-semibold text-emerald-700 hover:underline"
                >
                  הצג הכל
                </button>
              </div>
            )}
          </div>

          <div className="p-4 sm:p-5">
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

                  const rowStyle = isOutOfStock
                    ? 'border-rose-200 bg-rose-50/70'
                    : isLowStock
                    ? 'border-amber-300 bg-amber-50/70'
                    : 'border-slate-200/80 bg-white';

                  return (
                    <li
                      key={item.id}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition-colors ${rowStyle}`}
                    >
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span
                          className={`text-sm font-semibold break-words ${
                            isOutOfStock
                              ? 'text-rose-900'
                              : isLowStock
                              ? 'text-amber-950'
                              : 'text-slate-800'
                          }`}
                        >
                          {item.name}
                        </span>

                        {isOutOfStock && (
                          <span className="inline-flex items-center rounded-md border border-rose-300 bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                            חסר
                          </span>
                        )}

                        {isLowStock && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                            <AlertTriangle className="h-3 w-3" /> מתקרב לסיום
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAddShoppingItem(null, item.name, 1)}
                          title="הוסף פריט לרשימת הקניות"
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                        >
                          <ShoppingCart className="h-3 w-3" />
                          <span>הוסף לקניות</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleLowStock(item)}
                          title={item.lowStock ? 'בטל סימון מתקרב לסיום' : 'סמן כמתקרב לסיום'}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors ${
                            item.lowStock
                              ? 'border-amber-400 bg-amber-200/80 text-amber-950 hover:bg-amber-300/70'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800'
                          }`}
                        >
                          <AlertTriangle className="h-3 w-3" />
                          <span className="hidden sm:inline">{item.lowStock ? 'מסומן לסיום' : 'מתקרב לסיום'}</span>
                        </button>

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
                          className={`min-w-[2rem] text-center text-sm font-bold ${
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
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">רשימת קניות</h2>
                <p className="text-xs text-slate-500">סימון V יעביר אוטומטית למלאי הבית</p>
              </div>
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
              {shoppingItems.length} פריטים
            </span>
          </div>

          <form onSubmit={(e) => handleAddShoppingItem(e)} className="mb-3 flex gap-2">
            <input
              type="text"
              list="product-catalog-list"
              value={newShoppingName}
              onChange={(e) => setNewShoppingName(e.target.value)}
              placeholder="הוסף מוצר לקנייה (או בחר מהרשימה)..."
              className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
            />
            <input
              type="number"
              min="1"
              value={newShoppingQty}
              onChange={(e) => setNewShoppingQty(e.target.value)}
              className="w-16 rounded-xl border border-slate-300 bg-slate-50 px-2 py-2 text-center text-sm font-semibold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
              title="כמות"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>

          {quickSuggestions.length > 0 && (
            <div className="mb-4">
              <div className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                <Sparkles className="h-3 w-3" /> הוספה מהירה ממוצרים קודמים:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickSuggestions.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleAddShoppingItem(null, item.name, 1)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  >
                    + {item.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {shoppingItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">
              רשימת הקניות ריקה כרגע
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {shoppingItems.map(item => (
                <li key={item.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleCompleteShoppingItem(item)}
                      title="נקנה! העבר למלאי הבית"
                      className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-emerald-500 bg-white text-emerald-600 transition-colors hover:bg-emerald-500 hover:text-white"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <div>
                      <span className="text-sm font-semibold text-slate-800">{item.name}</span>
                      {item.quantity > 1 && (
                        <span className="mr-2 rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-bold text-blue-700">
                          ×{item.quantity}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteShoppingItem(item.id)}
                    title="הסר מהרשימה"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}