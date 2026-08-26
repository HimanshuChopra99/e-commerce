/**
 * Material-style toggle switch used across settings pages.
 * Matches the online/offline switch on the Home screen.
 */
export default function Switch({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange && onChange(!checked)}
      disabled={disabled}
      className="relative inline-flex items-center h-7 w-12 rounded-full transition-colors duration-300 cursor-pointer shrink-0"
      style={{
        backgroundColor: checked ? '#6b38d4' : '#e1e3e4',
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300 ease-in-out"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
  );
}
