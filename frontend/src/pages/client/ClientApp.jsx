import { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import NearbyRestaurants from './NearbyRestaurants';
import RestaurantMenu from './RestaurantMenu';
import MyOrders from './MyOrders';
import { MapPin, ClipboardList, LogOut, User } from 'lucide-react';

const TABS = [
  { id: 'explore', label: 'Explorar', icon: MapPin },
  { id: 'orders', label: 'Mis Pedidos', icon: ClipboardList },
];

export default function ClientApp() {
  const { clientUser, logout } = useRestaurant();
  const [tab, setTab] = useState('explore');
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);

  const handleSelectRestaurant = (restaurant) => {
    setSelectedRestaurant(restaurant);
  };

  const handleBackToList = () => {
    setSelectedRestaurant(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-bold text-gray-900">🍽️ RestaurantesGT</h1>
            <nav className="flex gap-1">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => { setTab(id); setSelectedRestaurant(null); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tab === id ? 'bg-orange-50 text-orange-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
              <User size={14} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">{clientUser?.name}</span>
            </div>
            <button
              onClick={() => { if (confirm('¿Cerrar sesión?')) logout(); }}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {tab === 'explore' && !selectedRestaurant && (
          <NearbyRestaurants onSelectRestaurant={handleSelectRestaurant} />
        )}
        {tab === 'explore' && selectedRestaurant && (
          <RestaurantMenu restaurant={selectedRestaurant} onBack={handleBackToList} />
        )}
        {tab === 'orders' && <MyOrders />}
      </main>
    </div>
  );
}
