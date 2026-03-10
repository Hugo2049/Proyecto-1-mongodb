import { useState, useEffect } from 'react';
import { getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, getRestaurants, uploadMenuItemImage, getMenuItemImageUrl } from '../services/api';
import { useRestaurant } from '../context/RestaurantContext';
import { Plus, Trash2, X, Search, ImagePlus, Camera, ToggleLeft, ToggleRight } from 'lucide-react';

export default function MenuItems() {
  const { selectedId, selected, restaurants } = useRestaurant();
  const [items, setItems] = useState([]);
  const [allRestaurants, setAllRestaurants] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filters, setFilters] = useState({ restaurantId: '', category: '', search: '', page: 1 });
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ restaurantId: '', name: '', description: '', category: 'platos fuertes', price: '', allergens: '', tags: '', preparationTime: '20' });
  const [pendingImage, setPendingImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(null);

  useEffect(() => {
    if (!selectedId) {
      getRestaurants({ limit: 50 }).then(res => setAllRestaurants(res.data)).catch(() => {});
    }
  }, [selectedId]);

  useEffect(() => {
    setFilters(f => ({ ...f, page: 1 }));
  }, [selectedId]);

  const load = () => {
    setLoading(true);
    const params = { page: filters.page, limit: 12 };
    const restId = selectedId || filters.restaurantId;
    if (restId) params.restaurantId = restId;
    if (filters.category) params.category = filters.category;
    if (filters.search) params.search = filters.search;
    getMenuItems(params)
      .then(res => { setItems(res.data); setPagination(res.pagination); })
      .catch(err => setMsg(`Error: ${err.message}`))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filters, selectedId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...form,
        restaurantId: selectedId || form.restaurantId,
        price: parseFloat(form.price),
        preparationTime: parseInt(form.preparationTime),
        allergens: form.allergens.split(',').map(a => a.trim()).filter(Boolean),
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      };
      const res = await createMenuItem(data);
      const newItemId = res.data?._id;

      if (pendingImage && newItemId) {
        try {
          await uploadMenuItemImage(newItemId, pendingImage);
        } catch {
          setMsg('Artículo creado, pero falló la subida de imagen');
        }
      }

      setMsg('Artículo creado');
      setShowCreate(false);
      setPendingImage(null);
      setForm({ restaurantId: '', name: '', description: '', category: 'platos fuertes', price: '', allergens: '', tags: '', preparationTime: '20' });
      load();
    } catch (err) { setMsg(`Error: ${err.message}`); }
  };

  const handleImageUpload = async (itemId, file) => {
    setUploadingImage(itemId);
    try {
      await uploadMenuItemImage(itemId, file);
      setMsg('Imagen actualizada');
      load();
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setUploadingImage(null);
    }
  };

  const handleToggleAvailable = async (item) => {
    try {
      await updateMenuItem(item._id, { isAvailable: !item.isAvailable });
      load();
    } catch (err) { setMsg(`Error: ${err.message}`); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar artículo?')) return;
    try { await deleteMenuItem(id); setMsg('Artículo eliminado'); load(); }
    catch (err) { setMsg(`Error: ${err.message}`); }
  };

  const displayRestaurants = selectedId ? [] : allRestaurants;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Artículos del Menú</h2>
          {selected && <p className="text-sm text-orange-600 mt-0.5">{selected.name}</p>}
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 text-sm font-medium">
          <Plus size={16} /> Nuevo Artículo
        </button>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm flex justify-between ${msg.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
          <span>{msg}</span><button onClick={() => setMsg('')}><X size={16}/></button>
        </div>
      )}

      <div className="flex gap-3 mb-4 flex-wrap">
        {!selectedId && (
          <select value={filters.restaurantId} onChange={e => setFilters({...filters, restaurantId: e.target.value, page: 1})} className="px-3 py-2 border rounded-lg text-sm">
            <option value="">Todos los restaurantes</option>
            {displayRestaurants.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
          </select>
        )}
        <select value={filters.category} onChange={e => setFilters({...filters, category: e.target.value, page: 1})} className="px-3 py-2 border rounded-lg text-sm">
          <option value="">Todas las categorías</option>
          {['entradas', 'platos fuertes', 'postres', 'bebidas', 'acompañamientos', 'rolls especiales', 'sashimi', 'ramen', 'hamburguesas', 'tacos', 'quesadillas', 'antojitos', 'café', 'repostería', 'brunch'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input type="text" placeholder="Buscar..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value, page: 1})} className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
        </div>
      </div>

      {loading ? <p className="text-gray-500">Cargando...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item._id} className={`bg-white rounded-xl border overflow-hidden ${item.isAvailable === false ? 'border-red-200 opacity-75' : 'border-gray-200'}`}>
              <div className="relative h-36 bg-gray-100">
                {item.imageFileId ? (
                  <img src={getMenuItemImageUrl(item.imageFileId)} alt={item.name} className={`w-full h-full object-cover ${item.isAvailable === false ? 'grayscale' : ''}`} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Camera size={32} />
                  </div>
                )}
                {item.isAvailable === false && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">No disponible</div>
                )}
                <label className={`absolute bottom-2 right-2 flex items-center gap-1 bg-white/90 backdrop-blur text-gray-700 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer hover:bg-white shadow-sm transition-colors ${uploadingImage === item._id ? 'opacity-50 pointer-events-none' : ''}`}>
                  <ImagePlus size={13} />
                  {uploadingImage === item._id ? 'Subiendo...' : item.imageFileId ? 'Cambiar' : 'Foto'}
                  <input type="file" className="hidden" accept="image/*" onChange={e => { if (e.target.files?.[0]) handleImageUpload(item._id, e.target.files[0]); e.target.value = ''; }} disabled={uploadingImage === item._id} />
                </label>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{item.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{item.category}</p>
                  </div>
                  <button onClick={() => handleDelete(item._id)} className="p-1 hover:bg-red-50 rounded"><Trash2 size={14} className="text-red-400"/></button>
                </div>
                <p className="text-xs text-gray-600 mt-2 line-clamp-2">{item.description}</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-lg font-bold text-green-600">Q{item.price?.toFixed(2)}</span>
                  <span className="text-xs text-gray-400">{item.preparationTime} min</span>
                </div>
                {item.allergens?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.allergens.map(a => <span key={a} className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">{a}</span>)}
                  </div>
                )}
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-400">
                    <span>Vendidos: {item.soldCount || 0}</span>
                    {item.rating?.average > 0 && <span className="ml-2">⭐ {item.rating.average}</span>}
                  </div>
                  <button
                    onClick={() => handleToggleAvailable(item)}
                    className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${item.isAvailable !== false ? 'text-green-700 bg-green-50 hover:bg-green-100' : 'text-red-600 bg-red-50 hover:bg-red-100'}`}
                    title={item.isAvailable !== false ? 'Desactivar platillo' : 'Activar platillo'}
                  >
                    {item.isAvailable !== false ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    {item.isAvailable !== false ? 'Activo' : 'Inactivo'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Nuevo Artículo del Menú</h3>
              <button onClick={() => { setShowCreate(false); setPendingImage(null); }} className="p-1 hover:bg-gray-100 rounded"><X size={20}/></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              {selectedId ? (
                <div className="px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700 font-medium">{selected?.name}</div>
              ) : (
                <select required value={form.restaurantId} onChange={e => setForm({...form, restaurantId: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="">Seleccionar restaurante</option>
                  {restaurants.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                </select>
              )}
              <input required placeholder="Nombre del platillo" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <textarea placeholder="Descripción" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} />
              <input required placeholder="Categoría" value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input required type="number" step="0.01" placeholder="Precio (Q)" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
                <input type="number" placeholder="Tiempo prep. (min)" value={form.preparationTime} onChange={e => setForm({...form, preparationTime: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
              </div>
              <input placeholder="Alérgenos (separados por coma)" value={form.allergens} onChange={e => setForm({...form, allergens: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input placeholder="Tags (separados por coma)" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Imagen del platillo (opcional)</label>
                <label className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-300 rounded-lg py-4 cursor-pointer hover:border-pink-400 hover:bg-pink-50/30 transition-colors">
                  {pendingImage ? (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <img src={URL.createObjectURL(pendingImage)} alt="preview" className="w-16 h-16 rounded-lg object-cover" />
                      <div>
                        <p className="font-medium">{pendingImage.name}</p>
                        <p className="text-xs text-gray-400">{(pendingImage.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <button type="button" onClick={(e) => { e.preventDefault(); setPendingImage(null); }} className="ml-2 p-1 hover:bg-red-50 rounded"><X size={14} className="text-red-400" /></button>
                    </div>
                  ) : (
                    <>
                      <ImagePlus size={20} className="text-gray-400" />
                      <span className="text-sm text-gray-500">Seleccionar imagen</span>
                    </>
                  )}
                  {!pendingImage && <input type="file" className="hidden" accept="image/*" onChange={e => { if (e.target.files?.[0]) setPendingImage(e.target.files[0]); }} />}
                </label>
              </div>

              <button type="submit" className="w-full bg-pink-600 text-white py-2 rounded-lg hover:bg-pink-700 text-sm font-medium">Crear Artículo</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
