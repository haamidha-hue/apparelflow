# AI Optimization Report

**Project:** ApparelFlow ERP – Cutting Operations & Gatekeeper Verification Terminal

**Author:** Mohammed Kaleel Haamidha

## 1. Tools & Prompting

I used **Claude (Anthropic)** as a coding assistant while building this project. Since I am still learning Next.js and React, I asked Claude to guide me step by step instead of generating the whole project at once. I started with the database setup, then moved on to login, role-based access control (RBAC), business logic, testing, and deployment.

After completing each step, I ran the project and checked whether everything worked before moving to the next part.

| Task | How I used AI |
|---|---|
| Project setup | Helped me organize the folders, pages, and API routes. |
| Database design | Helped me create the Prisma schema and handle uncounted quantities correctly. |
| Business logic | Helped me implement quantity calculations, traffic-light status, wastage, and approval rules. |
| UI design | Helped me style the pages and create consistent input fields using Tailwind CSS. |
| Testing | Helped me write Vitest tests for the gatekeeper verification process. |
| Debugging | I shared terminal errors and screenshots to understand and fix problems. |
| Deployment | Guided me through setting up Vercel and Neon. |

I did not simply copy and use everything AI generated. I ran the code, checked the results in the browser and terminal, and fixed problems whenever something did not work as expected. I also made changes to the generated code based on the project requirements. This helped me understand the code better and learn how to identify mistakes instead of depending completely on AI.

## 2. Flawed / Broken AI Code

During development, I faced several problems with AI-generated code and project configuration.

**1. Zod version mismatch**

The generated validation code used `invalid_type_error`, which was compatible with Zod 3 but not with my installed Zod 4 version. I checked the installed version using `npm ls zod` and fixed the issue by installing Zod 3. This taught me that AI-generated code must match the versions of the libraries used in a project.

**2. Next.js 16 blocking route error**

My first dashboard page read the login cookie directly inside the page. This caused an error with Next.js 16 and Cache Components. I fixed it by keeping the main page as a static shell and moving the cookie-reading logic into a child component wrapped with `<Suspense>`.

**3. Async component type error**

A redirect-only async component returned `Promise<void>`, which caused a TypeScript error when it was used as a JSX component. I fixed the return type by changing it to `Promise<null>`.

**4. Low-contrast styling issue**

The generated `globals.css` contained dark-mode styles that could make text difficult to read on light backgrounds. Since clear and readable inputs were important for this project, I removed the conflicting dark-mode styles, set `color-scheme: light`, and applied dark text with white backgrounds to the input fields.

**5. Dependency conflicts**

I faced compatibility issues with Prisma 7 because its new configuration did not match my existing setup. I switched to Prisma 6 and removed the unnecessary `prisma.config.ts` file. I also had a conflict between the latest Vitest version and my installed Node.js types, so I used Vitest 3 instead.

**6. Hydration warning**

I initially thought a hydration warning was caused by my code. After investigating, I found that a browser extension was adding extra attributes to the `<html>` element. I added `suppressHydrationWarning` to that element only.

**7. Missing and misplaced files**

Some problems came from my own mistakes while creating and organizing files.

- The Approve button failed because I had not created the required `app/api/orders/[id]/approve/route.ts` file.
- I accidentally placed `page.tsx` files inside API route folders, causing conflicting route and page errors.
- A stale `.next` cache referenced a deleted test route and caused a production type-check failure. Clearing the cache fixed the issue.

I discovered these problems by checking the project structure, reading error messages, and testing the affected features.

**8. Test folder mismatch**

My test configuration pointed to the `tests/` folder, but I had named my folder `test/`. Because of this, the initial test run failed. I corrected the folder name to match the configuration.

These issues taught me that AI-generated code is not always correct on the first attempt. Understanding error messages, checking dependencies, and testing each feature are important parts of development.

## 3. Human Refactoring

After using AI to generate the initial code, I made several changes to improve the project and make it more reliable.

- **One place for approval rules:** I kept the `checkApproval` logic in a shared file so both the server and UI use the same approval rules.
- **Server-side verification:** The approval API retrieves the latest counts from the database and recalculates the status instead of trusting values sent by the browser.
- **Consistent form styling:** I created a shared `inputClass()` helper to keep all input fields readable and consistent.
- **Better input validation:** I used text inputs with whole-number patterns and added server-side Zod validation to prevent invalid quantities from being submitted.
- **Preventing focus loss:** I defined the form field component outside the modal component to prevent it from being recreated on every keystroke.
- **Consistent date formatting:** I used the `Asia/Colombo` time zone to keep date and time displays consistent.
- **Clearer error messages:** I added an error message directly below the Approve button so users can easily see why an action failed.
- **Project cleanup:** I removed temporary testing routes and unnecessary files and added a `postinstall` script to generate the Prisma client during installation.
- **Deployment improvements:** I configured the Vercel function region close to the Neon database region to help reduce database communication delays.

These changes helped me improve the structure, usability, and reliability of the application.

## 4. Defensive Architecture

I designed the application to prevent unauthorized actions and ensure that cutting orders follow the correct verification process.

- **Database state transitions:** I used conditional `updateMany` operations to check the current status before changing it. This prevents invalid transitions and helps prevent two simultaneous approval attempts from succeeding.
- **Role-based access control:** Protected API routes use `requireRole()` to check whether the user is logged in and has the correct role. The server returns 401 for unauthenticated requests and 403 for users without the required permissions.
- **Approval hard stop:** The approval process checks for RED, missing, or uncounted components. If any of these conditions exist, the request fails with a 422 response, and the transaction rolls back the status change.
- **Sewing queue protection:** The sewing queue retrieves only orders with `VERIFIED` status directly from the database. Starting sewing on an unverified order returns 404.
- **Trusted user identity:** The verifier's ID comes from the signed, httpOnly session cookie, while timestamps are generated by the database. The approval route does not rely on identity or approval data supplied in the request body.
- **Audit trail:** Verification records are added to `verification_logs` using create operations. The wastage value displayed to the sewing floor is the value saved at approval time.
- **Server-side input validation:** Zod validates submitted values and rejects invalid quantities, including negative numbers, decimals, text, and empty values.
- **Automated testing:** I created nine Vitest tests that exercise the actual route handlers against the database, with the session mocked. These tests cover successful approval, rollback when a component is RED, uncounted components, YELLOW excess, rejection without a note, incorrect roles, logged-out users, and sewing queue isolation.

The main goal of this architecture is to make sure that important business rules are enforced on the server and database, rather than relying only on the user interface.

## Conclusion

Building ApparelFlow ERP helped me understand that AI can speed up development, but it cannot replace testing, debugging, and understanding the code. I faced several issues with generated code, dependency versions, configuration, and file organization. By investigating these problems and making changes, I improved my understanding of Next.js, React, Prisma, API routes, validation, automated testing, and deployment.

This project also taught me the importance of server-side security, reliable database operations, and testing business rules before deploying an application.
