/* Calm Material 3 / Material You inspired styling for Hardee's Dashboard
   Mobile-first, touch-friendly, and Chromebook/tablet friendly.
*/

:root {
  color-scheme: light;

  --primary: #2f5f73;
  --on-primary: #ffffff;
  --primary-container: #d7ecf5;
  --on-primary-container: #061f2a;

  --secondary-container: #dbe5ef;
  --on-secondary-container: #111c24;

  --background: #f6f8fb;
  --surface: #f6f8fb;
  --surface-lowest: #ffffff;
  --surface-low: #eef3f7;
  --surface-mid: #e8eef3;
  --surface-high: #dfe7ed;
  --on-surface: #111820;
  --on-surface-variant: #52616b;
  --outline: #748894;
  --outline-variant: #ccd9e1;

  --error: #ba1a1a;
  --on-error: #ffffff;

  --good-bg: #dcefdc;
  --good-fg: #0f5f28;
  --warning-bg: #f7edcf;
  --warning-fg: #5f4a13;
  --bad-bg: #f8d8d6;
  --bad-fg: #93000a;
  --info-bg: #d7eaf7;
  --info-fg: #24536a;

  --radius-sm: 12px;
  --radius-md: 18px;
  --radius-lg: 24px;
  --radius-xl: 32px;
  --pill: 999px;

  --shadow-1: 0 1px 2px rgba(17, 24, 32, 0.10), 0 1px 3px rgba(17, 24, 32, 0.08);
  --shadow-2: 0 2px 6px rgba(17, 24, 32, 0.12), 0 6px 16px rgba(17, 24, 32, 0.08);

  --content-max-width: 1120px;
  --touch-target: 48px;
}

* {
  box-sizing: border-box;
}

html {
  min-height: 100%;
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  min-height: 100%;
  font-family:
    "Roboto",
    "Google Sans",
    "Noto Sans",
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Arial,
    sans-serif;
  background:
    radial-gradient(circle at top left, rgba(215, 236, 245, 0.95), transparent 34rem),
    linear-gradient(180deg, #f6f8fb 0%, #edf3f7 100%);
  color: var(--on-surface);
}

button,
input,
select,
textarea {
  font: inherit;
}

button,
select,
input[type="checkbox"],
input[type="file"] {
  cursor: pointer;
}

button:focus-visible,
input:focus-visible,
select:focus-visible,
a:focus-visible {
  outline: 3px solid rgba(47, 95, 115, 0.26);
  outline-offset: 3px;
}

/* App shell */

.app {
  width: min(100%, var(--content-max-width));
  margin: 0 auto;
  padding: 16px;
}

h1 {
  margin: 0;
  color: var(--on-surface);
  font-size: clamp(1.85rem, 7vw, 3rem);
  line-height: 1.04;
  letter-spacing: -0.04em;
  font-weight: 900;
}

.subtitle {
  margin: 8px 0 0;
  color: var(--on-surface-variant);
  font-size: 1rem;
  line-height: 1.35;
}

.app > h1:first-child {
  padding-top: 6px;
}

/* Sticky Material-style tabs */

.tab-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  margin: 18px -16px 0;
  padding: 10px 16px 12px;
  background: rgba(255, 248, 246, 0.82);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  scrollbar-width: none;
}

.tab-bar::-webkit-scrollbar {
  display: none;
}

.tab-button {
  min-height: 44px;
  border: 1px solid var(--outline-variant);
  background: rgba(255, 255, 255, 0.72);
  color: var(--on-surface-variant);
  border-radius: var(--pill);
  padding: 10px 18px;
  font-weight: 800;
  white-space: nowrap;
  box-shadow: none;
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease,
    box-shadow 160ms ease, transform 160ms ease;
}

.tab-button:hover {
  background: var(--surface-low);
  box-shadow: var(--shadow-1);
  transform: translateY(-1px);
}

.tab-button.active {
  background: var(--primary);
  color: var(--on-primary);
  border-color: var(--primary);
  box-shadow: var(--shadow-2);
}

/* Cards */

.card {
  position: relative;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.84);
  border: 1px solid rgba(228, 189, 183, 0.72);
  border-radius: var(--radius-lg);
  padding: 18px;
  margin-top: 16px;
  box-shadow: var(--shadow-1);
  text-align: left;
}

.card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 4px;
  background: linear-gradient(90deg, var(--primary), #5f8da0, #8fb4c6);
  opacity: 0.9;
}

