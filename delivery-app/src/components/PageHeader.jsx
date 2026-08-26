import { useNavigate } from 'react-router-dom';
import Icon from './Icon';

/**
 * Standard sticky top app bar for sub-pages.
 * Shows a back button + title (and optional subtitle).
 */
export default function PageHeader({ title, subtitle, right }) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 bg-surface/80 dark:bg-on-background/80 backdrop-blur-md border-b border-surface-container-high/40 transition-all">
      <div className="flex items-center w-full px-margin-mobile h-14 max-w-2xl mx-auto gap-3">
        <button
          aria-label="Back"
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low active:scale-95 transition-all text-on-surface-variant"
        >
          <Icon name="arrow_back" className="text-[20px]" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-body-lg font-bold text-on-surface tracking-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-label-sm text-on-surface-variant -mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
        {right}
      </div>
    </header>
  );
}
