import { useState, useEffect, useCallback } from 'react';
import { getOrders } from '../../services/api';
import { useRestaurant } from '../../context/RestaurantContext';
import { ChevronDown, RefreshCw, CheckCircle2, Circle, XCircle } from 'lucide-react';

const PIPELINE = ['pendiente', 'en_proceso', 'en_camino', 'entregado'];
const PIPELINE_LABELS = { pendiente: 'Recibido', en_proceso: 'En cocina', en_camino: 'En camino', entregado: 'Entregado' };

function StatusTracker({ status }) {
  if (status === 'cancelado') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg">
        <XCircle size={16} className="text-red-500" />
        <span className="text-sm font-medium text-red-600">Pedido cancelado</span>
      </div>
    );
  }

  const currentIdx = PIPELINE.indexOf(status);

  return (
    <div className="flex items-center gap-0">
      {PIPELINE.map((step, i) => {
        const done = i <= currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
              } ${isCurrent ? 'ring-2 ring-green-300 ring-offset-1' : ''}`}>
                {done ? <CheckCircle2 size={16} /> : <Circle size={14} />}
              </div>
              <span className={`text-xs mt-1 font-medium whitespace-nowrap ${done ? 'text-green-700' : 'text-gray-400'}`}>
                {PIPELINE_LABELS[step]}
              </span>
            </div>
            {i < PIPELINE.length - 1 && (
              <div className={`w-8 h-0.5 mx-1 mt-[-14px] rounded ${i < currentIdx ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MyOrders() {
  const { clientUser, restaurants } = useRestaurant();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [tab, setTab] = useState('active');

  const loadOrders = useCallback(() => {
    getOrders({ userId: clientUser._id, sortBy: 'createdAt', order: 'desc', limit: 50 })
      .then(res => setOrders(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientUser._id]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => {
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const getRestName = (id) => restaurants.find(r => r._id?.toString() === id?.toString())?.name || 'Restaurante';

  const activeOrders = orders.filter(o => ['pendiente', 'en_proceso', 'en_camino'].includes(o.status));
  const pastOrders = orders.filter(o => ['entregado', 'cancelado'].includes(o.status));
  const displayOrders = tab === 'active' ? activeOrders : pastOrders;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Mis Pedidos</h2>
        <button onClick={loadOrders} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
        <button onClick={() => setTab('active')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
          Activos ({activeOrders.length})
        </button>
        <button onClick={() => setTab('past')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'past' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
          Historial ({pastOrders.length})
        </button>
      </div>

      {loading ? <p className="text-gray-500">Cargando...</p> : displayOrders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg">{tab === 'active' ? 'No tienes pedidos activos' : 'Sin pedidos anteriores'}</p>
          <p className="text-gray-400 text-sm mt-1">{tab === 'active' ? 'Explora restaurantes y haz tu primer pedido' : ''}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayOrders.map(o => (
            <div key={o._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold text-gray-700">{o.orderNumber}</span>
                      <span className="text-lg font-bold text-green-600">Q{o.pricing?.total?.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {getRestName(o.restaurantId)} · {new Date(o.createdAt).toLocaleString('es-GT')} · {o.items?.length} artículo(s)
                    </p>
                  </div>
                  <button onClick={() => setExpanded(expanded === o._id ? null : o._id)} className="p-1 hover:bg-gray-100 rounded">
                    <ChevronDown size={16} className={`transform transition text-gray-400 ${expanded === o._id ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                <StatusTracker status={o.status} />
              </div>

              {expanded === o._id && (
                <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1.5">Detalle del pedido</p>
                    {o.items?.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs text-gray-600 py-0.5">
                        <span>{item.quantity}x {item.name}</span>
                        <span>Q{item.subtotal?.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-200 mt-2 pt-2 space-y-0.5 text-xs text-gray-500">
                      <div className="flex justify-between"><span>Subtotal</span><span>Q{o.pricing?.subtotal?.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>Envío</span><span>Q{o.pricing?.deliveryFee?.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>IVA</span><span>Q{o.pricing?.tax?.toFixed(2)}</span></div>
                      <div className="flex justify-between font-semibold text-gray-700 pt-1"><span>Total</span><span>Q{o.pricing?.total?.toFixed(2)}</span></div>
                    </div>
                  </div>

                  {o.statusHistory?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1.5">Seguimiento</p>
                      <div className="space-y-1.5">
                        {o.statusHistory.slice().reverse().map((s, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${i === 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <div>
                              <span className="font-medium text-gray-700 capitalize">{PIPELINE_LABELS[s.status] || s.status}</span>
                              <span className="text-gray-400 ml-2">{new Date(s.timestamp).toLocaleString('es-GT')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'active' && activeOrders.length > 0 && (
        <p className="text-xs text-gray-400 text-center mt-4">Se actualiza automáticamente cada 10 segundos</p>
      )}
    </div>
  );
}
