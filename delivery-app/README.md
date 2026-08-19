# Delivery Partner App 🚚

A mobile-first delivery partner web app built with **React.js + Tailwind CSS + Redux Toolkit + React Router**.
It reproduces the exact Material-3 / Manrope design of the provided HTML screens, packaged as a
React app with a smooth, Android-like order flow.

## Screens (5)

| Route | Screen |
|-------|--------|
| `/` | **Home** — online/offline toggle, today's earnings (mini bar chart), map preview with High Demand, recent activity |
| `/orders` | **Orders** — filter tabs (All / Active / Delivered) + order cards with Accept / Reject |
| `/tracking` | **Live Tracking** — opens automatically when you Accept an order; live map, route markers, order metrics, driver card |
| `/order-complete` | **Order Complete** — success check, duration/distance/payout stats, route timeline, Back to Orders |
| `/earnings` | **Earnings** — Total Earnings / Tips / Deliveries / Incentive dashboard + Delivery History |
| `/profile` | **Profile** — avatar, stats (rating / deliveries / hours), account & support menus |

Bottom navigation (`Home · Orders · Earnings · Profile`) is visible on all main screens, like a native app.

## Order flow (Redux driven)

1. On **Orders**, tap **Accept** on a card →
2. Routes to **Live Tracking** (`/tracking`) with that order as the active order.
3. Tap **Complete Delivery** →
4. Routes to **Order Complete** (`/order-complete`) showing stats for the delivered order.
5. **Back to Orders** clears the completed state and returns to the orders list (order now shows "Delivered").

## Tech

- **React 18 + Vite 5**
- **Tailwind CSS 3.4** with a custom Material-3 theme (primary `#6b38d4`, Manrope font)
- **Redux Toolkit** (`store/slices/appSlice.js`, `store/slices/orderSlice.js`)
- **React Router v6**
- Material Symbols icon font

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build -> /dist
npm run preview  # serve the production build
```

## Project structure

```
src/
├── main.jsx            # entry (Provider + BrowserRouter)
├── App.jsx             # routes + bottom-nav visibility + completed-order cleanup
├── index.css           # theme base, icon font, phone-shell frame, animations
├── store/
│   ├── index.js
│   └── slices/
│       ├── appSlice.js     # online/offline state
│       └── orderSlice.js   # orders, activeOrderId, completedOrderId + flow actions
├── data/mockData.js    # orders, earnings, history, metrics, chart bars
├── components/
│   ├── BottomNav.jsx       # Home / Orders / Earnings / Profile
│   ├── MapBackground.jsx   # offline inline-SVG minimalist map
│   ├── Icon.jsx            # Material Symbols wrapper
│   ├── Avatar.jsx          # offline initials avatar
│   └── OrderCard.jsx       # order card with status chip + actions
└── pages/
    ├── Home.jsx  Orders.jsx  Tracking.jsx  OrderComplete.jsx  Earnings.jsx  Profile.jsx
```

## Notes

- The map imagery is rendered as **inline SVG** so the app looks identical offline and in the
  sandboxed preview (no external image dependency).
- Icons use the **Material Symbols Outlined** web font (loaded from Google Fonts in `index.html`).
