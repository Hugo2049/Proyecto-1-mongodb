import { useState, useEffect, useCallback } from 'react';
import { getOrders, createOrder, updateOrderStatus, deleteOrder, getRestaurants, getUsers, getRestaurantMenu } from '../services/api';
import { useRestaurant } from '../context/RestaurantContext';
import { Plus, X, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';

const STATUSES = ['pendiente', 'en_proceso', 'en_camino', 'entregado', 'cancelado'];
const STATUS_META = {
  pendiente:  { label: 'Pendiente',  color: 'bg-yellow-100 text-yellow-700', border: 'border-yellow-300', dot: 'bg-yellow-400' },
  en_proceso: { label: 'En cocina',  color: 'bg-blue-100 text-blue-700',     border: 'border-blue-300',   dot: 'bg-blue-500' },
  en_camino:  { label: 'En camino',  color: 'bg-purple-100 text-purple-700', border: 'border-purple-300', dot: 'bg-purple-500' },
  entregado:  { label: 'Entregado',  color: 'bg-green-100 text-green-700',   border: 'border-green-300',  dot: 'bg-green-500' },
  cancelado:  { label: 'Cancelado',  color: 'bg-red-100 text-red-700',       border: 'border-red-300',    dot: 'bg-red-500' }
};

const NEXT_STATUS = { pendiente: 'en_proceso', en_proceso: 'en_camino', en_camino: 'entregado' };
const NEXT_LABELS = { pendiente: 'Preparar', en_proceso: 'Enviar', en_camino: 'Entregado' };

export default function Orders() {
  const { selectedId, selected, isAdmin, restaurants } = useRestaurant();
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [viewMode, setViewMode] = useState('board');
  const [filters, setFilters] = useState({ status: '', sortBy: 'createdAt', order: 'desc', page: 1 });
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ customerName: '', userId: '', restaurantId: '', items: [{ menuItemId: '', quantity: 1 }], paymentMethod: 'efectivo' });
  const [customerMode, setCustomerMode] = useState('name');

  useEffect(() => {
    getUsers({ limit: 50 }).then(res => setUsers(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedId) {
      getRestaurantMenu(selectedId).then(res => setMenuItems(res.data)).catch(() => setMenuItems([]));
      setForm(f => ({ ...f, restaurantId: selectedId, items: [{ menuItemId: '', quantity: 1 }] }));
    }
    setFilters(f => ({ ...f, page: 1 }));
  }, [selectedId]);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page: filters.page, limit: 100, sortBy: filters.sortBy, order: filters.order };
    if (filters.status) params.status = filters.status;
    const restId = selectedId || filters.restaurantId;
    if (restId) params.restaurantId = restId;
    getOrders(params)
      .then(res => setOrders(res.data))
      .catch(err => setMsg(`Error: ${err.message}`))
      .finally(() => setLoading(false));
  }, [filters, selectedId]);

  useEffect(() => { load(); }, [load]);

  const handleRestaurantSelect = async (restaurantId) => {
    setForm({...form, restaurantId, items: [{ menuItemId: '', quantity: 1 }]});
    if (restaurantId) {
      try { const res = await getRestaurantMenu(restaurantId); setMenuItems(res.data); }
      catch { setMenuItems([]); }
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        restaurantId: selectedId || form.restaurantId,
        items: form.items.filter(i => i.menuItemId).map(i => ({ ...i, quantity: parseInt(i.quantity) })),
        paymentMethod: form.paymentMethod
      };
      if (customerMode === 'user' && form.userId) {
        payload.userId = form.userId;
      } else if (form.customerName.trim()) {
        payload.customerName = form.customerName.trim();
      } else {
        setMsg('Error: Ingresa el nombre del cliente');
        return;
      }
      await createOrder(payload);
      setMsg('Orden creada');
      setShowCreate(false);
      setForm({ customerName: '', userId: '', restaurantId: '', items: [{ menuItemId: '', quantity: 1 }], paymentMethod: 'efectivo' });
      setCustomerMode('name');
      load();
    } catch (err) { setMsg(`Error: ${err.message}`); }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus, `Actualizado a ${newStatus}`);
      load();
    } catch (err) { setMsg(`Error: ${err.message}`); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar orden cancelada?')) return;
    try { await deleteOrder(id); setMsg('Orden eliminada'); load(); }
    catch (err) { setMsg(`Error: ${err.message}`); }
  };

  const addItem = () => setForm({...form, items: [...form.items, { menuItemId: '', quantity: 1 }]});
  const removeItem = (idx) => setForm({...form, items: form.items.filter((_, i) => i !== idx)});
  const updateItem = (idx, field, value) => { const items = [...form.items]; items[idx] = {...items[idx], [field]: value}; setForm({...form, items}); };

  const getUserName = (order) => {
    if (order.customerName) return order.customerName;
    const u = users.find(u => u._id?.toString() === order.userId?.toString());
    return u?.name || 'Cliente';
  };
  const getRestName = (rid) => { const r = restaurants.find(r => r._id?.toString() === rid?.toString()); return r?.name || ''; };

  const activeStatuses = ['pendiente', 'en_proceso', 'en_camino'];
  const boardColumns = viewMode === 'board' ? activeStatuses : STATUSES;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Órdenes</h2>
          {selected && <p className="text-sm text-orange-600 mt-0.5">{selected.name}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg" title="Actualizar"><RefreshCw size={16} /></button>
          <div className="flex bg-gray-100 p-0.5 rounded-lg">
            <button onClick={() => setViewMode('board')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${viewMode === 'board' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Tablero</button>
            <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Lista</button>
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium">
            <Plus size={16} /> Nueva
          </button>
        </div>
      </div>

      {msg && <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm flex justify-between"><span>{msg}</span><button onClick={() => setMsg('')}><X size={16}/></button></div>}

      {viewMode === 'list' && (
        <div className="flex gap-3 mb-4 flex-wrap">
          <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value, page: 1})} className="px-3 py-2 border rounded-lg text-sm">
            <option value="">Todos los estados</option>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
          <select value={filters.sortBy} onChange={e => setFilters({...filters, sortBy: e.target.value})} className="px-3 py-2 border rounded-lg text-sm">
            <option value="createdAt">Fecha</option>
            <option value="pricing.total">Monto</option>
          </select>
        </div>
      )}

      {loading ? <p className="text-gray-500">Cargando...</p> : viewMode === 'board' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {boardColumns.map(status => {
            const meta = STATUS_META[status];
            const columnOrders = orders.filter(o => o.status === status);
            return (
              <div key={status} className="w-72 shrink-0">
                <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-lg ${meta.color}`}>
                  <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                  <span className="text-xs font-bold uppercase">{meta.label}</span>
                  <span className="text-xs font-semibold ml-auto">{columnOrders.length}</span>
                </div>
                <div className="space-y-2">
                  {columnOrders.map(o => (
                    <div key={o._id} className={`bg-white rounded-xl border ${meta.border} p-3`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-mono font-bold text-gray-700">{o.orderNumber?.split('-').slice(-1)}</span>
                        <span className="text-sm font-bold text-green-600">Q{o.pricing?.total?.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">{getUserName(o)}</p>
                      {!selectedId && <p className="text-xs text-orange-500 mb-1">{getRestName(o.restaurantId)}</p>}
                      <div className="text-xs text-gray-400 mb-2">
                        {o.items?.length} item(s) · {new Date(o.createdAt).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}
                      </div>

                      <button onClick={() => setExpandedOrder(expandedOrder === o._id ? null : o._id)} className="text-xs text-gray-400 hover:text-gray-600 mb-1">
                        {expandedOrder === o._id ? 'Ocultar detalle' : 'Ver detalle'}
                      </button>

                      {expandedOrder === o._id && (
                        <div className="border-t border-gray-100 pt-2 mt-1 space-y-1">
                          {o.items?.map((item, i) => (
                            <div key={i} className="text-xs text-gray-600 flex justify-between">
                              <span>{item.quantity}x {item.name}</span>
                              <span>Q{item.subtotal?.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-1.5 mt-2">
                        {NEXT_STATUS[status] && (
                          <button onClick={() => handleStatusChange(o._id, NEXT_STATUS[status])} className="flex-1 flex items-center justify-center gap-1 bg-gray-900 text-white py-1.5 rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors">
                            {NEXT_LABELS[status]} <ChevronRight size={12} />
                          </button>
                        )}
                        {status !== 'cancelado' && status !== 'entregado' && (
                          <button onClick={() => handleStatusChange(o._id, 'cancelado')} className="px-2 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">Cancelar</button>
                        )}
                        {status === 'cancelado' && (
                          <button onClick={() => handleDelete(o._id)} className="flex-1 text-xs text-red-500 border border-red-200 rounded-lg py-1.5 hover:bg-red-50">Eliminar</button>
                        )}
                      </div>
                    </div>
                  ))}
                  {columnOrders.length === 0 && <p className="text-xs text-gray-300 text-center py-6">Sin órdenes</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => {
            const meta = STATUS_META[o.status];
            return (
              <div key={o._id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-medium text-gray-700">{o.orderNumber}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                    <span className="text-lg font-bold text-green-600">Q{o.pricing?.total?.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {NEXT_STATUS[o.status] && (
                      <button onClick={() => handleStatusChange(o._id, NEXT_STATUS[o.status])} className="flex items-center gap-1 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-800">
                        {NEXT_LABELS[o.status]} <ChevronRight size={12} />
                      </button>
                    )}
                    <select value={o.status} onChange={e => handleStatusChange(o._id, e.target.value)} className="text-xs px-2 py-1 border rounded">
                      {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                    </select>
                    <button onClick={() => setExpandedOrder(expandedOrder === o._id ? null : o._id)} className="p-1 hover:bg-gray-100 rounded">
                      <ChevronDown size={16} className={`transform transition ${expandedOrder === o._id ? 'rotate-180' : ''}`} />
                    </button>
                    {o.status === 'cancelado' && (
                      <button onClick={() => handleDelete(o._id)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {getUserName(o)} · {new Date(o.createdAt).toLocaleString('es-GT')} · {o.items?.length} artículo(s)
                </div>

                {expandedOrder === o._id && (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    {o.items?.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs text-gray-600">
                        <span>{item.quantity}x {item.name}</span>
                        <span>Q{item.subtotal?.toFixed(2)}</span>
                      </div>
                    ))}
                    {o.statusHistory?.length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs font-semibold text-gray-600 mb-1">Historial:</p>
                        {o.statusHistory.map((s, i) => (
                          <div key={i} className="text-xs text-gray-400">
                            <span className="capitalize font-medium">{s.status}</span> — {new Date(s.timestamp).toLocaleString('es-GT')}
                            {s.note && <span className="italic"> ({s.note})</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Nueva Orden</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20}/></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Cliente</label>
                <div className="flex gap-1 mb-2 bg-gray-100 p-0.5 rounded-lg w-fit">
                  <button type="button" onClick={() => setCustomerMode('name')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${customerMode === 'name' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Nombre</button>
                  <button type="button" onClick={() => setCustomerMode('user')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${customerMode === 'user' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Usuario registrado</button>
                </div>
                {customerMode === 'name' ? (
                  <input
                    type="text"
                    required
                    placeholder="Nombre del cliente"
                    value={form.customerName}
                    onChange={e => setForm({...form, customerName: e.target.value, userId: ''})}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                    autoFocus
                  />
                ) : (
                  <select value={form.userId} onChange={e => setForm({...form, userId: e.target.value, customerName: ''})} className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="">Seleccionar usuario</option>
                    {users.map(u => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}
                  </select>
                )}
              </div>
              {selectedId ? (
                <div className="px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700 font-medium">{selected?.name}</div>
              ) : (
                <select required value={form.restaurantId} onChange={e => handleRestaurantSelect(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="">Seleccionar restaurante</option>
                  {restaurants.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                </select>
              )}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-700">Artículos:</p>
                {form.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <select value={item.menuItemId} onChange={e => updateItem(idx, 'menuItemId', e.target.value)} className="flex-1 px-2 py-1.5 border rounded text-xs">
                      <option value="">Seleccionar platillo</option>
                      {menuItems.map(m => <option key={m._id} value={m._id}>{m.name} (Q{m.price})</option>)}
                    </select>
                    <input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className="w-16 px-2 py-1.5 border rounded text-xs" />
                    {form.items.length > 1 && <button type="button" onClick={() => removeItem(idx)} className="text-red-500"><X size={14}/></button>}
                  </div>
                ))}
                <button type="button" onClick={addItem} className="text-xs text-green-600 hover:underline">+ Agregar artículo</button>
              </div>
              <select value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
              </select>
              <button type="submit" className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 text-sm font-medium">Crear Orden</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
