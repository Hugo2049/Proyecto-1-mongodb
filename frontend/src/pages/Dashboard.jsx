import { useState, useEffect } from 'react';
import { getDashboard } from '../services/api';
import { useRestaurant } from '../context/RestaurantContext';

export default function Dashboard() {
  const { selectedId, selected } = useRestaurant();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getDashboard(selectedId || undefined)
      .then(res => setData(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedId]);

  if (loading) return <div className="text-center py-20 text-gray-500">Cargando dashboard...</div>;
  if (error) return <div className="text-center py-20 text-red-500">Error: {error}</div>;
  if (!data) return null;

  const stats = selectedId
    ? [
        { label: 'Artículos del Menú', value: data.totalMenuItems, color: 'bg-pink-100 text-pink-700' },
        { label: 'Órdenes', value: data.totalOrders, color: 'bg-green-100 text-green-700' },
        { label: 'Reseñas', value: data.totalReviews, color: 'bg-purple-100 text-purple-700' },
      ]
    : [
        { label: 'Restaurantes', value: data.totalRestaurants, color: 'bg-orange-100 text-orange-700' },
        { label: 'Usuarios', value: data.totalUsers, color: 'bg-blue-100 text-blue-700' },
        { label: 'Órdenes', value: data.totalOrders, color: 'bg-green-100 text-green-700' },
        { label: 'Reseñas', value: data.totalReviews, color: 'bg-purple-100 text-purple-700' },
        { label: 'Artículos del Menú', value: data.totalMenuItems, color: 'bg-pink-100 text-pink-700' },
        { label: 'Event Logs', value: data.totalEventLogs?.toLocaleString(), color: 'bg-gray-100 text-gray-700' },
      ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {selected ? `Dashboard — ${selected.name}` : 'Dashboard General'}
        </h2>
      </div>

      <div className={`grid gap-4 mb-8 ${selectedId ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-3'}`}>
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-3">
            {selected ? 'Tus Ingresos' : 'Ingresos Totales'}
          </h3>
          <p className="text-3xl font-bold text-green-600">
            Q{data.revenue?.total?.toFixed(2) || '0.00'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Ticket promedio: Q{data.revenue?.avg?.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Órdenes por Estado</h3>
          <div className="space-y-2">
            {data.ordersByStatus?.map(s => (
              <div key={s._id} className="flex justify-between items-center">
                <span className="text-sm capitalize text-gray-600">{s._id || 'sin estado'}</span>
                <span className="text-sm font-semibold bg-gray-100 px-3 py-1 rounded-full">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
