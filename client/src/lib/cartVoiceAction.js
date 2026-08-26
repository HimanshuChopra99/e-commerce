import { getSocket } from './socket';

/**
 * Emits a real-time cart action event over socket to trigger instant Retell AI agent responses
 * when the user clicks cart or product page action buttons during an active voice call.
 */
export function emitCartVoiceAction({
  action,
  productName,
  color,
  size,
  quantity,
  cartSummary,
}) {
  const socket = getSocket();
  if (!socket || !socket.connected) return;

  socket.emit('cart:action', {
    action, // 'add_to_cart' | 'remove_from_cart' | 'increase_quantity' | 'decrease_quantity' | 'remove_item'
    productName: productName || 'item',
    color: color || null,
    size: size || null,
    quantity: quantity !== undefined ? quantity : null,
    cartSummary: cartSummary || null,
    timestamp: Date.now(),
  });
}
