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
];

// First admin. Temporary password; the app forces a change on first login.
const SEED_ADMIN = {
  name: "Durairaj S",
  username: "durairaj",
  phone: "+919551706025",
  hash: "$2b$10$ss0OBq5pdf4r0r0nIBxPGunUuZZYdUC1NZK2OK7cCE0Wwg29EYOya",
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
      "INSERT INTO users (name, username, phone, role, password_hash, must_change_password) VALUES ($1, $2, $3, 'admin', $4, TRUE)",
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
