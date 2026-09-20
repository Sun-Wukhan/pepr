import {
  ArrowRight,
  Check,
  FlaskConical,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import "./App.css";

type Category = "All" | "Peptides" | "Blends" | "Longevity";

interface Product {
  id: number;
  name: string;
  dose: string;
  formula?: string;
  price: number;
  category: Exclude<Category, "All">;
  accent: string;
}

interface GuideEntry {
  names: string[];
  status: string;
  summary: string;
  context: string;
}

const products: Product[] = [
  {
    id: 1,
    name: "Tesamorelin",
    dose: "10mg",
    price: 100,
    category: "Peptides",
    accent: "lime",
  },
  {
    id: 2,
    name: "Reta",
    dose: "10mg",
    price: 60,
    category: "Peptides",
    accent: "blue",
  },
  {
    id: 3,
    name: "Reta",
    dose: "20mg",
    price: 100,
    category: "Peptides",
    accent: "violet",
  },
  {
    id: 4,
    name: "TB500",
    dose: "10mg",
    price: 90,
    category: "Peptides",
    accent: "orange",
  },
  {
    id: 5,
    name: "BPC157",
    dose: "10mg",
    price: 70,
    category: "Peptides",
    accent: "pink",
  },
  {
    id: 6,
    name: "Wolverine",
    dose: "10mg total",
    formula: "BPC157 5mg + TB500 5mg",
    price: 70,
    category: "Blends",
    accent: "red",
  },
  {
    id: 7,
    name: "GHK-Cu",
    dose: "50mg",
    price: 60,
    category: "Peptides",
    accent: "cyan",
  },
  {
    id: 8,
    name: "GHK-Cu",
    dose: "100mg",
    price: 80,
    category: "Peptides",
    accent: "navy",
  },
  {
    id: 9,
    name: "MOTS-C",
    dose: "20mg",
    price: 90,
    category: "Longevity",
    accent: "green",
  },
  {
    id: 10,
    name: "NAD+",
    dose: "100mg",
    price: 60,
    category: "Longevity",
    accent: "yellow",
  },
  {
    id: 11,
    name: "GLOW",
    dose: "70mg total",
    formula: "BPC157 10mg + GHK-Cu 50mg + TB500 10mg",
    price: 180,
    category: "Blends",
    accent: "purple",
  },
  {
    id: 12,
    name: "KLOW",
    dose: "80mg total",
    formula: "GHK-Cu 50mg + TB500 10mg + BPC157 10mg + KPV 10mg",
    price: 180,
    category: "Blends",
    accent: "teal",
  },
];

const categories: Category[] = ["All", "Peptides", "Blends", "Longevity"];

const guideEntries: GuideEntry[] = [
  {
    names: ["Tesamorelin"],
    status: "Prescription context",
    summary:
      "Approved tesamorelin products are prescription medicines administered under a licensed clinician’s direction. A research vial is not interchangeable with an approved product.",
    context:
      "PEPR format: laboratory research only. Do not reconstitute or administer to a person.",
  },
  {
    names: ["Reta 10mg", "Reta 20mg"],
    status: "Investigational",
    summary:
      "Retatrutide remains an investigational compound. Human use should occur only within an authorized clinical trial with qualified medical oversight.",
    context:
      "PEPR format: laboratory research only. No approved consumer application or dosing protocol exists.",
  },
  {
    names: ["TB500", "BPC157"],
    status: "Not approved for human use",
    summary:
      "These research peptides are not approved medicines. Online injection or dosing protocols are not a substitute for regulatory review or clinical supervision.",
    context:
      "PEPR format: in-vitro or other properly authorized research workflows only.",
  },
  {
    names: ["Wolverine"],
    status: "Research blend",
    summary:
      "Wolverine combines BPC157 and TB500 in one research format. Combining compounds does not establish safety, efficacy, or an approved route of administration.",
    context:
      "PEPR format: laboratory research only. Not intended for personal application.",
  },
  {
    names: ["GHK-Cu 50mg", "GHK-Cu 100mg"],
    status: "Formulation-dependent",
    summary:
      "GHK-Cu appears in some purpose-made cosmetic formulations, but a lyophilized research vial is not a finished topical cosmetic and should not be applied to skin.",
    context:
      "PEPR format: laboratory research only. Use a regulated finished cosmetic for topical use.",
  },
  {
    names: ["MOTS-C"],
    status: "Investigational",
    summary:
      "MOTS-C is an experimental peptide without an approved consumer administration protocol. Its study belongs in controlled research settings.",
    context:
      "PEPR format: laboratory research only. Not for self-administration.",
  },
  {
    names: ["NAD+ 100mg"],
    status: "Formulation-dependent",
    summary:
      "NAD+ is available in multiple product categories, but research-grade material is not equivalent to a medicine, supplement, or clinician-supplied preparation.",
    context:
      "PEPR format: laboratory research only. Consult a licensed clinician about regulated medical products.",
  },
  {
    names: ["GLOW", "KLOW"],
    status: "Research blend",
    summary:
      "These multi-compound blends have no approved personal application. Each added ingredient creates additional compatibility and safety questions.",
    context:
      "PEPR format: laboratory research only. Not a cosmetic, medicine, or injectable product.",
  },
];

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

/** Renders one catalog item and its add-to-cart action. */
function ProductCard({ product, onAdd }: ProductCardProps) {
  return (
    <article className="product-card">
      <div className={`product-visual product-visual--${product.accent}`}>
        <span className="molecule molecule--one" />
        <span className="molecule molecule--two" />
        <div className="vial">
          <div className="vial-cap" />
          <div className="vial-body">
            <div className="vial-label">
              <span>PEPR.</span>
              <strong>{product.name}</strong>
              <small>{product.dose}</small>
            </div>
          </div>
        </div>
        <span className="product-pill">{product.category}</span>
      </div>
      <div className="product-info">
        <div>
          <p className="product-dose">{product.dose}</p>
          <h3>{product.name}</h3>
          <p className="product-formula">
            {product.formula ?? "Single-compound format"}
          </p>
        </div>
        <div className="product-bottom">
          <span className="product-price">${product.price}</span>
          <button
            type="button"
            className="add-button"
            onClick={() => onAdd(product)}
            aria-label={`Add ${product.name} ${product.dose} to cart`}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}

/** Explains the safe application status of every PEPR catalog item. */
function GuidePage() {
  return (
    <div className="site-shell guide-page">
      <div className="announcement">
        <span>Research-use guidance · Read before handling</span>
        <span className="announcement-secondary">
          Safety first · No self-administration
        </span>
      </div>

      <header className="nav-wrap guide-nav">
        <a className="logo" href="." aria-label="PEPR home">
          PEPR<span>.</span>
        </a>
        <a className="guide-back" href=".">
          <ArrowRight size={17} /> Back to storefront
        </a>
      </header>

      <main>
        <section className="guide-hero">
          <div>
            <p className="eyebrow">
              <ShieldCheck size={14} /> Product guidance
            </p>
            <h1 aria-label="Understanding application">
              Understanding
              <br />
              <em>application.</em>
            </h1>
          </div>
          <div className="guide-intro">
            <p>
              “Research use” describes a controlled laboratory purpose—not
              personal treatment. This guide clarifies the status of each
              compound and why its format matters.
            </p>
            <div className="guide-warning">
              <FlaskConical size={22} />
              <span>
                <strong>PEPR products are not for human consumption.</strong>
                Do not inject, ingest, inhale, or apply these research vials to
                the body.
              </span>
            </div>
          </div>
        </section>

        <section className="application-principles">
          <article>
            <span>01</span>
            <h2>Product format matters</h2>
            <p>
              A research vial is not equivalent to an approved prescription,
              compounded medicine, supplement, or finished cosmetic.
            </p>
          </article>
          <article>
            <span>02</span>
            <h2>Research is controlled</h2>
            <p>
              Appropriate use requires qualified personnel, documented
              protocols, suitable facilities, and applicable approvals.
            </p>
          </article>
          <article>
            <span>03</span>
            <h2>Ask a professional</h2>
            <p>
              For personal health questions, consult a licensed clinician who
              can discuss regulated and evidence-based options.
            </p>
          </article>
        </section>

        <section className="guide-catalog">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Compound directory</p>
              <h2>Application by product.</h2>
            </div>
            <p>
              Clear distinctions between investigational compounds, regulated
              formulations, and PEPR’s research-only formats.
            </p>
          </div>

          <div className="guide-list">
            {guideEntries.map((entry, index) => (
              <article className="guide-entry" key={entry.names.join("-")}>
                <div className="guide-entry-number">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="guide-entry-title">
                  {entry.names.map((name) => (
                    <h3 key={name}>{name}</h3>
                  ))}
                  <span>{entry.status}</span>
                </div>
                <p>{entry.summary}</p>
                <div className="guide-context">
                  <Check size={17} />
                  <span>{entry.context}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="guide-clinician">
          <ShieldCheck size={34} />
          <div>
            <p className="eyebrow">Personal health questions</p>
            <h2>Start with a licensed clinician.</h2>
            <p>
              A qualified professional can review your medical history, explain
              approved options, and provide product-specific instructions when
              treatment is appropriate.
            </p>
          </div>
          <a className="primary-button" href="./#contact">
            Visit support <ArrowRight size={18} />
          </a>
        </section>
      </main>

      <footer>
        <div className="footer-bottom guide-footer">
          <p>
            Educational information only. It is not medical advice and does not
            provide instructions for human administration.
          </p>
          <a href=".">Return to PEPR</a>
        </div>
      </footer>
    </div>
  );
}

/** Displays the PEPR research product storefront. */
function App() {
  const isGuidePage =
    new URLSearchParams(window.location.search).get("page") === "guide";
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Product[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory =
        activeCategory === "All" || product.category === activeCategory;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        `${product.name} ${product.dose} ${product.formula ?? ""}`
          .toLowerCase()
          .includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, search]);

  const total = cart.reduce((sum, product) => sum + product.price, 0);

  /** Adds a product and reveals the cart panel. */
  const addToCart = (product: Product): void => {
    setCart((current) => [...current, product]);
    setCartOpen(true);
  };

  /** Removes one cart line by its array position. */
  const removeFromCart = (index: number): void => {
    setCart((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  if (isGuidePage) {
    return <GuidePage />;
  }

  return (
    <div className="site-shell">
      <div className="announcement">
        <span>Complimentary cold-pack shipping on orders $250+</span>
        <span className="announcement-secondary">
          Independent testing · Verified purity
        </span>
      </div>

      <header className="nav-wrap">
        <a className="logo" href="#top" aria-label="PEPR home">
          PEPR<span>.</span>
        </a>
        <nav
          id="primary-navigation"
          className={mobileOpen ? "nav-links nav-links--open" : "nav-links"}
          aria-label="Primary navigation"
        >
          <a href="#shop" onClick={() => setMobileOpen(false)}>
            Shop
          </a>
          <a href="#standards" onClick={() => setMobileOpen(false)}>
            Our standards
          </a>
          <a href="?page=guide" onClick={() => setMobileOpen(false)}>
            Product guide
          </a>
          <a href="#contact" onClick={() => setMobileOpen(false)}>
            Contact
          </a>
        </nav>
        <div className="nav-actions">
          <button
            type="button"
            className="icon-button search-top"
            aria-label="Search products"
            onClick={() => document.getElementById("product-search")?.focus()}
          >
            <Search size={20} />
          </button>
          <button
            type="button"
            className="cart-button"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag size={20} />
            <span>Bag</span>
            <em>{cart.length}</em>
          </button>
          <button
            type="button"
            className="icon-button menu-button"
            aria-label="Toggle navigation"
            aria-controls="primary-navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow">
              <Sparkles size={14} /> Science, refined.
            </p>
            <h1>
              Precision compounds.
              <br />
              <em>Zero compromise.</em>
            </h1>
            <p className="hero-lede">
              High-purity research peptides, independently verified and
              delivered with complete transparency.
            </p>
            <div className="hero-actions">
              <a className="primary-button" href="#shop">
                Explore compounds <ArrowRight size={18} />
              </a>
              <a className="text-link" href="#standards">
                View testing standards
              </a>
            </div>
            <div className="hero-proof">
              <div>
                <strong>99%+</strong>
                <span>Purity standard</span>
              </div>
              <div>
                <strong>3rd party</strong>
                <span>Lab verified</span>
              </div>
              <div>
                <strong>US-based</strong>
                <span>Fulfillment</span>
              </div>
            </div>
          </div>
          <div className="hero-art" aria-label="PEPR laboratory vial">
            <div className="orb orb--one" />
            <div className="orb orb--two" />
            <div className="hero-vial">
              <div className="hero-vial-cap" />
              <div className="hero-vial-glass">
                <div className="hero-vial-label">
                  <span>PEPR.</span>
                  <small>RESEARCH COMPOUND</small>
                  <strong>RETA</strong>
                  <p>20mg · Lyophilized</p>
                </div>
                <div className="vial-liquid" />
              </div>
            </div>
            <div className="lab-card lab-card--purity">
              <ShieldCheck size={20} />
              <span>
                <strong>99.4% purity</strong>Batch verified
              </span>
              <Check size={16} />
            </div>
            <div className="lab-card lab-card--batch">
              <span>LOT / 0926</span>
              <strong>COA AVAILABLE</strong>
            </div>
          </div>
        </section>

        <section className="trust-strip" id="standards">
          <div>
            <FlaskConical size={22} />
            <span>
              <strong>HPLC tested</strong>Every batch
            </span>
          </div>
          <div>
            <ShieldCheck size={22} />
            <span>
              <strong>Quality handled</strong>Controlled process
            </span>
          </div>
          <div>
            <Sparkles size={22} />
            <span>
              <strong>Transparent</strong>COA documentation
            </span>
          </div>
          <div>
            <Check size={22} />
            <span>
              <strong>Cold packed</strong>When required
            </span>
          </div>
        </section>

        <section className="shop-section" id="shop">
          <div className="section-heading">
            <div>
              <p className="eyebrow">The collection</p>
              <h2>Research, elevated.</h2>
            </div>
            <p>
              Curated compounds and precision blends, presented with clear
              specifications and transparent pricing.
            </p>
          </div>

          <div className="catalog-tools">
            <div
              className="categories"
              role="group"
              aria-label="Filter products by category"
            >
              {categories.map((category) => (
                <button
                  type="button"
                  key={category}
                  className={
                    activeCategory === category ? "category-active" : ""
                  }
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
            <label className="search-field" htmlFor="product-search">
              <Search size={17} />
              <input
                id="product-search"
                type="search"
                placeholder="Search compounds"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>

          <div className="product-grid">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={addToCart}
              />
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <p className="empty-state">No compounds match your search.</p>
          )}
        </section>

        <section className="manifesto" id="journal">
          <div className="manifesto-mark">P.</div>
          <div className="manifesto-copy">
            <p className="eyebrow">Our standard</p>
            <h2>
              What’s on the label
              <br />
              is what’s in the vial.
            </h2>
            <p>
              Every PEPR batch is independently analyzed for identity and
              purity, with documentation available before you order.
            </p>
            <a href="#contact" className="text-link text-link--light">
              Learn about our process <ArrowRight size={17} />
            </a>
          </div>
          <div className="certificate-card">
            <div className="certificate-top">
              <span>CERTIFICATE</span>
              <FlaskConical size={28} />
            </div>
            <div>
              <small>ANALYSIS RESULT</small>
              <strong>PASS</strong>
            </div>
            <p>
              Identity confirmed
              <br />
              Purity ≥ 99%
            </p>
            <div className="certificate-line" />
            <span className="certificate-code">PEPR / QC / 2026</span>
          </div>
        </section>

        <section className="newsletter" id="contact">
          <p className="eyebrow">The PEPR journal</p>
          <h2>Stay close to the science.</h2>
          <p>
            Product releases, research notes, and laboratory updates—delivered
            selectively.
          </p>
          <form onSubmit={(event) => event.preventDefault()}>
            <label className="sr-only" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              placeholder="Email address"
              required
            />
            <button type="submit">
              Join the journal <ArrowRight size={17} />
            </button>
          </form>
        </section>
      </main>

      <footer>
        <div className="footer-top">
          <a className="logo logo--light" href="#top">
            PEPR<span>.</span>
          </a>
          <p>
            Precision research compounds.
            <br />
            Made for discovery.
          </p>
          <div className="footer-links">
            <div>
              <strong>Explore</strong>
              <a href="#shop">All compounds</a>
              <a href="#shop">Blends</a>
              <a href="?page=guide">Application guide</a>
            </div>
            <div>
              <strong>Support</strong>
              <a href="#contact">Contact</a>
              <a href="#contact">Shipping</a>
              <a href="#contact">FAQ</a>
            </div>
            <div>
              <strong>Legal</strong>
              <a href="#disclaimer">Terms</a>
              <a href="#disclaimer">Privacy</a>
              <a href="#disclaimer">Research use</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom" id="disclaimer">
          <p>
            For research use only. Not for human consumption. Products are not
            intended to diagnose, treat, cure, or prevent any disease.
          </p>
          <span>© 2026 PEPR LABS</span>
        </div>
      </footer>

      {cartOpen && (
        <button
          type="button"
          className="drawer-backdrop"
          aria-label="Close cart"
          onClick={() => setCartOpen(false)}
        />
      )}
      <aside
        className={cartOpen ? "cart-drawer cart-drawer--open" : "cart-drawer"}
        aria-label="Shopping bag"
        aria-hidden={!cartOpen}
      >
        <div className="cart-header">
          <div>
            <p className="eyebrow">Your selection</p>
            <h2>Shopping bag</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close cart"
            onClick={() => setCartOpen(false)}
          >
            <X />
          </button>
        </div>
        <div className="cart-content">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <ShoppingBag size={32} />
              <p>Your bag is empty.</p>
              <button type="button" onClick={() => setCartOpen(false)}>
                Explore compounds
              </button>
            </div>
          ) : (
            cart.map((product, index) => (
              <div className="cart-item" key={`${product.id}-${index}`}>
                <div
                  className={`cart-item-art product-visual--${product.accent}`}
                >
                  <FlaskConical size={25} />
                </div>
                <div>
                  <strong>{product.name}</strong>
                  <span>{product.dose}</span>
                  <button type="button" onClick={() => removeFromCart(index)}>
                    Remove
                  </button>
                </div>
                <b>${product.price}</b>
              </div>
            ))
          )}
        </div>
        {cart.length > 0 && (
          <div className="cart-footer">
            <div>
              <span>Subtotal</span>
              <strong>${total}</strong>
            </div>
            <p>Shipping and taxes calculated at checkout.</p>
            <button type="button">
              Continue to checkout <ArrowRight size={18} />
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

export default App;
