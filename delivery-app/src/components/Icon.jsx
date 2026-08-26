// Wrapper around Material Symbols Outlined icon font
export default function Icon({ name, fill = false, className = '', style }) {
  return (
    <span
      className={`material-symbols-outlined ${fill ? 'icon-fill' : ''} ${className}`}
      style={style}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