.card h2 {
  margin: 0 0 14px;
  color: var(--on-surface);
  font-size: clamp(1.18rem, 4vw, 1.55rem);
  line-height: 1.18;
  letter-spacing: -0.02em;
  font-weight: 900;
}

.card h3 {
  color: var(--on-surface);
  letter-spacing: -0.015em;
}

.card p {
  line-height: 1.45;
}

/* Forms */

label {
  display: block;
  margin-top: 16px;
  color: var(--on-surface);
  font-weight: 850;
  letter-spacing: -0.01em;
}

input,
select {
  display: block;
  width: 100%;
  min-height: var(--touch-target);
  margin-top: 8px;
  border: 1px solid var(--outline-variant);
  border-radius: var(--radius-sm);
  background: var(--surface-lowest);
  color: var(--on-surface);
  padding: 11px 14px;
  font-size: 16px;
  box-shadow: inset 0 0 0 1px transparent;
  transition: border-color 150ms ease, box-shadow 150ms ease, background 150ms ease;
}

input:hover,
select:hover {
  border-color: var(--outline);
}

input:focus,
select:focus {
  border-color: var(--primary);
  box-shadow: inset 0 0 0 1px var(--primary);
  outline: none;
}

input[type="file"] {
  padding: 10px;
  background: var(--surface-low);
}

input[type="checkbox"] {
  width: 22px;
  height: 22px;
  min-height: auto;
  margin: 0;
  accent-color: var(--primary);
}

.upload-grid {
  display: grid;
  gap: 14px;
}

.form-row {
  display: grid;
  gap: 8px;
  margin-top: 16px;
}

.form-row label {
  margin-top: 0;
}

.form-row input,
.form-row select {
  max-width: none;
}

.time-select-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 96px;
  gap: 8px;
}

.time-select-row select:first-child,
.time-select-row select:last-child {
  width: 100%;
}

/* Buttons */

button,
.secondary-button,
.danger-button {
  min-height: 44px;
  border-radius: var(--pill);
  border: none;
  padding: 10px 18px;
  font-weight: 850;
  letter-spacing: 0.01em;
  touch-action: manipulation;
  transition: background 150ms ease, box-shadow 150ms ease, transform 150ms ease,
    border-color 150ms ease;
}

.secondary-button {
  width: fit-content;
  margin-top: 8px;
  background: var(--secondary-container);
  color: var(--on-secondary-container);
  border: 1px solid transparent;
  box-shadow: none;
}

.secondary-button:hover {
  background: #cfe1ea;
  box-shadow: var(--shadow-1);
  transform: translateY(-1px);
}

.secondary-button:active,
.tab-button:active,
.danger-button:active {
  transform: translateY(0);
  box-shadow: none;
}

.danger-button {
  width: fit-content;
  max-width: 260px;
  margin-top: 16px;
  background: var(--error);
  color: var(--on-error);
  box-shadow: var(--shadow-1);
}

.danger-button:hover {
  background: #93000a;
  box-shadow: var(--shadow-2);
  transform: translateY(-1px);
}

.sync-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

/* Status / pills */

.status-line {
  margin-top: 12px;
  color: var(--on-surface-variant);
  font-weight: 650;
}

.file-status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.file-pill,
.status {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  justify-content: center;
  border-radius: var(--pill);
  padding: 6px 12px;
  font-weight: 850;
  font-size: 0.88rem;
  line-height: 1;
}

.file-pill {
  border: 1px solid var(--outline-variant);
  background: var(--surface-low);
  color: var(--on-surface-variant);
}

.file-pill.loaded,
.status.good {
  background: var(--good-bg);
  border-color: rgba(15, 95, 40, 0.24);
  color: var(--good-fg);
}

.status.heavy {
  background: var(--warning-bg);
  color: var(--warning-fg);
}

.status.short {
  background: var(--bad-bg);
  color: var(--bad-fg);
}

.warning-line {
  margin-top: 12px;
  color: var(--warning-fg);
  font-weight: 800;
  background: var(--warning-bg);
  border-left: 5px solid #c49a21;
  padding: 12px 14px;
  border-radius: var(--radius-md);
}

/* Tables */

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin-top: 12px;
  overflow: hidden;
  border: 1px solid var(--outline-variant);
  border-radius: var(--radius-md);
  background: var(--surface-lowest);
}

th,
td {
  border-bottom: 1px solid var(--outline-variant);
  text-align: left;
  padding: 12px;
  vertical-align: top;
}

