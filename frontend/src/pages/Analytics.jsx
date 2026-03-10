import { useState, useEffect } from 'react';
import { getTopRestaurants, getTopItems, getRevenueByMonth, getMenuFacets, getRatingDistribution, getRestaurants } from '../services/api';
import { useRestaurant } from '../context/RestaurantContext';
import { Star, TrendingUp, BarChart3 } from 'lucide-react';

function Section({ title, description, children, loading }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      {description && <p className="text-xs text-gray-500 mt-0.5 mb-3">{description}</p>}
      {loading ? <p className="text-sm text-gray-400">Cargando...</p> : children}
    </div>
  );
}

export default function Analytics() {
  const { selectedId, selected, restaurants } = useRestaurant();
  const [topRestaurants, setTopRestaurants] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [facets, setFacets] = useState(null);
  const [ratingDist, setRatingDist] = useState([]);
  const [allRestaurants, setAllRestaurants] = useState([]);
  const [selectedForRating, setSelectedForRating] = useState('');
  const [loading, setLoading] = useState({});

  useEffect(() => {
    if (!selectedId) {
      getRestaurants({ limit: 50 }).then(res => setAllRestaurants(res.data)).catch(() => {});

      setLoading(l => ({...l, top: true}));
      getTopRestaurants(10).then(res => setTopRestaurants(res.data)).catch(() => {}).finally(() => setLoading(l => ({...l, top: false})));
    }

    setLoading(l => ({...l, items: true}));
    getTopItems(selectedId || undefined).then(res => setTopItems(res.data)).catch(() => {}).finally(() => setLoading(l => ({...l, items: false})));

    setLoading(l => ({...l, revenue: true}));
    getRevenueByMonth(2026, selectedId || undefined).then(res => setRevenue(res.data)).catch(() => {}).finally(() => setLoading(l => ({...l, revenue: false})));

    setLoading(l => ({...l, facets: true}));
    const facetParams = selectedId ? { restaurantId: selectedId } : {};
    getMenuFacets(facetParams).then(res => setFacets(res.data)).catch(() => {}).finally(() => setLoading(l => ({...l, facets: false})));

    if (selectedId) {
      setLoading(l => ({...l, rating: true}));
      getRatingDistribution(selectedId).then(res => setRatingDist(res.data)).catch(() => {}).finally(() => setLoading(l => ({...l, rating: false})));
    }
  }, [selectedId]);

  const loadRatingDist = async (restId) => {
    setSelectedForRating(restId);
    if (!restId) return;
    setLoading(l => ({...l, rating: true}));
    try { const res = await getRatingDistribution(restId); setRatingDist(res.data); }
    catch {} finally { setLoading(l => ({...l, rating: false})); }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Analítica y Agregaciones</h2>
        {selected && <p className="text-sm text-orange-600 mt-0.5">{selected.name}</p>}
      </div>

      {!selectedId && (
        <Section title="Top 10 Restaurantes Mejor Calificados" loading={loading.top}>
          <div className="space-y-2">
            {topRestaurants.map((r, i) => (
              <div key={r._id || i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                  <span className="text-sm font-medium">{r.name}</span>
                  <span className="text-xs text-gray-400">{r.city}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star size={14} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-semibold">{r.avgRating}</span>
                  <span className="text-xs text-gray-400">({r.totalReviews} reseñas)</span>
                </div>
              </div>
            ))}
            {topRestaurants.length === 0 && <p className="text-sm text-gray-400">No hay datos aún. Crea reseñas primero.</p>}
          </div>
        </Section>
      )}

      <Section title={selectedId ? 'Tus Platillos Más Vendidos' : 'Platillos Más Vendidos por Restaurante'} loading={loading.items}>
        {topItems.map((r, i) => (
          <div key={i} className="mb-4">
            {!selectedId && <p className="text-sm font-semibold text-gray-800 mb-1">{r.restaurantName}</p>}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {r.topItems?.map((item, j) => (
                <div key={j} className="bg-gray-50 rounded-lg p-2 text-xs">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-gray-500">{item.sold} vendidos · Q{item.revenue}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
        {topItems.length === 0 && <p className="text-sm text-gray-400">No hay datos. Crea órdenes con estado "entregado".</p>}
      </Section>

      <Section title={selectedId ? 'Tus Ingresos por Mes' : 'Ingresos por Restaurante por Mes'} loading={loading.revenue}>
        {revenue.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {!selectedId && <th className="text-left p-2">Restaurante</th>}
                  <th className="p-2">Mes</th><th className="p-2">Órdenes</th><th className="p-2">Ingresos</th><th className="p-2">Ticket Prom.</th>
                </tr>
              </thead>
              <tbody>
                {revenue.map((r, i) => (
                  <tr key={i} className="border-t border-gray-50">
                    {!selectedId && <td className="p-2 font-medium">{r.restaurantName}</td>}
                    <td className="p-2 text-center">{r.month}/{r.year}</td>
                    <td className="p-2 text-center">{r.orderCount}</td>
                    <td className="p-2 text-center font-semibold text-green-600">Q{r.totalRevenue}</td>
                    <td className="p-2 text-center">Q{r.avgTicket}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-gray-400">No hay datos de ingresos.</p>}
      </Section>

      <Section title={selectedId ? 'Facetas de Tu Menú' : 'Facetas del Menú'} loading={loading.facets}>
        {facets ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">Por categoría:</p>
              {facets.byCategory?.map(c => (
                <div key={c._id} className="flex justify-between text-xs py-1">
                  <span>{c._id}</span>
                  <span className="text-gray-500">{c.count} items · Q{c.avgPrice?.toFixed(0)} prom.</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">Por rango de precio:</p>
              {facets.byPriceRange?.map(b => (
                <div key={b._id} className="flex justify-between text-xs py-1">
                  <span>Q{b._id === '500+' ? '500+' : `${b._id}-${b._id + 25}`}</span>
                  <span className="text-gray-500">{b.count} items</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Section>

      <Section title="Distribución de Calificaciones">
        {!selectedId && (
          <div className="mb-3">
            <select value={selectedForRating} onChange={e => loadRatingDist(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
              <option value="">Seleccionar restaurante</option>
              {allRestaurants.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
            </select>
          </div>
        )}
        {loading.rating ? <p className="text-sm text-gray-400">Cargando...</p> : (
          <div className="flex gap-4">
            {ratingDist.map(b => (
              <div key={b._id} className="text-center">
                <div className="text-2xl font-bold text-gray-800">{b.count}</div>
                <div className="flex items-center gap-0.5 justify-center">
                  {Array.from({length: b._id}, (_, i) => <Star key={i} size={10} className="text-yellow-400 fill-yellow-400" />)}
                </div>
              </div>
            ))}
            {ratingDist.length === 0 && (selectedId || selectedForRating) && <p className="text-sm text-gray-400">No hay reseñas para este restaurante.</p>}
          </div>
        )}
      </Section>
    </div>
  );
}
