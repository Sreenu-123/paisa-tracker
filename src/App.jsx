
import { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  LayoutDashboard,
  ArrowLeftRight,
  ChartNoAxesCombined,
  Settings,
  Plus,
  Search,
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  TrendingUp,
  Trash2,
  X,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  PiggyBank,
  ReceiptText,
  Menu,
} from "lucide-react";
import "./index.css";

const STORAGE_KEY = "paisa-tracker-transactions";

const categories = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Health",
  "Education",
  "Entertainment",
  "Salary",
  "Freelance",
  "Investment",
  "Other",
];

const money = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

function readTransactions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function App() {
  const [transactions, setTransactions] = useState(readTransactions);
  const [activePage, setActivePage] = useState("Overview");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState({
    title: "",
    amount: "",
    type: "expense",
    category: "Food",
    date: new Date().toLocaleDateString("en-CA"),
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch {
      setFormError("Could not save data. Check your browser storage.");
    }
  }, [transactions]);

  const currentMonth = getMonthKey(new Date());

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

    const totalIncome = transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + item.amount, 0);

    const totalExpenses = transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      income,
      expenses,
      balance: totalIncome - totalExpenses,
      savings: income - expenses,
      savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0,
    };
  }, [transactions, currentMonth]);

  const visibleTransactions = useMemo(() => {
    return [...transactions]
      .filter((item) => {
        const matchesSearch =
          item.title.toLowerCase().includes(search.toLowerCase()) ||
          item.category.toLowerCase().includes(search.toLowerCase());

        const matchesFilter =
          filter === "All" ||
          (filter === "Income" && item.type === "income") ||
          (filter === "Expenses" && item.type === "expense");

        const matchesPage =
          activePage !== "Transactions" ||
          true;

        return matchesSearch && matchesFilter && matchesPage;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  }, [transactions, search, filter, activePage]);

  const monthlyData = useMemo(() => {
    const now = new Date();

    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      const key = getMonthKey(date);

      const income = transactions
        .filter((item) => item.date?.slice(0, 7) === key && item.type === "income")
        .reduce((sum, item) => sum + item.amount, 0);

      const expenses = transactions
        .filter((item) => item.date?.slice(0, 7) === key && item.type === "expense")
        .reduce((sum, item) => sum + item.amount, 0);

      return {
        key,
        label: date.toLocaleDateString("en-IN", { month: "short" }),
        income,
        expenses,
      };
    });
  }, [transactions]);

  const maxChartValue = Math.max(
    ...monthlyData.flatMap((item) => [item.income, item.expenses]),
    1
  );

  const expenseBreakdown = useMemo(() => {
    const totals = {};

    transactions
      .filter(
        (item) =>
          item.type === "expense" &&
          item.date?.slice(0, 7) === currentMonth
      )
      .forEach((item) => {
        totals[item.category] = (totals[item.category] || 0) + item.amount;
      });

    return Object.entries(totals)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, currentMonth]);

  const categoryColors = [
    "#A78BFA",
    "#67E8F9",
    "#FBBF24",
    "#FB7185",
    "#4ADE80",
    "#60A5FA",
    "#F472B6",
  ];

  function openNewTransaction(type = "expense") {
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

  function handleSubmit(event) {
    event.preventDefault();

    const amount = Number(form.amount);

    if (!form.title.trim()) {
      setFormError("Please enter a transaction description.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Enter an amount greater than zero.");
      return;
    }

    if (!form.date || Number.isNaN(Date.parse(form.date))) {
      setFormError("Please choose a valid date.");
      return;
    }

    const transaction = {
      id: Date.now(),
      title: form.title.trim(),
      amount: Math.round(amount * 100) / 100,
      type: form.type,
      category: form.category,
      date: form.date,
    };

    setTransactions((previous) => [...previous, transaction]);
    setShowForm(false);
    setFormError("");
  }

  function deleteTransaction(id) {
    const confirmed = window.confirm("Delete this transaction?");
    if (confirmed) {
      setTransactions((previous) =>
        previous.filter((item) => item.id !== id)
      );
    }
  }

  function formatDate(date) {
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function exportCSV() {
    const headers = ["Description", "Type", "Category", "Date", "Amount"];
    const rows = transactions.map((item) => [
      item.title,
      item.type,
      item.category,
      item.date,
      item.amount,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    );

    const link = document.createElement("a");
    link.href = url;
    link.download = "paisa-tracker-transactions.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const navigation = [
    { name: "Overview", icon: LayoutDashboard },
    { name: "Transactions", icon: ArrowLeftRight },
  ];

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
          <div className="brand-mark">
            <Wallet size={23} strokeWidth={2.2} />
          </div>
          <div>
            <h1>paisa<span>.</span></h1>
            <p>PERSONAL FINANCE</p>
          </div>
          <button
            className="icon-button mobile-close"
            onClick={() => setMobileMenu(false)}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>

        <div className="nav-label">WORKSPACE</div>
        <nav className="navigation">
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${activePage === name ? "nav-active" : ""}`}
              onClick={() => {
                setActivePage(name);
                setMobileMenu(false);
              }}
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
            <div className="avatar">P</div>
            <div className="profile-info">
              <strong>My Wallet</strong>
              <span>Personal account</span>
            </div>
            <CircleDollarSign size={20} className="profile-icon" />
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu-button"
              onClick={() => setMobileMenu(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{activePage}</strong>
          </div>

          <div className="topbar-right">
            <span className="today-label">
              <CalendarDays size={15} />
              {new Date().toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <div className="topbar-divider" />
            <div className="avatar top-avatar">P</div>
          </div>
        </header>

        <div className="page-container">
          <section className="welcome-row">
            <div>
              <div className="eyebrow">
                <span className="status-dot" />
                YOUR MONEY, YOUR RULES
              </div>
              <h2>
                {activePage === "Overview"
                  ? "Financial overview"
                  : "Your transactions"}
                <span className="heading-period">.</span>
              </h2>
              <p className="welcome-subtitle">
                {activePage === "Overview"
                  ? "Here's what's happening with your money."
                  : "Every rupee, accounted for."}
              </p>
            </div>
            <button
              className="primary-button"
              onClick={() => openNewTransaction()}
            >
              <Plus size={18} />
              Add transaction
            </button>
          </section>

          {activePage === "Overview" && (
            <>
              <section className="balance-card">
                <div className="balance-glow" />
                <div className="balance-top">
                  <div className="balance-label">
                    <span className="balance-icon"><Wallet size={19} /></span>
                    TOTAL BALANCE
                  </div>
                  <span className="balance-badge">
                    <TrendingUp size={14} />
                    Live overview
                  </span>
                </div>
                <div className="balance-amount">{money(stats.balance)}</div>
                <p className="balance-description">
                  Net total of all recorded income and expenses
                </p>
                <div className="balance-footer">
                  <div>
                    <span className="balance-footer-label">THIS MONTH'S SAVINGS</span>
                    <strong className={stats.savings < 0 ? "negative-text" : ""}>
                      {money(stats.savings)}
                    </strong>
                  </div>
                  <div className="savings-rate">
                    <span>Income retained</span>
                    <strong>{stats.savingsRate.toFixed(1)}%</strong>
                  </div>
                </div>
              </section>

              <section className="stats-grid">
                <article className="stat-card">
                  <div className="stat-top">
                    <span className="stat-icon income-icon"><ArrowDownRight size={20} /></span>
                    <span className="stat-period">THIS MONTH</span>
                  </div>
                  <p className="stat-title">Total income</p>
                  <h3>{money(stats.income)}</h3>
                  <p className="stat-footnote"><span className="positive-dot" /> Money coming in</p>
                </article>

                <article className="stat-card">
                  <div className="stat-top">
                    <span className="stat-icon expense-icon"><ArrowUpRight size={20} /></span>
                    <span className="stat-period">THIS MONTH</span>
                  </div>
                  <p className="stat-title">Total expenses</p>
                  <h3>{money(stats.expenses)}</h3>
                  <p className="stat-footnote"><span className="expense-dot" /> Money going out</p>
                </article>

                <article className="stat-card">
                  <div className="stat-top">
                    <span className="stat-icon savings-icon"><PiggyBank size={20} /></span>
                    <span className="stat-period">THIS MONTH</span>
                  </div>
                  <p className="stat-title">Net savings</p>
                  <h3 className={stats.savings < 0 ? "negative-text" : ""}>{money(stats.savings)}</h3>
                  <p className="stat-footnote"><span className="savings-dot" /> Income minus expenses</p>
                </article>
              </section>

              <section className="charts-grid">
                <article className="panel chart-panel">
                  <div className="panel-header">
                    <div>
                      <h3>Cash flow</h3>
                      <p>Income vs expenses over six months</p>
                    </div>
                    <span className="chart-period">6 MONTHS <ChevronDown size={14} /></span>
                  </div>

                  <div className="chart-legend">
                    <span><i className="legend-income" /> Income</span>
                    <span><i className="legend-expense" /> Expenses</span>
                  </div>

                  <div className="bar-chart">
                    {[0, 1, 2, 3].map((line) => (
                      <div
                        key={line}
                        className="chart-gridline"
                        style={{ top: `${line * 33.33}%` }}
                      />
                    ))}
                    {monthlyData.map((month) => (
                      <div className="chart-month" key={month.key}>
                        <div className="bar-pair">
                          <div
                            className="bar bar-income"
                            title={`Income: ${money(month.income)}`}
                            style={{
                              height: `${Math.max((month.income / maxChartValue) * 100, 2)}%`,
                            }}
                          />
                          <div
                            className="bar bar-expense"
                            title={`Expenses: ${money(month.expenses)}`}
                            style={{
                              height: `${Math.max((month.expenses / maxChartValue) * 100, 2)}%`,
                            }}
                          />
                        </div>
                        <span className="month-label">{month.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="chart-note">Amounts are calculated from your recorded transactions.</p>
                </article>

                <article className="panel breakdown-panel">
                  <div className="panel-header">
                    <div>
                      <h3>Spending breakdown</h3>
                      <p>Where your money goes</p>
                    </div>
                    <span className="breakdown-icon"><ChartNoAxesCombined size={19} /></span>
                  </div>

                  {expenseBreakdown.length === 0 ? (
                    <div className="empty-breakdown">
                      <div className="empty-icon"><ReceiptText size={24} /></div>
                      <strong>No expenses yet</strong>
                      <p>Add an expense to see your spending categories.</p>
                    </div>
                  ) : (
                    <div className="breakdown-list">
                      {expenseBreakdown.slice(0, 6).map((item, index) => {
                        const total = expenseBreakdown.reduce(
                          (sum, entry) => sum + entry.amount,
                          0
                        );
                        const percent = total > 0 ? (item.amount / total) * 100 : 0;

                        return (
                          <div className="breakdown-item" key={item.name}>
                            <div className="breakdown-item-top">
                              <span>
                                <i style={{ background: categoryColors[index % categoryColors.length] }} />
                                {item.name}
                              </span>
                              <strong>{money(item.amount)}</strong>
                            </div>
                            <div className="progress-track">
                              <div
                                className="progress-fill"
                                style={{
                                  width: `${percent}%`,
                                  background: categoryColors[index % categoryColors.length],
                                }}
                              />
                            </div>
                            <span className="breakdown-percent">{percent.toFixed(1)}% of expenses</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>
              </section>
            </>
          )}

          <section className="panel transactions-panel">
            <div className="panel-header transactions-heading">
              <div>
                <h3>{activePage === "Overview" ? "Recent transactions" : "All transactions"}</h3>
                <p>
                  {activePage === "Overview"
                    ? "Keep track of where every rupee goes."
                    : `${transactions.length} transaction${transactions.length === 1 ? "" : "s"} recorded`}
                </p>
              </div>
              <div className="transaction-actions">
                {transactions.length > 0 && (
                  <button className="secondary-button export-button" onClick={exportCSV}>
                    Export CSV
                  </button>
                )}
                {activePage === "Overview" && (
                  <button
                    className="text-button"
                    onClick={() => setActivePage("Transactions")}
                  >
                    View all <ArrowUpRight size={15} />
                  </button>
                )}
              </div>
            </div>

            <div className="table-toolbar">
              <div className="search-box">
                <Search size={17} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search transactions..."
                  aria-label="Search transactions"
                />
                {search && (
                  <button className="clear-search" onClick={() => setSearch("")} aria-label="Clear search">
                    <X size={15} />
                  </button>
                )}
              </div>
              <div className="filter-control">
                <span>Type:</span>
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  aria-label="Filter transaction type"
                >
                  <option>All</option>
                  <option>Income</option>
                  <option>Expenses</option>
                </select>
                <ChevronDown size={14} />
              </div>
            </div>

            {visibleTransactions.length === 0 ? (
              <div className="empty-transactions">
                <div className="empty-icon"><ReceiptText size={26} /></div>
                <h4>{transactions.length === 0 ? "Your story starts here" : "No transactions found"}</h4>
                <p>
                  {transactions.length === 0
                    ? "Add your first income or expense to bring your dashboard to life."
                    : "Try another search term or change the transaction filter."}
                </p>
                {transactions.length === 0 && (
                  <button className="primary-button" onClick={() => openNewTransaction()}>
                    <Plus size={17} /> Add your first transaction
                  </button>
                )}
              </div>
            ) : (
              <div className="table-scroll">
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th>TRANSACTION</th>
                      <th>CATEGORY</th>
                      <th>DATE</th>
                      <th>AMOUNT</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {(activePage === "Overview"
                      ? visibleTransactions.slice(0, 5)
                      : visibleTransactions
                    ).map((item, index) => (
                      <tr key={item.id}>
                        <td>
                          <div className="transaction-name">
                            <span className={`transaction-symbol ${item.type}`}>
                              {item.type === "income" ? (
                                <ArrowDownRight size={18} />
                              ) : (
                                <ArrowUpRight size={18} />
                              )}
                            </span>
                            <div>
                              <strong>{item.title}</strong>
                              <span>{item.type === "income" ? "Income" : "Expense"}</span>
                            </div>
                          </div>
                        </td>
                        <td><span className="category-pill">{item.category}</span></td>
                        <td className="date-cell">{formatDate(item.date)}</td>
                        <td className={`amount-cell ${item.type}`}>
                          {item.type === "income" ? "+" : "−"}{money(item.amount)}
                        </td>
                        <td>
                          <button
                            className="delete-button"
                            onClick={() => deleteTransaction(item.id)}
                            aria-label={`Delete ${item.title}`}
                            title="Delete transaction"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {activePage === "Overview" && visibleTransactions.length > 5 && (
              <button className="table-footer" onClick={() => setActivePage("Transactions")}>
                View all {visibleTransactions.length} matching transactions <ArrowUpRight size={15} />
              </button>
            )}
          </section>

          <footer className="page-footer">
            <span>© {new Date().getFullYear()} paisa. Built for better money habits.</span>
            <span><span className="footer-dot" /> Data stored locally on this device</span>
          </footer>
        </div>
      </main>

      {showForm && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowForm(false);
          }}
        >
          <section className="transaction-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-header">
              <div>
                <span className="modal-eyebrow">TRANSACTION DETAILS</span>
                <h2 id="modal-title">Add transaction</h2>
                <p>Record where your money comes from or goes.</p>
              </div>
              <button className="icon-button" onClick={() => setShowForm(false)} aria-label="Close dialog">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label className="form-label">TRANSACTION TYPE</label>
              <div className="type-toggle">
                <button
                  type="button"
                  className={form.type === "expense" ? "type-selected expense-selected" : ""}
                  onClick={() => setForm({ ...form, type: "expense", category: "Food" })}
                >
                  <ArrowUpRight size={17} /> Expense
                </button>
                <button
                  type="button"
                  className={form.type === "income" ? "type-selected income-selected" : ""}
                  onClick={() => setForm({ ...form, type: "income", category: "Salary" })}
                >
                  <ArrowDownRight size={17} /> Income
                </button>
              </div>

              <label className="form-label" htmlFor="transaction-title">DESCRIPTION</label>
              <input
                id="transaction-title"
                className="form-input"
                placeholder="e.g. Monthly salary, groceries..."
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                maxLength={100}
                autoFocus
              />

              <label className="form-label" htmlFor="transaction-amount">AMOUNT (₹)</label>
              <div className="amount-input-wrap">
                <IndianRupee size={18} />
                <input
                  id="transaction-amount"
                  className="form-input amount-input"
                  type="number"
                  placeholder="0.00"
                  min="0.01"
                  max="1000000000000"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) => setForm({ ...form, amount: event.target.value })}
                />
              </div>

              <div className="form-two-column">
                <div>
                  <label className="form-label" htmlFor="transaction-category">CATEGORY</label>
                  <select
                    id="transaction-category"
                    className="form-input"
                    value={form.category}
                    onChange={(event) => setForm({ ...form, category: event.target.value })}
                  >
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" htmlFor="transaction-date">DATE</label>
                  <input
                    id="transaction-date"
                    className="form-input"
                    type="date"
                    value={form.date}
                    onChange={(event) => setForm({ ...form, date: event.target.value })}
                  />
                </div>
              </div>

              {formError && <p className="form-error">{formError}</p>}

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  <Plus size={17} /> Save transaction
                </button>
              </div>
              <p className="privacy-note"><Wallet size={14} /> Saved locally in this browser. No account needed.</p>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
