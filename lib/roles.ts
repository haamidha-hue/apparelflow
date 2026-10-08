import type { Role } from "@prisma/client";

export const DEMO_PASSWORD = "Password123!";

// One place that describes every role: label, home page, demo login.
export const ROLE_CONFIG: Record<
  Role,
  { label: string; home: string; email: string }
> = {
  cutting_supervisor: {
    label: "Cutting Supervisor",
    home: "/cutting",
    email: "cutting.supervisor@apparelflow.com",
  },
  cutting_verifier: {
    label: "Cutting Verifier",
    home: "/verifier",
    email: "cutting.verifier@apparelflow.com",
  },
  sewing_supervisor: {
    label: "Sewing Supervisor",
    home: "/sewing",
    email: "sewing.supervisor@apparelflow.com",
  },
};

// Menu links. Each role only sees the links listed in `roles`.
export const NAV_ITEMS: { label: string; href: string; roles: Role[] }[] = [
  { label: "Cutting Orders", href: "/cutting", roles: ["cutting_supervisor"] },
  { label: "Verification Terminal", href: "/verifier", roles: ["cutting_verifier"] },
  { label: "Sewing Queue", href: "/sewing", roles: ["sewing_supervisor"] },
];