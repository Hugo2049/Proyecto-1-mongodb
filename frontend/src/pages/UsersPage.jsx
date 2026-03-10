import { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../services/api';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', dietaryPrefs: '', address: { label: 'Casa', street: '', city: 'Guatemala City', latitude: '14.6349', longitude: '-90.5069' } });

  const load = () => {
    setLoading(true);
    getUsers({ page, limit: 10 })
      .then(res => { setUsers(res.data); setPagination(res.pagination); })
      .catch(err => setMsg(`Error: ${err.message}`))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...form,
        dietaryPrefs: form.dietaryPrefs.split(',').map(p => p.trim()).filter(Boolean),
        addresses: [form.address]
      };
      await createUser(data);
      setMsg('Usuario creado');
      setShowCreate(false);
      setForm({ name: '', email: '', phone: '', dietaryPrefs: '', address: { label: 'Casa', street: '', city: 'Guatemala City', latitude: '14.6349', longitude: '-90.5069' } });
      load();
    } catch (err) { setMsg(`Error: ${err.message}`); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar usuario?')) return;
    try {
      await deleteUser(id);
      setMsg('Usuario eliminado');
      load();
    } catch (err) { setMsg(`Error: ${err.message}`); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Usuarios</h2>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          <Plus size={16} /> Nuevo Usuario
        </button>
      </div>

      {msg && <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm flex justify-between"><span>{msg}</span><button onClick={() => setMsg('')}><X size={16}/></button></div>}

      {loading ? <p className="text-gray-500">Cargando...</p> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Teléfono</th>
                <th className="text-left px-4 py-3">Preferencias</th>
                <th className="text-left px-4 py-3">Órdenes</th>
                <th className="text-left px-4 py-3">Total Gastado</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3 text-gray-600">{u.phone}</td>
                  <td className="px-4 py-3">
                    {u.dietaryPrefs?.map(p => (
                      <span key={p} className="inline-block text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full mr-1">{p}</span>
                    ))}
                  </td>
                  <td className="px-4 py-3">{u.totalOrders || 0}</td>
                  <td className="px-4 py-3 font-medium">Q{(u.totalSpent || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(u._id)} className="p-1 hover:bg-red-50 rounded"><Trash2 size={14} className="text-red-500" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Nuevo Usuario</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20}/></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <input required placeholder="Nombre" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input required type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input placeholder="Teléfono" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input placeholder="Preferencias dietéticas (separadas por coma)" value={form.dietaryPrefs} onChange={e => setForm({...form, dietaryPrefs: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input placeholder="Dirección" value={form.address.street} onChange={e => setForm({...form, address: {...form.address, street: e.target.value}})} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input placeholder="Ciudad" value={form.address.city} onChange={e => setForm({...form, address: {...form.address, city: e.target.value}})} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">Crear Usuario</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
