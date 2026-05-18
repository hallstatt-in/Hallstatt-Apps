import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BadgeIndianRupee,
  Calculator,
  FileText,
  LockKeyhole,
  MessageSquareText,
  MoveUpRight,
  Sparkles,
} from 'lucide-react';
import './styles.css';

const apps = [
  {
    name: 'Pricing Sticker Generator',
    description: 'Create barcode-ready pricing labels, product variants, and print layouts.',
    href: '/sticker/',
    label: 'Labels',
    metric: 'Print desk',
    Icon: BadgeIndianRupee,
    accent: 'amber',
  },
  {
    name: 'Pricing Calculator',
    description: 'Model COGS, marketplace fees, CAC, returns, and target margins.',
    href: '/pricing-calculator/',
    label: 'Margins',
    metric: 'COGS live',
    Icon: Calculator,
    accent: 'rose',
  },
  {
    name: 'Product Description Generator',
    description: 'Turn product URLs into structured catalog copy for ecommerce listings.',
    href: '/product-description-generator/',
    label: 'Copy',
    metric: 'AI assist',
    Icon: FileText,
    accent: 'green',
  },
  {
    name: 'Review Generator',
    description: 'Generate exportable product reviews with language and location controls.',
    href: '/reviews-generator/',
    label: 'Reviews',
    metric: 'Bulk export',
    Icon: MessageSquareText,
    accent: 'blue',
  },
] as const;

function App() {
  return (
    <main className="page-shell">
      <nav className="topbar" aria-label="Hallstatt Apps">
        <a className="brand" href="/" aria-label="Hallstatt Apps home">
          <span className="brand-mark">H</span>
          <span>
            <span className="brand-name">Hallstatt</span>
            <span className="brand-subtitle">Operations suite</span>
          </span>
        </a>
        <div className="access-note">
          <LockKeyhole size={15} />
          <span>Internal workspace</span>
        </div>
      </nav>

      <section className="hero-panel" aria-labelledby="page-title">
        <div>
          <span className="eyebrow">
            <Sparkles size={15} />
            Active app console
          </span>
          <h1 id="page-title">One command center for Hallstatt ecommerce work.</h1>
        </div>
        <p>
          Jump into pricing, stickers, catalog copy, and review workflows from a cleaner
          operations dashboard built for daily use.
        </p>
      </section>

      <section className="app-grid" aria-label="Available apps">
        {apps.map(({ name, description, href, label, metric, Icon, accent }) => (
          <a className={`app-tile ${accent}`} href={href} key={name}>
            <span className="tile-top">
              <span className="tile-label">{label}</span>
              <span className="open-icon" aria-hidden="true">
                <MoveUpRight size={19} />
              </span>
            </span>
            <span className="icon-wrap" aria-hidden="true">
              <Icon size={28} strokeWidth={1.85} />
            </span>
            <span className="tile-copy">
              <span className="tile-title">{name}</span>
              <span className="tile-description">{description}</span>
            </span>
            <span className="tile-footer">
              <span>{metric}</span>
              <span>{href}</span>
            </span>
          </a>
        ))}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
