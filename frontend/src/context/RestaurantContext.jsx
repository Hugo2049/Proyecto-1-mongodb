import { createContext, useContext, useState, useEffect } from 'react';
import { getRestaurants } from '../services/api';

const RestaurantContext = createContext();

export function RestaurantProvider({ children }) {
  const [restaurants, setRestaurants] = useState([]);
  const [selectedId, setSelectedId] = useState(() => localStorage.getItem('selectedRestaurant') || '');
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('isAdmin') === 'true');
  const [clientUser, setClientUser] = useState(() => {
    const stored = localStorage.getItem('clientUser');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRestaurants({ limit: 50 })
      .then(res => setRestaurants(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectRestaurant = (id) => {
    setSelectedId(id);
    setIsAdmin(false);
    setClientUser(null);
    if (id) localStorage.setItem('selectedRestaurant', id);
    else localStorage.removeItem('selectedRestaurant');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('clientUser');
  };

  const loginAsAdmin = () => {
    setIsAdmin(true);
    setSelectedId('');
    setClientUser(null);
    localStorage.setItem('isAdmin', 'true');
    localStorage.removeItem('selectedRestaurant');
    localStorage.removeItem('clientUser');
  };

  const loginAsClient = (user) => {
    setClientUser(user);
    setSelectedId('');
    setIsAdmin(false);
    localStorage.setItem('clientUser', JSON.stringify(user));
    localStorage.removeItem('selectedRestaurant');
    localStorage.removeItem('isAdmin');
  };

  const logout = () => {
    setSelectedId('');
    setIsAdmin(false);
    setClientUser(null);
    localStorage.removeItem('selectedRestaurant');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('clientUser');
  };

  const selected = restaurants.find(r => r._id === selectedId) || null;
  const isClient = !!clientUser;
  const isAuthenticated = !!selectedId || isAdmin || isClient;
  const role = isAdmin ? 'admin' : isClient ? 'client' : selectedId ? 'restaurant' : null;

  return (
    <RestaurantContext.Provider value={{
      restaurants, selected, selectedId, isAdmin, isClient, clientUser,
      isAuthenticated, role,
      selectRestaurant, loginAsAdmin, loginAsClient, logout, loading
    }}>
      {children}
    </RestaurantContext.Provider>
  );
}

export const useRestaurant = () => useContext(RestaurantContext);
