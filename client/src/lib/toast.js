export function showToast(message, type = 'success', options = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('kick:toast', {
      detail: {
        message: String(message || 'Updated successfully.'),
        type,
        ...options,
      },
    })
  );
}
