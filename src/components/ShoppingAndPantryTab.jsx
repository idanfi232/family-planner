import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ShoppingCart, Home, Plus, Minus, Check, Trash2, Sparkles, X } from 'lucide-react';

export default function ShoppingAndPantryTab() {
  const [pantryItems, setPantryItems] = useState([]);
  const [shoppingItems, setShoppingItems] = useState([]);
  const [catalog, setCatalog] = useState([]);

  // שדות הוספה לרשימת קניות
  const [newShoppingName, setNewShoppingName] = useState('');
  const [newShoppingQty, setNewShoppingQty] = useState(1);

  // שדות הוספה למלאי בית
  const [newPantryName, setNewPantryName] = useState('');
  const [newPantryQty, setNewPantryQty] = useState(1);

  // הצעה להוספה לקניות לאחר הורדה מהמלאי
  const [restockPrompt, setRestockPrompt] = useState(null); // { name: string }

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

  // שמירת מוצר בזיכרון המערכת לבחירה עתידית
  const saveToCatalog = async (rawName) => {
    const cleanName = rawName.trim();
    if (!cleanName) return;
    const exists = catalog.some(c => c.name.toLowerCase() === cleanName.toLowerCase());
    if (!exists) {
      const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await setDoc(doc(db, 'product_catalog', id), { id, name: cleanName });
    }
  };

  // הוספה לרשימת קניות
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

  // הוספה ישירה למלאי הבית
  const handleAddPantryItem = async (e) => {
    e.preventDefault();
    const name = newPantryName.trim();
    const qty = Math.max(1, Number(newPantryQty) || 1);
    if (!name) return;

    await saveToCatalog(name);

    const existing = pantryItems.find(item => item.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      await updateDoc(doc(db, 'pantry_items', existing.id), {
        quantity: (existing.quantity || 0) + qty
      });
    } else {
      const id = `pantry_${Date.now()}`;
      await setDoc(doc(db, 'pantry_items', id), {
        id,
        name,
        quantity: qty
      });
    }

    setNewPantryName('');
    setNewPantryQty(1);
  };

  // הורדה מהמלאי + הצעה להוסיף לרשימת קניות
  const handleDecreasePantry = async (item) => {
    const currentQty = Number(item.quantity) || 1;
    if (currentQty <= 1) {
      await deleteDoc(doc(db, 'pantry_items', item.id));
    } else {
      await updateDoc(doc(db, 'pantry_items', item.id), {
        quantity: currentQty - 1
      });
    }
    setRestockPrompt({ name: item.name });
  };

  // העלאה במלאי
  const handleIncreasePantry = async (item) => {
    await updateDoc(doc(db, 'pantry_items', item.id), {
      quantity: (Number(item.quantity) || 0) + 1
    });
  };

  // סימון V על פריט ברשימת הקניות -> מעביר למלאי הבית ומוחק מהקניות
  const handleCompleteShoppingItem = async (shopItem) => {
    const boughtQty = Number(shopItem.quantity) || 1;
    const existingPantry = pantryItems.find(
      p => p.name.toLowerCase() === shopItem.name.toLowerCase()
    );

    if (existingPantry) {
      await updateDoc(doc(db, 'pantry_items', existingPantry.id), {
        quantity: (Number(existingPantry.quantity) || 0) + boughtQty
      });
    } else {
      const id = `pantry_${Date.now()}`;
      await setDoc(doc(db, 'pantry_items', id), {
        id,
        name: shopItem.name,
        quantity: boughtQty
      });
    }

    await deleteDoc(doc(db, 'shopping_items', shopItem.id));
  };

  // מחיקה מרשימת קניות ללא העברה למלאי
  const handleDeleteShoppingItem = async (id) => {
    await deleteDoc(doc(db, 'shopping_items', id));
  };

  // הצעות מוצרים מהזיכרון שלא נמצאים כרגע ברשימת הקניות
  const quickSuggestions = useMemo(() => {
    const inShopping = new Set(shoppingItems.map(s => s.name.toLowerCase()));
    return catalog.filter(c => !inShopping.has(c.name.toLowerCase())).slice(0, 12);
  }, [catalog, shoppingItems]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* רשימת הצעות מהזיכרון */}
      <datalist id="product-catalog-list">
        {catalog.map(item => (
          <option key={item.id} value={item.name} />
        ))}
      </datalist>

      {/* באנר שאלה לאחר הורדה מהמלאי */}
      {restockPrompt && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 shadow-sm">
          <div className="text-xs sm:text-sm font-semibold text-amber-900">
            הורדת <span className="underline">{restockPrompt.name}</span> מהמלאי. להוסיף לרשימת הקניות?
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* עמודה 1: רשימת קניות */}
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

          {/* בחירה מהירה ממוצרים מוכרים */}
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

        {/* עמודה 2: מלאי הבית */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Home className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">מה יש בבית (מלאי)</h2>
                <p className="text-xs text-slate-500">עדכון כמויות בזמן אמת</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
              {pantryItems.length} מוצרים
            </span>
          </div>

          <form onSubmit={handleAddPantryItem} className="mb-4 flex gap-2">
            <input
              type="text"
              list="product-catalog-list"
              value={newPantryName}
              onChange={(e) => setNewPantryName(e.target.value)}
              placeholder="הוסף מוצר שקיים בבית..."
              className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none"
            />
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
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>

          {pantryItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">
              עדיין לא הוזנו פריטים למלאי הבית
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pantryItems.map(item => (
                <li key={item.id} className="flex items-center justify-between gap-2 py-2.5">
                  <span className="text-sm font-semibold text-slate-800">{item.name}</span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDecreasePantry(item)}
                      title="הפחת כמות"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-[2rem] text-center text-sm font-bold text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleIncreasePantry(item)}
                      title="הוסף יחידה"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}