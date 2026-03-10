import { useState, useEffect } from 'react';
import { getReviews, createReview, addReviewResponse, deleteReview, getRestaurants, getUsers } from '../services/api';
import { useRestaurant } from '../context/RestaurantContext';
import { Plus, X, Star, MessageSquare } from 'lucide-react';

export default function Reviews() {
  const { selectedId, selected, restaurants } = useRestaurant();
  const [reviews, setReviews] = useState([]);
  const [allRestaurants, setAllRestaurants] = useState([]);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [respondingTo, setRespondingTo] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [filters, setFilters] = useState({ targetType: 'restaurant', sortBy: 'createdAt', order: 'desc', page: 1 });
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ userId: '', targetType: 'restaurant', targetId: '', rating: 5, title: '', comment: '', tags: '' });

  useEffect(() => {
    if (!selectedId) {
      getRestaurants({ limit: 50 }).then(res => setAllRestaurants(res.data)).catch(() => {});
    }
    getUsers({ limit: 50 }).then(res => setUsers(res.data)).catch(() => {});
  }, [selectedId]);

  useEffect(() => {
    setFilters(f => ({ ...f, page: 1 }));
  }, [selectedId]);

  const load = () => {
    setLoading(true);
    const params = { page: filters.page, limit: 10, sortBy: filters.sortBy, order: filters.order };
    if (filters.targetType) params.targetType = filters.targetType;
    if (selectedId) params.targetId = selectedId;
    getReviews(params)
      .then(res => { setReviews(res.data); setPagination(res.pagination); })
      .catch(err => setMsg(`Error: ${err.message}`))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filters, selectedId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...form,
        targetId: selectedId || form.targetId,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean)
      };
      await createReview(data);
      setMsg('Reseña publicada');
      setShowCreate(false);
      load();
    } catch (err) { setMsg(`Error: ${err.message}`); }
  };

  const handleRespond = async () => {
    try {
      await addReviewResponse(respondingTo, responseText);
      setMsg('Respuesta agregada');
      setRespondingTo(null);
      setResponseText('');
      load();
    } catch (err) { setMsg(`Error: ${err.message}`); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar reseña?')) return;
    try { await deleteReview(id); setMsg('Reseña eliminada'); load(); }
    catch (err) { setMsg(`Error: ${err.message}`); }
  };

  const getRestName = (id) => {
    const all = selectedId ? restaurants : allRestaurants;
    return all.find(r => r._id === id)?.name || id;
  };
  const getUserName = (id) => users.find(u => u._id === id)?.name || id;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reseñas</h2>
          {selected && <p className="text-sm text-orange-600 mt-0.5">{selected.name}</p>}
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm font-medium">
          <Plus size={16} /> Nueva Reseña
        </button>
      </div>

      {msg && <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm flex justify-between"><span>{msg}</span><button onClick={() => setMsg('')}><X size={16}/></button></div>}

      <div className="flex gap-3 mb-4">
        <select value={filters.sortBy} onChange={e => setFilters({...filters, sortBy: e.target.value})} className="px-3 py-2 border rounded-lg text-sm">
          <option value="createdAt">Por fecha</option>
          <option value="rating">Por calificación</option>
        </select>
      </div>

      {loading ? <p className="text-gray-500">Cargando...</p> : (
        <div className="space-y-4">
          {reviews.map(r => (
            <div key={r._id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex">{Array.from({length: 5}, (_, i) => <Star key={i} size={14} className={i < r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />)}</div>
                    <span className="text-sm font-semibold">{r.title}</span>
                  </div>
                  <p className="text-sm text-gray-600">{r.comment}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>Por: {getUserName(r.userId)}</span>
                    {!selectedId && <span>Restaurante: {getRestName(r.targetId)}</span>}
                    <span>{new Date(r.createdAt).toLocaleDateString('es-GT')}</span>
                  </div>
                  {r.tags?.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {r.tags.map(t => <span key={t} className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{t}</span>)}
                    </div>
                  )}
                  {r.response && (
                    <div className="mt-3 bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-700">Respuesta del restaurante:</p>
                      <p className="text-xs text-gray-600 mt-1">{r.response.text}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  {!r.response && (
                    <button onClick={() => setRespondingTo(r._id)} className="p-1.5 hover:bg-gray-100 rounded" title="Responder">
                      <MessageSquare size={14} className="text-gray-500"/>
                    </button>
                  )}
                  <button onClick={() => handleDelete(r._id)} className="p-1.5 hover:bg-red-50 rounded"><X size={14} className="text-red-500"/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Nueva Reseña</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20}/></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <select required value={form.userId} onChange={e => setForm({...form, userId: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">Seleccionar usuario</option>
                {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
              </select>
              {selectedId ? (
                <div className="px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700 font-medium">{selected?.name}</div>
              ) : (
                <select required value={form.targetId} onChange={e => setForm({...form, targetId: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="">Seleccionar restaurante</option>
                  {allRestaurants.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                </select>
              )}
              <div>
                <label className="text-xs text-gray-600">Calificación</label>
                <div className="flex gap-1 mt-1">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button" onClick={() => setForm({...form, rating: n})}>
                      <Star size={24} className={n <= form.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
                    </button>
                  ))}
                </div>
              </div>
              <input placeholder="Título" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <textarea required placeholder="Comentario" value={form.comment} onChange={e => setForm({...form, comment: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" rows={3} />
              <input placeholder="Tags (separados por coma)" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <button type="submit" className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 text-sm font-medium">Publicar Reseña</button>
            </form>
          </div>
        </div>
      )}

      {respondingTo && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-3">Responder Reseña</h3>
            <textarea placeholder="Respuesta del restaurante..." value={responseText} onChange={e => setResponseText(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" rows={3} />
            <div className="flex gap-2 mt-3">
              <button onClick={handleRespond} className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm">Responder</button>
              <button onClick={() => setRespondingTo(null)} className="flex-1 bg-gray-100 py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
