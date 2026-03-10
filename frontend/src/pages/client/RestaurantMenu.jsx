import { useState, useEffect } from 'react';
import { getRestaurantMenu, getRestaurantReviews, createOrder, createReview, getMenuItemImageUrl } from '../../services/api';
import { useRestaurant } from '../../context/RestaurantContext';
import { ArrowLeft, Star, ShoppingCart, Plus, Minus, X, Send, MessageSquare } from 'lucide-react';

export default function RestaurantMenu({ restaurant, onBack }) {
  const { clientUser } = useRestaurant();
  const [menuItems, setMenuItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [cart, setCart] = useState({});
  const [tab, setTab] = useState('menu');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewTags, setReviewTags] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    Promise.all([
      getRestaurantMenu(restaurant._id).then(res => setMenuItems(res.data)),
      getRestaurantReviews(restaurant._id).then(res => setReviews(res.data))
    ]).catch(() => {}).finally(() => setLoading(false));
  }, [restaurant._id]);

  const categories = [...new Set(menuItems.map(i => i.category))];
  const cartItems = Object.entries(cart).filter(([, qty]) => qty > 0);
  const cartTotal = cartItems.reduce((sum, [id, qty]) => {
    const item = menuItems.find(i => i._id === id);
    return sum + (item?.price || 0) * qty;
  }, 0);

  const updateCart = (itemId, delta) => {
    setCart(prev => {
      const qty = Math.max(0, (prev[itemId] || 0) + delta);
      if (qty === 0) { const { [itemId]: _, ...rest } = prev; return rest; }
      return { ...prev, [itemId]: qty };
    });
  };

  const handleOrder = async () => {
    if (cartItems.length === 0) return;
    setOrdering(true);
    try {
      const items = cartItems.map(([id, quantity]) => ({ menuItemId: id, quantity }));
      await createOrder({
        userId: clientUser._id,
        restaurantId: restaurant._id,
        items,
        paymentMethod: 'tarjeta'
      });
      setMsg('Pedido realizado exitosamente');
      setCart({});
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setOrdering(false);
    }
  };

  const submitReview = async () => {
    if (!reviewComment.trim()) {
      setMsg('Error: Escribe un comentario para tu reseña');
      return;
    }
    if (!clientUser || !clientUser._id) {
      setMsg('Error: Debes iniciar sesión para dejar una reseña');
      return;
    }

    setSubmittingReview(true);
    setMsg('');
    try {
      const body = {
        userId: clientUser._id,
        targetType: 'restaurant',
        targetId: restaurant._id,
        rating: reviewRating,
        title: reviewTitle.trim(),
        comment: reviewComment.trim(),
        tags: reviewTags ? reviewTags.split(',').map(t => t.trim()).filter(Boolean) : []
      };
      await createReview(body);
      setMsg('Reseña publicada exitosamente');
      setShowReviewForm(false);
      setReviewRating(5);
      setReviewTitle('');
      setReviewComment('');
      setReviewTags('');
      try {
        const res = await getRestaurantReviews(restaurant._id);
        setReviews(res.data);
      } catch {}
    } catch (err) {
      setMsg(`Error: ${err.message || 'No se pudo publicar la reseña'}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft size={16} /> Volver a restaurantes
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{restaurant.name}</h2>
            <p className="text-sm text-gray-500 mt-1">{restaurant.description}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                <span className="font-semibold text-gray-800">{restaurant.rating?.average || '—'}</span>
                <span>({restaurant.rating?.count || 0} reseñas)</span>
              </div>
              <span>{restaurant.address?.street}, {restaurant.address?.city}</span>
            </div>
          </div>
          <button
            onClick={() => { setTab('reviews'); setShowReviewForm(true); }}
            className="flex items-center gap-1.5 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors shrink-0"
          >
            <MessageSquare size={15} /> Dejar reseña
          </button>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm flex justify-between items-center ${msg.startsWith('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="ml-2 shrink-0"><X size={16} /></button>
        </div>
      )}

      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        {['menu', 'reviews'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t === 'menu' ? `Menú (${menuItems.length})` : `Reseñas (${reviews.length})`}
          </button>
        ))}
      </div>

      {loading ? <p className="text-gray-500">Cargando...</p> : tab === 'menu' ? (
        <div className="flex gap-6">
          <div className="flex-1">
            {categories.map(cat => (
              <div key={cat} className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{cat}</h3>
                <div className="space-y-2">
                  {menuItems.filter(i => i.category === cat).map(item => {
                    const qty = cart[item._id] || 0;
                    return (
                      <div key={item._id} className="bg-white rounded-xl border border-gray-200 p-4 flex justify-between items-center">
                        <div className="flex items-center gap-4 flex-1 mr-4">
                          {item.imageFileId && (
                            <img src={getMenuItemImageUrl(item.imageFileId)} alt={item.name} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900 text-sm">{item.name}</h4>
                              {!item.isAvailable && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Agotado</span>}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                            {item.allergens?.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {item.allergens.map(a => <span key={a} className="text-xs bg-red-50 text-red-500 px-1.5 py-0.5 rounded">{a}</span>)}
                              </div>
                            )}
                            <span className="text-sm font-bold text-green-600 mt-1 block">Q{item.price?.toFixed(2)}</span>
                          </div>
                        </div>
                        {item.isAvailable !== false && (
                          <div className="flex items-center gap-2">
                            {qty > 0 && (
                              <>
                                <button onClick={() => updateCart(item._id, -1)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                                  <Minus size={14} />
                                </button>
                                <span className="text-sm font-semibold w-5 text-center">{qty}</span>
                              </>
                            )}
                            <button onClick={() => updateCart(item._id, 1)} className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200">
                              <Plus size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {cartItems.length > 0 && (
            <div className="w-72 shrink-0">
              <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                  <ShoppingCart size={16} /> Tu pedido
                </h3>
                <div className="space-y-2 mb-3">
                  {cartItems.map(([id, qty]) => {
                    const item = menuItems.find(i => i._id === id);
                    return (
                      <div key={id} className="flex justify-between text-sm">
                        <span className="text-gray-700">{qty}x {item?.name}</span>
                        <span className="text-gray-500">Q{((item?.price || 0) * qty).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-gray-100 pt-2 flex justify-between font-semibold text-sm mb-3">
                  <span>Total</span>
                  <span className="text-green-600">Q{cartTotal.toFixed(2)}</span>
                </div>
                <button
                  onClick={handleOrder}
                  disabled={ordering}
                  className="w-full bg-orange-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors"
                >
                  {ordering ? 'Procesando...' : 'Hacer pedido'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">Reseñas de {restaurant.name}</h3>
            {!showReviewForm && (
              <button onClick={() => setShowReviewForm(true)} className="flex items-center gap-1.5 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
                <Send size={14} /> Escribir reseña
              </button>
            )}
          </div>

          {showReviewForm && (
            <div className="bg-purple-50 rounded-xl border border-purple-200 p-5 mb-5">
              <h4 className="text-sm font-bold text-purple-900 mb-4 flex items-center gap-2">
                <MessageSquare size={16} /> Tu reseña para {restaurant.name}
              </h4>

              <div className="mb-4">
                <label className="text-xs text-gray-700 font-semibold block mb-1">Calificación</label>
                <div className="flex gap-1.5 items-center">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button" onClick={() => setReviewRating(n)} className="focus:outline-none">
                      <Star size={28} className={`transition-colors ${n <= reviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 hover:text-yellow-200'}`} />
                    </button>
                  ))}
                  <span className="text-sm font-bold text-purple-700 ml-2">{reviewRating}/5</span>
                </div>
              </div>

              <div className="mb-3">
                <label className="text-xs text-gray-700 font-semibold block mb-1">Título (opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Excelente comida"
                  value={reviewTitle}
                  onChange={e => setReviewTitle(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
                />
              </div>

              <div className="mb-3">
                <label className="text-xs text-gray-700 font-semibold block mb-1">Comentario *</label>
                <textarea
                  placeholder="¿Qué te pareció este restaurante? Cuéntanos tu experiencia..."
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
                  rows={4}
                />
              </div>

              <div className="mb-4">
                <label className="text-xs text-gray-700 font-semibold block mb-1">Tags (opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: buena atención, rápido, económico (separados por coma)"
                  value={reviewTags}
                  onChange={e => setReviewTags(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={submitReview}
                  disabled={submittingReview || !reviewComment.trim()}
                  className="bg-purple-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {submittingReview ? (
                    <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Publicando...</>
                  ) : (
                    <><Send size={14} /> Publicar reseña</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowReviewForm(false); setReviewRating(5); setReviewTitle(''); setReviewComment(''); setReviewTags(''); }}
                  className="bg-white text-gray-600 px-4 py-2.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {reviews.map(r => (
              <div key={r._id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={13} className={i < r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />)}</div>
                  <span className="text-sm font-semibold">{r.title}</span>
                </div>
                <p className="text-sm text-gray-600">{r.comment}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                  <span>{r.user?.name || 'Usuario'}</span>
                  <span>·</span>
                  <span>{new Date(r.createdAt).toLocaleDateString('es-GT')}</span>
                </div>
                {r.response && (
                  <div className="mt-2 bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-600">Respuesta del restaurante:</p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.response.text}</p>
                  </div>
                )}
              </div>
            ))}
            {reviews.length === 0 && <p className="text-sm text-gray-400">Aún no hay reseñas. Sé el primero en opinar.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
