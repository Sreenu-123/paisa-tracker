
import { useEffect, useMemo, useState } from "react";
import {
  Wallet, LayoutDashboard, ArrowLeftRight, Plus, Search,
  ArrowUpRight, ArrowDownRight, IndianRupee, TrendingUp,
  Trash2, X, ChevronDown, PiggyBank, ReceiptText, Menu,
} from "lucide-react";
import { apiRequest, loginUser, signupUser } from "./api.js";
import "./index.css";

const categories = [
  "Food", "Transport", "Shopping", "Bills", "Health",
  "Education", "Entertainment", "Salary", "Freelance",
  "Investment", "Other",
];

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

const monthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export default function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("paisa-access-token")
  );
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    name: "", email: "", password: "",
  });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [activePage, setActivePage] = useState("Overview");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    amount: "",
    type: "expense",
    category: "Food",
    date: new Date().toLocaleDateString("en-CA"),
  });

  useEffect(() => {
    if (!token) {
      setUser(null);
      setTransactions([]);
      return;
    }

    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setApiError("");

      try {
        const [profile, items] = await Promise.all([
          apiRequest("/users/me", { token }),
          apiRequest("/transactions", { token }),
        ]);

        if (cancelled) return;

        setUser(profile);
        setTransactions(items.map((item) => ({
          ...item,
          amount: Number(item.amount),
          date: String(item.date).slice(0, 10),
        })));
      } catch (error) {
        if (cancelled) return;

        if (error.status === 401) {
          localStorage.removeItem("paisa-access-token");
          setToken(null);
        } else {
          setApiError(error.message || "Could not load your account.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [token]);

  
  async function handleAuth(event) {
    event.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      if (authMode === "signup") {
        await signupUser(authForm);

        // Signup successful: redirect to Sign In, don't auto-login.
        setAuthMode("login");
        setAuthForm({
          name: "",
          email: authForm.email.trim(),
          password: "",
        });
        setAuthError("");
        return;
      }

      const result = await loginUser(
        authForm.email.trim(),
        authForm.password
      );

      localStorage.setItem("paisa-access-token", result.access_token);
      setToken(result.access_token);

      setAuthForm({
        name: "",
        email: "",
        password: "",
      });
    } catch (error) {
      setAuthError(error.message || "Could not authenticate.");
    } finally {
      setAuthLoading(false);
    }
  }


  function logout() {
    localStorage.removeItem("paisa-access-token");
    setToken(null);
    setUser(null);
    setTransactions([]);
    setApiError("");
  }

  function openTransaction(type = "expense") {
    setForm({
      title: "",
      amount: "",
      type,
      category: type === "income" ? "Salary" : "Food",
      date: new Date().toLocaleDateString("en-CA"),
    });
    setFormError("");
    setShowForm(true);
  }

  async function saveTransaction(event) {
    event.preventDefault();

    const amount = Number(form.amount);

    if (!form.title.trim()) {
      setFormError("Enter a transaction description.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Enter an amount greater than zero.");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const item = await apiRequest("/transactions", {
        method: "POST",
        token,
        body: {
          title: form.title.trim(),
          amount,
          type: form.type,
          category: form.category,
          date: `${form.date}T12:00:00`,
        },
      });

      setTransactions((old) => [{
        ...item,
        amount: Number(item.amount),
        date: String(item.date).slice(0, 10),
      }, ...old]);

      setShowForm(false);
      setApiError("");
    } catch (error) {
      if (error.status === 401) {
        logout();
      } else {
        setFormError(error.message || "Could not save transaction.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function removeTransaction(id) {
    if (!window.confirm("Delete this transaction?")) return;

    try {
      await apiRequest(`/transactions/${id}`, {
        method: "DELETE",
        token,
      });

      setTransactions((old) => old.filter((item) => item.id !== id));
      setApiError("");
    } catch (error) {
      if (error.status === 401) logout();
      else setApiError(error.message || "Could not delete transaction.");
    }
  }

  function exportCSV() {
    const rows = [
      ["Description", "Type", "Category", "Date", "Amount"],
      ...transactions.map((item) => [
        item.title, item.type, item.category, item.date, item.amount,
      ]),
    ];

    const csv = rows.map((row) =>
      row.map((value) =>
        `"${String(value ?? "").replace(/"/g, '""')}"`
      ).join(",")
    ).join("\n");

    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "paisa-transactions.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const currentMonth = monthKey(new Date());

  const stats = useMemo(() => {
    const current = transactions.filter(
      (item) => item.date?.slice(0, 7) === currentMonth
    );
    const income = current
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + item.amount, 0);
    const expenses = current
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);
    const allIncome = transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + item.amount, 0);
    const allExpenses = transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      income,
      expenses,
      balance: allIncome - allExpenses,
      savingsRate: income ? ((income - expenses) / income) * 100 : 0,
    };
  }, [transactions, currentMonth]);

  const monthlyData = useMemo(() => {
    const now = new Date();

    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(
        now.getFullYear(), now.getMonth() - 5 + index, 1
      );
      const key = monthKey(date);
      const items = transactions.filter(
        (item) => item.date?.slice(0, 7) === key
      );

      return {
        label: date.toLocaleDateString("en-IN", { month: "short" }),
        income: items.filter((x) => x.type === "income")
          .reduce((sum, x) => sum + x.amount, 0),
        expenses: items.filter((x) => x.type === "expense")
          .reduce((sum, x) => sum + x.amount, 0),
      };
    });
  }, [transactions]);

  const breakdown = useMemo(() => {
    const totals = {};

    transactions
      .filter((item) =>
        item.type === "expense" &&
        item.date?.slice(0, 7) === currentMonth
      )
      .forEach((item) => {
        totals[item.category] = (totals[item.category] || 0) + item.amount;
      });

    return Object.entries(totals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, currentMonth]);

  const filteredTransactions = transactions
    .filter((item) => {
      const query = search.toLowerCase();
      const matchesSearch =
        item.title.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);

      const matchesFilter =
        filter === "All" ||
        (filter === "Income" && item.type === "income") ||
        (filter === "Expenses" && item.type === "expense");

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const maxChart = Math.max(
    1, ...monthlyData.flatMap((item) => [item.income, item.expenses])
  );

  if (!token) {
    return (
      <div className="auth-page">
        <section className="auth-card">
          <div className="auth-brand">
            <div className="brand-mark"><Wallet size={24} /></div>
            <div><h1>paisa<span>.</span></h1><p>PERSONAL FINANCE</p></div>
          </div>

          <span className="auth-eyebrow">YOUR MONEY, YOUR RULES</span>
          <h2>{authMode === "login" ? "Welcome back." : "Create your account."}</h2>
          <p className="auth-subtitle">
            {authMode === "login"
              ? "Sign in to access your finance dashboard."
              : "Start tracking every rupee."}
          </p>

          <form className="auth-form" onSubmit={handleAuth}>
            {authMode === "signup" && <>
              <label htmlFor="auth-name">FULL NAME</label>
              <input
                id="auth-name"
                className="form-input"
                value={authForm.name}
                onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                minLength={2}
                required
                autoComplete="name"
              />
            </>}

            <label htmlFor="auth-email">EMAIL ADDRESS</label>
            <input
              id="auth-email"
              className="form-input"
              type="email"
              value={authForm.email}
              onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
              required
              autoComplete="email"
            />

            <label htmlFor="auth-password">PASSWORD</label>
            <input
              id="auth-password"
              className="form-input"
              type="password"
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              minLength={8}
              required
              autoComplete={authMode === "login" ? "current-password" : "new-password"}
            />

            {authError && <p className="form-error">{authError}</p>}

            <button className="primary-button auth-submit" disabled={authLoading}>
              {authLoading ? "Please wait..." :
                authMode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="auth-switch">
            {authMode === "login" ? "New to Paisa?" : "Already have an account?"}
            {" "}
            <button type="button" onClick={() => {
              setAuthMode(authMode === "login" ? "signup" : "login");
              setAuthError("");
            }}>
              {authMode === "login" ? "Create account" : "Sign in"}
            </button>
          </p>
          <p className="auth-footnote"><Wallet size={14} /> Your own personal finance space.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {mobileMenu && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Wallet size={23} /></div>
          <div><h1>paisa<span>.</span></h1><p>PERSONAL FINANCE</p></div>
          <button className="icon-button mobile-close" onClick={() => setMobileMenu(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="nav-label">WORKSPACE</div>
        <nav className="navigation">
          {[
            ["Overview", LayoutDashboard],
            ["Transactions", ArrowLeftRight],
          ].map(([name, Icon]) => (
            <button
              key={name}
              className={`nav-item ${activePage === name ? "nav-active" : ""}`}
              onClick={() => { setActivePage(name); setMobileMenu(false); }}
            >
              <Icon size={19} />
              <span>{name}</span>
              {name === "Transactions" && (
                <span className="nav-count">{transactions.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-promo">
            <div className="promo-icon"><PiggyBank size={22} /></div>
            <h3>Small steps.</h3>
            <h3>Big savings.</h3>
            <p>Every transaction tells a story. Make yours count.</p>
          </div>
          <div className="profile">
            <div className="avatar">{(user?.name || "P")[0].toUpperCase()}</div>
            <div className="profile-info">
              <strong>{user?.name || "My Wallet"}</strong>
              <span>{user?.email || "Personal account"}</span>
            </div>
          </div>
          <button className="logout-button" onClick={logout}>Sign out</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button mobile-menu-button" onClick={() => setMobileMenu(true)}>
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            <span>Workspace</span><span className="breadcrumb-slash">/</span>
            <strong>{activePage}</strong>
          </div>
          <div className="topbar-actions">
            <span className="profile-icon">{(user?.name || "P")[0].toUpperCase()}</span>
            <button className="logout-button" onClick={logout}>Sign out</button>
          </div>
        </header>

        <div className="page-container">
          {apiError && <div className="api-notice">{apiError}</div>}

          <section className="page-heading">
            <div>
              <span className="eyebrow">YOUR FINANCIAL OVERVIEW</span>
              <h1>{activePage === "Overview" ? "Good to see you." : "Transactions"}</h1>
              <p>Here's what's happening with your money.</p>
            </div>
            <div className="heading-actions">
              <button className="export-button" onClick={exportCSV}>Export CSV</button>
              <button className="primary-button" onClick={() => openTransaction()}>
                <Plus size={17} /> Add transaction
              </button>
            </div>
          </section>

          {loading && <p className="loading-message">Loading your account...</p>}

          {activePage === "Overview" && <>
            <section className="stats-grid">
              <article className="stat-card balance-card">
                <div className="balance-top">
                  <span className="balance-label">Total balance</span>
                  <span className="balance-icon"><Wallet size={20} /></span>
                </div>
                <h2 className="balance-amount">{money(stats.balance)}</h2>
                <p className="balance-description">All-time income minus expenses</p>
                <div className="balance-footer">
                  <span className="balance-footer-label">Current balance</span>
                  <span className="balance-badge"><TrendingUp size={14} /> Tracking</span>
                </div>
              </article>

              <article className="stat-card">
                <div className="stat-top">
                  <span className="stat-label">Monthly income</span>
                  <span className="income-icon"><ArrowDownRight size={20} /></span>
                </div>
                <h2>{money(stats.income)}</h2>
                <p className="stat-description">Income this month</p>
              </article>

              <article className="stat-card">
                <div className="stat-top">
                  <span className="stat-label">Monthly expenses</span>
                  <span className="expense-icon"><ArrowUpRight size={20} /></span>
                </div>
                <h2>{money(stats.expenses)}</h2>
                <p className="stat-description">Expenses this month</p>
              </article>

              <article className="stat-card">
                <div className="stat-top">
                  <span className="stat-label">Savings rate</span>
                  <span className="savings-icon"><PiggyBank size={20} /></span>
                </div>
                <h2>{stats.savingsRate.toFixed(1)}%</h2>
                <p className="stat-description">Monthly income minus expenses</p>
              </article>
            </section>

            <section className="charts-grid">
              <article className="panel chart-panel">
                <div className="panel-header">
                  <div><h3>Cash flow</h3><p>Income vs expenses · last 6 months</p></div>
                  <span className="chart-period">6 months</span>
                </div>
                <div className="chart-legend">
                  <span className="legend-income">Income</span>
                  <span className="legend-expense">Expenses</span>
                </div>
                <div className="bar-chart">
                  {monthlyData.map((item) => (
                    <div className="bar-pair" key={item.label}>
                      <div className="bar-stack">
                        <div className="bar bar-income" style={{ height: `${Math.max(2, item.income / maxChart * 100)}%` }} title={`Income: ${money(item.income)}`} />
                        <div className="bar bar-expense" style={{ height: `${Math.max(2, item.expenses / maxChart * 100)}%` }} title={`Expenses: ${money(item.expenses)}`} />
                      </div>
                      <span className="chart-month">{item.label}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel breakdown-panel">
                <div className="panel-header">
                  <div><h3>Spending breakdown</h3><p>This month's expenses</p></div>
                </div>
                {breakdown.length === 0 ? (
                  <div className="empty-breakdown"><ReceiptText size={24} /><p>No expenses this month yet.</p></div>
                ) : (
                  <div className="breakdown-list">
                    {breakdown.map((item, index) => {
                      const total = breakdown.reduce((sum, x) => sum + x.amount, 0);
                      const percent = total ? item.amount / total * 100 : 0;
                      return (
                        <div className="breakdown-item" key={item.category}>
                          <div className="breakdown-item-top">
                            <span>{item.category}</span>
                            <strong>{money(item.amount)}</strong>
                          </div>
                          <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${percent}%`, background: ["#A78BFA", "#67E8F9", "#FBBF24", "#FB7185", "#4ADE80"][index % 5] }} />
                          </div>
                          <span className="breakdown-percent">{percent.toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            </section>
          </>}

          <section className="panel transactions-panel">
            <div className="panel-header">
              <div>
                <h3>{activePage === "Overview" ? "Recent transactions" : "All transactions"}</h3>
                <p>Your income and expenses</p>
              </div>
              <div className="transaction-controls">
                <div className="search-box">
                  <Search size={16} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." />
                  {search && <button className="clear-search" onClick={() => setSearch("")}><X size={14} /></button>}
                </div>
                <div className="filter-control">
                  <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                    <option>All</option><option>Income</option><option>Expenses</option>
                  </select>
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="empty-transactions">
                <div className="empty-icon"><ReceiptText size={24} /></div>
                <h4>{transactions.length ? "No matching transactions" : "No transactions yet"}</h4>
                <p>{transactions.length ? "Try changing the search or filter." : "Add a transaction to get started."}</p>
                {!transactions.length && <button className="primary-button" onClick={() => openTransaction()}><Plus size={16} /> Add transaction</button>}
              </div>
            ) : (
              <div className="table-wrap">
                <table className="transactions-table">
                  <thead><tr><th>TRANSACTION</th><th>CATEGORY</th><th>DATE</th><th>AMOUNT</th><th /></tr></thead>
                  <tbody>
                    {(activePage === "Overview" ? filteredTransactions.slice(0, 5) : filteredTransactions).map((item) => (
                      <tr key={item.id}>
                        <td><div className="transaction-name">
                          <span className={`transaction-type-icon ${item.type === "income" ? "transaction-income" : "transaction-expense"}`}>
                            {item.type === "income" ? <ArrowDownRight size={17} /> : <ArrowUpRight size={17} />}
                          </span>
                          <div><strong>{item.title}</strong><span>{item.type}</span></div>
                        </div></td>
                        <td><span className="category-pill">{item.category}</span></td>
                        <td className="date-cell">{new Date(`${item.date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                        <td className={`amount-cell ${item.type === "income" ? "positive-text" : "negative-text"}`}>
                          {item.type === "income" ? "+" : "−"}{money(item.amount)}
                        </td>
                        <td><button className="delete-button" onClick={() => removeTransaction(item.id)} aria-label="Delete transaction"><Trash2 size={16} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="table-footer">
              <span>{filteredTransactions.length} transaction(s)</span>
              {activePage === "Overview" && filteredTransactions.length > 5 && (
                <button className="text-button" onClick={() => setActivePage("Transactions")}>See all transactions</button>
              )}
            </div>
          </section>

          <footer className="page-footer">
            <span>© {new Date().getFullYear()} Paisa</span>
            <span>Every rupee counts.</span>
          </footer>
        </div>
      </main>

      {showForm && (
        <div className="modal-backdrop" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setShowForm(false);
        }}>
          <section className="transaction-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div><span className="modal-eyebrow">YOUR FINANCES</span><h2>Add transaction</h2></div>
              <button className="icon-button" onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>

            <form onSubmit={saveTransaction}>
              <label className="form-label">TRANSACTION TYPE</label>
              <div className="type-toggle">
                <button type="button" className={form.type === "expense" ? "type-selected expense-selected" : ""} onClick={() => setForm({ ...form, type: "expense", category: "Food" })}><ArrowUpRight size={17} /> Expense</button>
                <button type="button" className={form.type === "income" ? "type-selected income-selected" : ""} onClick={() => setForm({ ...form, type: "income", category: "Salary" })}><ArrowDownRight size={17} /> Income</button>
              </div>

              <label className="form-label" htmlFor="transaction-title">DESCRIPTION</label>
              <input id="transaction-title" className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={150} required />

              <label className="form-label" htmlFor="transaction-amount">AMOUNT (₹)</label>
              <div className="amount-input-wrap"><IndianRupee size={18} /><input id="transaction-amount" className="form-input amount-input" type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>

              <div className="form-two-column">
                <div><label className="form-label" htmlFor="transaction-category">CATEGORY</label>
                  <select id="transaction-category" className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {categories.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </div>
                <div><label className="form-label" htmlFor="transaction-date">DATE</label>
                  <input id="transaction-date" className="form-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </div>
              </div>

              {formError && <p className="form-error">{formError}</p>}
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="primary-button" disabled={saving}><Plus size={17} /> {saving ? "Saving..." : "Save transaction"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
