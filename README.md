# 🔬 BookMyLab
### A Web-Based Laboratory Equipment Booking and Resource Management System

Students view lab equipment, check availability, reserve it for a date/time slot and track their bookings.
Lab administrators manage equipment (full CRUD), approve or reject requests, log maintenance and watch a live dashboard.
The system **never allows double booking** of the same equipment for overlapping time slots.

---

## 1. Technology stack (only what your Experiments 1–9 cover)

| Exp | Topic | Where it is used in BookMyLab |
|----|-------|-------------------------------|
| 1 | HTML5 + CSS3 | Semantic HTML (`header`, `nav`, `main`, `section`, `table`, `form`, `ul/ol/dl`) and one hand-written stylesheet `frontend/src/styles.css` (variables, flexbox, grid, transitions, media queries). Tables, forms and lists are used across all pages. |
| 2 | REST API + Postman | 23 endpoints under `/api/...`; ready-made collection in `postman/` |
| 3 | React.js + JSX | Components in `frontend/src/components` and pages in `frontend/src/pages` |
| 4 | Hooks + Context API + forms | `useState/useEffect/useMemo/useReducer/useCallback`, `AuthContext`, `NavContext`, `ToastContext`, custom `useForm` hook with validation on every form |
| 5 | Kotlin: data types, collections, OOP | Entities/DTOs as Kotlin classes and data classes; `demo/KotlinConcepts.kt` (inheritance, polymorphism) |
| 6 | Kotlin: exceptions + map/filter/reduce | Sealed exception hierarchy + `GlobalExceptionHandler`; dashboard statistics computed with `filter`, `map`, `groupBy`, `reduce` |
| 7 | Spring Boot REST API | Controllers, services, Spring Data JPA repositories, validation |
| 8 | JWT authentication | Spring Security + signed JWT (HS256), BCrypt passwords, role-based access (STUDENT / ADMIN) |
| 9 | Deployment | Single `Dockerfile` + `render.yaml` (Render), or run locally as one jar |

> Storage uses the **embedded H2 file database** that ships with Spring Boot, so there is nothing to install. It holds the 4 tables from the design: `users`, `equipment`, `bookings`, `maintenance`.

No other framework is used: no router library, no UI kit, no CSS framework, no state library. The React build is copied into Spring Boot's `static` folder, so the whole app is **one deployable jar**.

---

## 2. Features

### Student
- Register / Login (JWT)
- Dashboard: my booking counts, upcoming bookings, equipment available
- Browse equipment with search + category + status filters, live "free now" meter
- Equipment details (ID, category, quantity, available, condition, location) and upcoming reserved slots
- Book equipment: date, start/end time, purpose, with form validation
- See already-reserved slots for the chosen day while booking
- My Bookings: filter by status, cancel, delete
- Statuses: `PENDING → APPROVED / REJECTED`, `CANCELLED`, `COMPLETED`

### Admin / Lab Assistant
- Dashboard: equipment counts (total / available / booked / maintenance), booking counts, bar charts, most-booked equipment, recent requests
- **Equipment CRUD**: add, list/search, edit, delete, quick status change
- Booking management: filter, search, Approve / Reject / Mark completed / Cancel
- Maintenance log: logging maintenance blocks booking; "Mark done" returns equipment to service

### ⭐ Business rule: no double booking
Two time ranges overlap when `existing.start < new.end AND existing.end > new.start`.
Every PENDING/APPROVED booking occupies one unit of that equipment in its time range. If all units are taken, the API returns **409 Conflict**:

> `Equipment unavailable: Robotic Arm Kit is already booked from 10:00 AM to 12:00 PM on 2026-10-06.`

Items with several units (e.g. 5 Arduinos) accept up to 5 simultaneous bookings. A student also cannot book the same item twice for overlapping times. Past dates, end-before-start, and equipment under maintenance are rejected.

---

## 3. Project structure

```
BookMyLab/
├── backend/                       Spring Boot + Kotlin
│   ├── pom.xml
│   └── src/main/
│       ├── kotlin/com/bookmylab/
│       │   ├── BookMyLabApplication.kt
│       │   ├── model/Entities.kt         4 JPA tables + enums
│       │   ├── repository/Repositories.kt  incl. overlap query
│       │   ├── dto/Dtos.kt               request/response + validation
│       │   ├── exception/Exceptions.kt   custom exceptions + handler
│       │   ├── security/Security.kt      JWT service, filter, rules
│       │   ├── service/Services.kt       all business logic
│       │   ├── controller/Controllers.kt REST endpoints
│       │   ├── config/DataSeeder.kt      demo data on first run
│       │   └── demo/KotlinConcepts.kt    Exp 5 + 6 showcase
│       └── resources/application.properties
├── frontend/                      React (Vite build tool only)
│   └── src/ {api.js, App.jsx, context/, hooks/, components/, pages/, styles.css}
├── postman/BookMyLab.postman_collection.json
├── Dockerfile
├── render.yaml
└── README.md
```

