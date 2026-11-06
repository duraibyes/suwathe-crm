// Creates / updates the database tables and seeds the first admin user.
// Runs automatically before every build (see package.json), and is safe to run many times.
// Needs DATABASE_URL (Neon connection string). Without it, it does nothing.
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] DATABASE_URL not set, skipping database setup.");
  process.exit(0);
}

const local = /localhost|127\.0\.0\.1|host=\/tmp/.test(url);
const client = new pg.Client({ connectionString: url, ssl: local ? false : { rejectUnauthorized: true } });

// Each step runs once, in order. Add new steps at the end; never edit old ones.
const steps = [
  [
    "001_initial",
    `
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
      password_hash TEXT NOT NULL,
      must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      failed_logins INT NOT NULL DEFAULT 0,
      locked_until TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX sessions_user_idx ON sessions(user_id);

    CREATE TABLE leads (
      id SERIAL PRIMARY KEY,
      business_name TEXT NOT NULL,
      contact_name TEXT,
      phone TEXT NOT NULL,
      alt_phone TEXT,
      business_type TEXT,
      area TEXT,
      city TEXT DEFAULT 'Chennai',
      website_status TEXT DEFAULT 'none',
      current_website TEXT,
      source TEXT DEFAULT 'google_maps',
      referred_by_lead_id INT REFERENCES leads(id) ON DELETE SET NULL,
      referred_by_name TEXT,
      referral_reward INT,
      referral_reward_paid BOOLEAN NOT NULL DEFAULT FALSE,
      interest TEXT,
      quoted_amount INT,
      deal_amount INT,
      status TEXT NOT NULL DEFAULT 'new',
      next_follow_up DATE,
      meeting_at TIMESTAMPTZ,
      lost_reason TEXT,
      notes TEXT,
      assigned_to INT REFERENCES users(id) ON DELETE SET NULL,
      created_by INT REFERENCES users(id) ON DELETE SET NULL,
      won_on DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX leads_status_idx ON leads(status);
    CREATE INDEX leads_follow_idx ON leads(next_follow_up);
    CREATE INDEX leads_phone_idx ON leads(phone);

    CREATE TABLE activities (
      id SERIAL PRIMARY KEY,
      lead_id INT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      user_id INT REFERENCES users(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      summary TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX activities_lead_idx ON activities(lead_id, created_at DESC);

    CREATE TABLE payments (
      id SERIAL PRIMARY KEY,
      lead_id INT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      amount INT NOT NULL CHECK (amount > 0),
      paid_on DATE NOT NULL,
      mode TEXT,
      note TEXT,
      created_by INT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX payments_lead_idx ON payments(lead_id);

    CREATE TABLE renewals (
      id SERIAL PRIMARY KEY,
      lead_id INT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      item TEXT NOT NULL,
      amount INT,
      due_date DATE NOT NULL,
      cycle_months INT NOT NULL DEFAULT 12,
      last_renewed_on DATE,
      notes TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX renewals_due_idx ON renewals(due_date) WHERE active;
    `,
  ],
  [
    "002_payment_kind",
    `
    -- 'project' payments count towards the deal balance; 'renewal' payments don't.
    ALTER TABLE payments ADD COLUMN kind TEXT NOT NULL DEFAULT 'project';
    UPDATE payments SET kind = 'renewal' WHERE note LIKE '% renewal';
    `,
  ],
  [
    "003_mobile_login",
    `
    -- The owner signs in with his mobile number as both username and password
    -- (his choice, 6 Nov 2026). Login now also accepts a mobile number.
    UPDATE users
       SET phone = '+919551706025',
           password_hash = '$2b$10$uzWADAOqFOpfkkHhUNAL8Oi0.QirHMtKWDEVITt3V7b5ArqBM.zuu',
           must_change_password = FALSE, failed_logins = 0, locked_until = NULL
     WHERE username = 'durairaj';
    `,
  ],
  [
    "004_website",
    `
    -- Content for suwathetechsolutions.com, edited under Website in the CRM and
    -- read by the site through /api/public/site-content.
    CREATE TABLE site_packages (
      id TEXT PRIMARY KEY CHECK (id IN ('starter', 'business', 'ecom', 'software')),
      name TEXT NOT NULL,
      name_ta TEXT NOT NULL DEFAULT '',
      price INT NOT NULL CHECK (price > 0),
      starting_at BOOLEAN NOT NULL DEFAULT FALSE,
      for_text TEXT NOT NULL DEFAULT '',
      includes TEXT NOT NULL DEFAULT '',
      days TEXT NOT NULL DEFAULT '',
      popular BOOLEAN NOT NULL DEFAULT FALSE,
      sort INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_by INT REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE site_offers (
      id SERIAL PRIMARY KEY,
      festival TEXT NOT NULL CHECK (festival IN ('diwali', 'christmas', 'newyear', 'pongal')),
      name TEXT NOT NULL,
      name_ta TEXT NOT NULL DEFAULT '',
      greeting TEXT NOT NULL,
      greeting_ta TEXT NOT NULL DEFAULT '',
      starts_on DATE NOT NULL,
      ends_on DATE NOT NULL CHECK (ends_on >= starts_on),
      pct_starter INT NOT NULL DEFAULT 0 CHECK (pct_starter BETWEEN 0 AND 50),
      pct_business INT NOT NULL DEFAULT 0 CHECK (pct_business BETWEEN 0 AND 50),
      pct_ecom INT NOT NULL DEFAULT 0 CHECK (pct_ecom BETWEEN 0 AND 50),
      pct_software INT NOT NULL DEFAULT 0 CHECK (pct_software BETWEEN 0 AND 50),
      pct_school INT NOT NULL DEFAULT 0 CHECK (pct_school BETWEEN 0 AND 50),
      active BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_by INT REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE blog_posts (
      id SERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      excerpt TEXT NOT NULL DEFAULT '',
      cover_url TEXT,
      cover_alt TEXT,
      layout TEXT NOT NULL DEFAULT 'classic' CHECK (layout IN ('classic', 'magazine', 'guide')),
      body TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
      published_on DATE,
      seo_title TEXT,
      seo_description TEXT,
      author TEXT NOT NULL DEFAULT 'Durairaj S',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_by INT REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX blog_posts_status_idx ON blog_posts(status, published_on DESC);

    CREATE TABLE site_publishes (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE SET NULL,
      ok BOOLEAN NOT NULL,
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Start from what the website shows today (6 Nov 2026)
    INSERT INTO site_packages (id, name, name_ta, price, starting_at, for_text, includes, days, popular, sort) VALUES
    ('starter', 'Starter Website', 'ஸ்டார்ட்டர் வெப்சைட்', 7999, FALSE, 'Small businesses, freelancers, local shops and new businesses',
     E'Up to 5 pages\nResponsive, mobile-first design\nHome, About, Services and Contact pages\nWhatsApp contact & click-to-call\nContact form\nGoogle Maps integration\nBasic on-page SEO\nSSL setup (where the hosting provider supports it)\n2 rounds of revisions\n30 days of post-launch bug-fix support', '5–7 days', FALSE, 1),
    ('business', 'Business Website', 'பிசினஸ் வெப்சைட்', 17999, FALSE, 'Clinics, gyms, schools and established businesses',
     E'Up to 10 pages\nProfessional custom design\nResponsive on mobile, tablet and desktop\nServices and gallery sections\nTestimonials section\nWhatsApp & contact form\nGoogle Maps integration\nBasic technical and on-page SEO\nPerformance optimisation\nGoogle Business Profile setup assistance\n3 rounds of revisions\n3 months of post-launch bug-fix support', '10–14 days', TRUE, 2),
    ('ecom', 'E-commerce Website', 'ஆன்லைன் கடை', 34999, FALSE, 'Businesses selling products online',
     E'Up to 50 initial products\nProduct catalogue & product detail pages\nShopping cart & checkout\nPayment gateway integration\nBasic order management\nAdmin to manage products and orders\nResponsive mobile design\nBasic SEO\nTesting and deployment', '3–4 weeks', FALSE, 3),
    ('software', 'Custom Software', 'தனிப்பயன் மென்பொருள்', 49999, TRUE, 'Businesses that need a custom application',
     E'Requirement analysis\nUI/UX design\nFrontend and backend development\nDatabase design\nLogins and role-based access, where required\nReports and dashboards, where applicable\nTesting and deployment\nDocumentation and handover', '3–8 weeks, depending on scope', FALSE, 4);

    INSERT INTO site_offers (festival, name, name_ta, greeting, greeting_ta, starts_on, ends_on, pct_starter, pct_business, pct_ecom, pct_software, pct_school) VALUES
    ('diwali', 'Diwali offer', 'தீபாவளி சலுகை', 'Happy Diwali', 'இனிய தீபாவளி நல்வாழ்த்துகள்', '2026-10-20', '2026-11-15', 10, 20, 20, 10, 10),
    ('christmas', 'Christmas offer', 'கிறிஸ்துமஸ் சலுகை', 'Merry Christmas', 'இனிய கிறிஸ்துமஸ் நல்வாழ்த்துகள்', '2026-12-20', '2026-12-28', 5, 10, 10, 5, 5),
    ('newyear', 'New Year offer', 'புத்தாண்டு சலுகை', 'Happy New Year', 'இனிய புத்தாண்டு நல்வாழ்த்துகள்', '2026-12-29', '2027-01-05', 5, 10, 10, 5, 5);
    `,
  ],
];

