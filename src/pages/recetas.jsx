import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen, ChefHat, Croissant, Edit3, Loader2, Plus, Save,
  Search, Trash2, X, AlertCircle, Calculator, Package,
} from 'lucide-react';
import { supabase } from '../supabase.js';
import '../styles/recetas.css';

const EMPTY_RECIPE = {
  name: '', area: 'obrador', description: '', yield_quantity: 1,
  yield_unit: 'unidades', process: '', product_id: '', cost_sheet_id: '', active: true,
  allergens: [],
};

const EMPTY_ITEM = {
  name: '', quantity: 0, unit: 'g', unit_cost: 0,
  source_type: 'manual', source_id: '', notes: '', sort_order: 0,
};

const UNITS = ['g', 'kg', 'ml', 'l', 'unidad', 'docena', 'ración'];

const ALLERGENS = [
  ['gluten', 'Gluten'], ['crustaceos', 'Crustáceos'], ['huevos', 'Huevos'],
  ['pescado', 'Pescado'], ['cacahuetes', 'Cacahuetes'], ['soja', 'Soja'],
  ['leche', 'Leche'], ['frutos_de_cascara', 'Frutos de cáscara'], ['apio', 'Apio'],
  ['mostaza', 'Mostaza'], ['sesamo', 'Sésamo'], ['sulfitos', 'Sulfitos'],
  ['altramuces', 'Altramuces'], ['moluscos', 'Moluscos'],
];

const money = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const number = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 3 });

function normalizedCost(item) {
  const quantity = Number(item.quantity) || 0;
  const unitCost = Number(item.unit_cost) || 0;
  return quantity * unitCost;
}

function sourceRecipeUnitCost(sourceRecipe, targetUnit) {
  if (!sourceRecipe) return 0;
  const total = (sourceRecipe.recipe_ingredients || []).reduce(
    (sum, item) => sum + normalizedCost(item), 0,
  );
  const sourceUnit = String(sourceRecipe.yield_unit || '').toLowerCase();
  const unit = String(targetUnit || sourceUnit).toLowerCase();
  const costPerSourceUnit = total / Math.max(Number(sourceRecipe.yield_quantity) || 1, 1);
  if (sourceUnit === 'kg' && unit === 'g') return costPerSourceUnit / 1000;
  if (sourceUnit === 'g' && unit === 'kg') return costPerSourceUnit * 1000;
  if (sourceUnit === 'l' && unit === 'ml') return costPerSourceUnit / 1000;
  if (sourceUnit === 'ml' && unit === 'l') return costPerSourceUnit * 1000;
  return costPerSourceUnit;
}