---

## 4. Database (4 tables)

| Table | Columns |
|-------|---------|
| `users` | id, name, email (unique), password (BCrypt), role |
| `equipment` | id, code (unique), name, category, quantity, location, equipment_condition, description, status |
| `bookings` | id, user_id → users, equipment_id → equipment, booking_date, start_time, end_time, purpose, status, created_at |
| `maintenance` | id, equipment_id → equipment, reason, start_date, end_date, status |

`available_quantity` is **calculated live** (quantity minus approved bookings happening right now) instead of stored, so it can never go out of sync. The status `BOOKED` is derived the same way; the stored statuses are AVAILABLE / MAINTENANCE / UNAVAILABLE.

---

## 5. REST API

Base URL: `http://localhost:8080`. Send `Authorization: Bearer <token>` for protected routes.

| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| POST | `/api/auth/register` | public | Create student account |
| POST | `/api/auth/login` | public | Login → `{token, user}` |
| GET | `/api/auth/me` | logged in | Current user |
| GET | `/api/equipment` | public | List equipment |
| GET | `/api/equipment/{id}` | public | One equipment |
| GET | `/api/equipment/{id}/schedule` | public | Upcoming reserved slots |
| POST | `/api/equipment` | admin | Add equipment |
| PUT | `/api/equipment/{id}` | admin | Update equipment / status |
| DELETE | `/api/equipment/{id}` | admin | Delete equipment |
| GET | `/api/bookings` | logged in | Student: own · Admin: all |
| GET | `/api/bookings/{id}` | owner/admin | One booking |
| POST | `/api/bookings` | logged in | Create booking (conflict check) |
| PUT | `/api/bookings/{id}` | owner/admin | Edit a PENDING booking |
| PUT | `/api/bookings/{id}/status` | admin | Approve / reject / complete |
| PUT | `/api/bookings/{id}/cancel` | owner/admin | Cancel |
| DELETE | `/api/bookings/{id}` | owner/admin | Delete |
| GET/POST | `/api/maintenance` | admin | List / log maintenance |
| PUT | `/api/maintenance/{id}/complete` | admin | Finish maintenance |
| DELETE | `/api/maintenance/{id}` | admin | Delete record |
| GET | `/api/dashboard/admin` | admin | Admin statistics |
| GET | `/api/dashboard/student` | logged in | Student summary |
| GET | `/api/demo/kotlin` | public | Output of Kotlin Exp 5 + 6 code |
| GET | `/api/health` | public | Health check |

HTTP status codes used: `200, 201, 400` (validation), `401` (no/invalid token), `403` (wrong role), `404`, `409` (booking clash).

Example booking request:
```json
{ "equipmentId": 6, "date": "2026-10-06", "startTime": "10:00", "endTime": "12:00", "purpose": "Mini Project" }
```

---

## 6. Demo accounts (created automatically on first start)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@bookmylab.com` | `admin123` |
| Student | `rahul@student.com` | `student123` |
| Student | `prathamesh@student.com` | `student123` |
| Student | `sai@student.com` | `student123` |

Seeded equipment IDs: 1 Arduino Uno R3 (qty 5) · 2 Raspberry Pi 4 (3) · 3 Digital Oscilloscope (2, in maintenance) · 4 Digital Multimeter (10) · 5 Ultrasonic Sensor Kit (8) · **6 Robotic Arm Kit (qty 1 — best for the double-booking demo)** · 7 IoT Starter Kit (4) · 8 ESP32 Dev Board (6).

---

## 7. How to run

**Prerequisites:** JDK 21, Maven 3.9+, Node.js 20+ (any recent LTS), Postman.

### Option A — development (two terminals, hot reload)
```bash
# Terminal 1 – backend on :8080
cd backend
mvn spring-boot:run

# Terminal 2 – frontend on :5173 (proxies /api to :8080)
cd frontend
npm install
npm run dev
```
Open **http://localhost:5173**

### Option B — production style (one jar, one port)
```bash
cd frontend && npm install && npm run build      # writes into backend/src/main/resources/static
cd ../backend && mvn clean package -DskipTests
java -jar target/bookmylab.jar
```
Open **http://localhost:8080**

The database file is created at `backend/data/bookmylab.mv.db`. To reset all data, stop the app and delete the `data` folder.

---

## 8. Step-by-step test plan

### A. Student flow (browser)
1. Open the app → **Home** page loads with "Browse Equipment".
2. Click **Browse Equipment** (works without login). Try search "arduino", the category filter and the status filter. Oscilloscope shows **MAINTENANCE**.
3. Click **View Details** on *Arduino Uno R3* → ID `ARD-001`, quantity 5, location AIML Lab, reservation table.
4. Click **Login** → press the **🎓 Student** chip → Login. You land on the **Student Dashboard**.
5. **Validation test:** Logout, open Login, submit empty → red messages "Email is required / Password is required". Enter `abc` as email → "Enter a valid email address".
6. **Register test:** Register tab → fill name, email, password, confirm → account created and logged in.
7. Go to **Book Equipment** → choose *Robotic Arm Kit*, tomorrow's date, 10:00–12:00, purpose "Mini Project" → **Confirm Booking** → green **Booking Successful** card with ID like `BK1007`, status **PENDING**.
8. **Validation test:** set end time earlier than start → "End time must be after start time". Leave purpose empty → "Please enter the purpose".
9. Open **My Bookings** → your booking is listed; use the status pills; try **Cancel**.

