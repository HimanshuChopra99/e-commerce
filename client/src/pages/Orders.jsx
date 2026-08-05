import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyOrders } from '../store/ordersSlice';
import { useNavigate, useLocation } from 'react-router-dom';

const STATUS_STYLES = {
  pending:    'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped:    'bg-indigo-100 text-indigo-800',
  delivered:  'bg-emerald-100 text-emerald-800',
  cancelled:  'bg-red-100 text-red-800',
  returned:   'bg-gray-100 text-gray-700',
};

const STATUS_LABELS = {
  pending:    'Pending',
  processing: 'Processing',
  shipped:    'Shipped',
  delivered:  'Delivered',
  cancelled:  'Cancelled',
  returned:   'Returned',
};

export default function Orders() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const justPlaced = location.state?.justPlaced;
  const paid = location.state?.paid;

  const { items, loading, error } = useSelector((state) => state.orders);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (user) {
      dispatch(fetchMyOrders());
    }
  }, [user, dispatch]);

  if (!user && !justPlaced) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">My Orders</h1>
        <p className="text-gray-600 mb-6">Please log in to view your order history.</p>
        <button
          onClick={() => navigate('/login')}
          className="bg-black text-white px-6 py-2.5 rounded-full font-semibold hover:bg-gray-800 transition"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-black uppercase tracking-tight mb-8">My Orders</h1>

      {justPlaced && (
        <div className={`mb-6 p-5 rounded-2xl border ${paid ? 'bg-emerald-50 border-emerald-200' : 'bg-green-50 border-green-200'}`}>
          <h2 className={`text-lg font-black mb-1 ${paid ? 'text-emerald-800' : 'text-green-800'}`}>
            {paid ? '✅ Payment Successful!' : '🎉 Order Placed!'}
          </h2>
          <p className={`text-sm ${paid ? 'text-emerald-700' : 'text-green-700'}`}>
            Order <span className="font-mono font-bold">#{justPlaced.orderNumber || justPlaced.id}</span> confirmed.
            Total: <strong>${Number(justPlaced.total || justPlaced.grandTotal || 0).toFixed(2)}</strong>
          </p>
          {justPlaced.customerEmail && (
            <p className={`text-xs mt-1 ${paid ? 'text-emerald-600' : 'text-green-600'}`}>
              A confirmation will be sent to {justPlaced.customerEmail}.
            </p>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading order history...</div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
      ) : items.length === 0 && !justPlaced ? (
        <div className="py-12 text-center border-2 border-dashed border-gray-300 rounded-2xl bg-white p-8">
          <p className="text-gray-500 mb-4">You haven't placed any orders yet.</p>
          <button
            onClick={() => navigate('/products')}
            className="bg-black text-white px-6 py-2.5 rounded-full font-semibold hover:bg-gray-800 transition"
          >
            Explore Catalog
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {items.map((order) => (
            <div key={order.id} className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition">
              <div className="flex flex-wrap justify-between items-center pb-4 border-b gap-2">
                <div>
                  <span className="font-mono text-sm text-gray-500">ORDER {order.orderNumber || order.id}</span>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Placed on {new Date(order.placedAt || order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                  <span className="text-lg font-black">${Number(order.grandTotal || order.total || 0).toFixed(2)}</span>
                </div>
              </div>

              {order.items && order.items.length > 0 && (
                <div className="mt-4 space-y-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-4">
                      {(item.image || item.productImage) && (
                        <img
                          src={item.image || item.productImage}
                          alt={item.name || item.productName}
                          className="w-16 h-16 object-contain rounded-lg bg-gray-50 p-1 border"
                         loading="lazy" decoding="async"/>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-gray-900 truncate">{item.name || item.productName}</h4>
                        <p className="text-xs text-gray-500">
                          Size: {item.size} | Color: {item.color} | Qty: {item.quantity}
                        </p>
                      </div>
                      <div className="text-sm font-semibold">${Number(item.lineTotal || item.unitPrice).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
