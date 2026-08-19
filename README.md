# QUEENCY HUB DESK README

# QUEENCY HUB DESK

**An offline-first service receipt management PWA for tech hubs and service-based businesses.**

QUEENCY HUB DESK is a Progressive Web Application (PWA) designed to simplify how service-based businesses record client transactions, manage services, generate receipts, and maintain transaction history.

The project is initially being developed for a tech hub that operates both a **technology academy** and a **printing/service centre**, handling services such as document preparation, printing, graphic design, and other client requests.

Rather than relying on handwritten receipts or scattered transaction records, QUEENCY HUB DESK provides a simple digital workflow for recording a client's requested services, calculating costs, generating a professional receipt, saving the transaction, and printing the receipt.

The first version of QUEENCY HUB DESK is designed to be **offline-first**, allowing the application to remain useful even when an internet connection is unavailable.

---

## Project Status

> **Currently in development**

The initial MVP focuses primarily on **receipt generation and offline transaction storage**.

QUEENCY HUB DESK is being developed incrementally, with additional business-management capabilities planned for future releases.

---

## Core Idea

The basic workflow is:

**Customer → Select Services → Calculate Cost → Record Payment → Generate Receipt → Save → Print**

A staff member should be able to serve a customer from beginning to end without depending on an internet connection.

---

## MVP Features

### Dashboard

A simple overview of business activity, including:

- Today's receipts
- Today's revenue
- Recent transactions
- Quick access to receipt creation
- Offline/online application status

### Receipt Generation

Staff can:

- Enter customer information
- Select one or multiple services
- Specify quantities
- Enter or retrieve service prices
- Automatically calculate item totals
- Apply discounts where necessary
- Calculate the final amount
- Select a payment method
- Generate a unique receipt number
- Preview the completed receipt
- Print the receipt

### Service Selection

Services can be organised into categories such as:

- Printing
- Document preparation
- Graphic design
- Finishing
- Large-format printing
- Academy services
- Other/custom services

Multiple services can be added to a single transaction.

### Receipt History

Generated receipts can be stored and retrieved later.

The system is intended to support:

- Viewing previous receipts
- Searching by receipt number
- Searching by customer
- Filtering transactions
- Viewing receipt details
- Reprinting receipts

### Offline Support

QUEENCY HUB DESK is designed as an offline-first PWA.

Core operations should continue to work without an active internet connection, including:

- Creating receipts
- Saving transactions
- Accessing saved receipts
- Managing locally stored services
- Printing receipts

Local application data will be stored using **IndexedDB**.

---

## Technology Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

### Forms & Validation

- React Hook Form
- Zod

### Offline Data

- IndexedDB
- Dexie.js

### PWA

- Web App Manifest
- Service Worker
- Application caching
- Offline functionality
- Installable web application

### Printing

Browser printing capabilities will initially be used for generating physical receipts.

PDF generation may be introduced later.

---

## High-Level Architecture

```text
                    ┌──────────────────────┐
                    │        Staff         │
                    │ Desktop / Tablet /   │
                    │        Mobile        │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │     QUEENCY HUB DESK PWA      │
                    │                      │
                    │ Next.js + React + TS │
                    └──────────┬───────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
     │   Business   │  │     PWA      │  │   Printing   │
     │    Logic     │  │    Layer     │  │    Layer     │
     └──────┬───────┘  └──────────────┘  └──────────────┘
            │
            ▼
     ┌──────────────┐
     │   Dexie.js   │
     │      ↓       │
     │  IndexedDB   │
     └──────────────┘
```

The MVP does not require a traditional backend server for its core offline functionality.

---

## Local Data Model

The initial local database is expected to contain object stores for:

```text
QUEENCY HUB DESKDB
│
├── receipts
├── receiptItems
├── customers
├── services
└── settings
```

### Receipt

A receipt may contain:

```text
id
receiptNumber
customerId
subtotal
discount
total
amountPaid
paymentMethod
createdAt
```

### Receipt Item

```text
id
receiptId
serviceId
serviceName
quantity
unitPrice
total
```

### Customer

```text
id
name
phone
email
address
createdAt
```

### Service

```text
id
name
category
defaultPrice
status
createdAt
updatedAt
```

The exact schema may evolve as development progresses.

---

## Application Structure

The MVP is expected to contain the following major areas:

```text
QUEENCY HUB DESK
│
├── Dashboard
│
├── Create Receipt
│   ├── Customer Information
│   ├── Service Selection
│   ├── Payment Information
│   └── Receipt Preview
│
├── Receipts
│   ├── Receipt History
│   ├── Search
│   ├── Filter
│   ├── View Receipt
│   └── Reprint Receipt
│
├── Customers
│
├── Services
│
└── Settings
```

---

## Receipt Creation Flow

