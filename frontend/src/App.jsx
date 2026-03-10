import { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Store, Users as UsersIcon, UtensilsCrossed, ClipboardList, Star, BarChart3, Shield, LogOut, Lock, KeyRound, User, Mail, UserPlus, MapPin } from 'lucide-react';
import { RestaurantProvider, useRestaurant } from './context/RestaurantContext';
import { loginRestaurant, loginAdmin, loginUser, registerUser } from './services/api';
import Dashboard from './pages/Dashboard';
import Restaurants from './pages/Restaurants';
import UsersPage from './pages/UsersPage';
import MenuItems from './pages/MenuItems';
import Orders from './pages/Orders';
import Reviews from './pages/Reviews';
import Analytics from './pages/Analytics';
import ClientApp from './pages/client/ClientApp';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: BarChart3 },
  { path: '/restaurants', label: 'Restaurantes', icon: Store, adminOnly: true },
  { path: '/users', label: 'Usuarios', icon: UsersIcon, adminOnly: true },
  { path: '/menu', label: 'Menú', icon: UtensilsCrossed },
  { path: '/orders', label: 'Órdenes', icon: ClipboardList },
  { path: '/reviews', label: 'Reseñas', icon: Star },
  { path: '/analytics', label: 'Analítica', icon: BarChart3 },
];