function RecipeForm({ initial, availableRecipes, onCancel, onSaved }) {
  const [recipe, setRecipe] = useState(initial?.recipe ?? EMPTY_RECIPE);
  const [items, setItems] = useState(initial?.items?.length ? initial.items : [{ ...EMPTY_ITEM }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const totalCost = useMemo(() => items.reduce((sum, item) => sum + normalizedCost(item), 0), [items]);
  const costPerYield = totalCost / Math.max(Number(recipe.yield_quantity) || 1, 1);

  const setField = (field, value) => setRecipe((current) => ({ ...current, [field]: value }));
  const setItem = (index, field, value) => setItems((current) => current.map((item, i) => (
    i === index ? { ...item, [field]: value } : item
  )));

  const addItem = () => setItems((current) => [
    ...current,
    { ...EMPTY_ITEM, sort_order: current.length },
  ]);

  const removeItem = (index) => setItems((current) => current.filter((_, i) => i !== index));
  const toggleAllergen = (allergen) => setRecipe((current) => ({
    ...current,
    allergens: (current.allergens || []).includes(allergen)
      ? current.allergens.filter((value) => value !== allergen)
      : [...(current.allergens || []), allergen],
  }));

  const selectSourceRecipe = (index, sourceId) => {
    const source = availableRecipes.find((candidate) => candidate.id === sourceId);
    setItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      if (!source) return { ...item, source_id: '', name: '', unit_cost: 0 };
      const sourceUnit = source.yield_unit === 'unidades' ? 'unidad' : source.yield_unit;
      return {
        ...item,
        source_type: 'recipe',
        source_id: source.id,
        name: source.name,
        unit: sourceUnit,
        unit_cost: sourceRecipeUnitCost(source, sourceUnit),
      };
    }));
    if (source?.allergens?.length) {
      setRecipe((current) => ({
        ...current,
        allergens: [...new Set([...(current.allergens || []), ...source.allergens])],
      }));
    }
  };

  async function save(event) {
    event.preventDefault();
    setError('');
    if (!recipe.name.trim()) return setError('Escribe el nombre de la receta.');
    const validItems = items.filter((item) => item.name.trim() && Number(item.quantity) > 0);
    if (!validItems.length) return setError('Añade al menos un ingrediente con cantidad.');

    setSaving(true);
    try {
      const payload = {
        name: recipe.name.trim(),
        area: recipe.area,
        description: recipe.description?.trim() || null,
        yield_quantity: Number(recipe.yield_quantity) || 1,
        yield_unit: recipe.yield_unit?.trim() || 'unidades',
        process: recipe.process?.trim() || null,
        product_id: recipe.product_id || null,
        cost_sheet_id: recipe.cost_sheet_id || null,
        active: recipe.active,
        allergens: recipe.allergens || [],
      };

      let recipeId = initial?.recipe?.id;
      if (recipeId) {
        const { error: recipeError } = await supabase.from('recipes').update(payload).eq('id', recipeId);
        if (recipeError) throw recipeError;
        const { error: deleteError } = await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId);
        if (deleteError) throw deleteError;
      } else {
        const { data, error: recipeError } = await supabase.from('recipes').insert(payload).select('id').single();
        if (recipeError) throw recipeError;
        recipeId = data.id;
      }

      const ingredientPayload = validItems.map((item, index) => ({
        recipe_id: recipeId,
        name: item.name.trim(),
        quantity: Number(item.quantity),
        unit: item.unit,
        unit_cost: Number(item.unit_cost) || 0,
        source_type: item.source_type,
        source_id: item.source_id || null,
        notes: item.notes?.trim() || null,
        sort_order: index,
      }));
      const { error: itemsError } = await supabase.from('recipe_ingredients').insert(ingredientPayload);
      if (itemsError) throw itemsError;
      onSaved();
    } catch (saveError) {
      setError(saveError.message || 'No se ha podido guardar la receta.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="recipe-editor" onSubmit={save}>
      <div className="recipe-editor__header">
        <div>
          <span className="recipe-eyebrow">{initial ? 'Editar receta' : 'Nueva receta'}</span>
          <h2>{recipe.name || 'Receta sin nombre'}</h2>
        </div>
        <button type="button" className="icon-button" onClick={onCancel} aria-label="Cerrar"><X size={20} /></button>
      </div>

      {error && <div className="recipe-alert"><AlertCircle size={18} />{error}</div>}

      <div className="recipe-grid recipe-grid--2">
        <label>Nombre<input value={recipe.name} onChange={(e) => setField('name', e.target.value)} placeholder="Ej. Croissant de mantequilla" /></label>
        <label>Sección<select value={recipe.area} onChange={(e) => setField('area', e.target.value)}><option value="cocina">Cocina</option><option value="obrador">Obrador</option></select></label>
      </div>
      <label>Descripción<textarea rows="2" value={recipe.description || ''} onChange={(e) => setField('description', e.target.value)} placeholder="Descripción breve o notas generales" /></label>

      <div className="recipe-grid recipe-grid--4">
        <label>Rendimiento<input type="number" min="0.001" step="0.001" value={recipe.yield_quantity} onChange={(e) => setField('yield_quantity', e.target.value)} /></label>
        <label>Unidad producida<input value={recipe.yield_unit} onChange={(e) => setField('yield_unit', e.target.value)} placeholder="unidades / raciones / kg" /></label>
        <label>ID producto (opcional)<input value={recipe.product_id || ''} onChange={(e) => setField('product_id', e.target.value)} placeholder="UUID del producto" /></label>
        <label>ID escandallo (opcional)<input value={recipe.cost_sheet_id || ''} onChange={(e) => setField('cost_sheet_id', e.target.value)} placeholder="UUID del escandallo" /></label>
      </div>

      <div className="recipe-section-title"><div><h3>Ingredientes</h3><p>El coste unitario se expresa por la unidad elegida.</p></div><button type="button" className="secondary-button" onClick={addItem}><Plus size={17} />Ingrediente</button></div>
      <div className="ingredients-table">
        <div className="ingredients-table__head"><span>Ingrediente</span><span>Cantidad</span><span>Unidad</span><span>Origen</span><span>Coste/u.</span><span>Total</span><span /></div>
        {items.map((item, index) => (
          <div className="ingredients-table__row" key={item.id || index}>
            {item.source_type === 'recipe' ? (
              <select value={item.source_id || ''} onChange={(e) => selectSourceRecipe(index, e.target.value)}>
                <option value="">Selecciona receta base…</option>
                {availableRecipes.filter((candidate) => candidate.id !== initial?.recipe?.id).map((candidate) => (
                  <option value={candidate.id} key={candidate.id}>{candidate.name} · {candidate.yield_quantity} {candidate.yield_unit}</option>
                ))}
              </select>
            ) : <input value={item.name} onChange={(e) => setItem(index, 'name', e.target.value)} placeholder="Harina de fuerza" />}
            <input type="number" min="0" step="0.001" value={item.quantity} onChange={(e) => setItem(index, 'quantity', e.target.value)} />
            <select value={item.unit} onChange={(e) => setItem(index, 'unit', e.target.value)}>{UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select>
            <select value={item.source_type} onChange={(e) => {
              const nextType = e.target.value;
              setItems((current) => current.map((currentItem, itemIndex) => itemIndex === index ? {
                ...currentItem, source_type: nextType,
                ...(nextType === 'recipe' ? { source_id: '', name: '', unit_cost: 0 } : { source_id: '' }),
              } : currentItem));
            }}><option value="manual">Manual</option><option value="product">Producto</option><option value="cost_sheet">Escandallo</option><option value="recipe">Otra receta</option></select>
            <input type="number" min="0" step="0.0001" value={item.unit_cost} onChange={(e) => setItem(index, 'unit_cost', e.target.value)} readOnly={item.source_type === 'recipe'} title={item.source_type === 'recipe' ? 'Calculado desde la receta base' : ''} />
            <strong>{money.format(normalizedCost(item))}</strong>
            <button type="button" className="icon-button icon-button--danger" onClick={() => removeItem(index)} disabled={items.length === 1} aria-label="Eliminar ingrediente"><Trash2 size={17} /></button>
          </div>
        ))}
      </div>

      <div className="recipe-allergens">
        <div className="recipe-section-title"><div><h3>Alérgenos</h3><p>Marca todos los presentes en la receta o sus ingredientes.</p></div></div>
        <div className="allergen-selector">
          {ALLERGENS.map(([value, label]) => (
            <label className={(recipe.allergens || []).includes(value) ? 'selected' : ''} key={value}>
              <input type="checkbox" checked={(recipe.allergens || []).includes(value)} onChange={() => toggleAllergen(value)} />
              {label}
            </label>
          ))}
        </div>
      </div>

      <label>Proceso / elaboración<textarea rows="7" value={recipe.process || ''} onChange={(e) => setField('process', e.target.value)} placeholder={'1. Preparar los ingredientes…\n2. Amasar…\n3. Fermentar…'} /></label>

      <div className="recipe-summary">
        <div><span>Coste total</span><strong>{money.format(totalCost)}</strong></div>
        <div><span>Coste por {recipe.yield_unit || 'unidad'}</span><strong>{money.format(costPerYield)}</strong></div>
        <label className="recipe-toggle"><input type="checkbox" checked={recipe.active} onChange={(e) => setField('active', e.target.checked)} />Receta activa</label>
      </div>

      <div className="recipe-editor__actions"><button type="button" className="secondary-button" onClick={onCancel}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? <Loader2 className="spin" size={18} /> : <Save size={18} />}{saving ? 'Guardando…' : 'Guardar receta'}</button></div>
    </form>
  );
}