```text
Start
  │
  ▼
Enter / Select Customer
  │
  ▼
Select Services
  │
  ▼
Set Quantity & Price
  │
  ▼
Calculate Transaction
  │
  ▼
Select Payment Method
  │
  ▼
Review Receipt
  │
  ▼
Generate Receipt
  │
  ├──────────────► Save to IndexedDB
  │
  ▼
Print Receipt
  │
  ▼
Complete
```

---

## Why Offline-First?

The application is intended for day-to-day business operations where internet connectivity should not determine whether a customer can be served.

Using an offline-first architecture allows QUEENCY HUB DESK to:

- Remain operational during network outages
- Provide fast access to locally stored data
- Generate receipts without server requests
- Reduce dependency on external infrastructure
- Provide an app-like experience through PWA installation

---

## Future Architecture

QUEENCY HUB DESK is intentionally structured so that cloud functionality can be introduced later.

A future version may use:

```text
                       QUEENCY HUB DESK PWA
                           │
               ┌───────────┴───────────┐
               │                       │
               ▼                       ▼
          IndexedDB                Backend API
        Local Database                 │
               │                       ▼
               │                  PostgreSQL
               │                       │
               └────── Sync Layer ─────┘
```

Possible technologies for the cloud architecture include:

- PostgreSQL
- Prisma ORM
- Next.js server functionality or a dedicated backend API
- Authentication and authorization
- Background synchronization

IndexedDB would continue supporting offline operations while the server database provides centralized storage, backup, and multi-device access.

---

## Future Features

QUEENCY HUB DESK may eventually expand beyond receipt generation to include:

### Customer Management

- Customer profiles
- Transaction history
- Customer search
- Returning customer identification

### Job & Order Management

- Create jobs from transactions
- Pending jobs
- Jobs in progress
- Ready for collection
- Completed/delivered jobs

### Quotations & Invoices

- Generate quotations
- Convert quotations into invoices
- Convert completed invoices into receipts
- Printable business documents

### Reporting & Analytics

- Daily revenue
- Weekly revenue
- Monthly revenue
- Service performance
- Payment method breakdown
- Most requested services
- Transaction trends

### User Management

- Administrator
- Receptionist
- Cashier
- Printing staff
- Other staff roles

### Cloud Synchronization

- Automatic backup
- Multi-device synchronization
- Central database
- Remote administration
- Multi-branch support

### Academy Management

Future versions may integrate selected academy operations, such as:

- Course registration
- Student transactions
- Training payments
- Academy receipts

---

## PWA Goals

QUEENCY HUB DESK should eventually satisfy the core characteristics expected of a Progressive Web Application:

- Installable
- Responsive
- Offline-capable
- Reliable
- Fast
- Secure
- App-like user experience

---

## Development Philosophy

QUEENCY HUB DESK is being built incrementally.

The priority is not to build every possible feature immediately.

The development approach is:

```text
Design
   ↓
Build
   ↓
Test in the real business environment
   ↓
Identify problems
   ↓
Improve
   ↓
Expand
```

The first milestone is simple:

> **Create, store, retrieve, and print a professional client receipt completely offline.**

Once that workflow is reliable, additional business-management features can be introduced.

---

## Roadmap

### Phase 1 — Receipt MVP

- [ ] Application UI
- [ ] Dashboard
- [ ] Service management
- [ ] Receipt creation
- [ ] Multiple service selection
- [ ] Automatic calculations
- [ ] Payment information
- [ ] Receipt preview
- [ ] Receipt printing
- [ ] IndexedDB integration
- [ ] Receipt history
- [ ] Search and filtering

### Phase 2 — PWA

- [ ] Web app manifest
- [ ] Application icons
- [ ] Service worker
- [ ] Offline asset caching
- [ ] Installability
- [ ] Offline fallback handling
- [ ] Online/offline state handling

### Phase 3 — Business Management

- [ ] Customer management
- [ ] Job/order tracking
- [ ] Quotations
- [ ] Invoices
- [ ] Reports
- [ ] Analytics

### Phase 4 — Cloud

- [ ] Backend API
- [ ] PostgreSQL
- [ ] Prisma ORM
- [ ] Authentication
- [ ] Authorization
- [ ] Cloud backup
- [ ] IndexedDB/cloud synchronization
- [ ] Multi-device support

### Phase 5 — Expansion

- [ ] Multi-branch support
- [ ] Academy integration
- [ ] Notifications
- [ ] Advanced reporting
- [ ] Additional business modules

---

## Getting Started

The project is currently under active development.

Development setup instructions will be added as the initial application structure and dependencies are finalized.

---

## License

This project is currently intended for internal/private development.

Licensing information may be updated as the project evolves.

---

## Author

Built and maintained as a practical solution for improving service operations within a technology and printing hub.