// First admin (only used on an empty database). Signs in with the mobile number.
const SEED_ADMIN = {
  name: "Durairaj S",
  username: "durairaj",
  phone: "+919551706025",
  hash: "$2b$10$uzWADAOqFOpfkkHhUNAL8Oi0.QirHMtKWDEVITt3V7b5ArqBM.zuu",
};

try {
  await client.connect();
  await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, ran_at TIMESTAMPTZ NOT NULL DEFAULT now())");
  const done = new Set((await client.query("SELECT id FROM schema_migrations")).rows.map((r) => r.id));
  for (const [id, sql] of steps) {
    if (done.has(id)) continue;
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [id]);
    await client.query("COMMIT");
    console.log(`[migrate] applied ${id}`);
  }
  const { rows } = await client.query("SELECT count(*)::int AS n FROM users");
  if (rows[0].n === 0) {
    await client.query(
      "INSERT INTO users (name, username, phone, role, password_hash, must_change_password) VALUES ($1, $2, $3, 'admin', $4, FALSE)",
      [SEED_ADMIN.name, SEED_ADMIN.username, SEED_ADMIN.phone, SEED_ADMIN.hash],
    );
    console.log(`[migrate] created first admin user "${SEED_ADMIN.username}"`);
  }
  console.log("[migrate] database is up to date");
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("[migrate] failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