function LoginScreen() {
  const { restaurants, selectRestaurant, loginAsAdmin, loginAsClient } = useRestaurant();
  const [mode, setMode] = useState('select');
  const [clientMode, setClientMode] = useState('login');
  const [pendingId, setPendingId] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regForm, setRegForm] = useState({ name: '', email: '', password: '', phone: '', street: '', city: 'Guatemala', latitude: '', longitude: '' });

  const pendingRestaurant = restaurants.find(r => r._id === pendingId);

  const handleRestaurantLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await loginRestaurant(pendingId, code);
      selectRestaurant(pendingId);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await loginAdmin(code);
      loginAsAdmin();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleClientLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await loginUser(email, password);
      loginAsClient(res.data);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await registerUser(regForm);
      loginAsClient(res.data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const resetClient = () => { setClientMode('login'); setEmail(''); setPassword(''); setError(''); setRegForm({ name: '', email: '', password: '', phone: '', street: '', city: 'Guatemala', latitude: '', longitude: '' }); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">RestaurantesGT</h1>
          <p className="text-sm text-gray-500">Plataforma de pedidos</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          {mode === 'select' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">Iniciar sesión</h2>
              <div className="space-y-2">
                <button onClick={() => { setMode('client'); resetClient(); }} className="w-full flex items-center gap-3 px-4 py-3.5 border border-gray-200 rounded-xl text-left hover:bg-green-50 hover:border-green-300 transition-colors">
                  <User size={20} className="text-green-600 shrink-0" />
                  <div>
                    <span className="text-sm font-semibold text-gray-800">Cliente</span>
                    <p className="text-xs text-gray-400">Pedir comida, ver restaurantes cercanos</p>
                  </div>
                </button>
                <button onClick={() => setMode('restaurant')} className="w-full flex items-center gap-3 px-4 py-3.5 border border-gray-200 rounded-xl text-left hover:bg-orange-50 hover:border-orange-300 transition-colors">
                  <Store size={20} className="text-orange-500 shrink-0" />
                  <div>
                    <span className="text-sm font-semibold text-gray-800">Restaurante</span>
                    <p className="text-xs text-gray-400">Gestionar tu menú, órdenes y reseñas</p>
                  </div>
                </button>
                <button onClick={() => { setMode('admin'); setCode(''); setError(''); }} className="w-full flex items-center gap-3 px-4 py-3.5 border border-gray-200 rounded-xl text-left hover:bg-blue-50 hover:border-blue-300 transition-colors">
                  <Shield size={20} className="text-blue-600 shrink-0" />
                  <div>
                    <span className="text-sm font-semibold text-gray-800">Administrador</span>
                    <p className="text-xs text-gray-400">Acceso completo a todos los datos</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {mode === 'client' && clientMode === 'login' && (
            <form onSubmit={handleClientLogin}>
              <button type="button" onClick={() => setMode('select')} className="text-xs text-gray-400 hover:text-gray-600 mb-3">&larr; Volver</button>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg mb-4">
                <User size={16} className="text-green-600" />
                <span className="text-sm font-semibold text-green-800">Ingreso de Cliente</span>
              </div>

              <label className="text-xs font-medium text-gray-600 mb-1 block">Email</label>
              <div className="relative mb-2">
                <Mail size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="email"
                  required
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                  autoFocus
                />
              </div>

              <label className="text-xs font-medium text-gray-600 mb-1 block">Contraseña</label>
              <div className="relative mb-3">
                <Lock size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="password"
                  required
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                />
              </div>

              {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

              <button type="submit" disabled={!email || !password || loading} className="w-full bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                {loading ? 'Ingresando...' : 'Iniciar sesión'}
              </button>

              <div className="mt-4 pt-3 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400 mb-1">¿No tienes cuenta?</p>
                <button type="button" onClick={() => { setClientMode('register'); setError(''); }} className="text-sm font-medium text-green-600 hover:text-green-700 flex items-center gap-1 mx-auto">
                  <UserPlus size={14} /> Crear cuenta
                </button>
              </div>
            </form>
          )}

          {mode === 'client' && clientMode === 'register' && (
            <form onSubmit={handleRegister}>
              <button type="button" onClick={() => { setClientMode('login'); setError(''); }} className="text-xs text-gray-400 hover:text-gray-600 mb-3">&larr; Volver al login</button>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg mb-4">
                <UserPlus size={16} className="text-green-600" />
                <span className="text-sm font-semibold text-green-800">Crear cuenta</span>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-0.5 block">Nombre *</label>
                  <input required placeholder="Tu nombre completo" value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300" autoFocus />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-0.5 block">Email *</label>
                  <input type="email" required placeholder="tu@email.com" value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-0.5 block">Contraseña *</label>
                  <input type="password" required minLength={4} placeholder="Mínimo 4 caracteres" value={regForm.password} onChange={e => setRegForm({...regForm, password: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-0.5 block">Teléfono</label>
                  <input type="tel" placeholder="+502 1234-5678" value={regForm.phone} onChange={e => setRegForm({...regForm, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                </div>

                <div className="pt-1">
                  <p className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1"><MapPin size={12} /> Dirección (para entregas)</p>
                  <input placeholder="Calle o dirección" value={regForm.street} onChange={e => setRegForm({...regForm, street: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300 mb-2" />
                  <input placeholder="Ciudad" value={regForm.city} onChange={e => setRegForm({...regForm, city: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300 mb-2" />
                  <div className="flex gap-2">
                    <input type="number" step="any" placeholder="Latitud" value={regForm.latitude} onChange={e => setRegForm({...regForm, latitude: e.target.value})} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                    <input type="number" step="any" placeholder="Longitud" value={regForm.longitude} onChange={e => setRegForm({...regForm, longitude: e.target.value})} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Las coordenadas permiten buscar restaurantes cercanos</p>
                </div>
              </div>

              {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

              <button type="submit" disabled={!regForm.name || !regForm.email || !regForm.password || loading} className="w-full mt-4 bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                {loading ? 'Creando cuenta...' : 'Crear cuenta e ingresar'}
              </button>
            </form>
          )}

          {mode === 'restaurant' && !pendingId && (
            <div>
              <button type="button" onClick={() => setMode('select')} className="text-xs text-gray-400 hover:text-gray-600 mb-3">&larr; Volver</button>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Selecciona tu restaurante</h3>
              <div className="space-y-2">
                {restaurants.map(r => (
                  <button
                    key={r._id}
                    onClick={() => { setPendingId(r._id); setCode(''); setError(''); }}
                    className="w-full flex items-center gap-3 px-3 py-3 border border-gray-200 rounded-xl text-left hover:bg-orange-50 hover:border-orange-300 transition-colors"
                  >
                    <Store size={16} className="text-orange-500 shrink-0" />
                    <span className="text-sm font-medium text-gray-800">{r.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'restaurant' && pendingId && (
            <form onSubmit={handleRestaurantLogin}>
              <button type="button" onClick={() => setPendingId('')} className="text-xs text-gray-400 hover:text-gray-600 mb-3">&larr; Volver</button>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-orange-50 border border-orange-200 rounded-lg mb-4">
                <Store size={16} className="text-orange-500" />
                <span className="text-sm font-semibold text-orange-800">{pendingRestaurant?.name}</span>
              </div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Código de acceso</label>
              <div className="relative mb-3">
                <KeyRound size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input type="password" maxLength={6} placeholder="Ingresa tu código" value={code} onChange={e => { setCode(e.target.value); setError(''); }} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" autoFocus />
              </div>
              {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
              <button type="submit" disabled={!code || loading} className="w-full bg-orange-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors">
                {loading ? 'Verificando...' : 'Entrar'}
              </button>
            </form>
          )}

          {mode === 'admin' && (
            <form onSubmit={handleAdminLogin}>
              <button type="button" onClick={() => setMode('select')} className="text-xs text-gray-400 hover:text-gray-600 mb-3">&larr; Volver</button>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <Shield size={16} className="text-blue-600" />
                <span className="text-sm font-semibold text-blue-800">Administrador</span>
              </div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Contraseña</label>
              <div className="relative mb-3">
                <Lock size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input type="password" placeholder="Contraseña de admin" value={code} onChange={e => { setCode(e.target.value); setError(''); }} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" autoFocus />
              </div>
              {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
              <button type="submit" disabled={!code || loading} className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {loading ? 'Verificando...' : 'Entrar como Admin'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminRestaurantApp() {
  const location = useLocation();
  const { isAdmin, selected, logout } = useRestaurant();

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-10 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">RestaurantesGT</h1>
          <p className="text-xs text-gray-500 mt-1">Panel de administración</p>
        </div>

        <div className="px-4 pt-4 pb-2 border-b border-gray-100">
          {isAdmin ? (
            <div className="flex items-center gap-2 w-full px-3 py-2.5 border border-blue-300 rounded-lg text-sm bg-blue-50 text-blue-800 font-semibold">
              <Shield size={14} /> Administrador
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 w-full px-3 py-2.5 border border-green-300 rounded-lg text-sm bg-green-50 text-green-800 font-semibold">
                <Lock size={14} /> {selected?.name}
              </div>
            </div>
          )}
          <button onClick={() => { if (confirm('¿Cerrar sesión?')) logout(); }} className="flex items-center gap-1.5 mt-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg w-full transition-colors">
            <LogOut size={13} /> Cerrar sesión
          </button>
        </div>

        <nav className="p-4 space-y-1 flex-1">
          {NAV_ITEMS
            .filter(item => !item.adminOnly || isAdmin)
            .map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link key={path} to={path} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
                  <Icon size={18} /> {label}
                </Link>
              );
            })}
        </nav>
      </aside>

      <main className="ml-64 p-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/restaurants" element={<Restaurants />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/menu" element={<MenuItems />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </main>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, role } = useRestaurant();

  if (!isAuthenticated) return <LoginScreen />;
  if (role === 'client') return <ClientApp />;
  return <AdminRestaurantApp />;
}

export default function App() {
  return (
    <RestaurantProvider>
      <AppContent />
    </RestaurantProvider>
  );
}