th {
  background: var(--surface-mid);
  color: var(--on-surface);
  font-weight: 900;
}

tr:last-child td {
  border-bottom: none;
}

/* Labor dashboard */

.hour-card-list,
.upcoming-list {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.hour-card,
.upcoming-row,
.pace-grid div {
  border: 1px solid var(--outline-variant);
  border-radius: var(--radius-md);
  background: var(--surface-lowest);
  box-shadow: none;
}

.hour-card {
  padding: 14px;
}

.hour-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.hour-card-top h3 {
  margin: 0;
  font-size: 1.05rem;
}

.hour-stats {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-top: 12px;
}

.hour-stats div {
  background: var(--surface-low);
  border-radius: var(--radius-sm);
  padding: 12px;
}

.hour-stats strong,
.pace-grid strong {
  display: block;
  color: var(--on-surface);
  font-size: 1.28rem;
  line-height: 1.1;
}

.hour-stats span,
.pace-grid span,
.upcoming-row span {
  display: block;
  margin-top: 4px;
  color: var(--on-surface-variant);
  font-size: 0.86rem;
  line-height: 1.25;
}

.working-list {
  margin-bottom: 0;
}

.pace-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin-top: 16px;
}

.pace-grid div {
  padding: 14px;
}

.recommendation {
  margin-top: 16px;
  border-radius: var(--radius-lg);
  padding: 16px;
  border: 1px solid transparent;
  box-shadow: none;
}

.recommendation h3 {
  margin-top: 0;
}

.recommendation p {
  margin-bottom: 0;
}

.recommendation.busy {
  background: var(--info-bg);
  color: var(--info-fg);
}

.recommendation.normal {
  background: var(--good-bg);
  color: var(--good-fg);
}

.recommendation.slow {
  background: var(--warning-bg);
  color: var(--warning-fg);
}

.upcoming-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  align-items: center;
  padding: 14px;
}

.upcoming-row strong {
  display: block;
  color: var(--on-surface);
}

.labor-position-card {
  border-radius: var(--radius-lg);
  padding: 16px;
  border: 1px solid transparent;
}

.labor-position-card.good {
  background: var(--good-bg);
  border-color: rgba(15, 95, 40, 0.22);
}

.labor-position-card.warning {
  background: var(--warning-bg);
  border-color: rgba(109, 80, 0, 0.22);
}

.labor-position-card.bad {
  background: var(--bad-bg);
  border-color: rgba(147, 0, 10, 0.22);
}

.labor-position-card.good strong,
.labor-position-card.warning strong,
.labor-position-card.bad strong {
  color: var(--on-surface);
}

/* Employee / Sparkling Clean */

.employee-list {
  margin: 12px 0 0;
  padding-left: 20px;
}

.employee-list li {
  padding: 7px 0;
  font-weight: 750;
}

.cleaning-duty-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  align-items: center;
  margin-top: 10px;
  padding: 14px;
  border: 1px solid var(--outline-variant);
  border-left: 7px solid transparent;
  border-radius: var(--radius-md);
  background: var(--surface-lowest);
  box-shadow: none;
  transition: background 150ms ease, border-color 150ms ease, box-shadow 150ms ease,
    transform 150ms ease;
}

.cleaning-duty-row:hover {
  box-shadow: var(--shadow-1);
  transform: translateY(-1px);
}

.cleaning-duty-row:last-child {
  border-bottom: 1px solid var(--outline-variant);
}

.cleaning-duty-row strong {
  color: var(--on-surface);
  font-size: 1rem;
  letter-spacing: -0.01em;
}

.cleaning-duty-row span {
  display: block;
  margin-top: 4px;
  color: var(--on-surface-variant);
  font-size: 0.92rem;
  line-height: 1.32;
}

.cleaning-duty-row select {
  margin-top: 0;
}

.cleaning-duty-row.assigned {
  background: #f8f0d8;
  border-color: rgba(227, 177, 0, 0.36);
  border-left-color: #c49a21;
}

.cleaning-duty-row.done {
  background: #e8f6e8;
  border-color: rgba(15, 95, 40, 0.26);
  border-left-color: #1f8f41;
}

.done-check {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: var(--touch-target);
  color: var(--on-surface);
  font-weight: 850;
}

.cleaning-status {
  display: inline-flex;
  width: fit-content;
  min-height: 28px;
  align-items: center;
  margin-top: 8px;
  border-radius: var(--pill);
  padding: 5px 10px;
  background: var(--surface-mid);
  color: var(--on-surface-variant);
  font-weight: 850;
  font-size: 0.82rem;
}