### B. ⭐ Double-booking test (needs two students)
1. As `rahul@student.com`, book **Robotic Arm Kit** tomorrow 10:00–12:00 → success (PENDING).
2. Logout, login as `sai@student.com`, book **Robotic Arm Kit**, same day, **11:00–13:00**.
3. Expected: red message **"Equipment unavailable: Robotic Arm Kit is already booked from 10:00 AM to 12:00 PM …"**.
4. Book 12:00–14:00 (touching, not overlapping) → succeeds.
5. Also check: the right-hand panel on the Booking page lists reserved slots for the chosen day.

### C. Admin flow
1. Login with the **👨‍💼 Admin** chip → **Admin Dashboard** with equipment/booking cards and bar charts.
2. **Bookings** → the *Pending* tab lists requests → **Approve** one and **Reject** another. The status badge and dashboard counts change.
3. Login again as the student → *My Bookings* shows APPROVED / REJECTED.
4. **Equipment (CRUD):**
   - **Create** – "Add Equipment": name `Logic Analyzer`, category `Electronics`, quantity `3`, location `AIML Lab` → appears in table with a generated ID.
   - **Read** – search for it; open it from the catalogue.
   - **Update** – Edit → quantity 3 → 6 → Save; use the *Set status* dropdown to switch to Maintenance.
   - **Delete** – Delete → confirm.
   - **Validation** – submit with empty name or quantity 0 → inline errors.
5. **Maintenance:** log maintenance for *Raspberry Pi 4* → in the student view it turns MAINTENANCE and booking it returns "under maintenance". Click **Mark done** → available again.
6. **Role security:** while logged in as a student, there are no admin menu items; calling admin APIs returns 403 (see Postman below).

### D. Kotlin Lab (Exp 5 + 6)
Open **Kotlin Lab** in the menu (or `GET /api/demo/kotlin`) to see data types, collections, inheritance/polymorphism, `filter/map/reduce` and `try/catch/finally` output produced by the Kotlin backend.

### E. Postman (Exp 2 + 8)
1. Postman → **Import** → `postman/BookMyLab.postman_collection.json`. The `baseUrl` variable is `http://localhost:8080`.
2. Run **1. Auth → Login as Admin** and **Login as Student** — their test scripts save the JWTs in the collection variables.
3. Run requests top to bottom (or use the Collection Runner). Each request marked *expect 401/403/409* has a test that passes when the security rules and the double-booking rule work.
4. Manual JWT check: copy a token to https://jwt.io to see the claims (`sub` = email, `role`, `exp`).

---

## 9. Deployment (Exp 9)

### Local server
Option B above is already a deployment: `java -jar target/bookmylab.jar` (set `PORT` to change the port).

### Render (cloud)
1. Push the `BookMyLab` folder to a GitHub repository.
2. Render dashboard → **New → Blueprint** → pick the repo (it reads `render.yaml`), or **New → Web Service → Docker**.
3. Environment variable `JWT_SECRET` (auto-generated by the blueprint; use 32+ characters).
4. Wait for the build, then open `https://<your-service>.onrender.com`. Health check: `/api/health`.

> Free Render instances sleep when idle and use a temporary disk, so the H2 data is re-seeded on restart. For permanent data, add a Render persistent disk mounted at `/app/data` (or switch the datasource URL to a hosted database).

### Environment variables
| Name | Default | Meaning |
|------|---------|---------|
| `PORT` | 8080 | HTTP port |
| `JWT_SECRET` | demo value | HS256 signing key (change in production!) |
| `JWT_EXPIRATION_MS` | 86400000 | Token lifetime (24 h) |
| `TZ` | server zone | Set `Asia/Kolkata` so "today" and booking times match local time |

---

## 10. Troubleshooting
- **Blank page / "Cannot reach the server"** – the backend is not running or the frontend was built before the backend started; use Option A or rebuild.
- **Port 8080 in use** – `PORT=9090 java -jar target/bookmylab.jar` (and update Postman `baseUrl`).
- **`mvn` cannot download dependencies** – needs internet access to Maven Central on first build.
- **Login says "Invalid email or password" after editing data** – delete `backend/data` to re-seed the demo accounts.
- **401 after a day** – the token expired; log in again.

---

## 11. Scope note — Android app
The original idea mentions a small Kotlin Android app. Android/Jetpack is outside Experiments 1–9, so it is **not included**; the mobile-friendly responsive web UI (works on phones) plus the documented REST API cover that role. An Android client could call exactly the same `/api` endpoints.
