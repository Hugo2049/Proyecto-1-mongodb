import { useState, useEffect } from 'react';
import { getRestaurants, createRestaurant, updateRestaurant, deleteRestaurant, addCategory, removeCategory, updateSchedule } from '../services/api';
import { Plus, Pencil, Trash2, X, MapPin, Tag } from 'lucide-react';

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Restaurants() {
  const [restaurants, setRestaurants] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ name: '', description: '', phone: '', email: '', address: { street: '', city: '', country: 'Guatemala', latitude: '14.6349', longitude: '-90.5069' }, categories: '' });
  const [catForm, setCatForm] = useState({ id: null, category: '' });
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    const params = { page, limit: 10 };
    if (search) params.search = search;
    getRestaurants(params)
      .then(res => { setRestaurants(res.data); setPagination(res.pagination); })
      .catch(err => setMsg(`Error: ${err.message}`))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, search]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form, categories: form.categories.split(',').map(c => c.trim()).filter(Boolean) };
      await createRestaurant(data);
      setMsg('Restaurante creado');
      setShowCreate(false);
      setForm({ name: '', description: '', phone: '', email: '', address: { street: '', city: '', country: 'Guatemala', latitude: '14.6349', longitude: '-90.5069' }, categories: '' });
      load();
    } catch (err) { setMsg(`Error: ${err.message}`); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await updateRestaurant(editing._id, { name: form.name, description: form.description, phone: form.phone, email: form.email });
      setMsg('Restaurante actualizado');
      setEditing(null);
      load();
    } catch (err) { setMsg(`Error: ${err.message}`); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar restaurante?')) return;
    try {
      await deleteRestaurant(id);
      setMsg('Restaurante eliminado');
      load();
    } catch (err) { setMsg(`Error: ${err.message}`); }
  };

  const handleAddCat = async () => {
    if (!catForm.category) return;
    try {
      await addCategory(catForm.id, catForm.category);
      setMsg(`Categoría "${catForm.category}" agregada ($addToSet)`);
      setCatForm({ id: null, category: '' });
      load();
    } catch (err) { setMsg(`Error: ${err.message}`); }
  };

  const handleRemoveCat = async (restId, cat) => {
    try {
      await removeCategory(restId, cat);
      setMsg(`Categoría "${cat}" removida ($pull)`);
      load();
    } catch (err) { setMsg(`Error: ${err.message}`); }
  };

  const startEdit = (r) => {
    setForm({ name: r.name, description: r.description || '', phone: r.phone || '', email: r.email || '', address: r.address || {}, categories: '' });
    setEditing(r);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Restaurantes</h2>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 text-sm font-medium">
          <Plus size={16} /> Nuevo Restaurante
        </button>
      </div>

      {msg && <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm flex justify-between"><span>{msg}</span><button onClick={() => setMsg('')}><X size={16}/></button></div>}

      <div className="mb-4">
        <input type="text" placeholder="Buscar restaurante..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : (
        <div className="space-y-4">
          {restaurants.map(r => (
            <div key={r._id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{r.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {r.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                    {r.rating?.average > 0 && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                        ⭐ {r.rating.average} ({r.rating.count} reseñas)
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{r.description}</p>
                  {r.address && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <MapPin size={12} /> {r.address.street}, {r.address.city}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {r.categories?.map(cat => (
                      <span key={cat} className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                        <Tag size={10} />{cat}
                        <button onClick={() => handleRemoveCat(r._id, cat)} className="hover:text-red-600 ml-0.5"><X size={10}/></button>
                      </span>
                    ))}
                    <button onClick={() => setCatForm({ id: r._id, category: '' })} className="text-xs text-orange-600 hover:text-orange-700">+ categoría</button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(r)} className="p-2 hover:bg-gray-100 rounded-lg"><Pencil size={16} className="text-gray-500" /></button>
                  <button onClick={() => handleDelete(r._id)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16} className="text-red-500" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: pagination.pages }, (_, i) => (
            <button key={i} onClick={() => setPage(i + 1)} className={`px-3 py-1 rounded text-sm ${page === i + 1 ? 'bg-orange-600 text-white' : 'bg-white border hover:bg-gray-50'}`}>
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Modal crear */}
      {showCreate && (
        <Modal title="Nuevo Restaurante" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <input required placeholder="Nombre" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
            <textarea placeholder="Descripción" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} />
            <input placeholder="Teléfono" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
            <input placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
            <input required placeholder="Dirección" value={form.address.street} onChange={e => setForm({...form, address: {...form.address, street: e.target.value}})} className="w-full px-3 py-2 border rounded-lg text-sm" />
            <input required placeholder="Ciudad" value={form.address.city} onChange={e => setForm({...form, address: {...form.address, city: e.target.value}})} className="w-full px-3 py-2 border rounded-lg text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Latitud" value={form.address.latitude} onChange={e => setForm({...form, address: {...form.address, latitude: e.target.value}})} className="px-3 py-2 border rounded-lg text-sm" />
              <input placeholder="Longitud" value={form.address.longitude} onChange={e => setForm({...form, address: {...form.address, longitude: e.target.value}})} className="px-3 py-2 border rounded-lg text-sm" />
            </div>
            <input placeholder="Categorías (separadas por coma)" value={form.categories} onChange={e => setForm({...form, categories: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
            <button type="submit" className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 text-sm font-medium">Crear Restaurante</button>
          </form>
        </Modal>
      )}

      {/* Modal editar */}
      {editing && (
        <Modal title="Editar Restaurante" onClose={() => setEditing(null)}>
          <form onSubmit={handleUpdate} className="space-y-3">
            <input required placeholder="Nombre" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
            <textarea placeholder="Descripción" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} />
            <input placeholder="Teléfono" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
            <input placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
            <button type="submit" className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 text-sm font-medium">Guardar Cambios</button>
          </form>
        </Modal>
      )}

      {/* Modal agregar categoría */}
      {catForm.id && (
        <Modal title="Agregar Categoría ($addToSet)" onClose={() => setCatForm({ id: null, category: '' })}>
          <div className="space-y-3">
            <p className="text-xs text-gray-500">Usa $addToSet para agregar sin duplicados al array de categorías</p>
            <input placeholder="Nueva categoría" value={catForm.category} onChange={e => setCatForm({...catForm, category: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
            <button onClick={handleAddCat} className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 text-sm font-medium">Agregar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
