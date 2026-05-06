import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BadgeIndianRupee,
  FileText,
  LockKeyhole,
  MessageSquareText,
  MoveUpRight,
} from 'lucide-react';
import './styles.css';

const apps = [
  {
    name: 'Pricing Sticker Generator',
    description: 'Create Hallstatt product stickers with sizes, barcodes, MRP, and print-ready layouts.',
    href: '/sticker/',
    label: 'Label operations',
    Icon: BadgeIndianRupee,
    accent: 'amber',
  },
  {
    name: 'Product Description Generator',
    description: 'Generate polished ecommerce descriptions from product URLs for catalog and listing work.',
    href: '/product-description-generator/',
    label: 'Catalog copy',
    Icon: FileText,
    accent: 'green',
  },
  {
    name: 'Review Generator',
    description: 'Generate structured product reviews with language, location, and export controls.',
    href: '/reviews-generator/',
    label: 'Review export',
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
            <span className="brand-subtitle">Apps</span>
          </span>
        </a>
        <div className="access-note">
          <LockKeyhole size={15} />
          <span>Internal tools</span>
        </div>
      </nav>

      <section className="app-grid" aria-label="Available apps">
        {apps.map(({ name, description, href, label, Icon, accent }) => (
          <a className={`app-tile ${accent}`} href={href} key={name}>
            <span className="tile-top">
              <span className="icon-wrap" aria-hidden="true">
                <Icon size={27} strokeWidth={1.9} />
              </span>
              <span className="open-icon" aria-hidden="true">
                <MoveUpRight size={20} />
              </span>
            </span>
            <span className="tile-copy">
              <span className="tile-label">{label}</span>
              <span className="tile-title">{name}</span>
              <span className="tile-description">{description}</span>
            </span>
            <span className="tile-path">{href}</span>
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
