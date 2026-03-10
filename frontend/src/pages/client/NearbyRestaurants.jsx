import { useState, useEffect } from 'react';
import { getNearbyRestaurants, getRestaurants } from '../../services/api';
import { useRestaurant } from '../../context/RestaurantContext';
import { MapPin, Star, Clock, Navigation, Search, Globe, Radar } from 'lucide-react';

const RADIUS_OPTIONS = [
  { label: '2 km', value: 2000 },
  { label: '5 km', value: 5000 },
  { label: '10 km', value: 10000 },
  { label: '25 km', value: 25000 },
  { label: '50 km', value: 50000 },
];

function formatDistance(meters) {
  if (!meters && meters !== 0) return null;
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export default function NearbyRestaurants({ onSelectRestaurant }) {
  const { clientUser } = useRestaurant();
  const [nearbyRestaurants, setNearbyRestaurants] = useState([]);
  const [allRestaurants, setAllRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [radius, setRadius] = useState(5000);
  const [mode, setMode] = useState('nearby');
  const [search, setSearch] = useState('');

  const userAddress = clientUser?.addresses?.find(a => a.isDefault) || clientUser?.addresses?.[0];
  const userCoords = userAddress?.location?.coordinates;

  useEffect(() => {
    setLoading(true);
    setError('');
    if (userCoords) {
      getNearbyRestaurants(userCoords[0], userCoords[1], radius)
        .then(res => setNearbyRestaurants(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setMode('all');
      setLoading(false);
    }
  }, [radius]);

  useEffect(() => {
    getRestaurants({ limit: 100 })
      .then(res => setAllRestaurants(res.data))
      .catch(e => setError(e.message));
  }, []);

  const today = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][new Date().getDay()];

  const getTodaySchedule = (restaurant) => {
    const sched = restaurant.schedule?.find(s => s.day === today);
    if (!sched || !sched.isOpen) return { text: 'Cerrado hoy', open: false };
    return { text: `${sched.open} - ${sched.close}`, open: true };
  };

  const displayList = mode === 'nearby' ? nearbyRestaurants : allRestaurants;

  const filtered = search.trim()
    ? displayList.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.description?.toLowerCase().includes(search.toLowerCase()) ||
        r.address?.city?.toLowerCase().includes(search.toLowerCase()) ||
        r.categories?.some(c => c.toLowerCase().includes(search.toLowerCase()))
      )
    : displayList;

  const RestaurantCard = ({ r }) => {
    const dist = formatDistance(r.distance);
    const sched = getTodaySchedule(r);
    return (
      <button
        onClick={() => onSelectRestaurant(r)}
        className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:border-orange-300 hover:shadow-md transition-all"
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{r.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.description}</p>
          </div>
          {dist && (
            <span className="shrink-0 ml-3 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg flex items-center gap-1">
              <MapPin size={12} />
              {dist}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Star size={12} className="text-yellow-400 fill-yellow-400" />
            <span className="font-medium text-gray-700">{r.rating?.average || '—'}</span>
            <span>({r.rating?.count || 0})</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin size={12} />
            <span>{r.address?.city}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span className={sched.open ? 'text-green-600' : 'text-red-500'}>{sched.text}</span>
          </div>
        </div>

        {r.categories?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {r.categories.map(c => (
              <span key={c} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{c}</span>
            ))}
          </div>
        )}
      </button>
    );
  };

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-gray-900">Explorar Restaurantes</h2>
        {userAddress && (
          <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
            <Navigation size={14} />
            <span>Desde: {userAddress.label} — {userAddress.street}, {userAddress.city}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar restaurante por nombre, ciudad, categoría..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
          />
        </div>
        {userCoords && (
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg shrink-0 self-start">
            <button
              onClick={() => setMode('nearby')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${mode === 'nearby' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Radar size={14} /> Cercanos
            </button>
            <button
              onClick={() => setMode('all')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${mode === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Globe size={14} /> Todos
            </button>
          </div>
        )}
      </div>

      {mode === 'nearby' && userCoords && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-medium text-gray-500">Radio:</span>
          <div className="flex gap-1">
            {RADIUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setRadius(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  radius === opt.value
                    ? 'bg-orange-100 text-orange-700 border border-orange-300'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-transparent'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {loading ? <p className="text-gray-500">Buscando restaurantes...</p> : filtered.length === 0 ? (
        <div className="text-center py-12">
          <MapPin size={32} className="mx-auto text-gray-300 mb-3" />
          {search.trim() ? (
            <>
              <p className="text-gray-400 text-lg">No se encontraron resultados para "{search}"</p>
              <p className="text-gray-400 text-sm mt-1">Intenta con otro término de búsqueda</p>
            </>
          ) : mode === 'nearby' ? (
            <>
              <p className="text-gray-400 text-lg">No hay restaurantes en un radio de {formatDistance(radius)}</p>
              <p className="text-gray-400 text-sm mt-1">Intenta aumentar el radio o ver todos los restaurantes</p>
              <button onClick={() => setMode('all')} className="mt-3 text-sm text-orange-600 font-medium hover:text-orange-700">
                Ver todos los restaurantes →
              </button>
            </>
          ) : (
            <p className="text-gray-400 text-lg">No hay restaurantes disponibles</p>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-3">
            {filtered.length} restaurante(s)
            {search.trim() && ` para "${search}"`}
            {mode === 'nearby' && !search.trim() && ` en un radio de ${formatDistance(radius)}`}
            {mode === 'all' && !search.trim() && ' disponibles'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(r => <RestaurantCard key={r._id} r={r} />)}
          </div>
        </>
      )}
    </div>
  );
}
