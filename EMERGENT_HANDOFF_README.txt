PVL COMMERCE - EMERGENT DEVELOPMENT HANDOFF

This package contains the current PVL Commerce source projects.

PROJECTS:

customer_app
    PVL Mart customer Flutter application.

backend
    Existing Express.js + PostgreSQL backend.

delivery_app
    Delivery partner application.

store_dashboard
    Store/vendor management application.

admin_dashboard
    Administrative dashboard.

database
    Existing PostgreSQL schema/database files.

documentation
    Existing project reports and diagnostics.

IMPORTANT:

Preserve working existing functionality.

Do not create a replacement backend unless absolutely necessary.

Extend the existing Express.js + PostgreSQL backend.

Preserve existing:
- authentication
- products
- categories
- cart
- orders
- payments
- delivery
- Socket.IO/realtime functionality

The backend must remain the source of truth for:
- prices
- inventory
- discounts
- coupons
- taxes
- delivery fees
- order totals
- payment status
- permissions

Real secrets have intentionally NOT been included.

Configure secrets through environment variables.

Razorpay TEST credentials should be configured separately.

Excluded generated folders include:
- node_modules
- .dart_tool
- build
- dist
- .git
- .idea
- .vscode
- caches
- temporary files
- .env
- log files

Use this package as the source of truth for the current PVL Commerce implementation.