export default function Recetas() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [area, setArea] = useState('all');
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState(null);

  const loadRecipes = useCallback(async () => {
    setLoading(true); setError('');
    const { data, error: queryError } = await supabase
      .from('recipes')
      .select('*, recipe_ingredients(*)')
      .order('updated_at', { ascending: false });
    if (queryError) setError(queryError.message);
    else setRecipes(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadRecipes(); }, [loadRecipes]);

  const visible = useMemo(() => recipes.filter((recipe) => {
    const matchesArea = area === 'all' || recipe.area === area;
    const needle = search.trim().toLocaleLowerCase('es');
    const matchesSearch = !needle || `${recipe.name} ${recipe.description || ''}`.toLocaleLowerCase('es').includes(needle);
    return matchesArea && matchesSearch;
  }), [recipes, area, search]);

  async function removeRecipe(recipe) {
    if (!window.confirm(`¿Eliminar la receta “${recipe.name}”?`)) return;
    const { error: deleteError } = await supabase.from('recipes').delete().eq('id', recipe.id);
    if (deleteError) setError(deleteError.message); else loadRecipes();
  }

  if (editor) return <RecipeForm initial={editor === 'new' ? null : editor} availableRecipes={recipes} onCancel={() => setEditor(null)} onSaved={() => { setEditor(null); loadRecipes(); }} />;

  return (
    <main className="recipes-page">
      <header className="recipes-hero">
        <div><span className="recipe-eyebrow">Producción propia</span><h1>Recetas</h1><p>Fichas de elaboración, rendimiento y coste para Cocina y Obrador.</p></div>
        <button className="primary-button" onClick={() => setEditor('new')}><Plus size={19} />Nueva receta</button>
      </header>

      <section className="recipe-stats">
        <div><BookOpen size={22} /><span><strong>{recipes.length}</strong> recetas</span></div>
        <div><ChefHat size={22} /><span><strong>{recipes.filter((r) => r.area === 'cocina').length}</strong> cocina</span></div>
        <div><Croissant size={22} /><span><strong>{recipes.filter((r) => r.area === 'obrador').length}</strong> obrador</span></div>
      </section>

      <section className="recipes-toolbar">
        <div className="recipes-tabs">{[['all', 'Todas'], ['cocina', 'Cocina'], ['obrador', 'Obrador']].map(([value, label]) => <button key={value} className={area === value ? 'active' : ''} onClick={() => setArea(value)}>{label}</button>)}</div>
        <label className="recipe-search"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar receta…" /></label>
      </section>

      {error && <div className="recipe-alert"><AlertCircle size={18} />{error}</div>}
      {loading ? <div className="recipe-empty"><Loader2 className="spin" size={30} /><p>Cargando recetas…</p></div> : visible.length === 0 ? <div className="recipe-empty"><BookOpen size={38} /><h3>No hay recetas</h3><p>Crea la primera receta o cambia los filtros.</p></div> : (
        <section className="recipe-cards">
          {visible.map((recipe) => {
            const total = (recipe.recipe_ingredients || []).reduce((sum, item) => sum + normalizedCost(item), 0);
            const perUnit = total / Math.max(Number(recipe.yield_quantity) || 1, 1);
            return <article className="recipe-card" key={recipe.id}>
              <div className="recipe-card__top"><span className={`area-badge area-badge--${recipe.area}`}>{recipe.area === 'cocina' ? <ChefHat size={15} /> : <Croissant size={15} />}{recipe.area}</span><span className={`status-dot ${recipe.active ? '' : 'inactive'}`}>{recipe.active ? 'Activa' : 'Inactiva'}</span></div>
              <h2>{recipe.name}</h2><p>{recipe.description || 'Sin descripción'}</p>
              {(recipe.allergens || []).length > 0 ? <div className="allergen-badges" aria-label="Alérgenos">{recipe.allergens.map((value) => <span key={value}>{ALLERGENS.find(([key]) => key === value)?.[1] || value}</span>)}</div> : <div className="allergen-badges allergen-badges--empty">Alérgenos sin indicar</div>}
              <div className="recipe-card__meta"><span><Package size={16} />{number.format(recipe.yield_quantity)} {recipe.yield_unit}</span><span><Calculator size={16} />{money.format(perUnit)} / {recipe.yield_unit}</span></div>
              <div className="recipe-card__cost"><span>Coste receta</span><strong>{money.format(total)}</strong></div>
              <div className="recipe-card__actions"><button className="secondary-button" onClick={() => setEditor({ recipe, items: recipe.recipe_ingredients })}><Edit3 size={16} />Editar</button><button className="icon-button icon-button--danger" onClick={() => removeRecipe(recipe)} aria-label="Eliminar receta"><Trash2 size={17} /></button></div>
            </article>;
          })}
        </section>
      )}
    </main>
  );
}