.cleaning-status.assigned {
  background: var(--warning-bg);
  color: var(--warning-fg);
}

.cleaning-status.done {
  background: var(--good-bg);
  color: var(--good-fg);
}

.cleaning-card-link {
  color: inherit;
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;
}

.cleaning-card-link:hover {
  color: var(--primary);
}

/* Tablet and wider layouts */

@media (min-width: 560px) {
  .app {
    padding: 20px;
  }

  .tab-bar {
    margin-left: -20px;
    margin-right: -20px;
    padding-left: 20px;
    padding-right: 20px;
  }

  .hour-stats {
    grid-template-columns: repeat(3, 1fr);
  }

  .pace-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .upcoming-row {
    grid-template-columns: 1fr 1fr auto;
  }
}

@media (min-width: 760px) {
  .app {
    padding: 28px;
  }

  .tab-bar {
    margin-left: -28px;
    margin-right: -28px;
    padding-left: 28px;
    padding-right: 28px;
  }

  .card {
    padding: 22px;
    margin-top: 20px;
  }

  .upload-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .form-row input,
  .form-row select {
    max-width: 360px;
  }

  .cleaning-duty-row {
    grid-template-columns: minmax(0, 1fr) minmax(170px, 220px) auto;
    gap: 14px;
  }

  .cleaning-duty-row .done-check {
    justify-content: flex-end;
  }
}

@media (min-width: 1020px) {
  .app {
    padding-bottom: 48px;
  }

  .card {
    border-radius: var(--radius-xl);
  }
}

@media (max-width: 420px) {
  .app {
    padding: 12px;
  }

  .tab-bar {
    margin-left: -12px;
    margin-right: -12px;
    padding-left: 12px;
    padding-right: 12px;
  }

  .card {
    padding: 14px;
    border-radius: 20px;
  }

  .sync-row .secondary-button,
  .sync-row .danger-button {
    flex: 1 1 100%;
    width: 100%;
  }

  .time-select-row {
    grid-template-columns: 1fr 86px;
  }

  th,
  td {
    padding: 10px 8px;
    font-size: 0.92rem;
  }
}

/* Compact Sparkling Clean print layout.
   The Print List button uses its own print-window CSS, but this keeps browser print usable too.
*/

@media print {
  :root {
    color-scheme: light;
  }

  body {
    background: white;
    color: #111;
    font-size: 10px;
  }

  .app {
    max-width: none;
    padding: 0;
    margin: 0;
  }

  h1,
  .subtitle,
  .tab-bar,
  button,
  input,
  select,
  .sync-row,
  .status-line,
  .pace-grid,
  .recommendation,
  .hour-card-list,
  .upcoming-list,
  table,
  .file-status-row,
  .form-row,
  .danger-button,
  .secondary-button {
    display: none !important;
  }

  .card {
    box-shadow: none;
    border: none;
    padding: 0;
    margin: 0 0 8px 0;
    break-inside: avoid;
    background: white;
    overflow: visible;
  }

  .card::before {
    display: none;
  }

  .card h2 {
    font-size: 14px;
    margin: 0 0 6px 0;
    padding-bottom: 3px;
    border-bottom: 1px solid #999;
  }

  .print-area,
  .sparkling-print-area,
  .cleaning-print-area {
    display: block;
  }

  .cleaning-duty-row {
    display: block;
    border: none !important;
    border-bottom: 1px solid #ccc !important;
    border-radius: 0;
    background: white !important;
    box-shadow: none;
    padding: 4px 0;
    margin: 0;
    break-inside: avoid;
    transform: none !important;
  }

  .cleaning-duty-row strong {
    font-size: 10px;
  }

  .cleaning-duty-row span {
    font-size: 9px;
    margin-top: 1px;
    color: #333;
  }

  .cleaning-status,
  .done-check {
    display: none;
  }

  @page {
    size: landscape;
    margin: 0.35in;
  }

  main.app {
    columns: 2;
    column-gap: 0.25in;
  }

  .card:first-of-type {
    column-span: all;
    margin-bottom: 8px;
  }
}


/* PWA/status polish */
.file-pill.warning {
  background: #f6ead6;
  border-color: rgba(116, 84, 42, 0.24);
  color: #74542a;
}

@media (display-mode: standalone) {
  body {
    overscroll-behavior-y: none;
  }
}
