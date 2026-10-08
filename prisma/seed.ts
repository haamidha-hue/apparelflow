import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Password123!";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ---- Users (one per role) ----
  const users: { email: string; fullName: string; role: Role }[] = [
    { email: "cutting.supervisor@apparelflow.com", fullName: "Nimal Perera", role: "cutting_supervisor" },
    { email: "cutting.verifier@apparelflow.com", fullName: "Kumari Silva", role: "cutting_verifier" },
    { email: "sewing.supervisor@apparelflow.com", fullName: "Sunil Fernando", role: "sewing_supervisor" },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash },
    });
  }

  // ---- Recipe A: Casual Blouse ----
  await prisma.recipe.upsert({
    where: { recipeCode: "REC-BL01" },
    update: {},
    create: {
      recipeCode: "REC-BL01",
      name: "Casual Blouse",
      category: "Blouse",
      stdFabricYards: 1.8,
      wastageCap: 5.0,
      components: {
        create: [
          { componentName: "Front Body Panel", piecesPerGarment: 1 },
          { componentName: "Back Body Panel", piecesPerGarment: 1 },
          { componentName: "Sleeves (Left & Right)", piecesPerGarment: 2 },
          { componentName: "Collar & Stand", piecesPerGarment: 1 },
          { componentName: "Sleeve Cuffs", piecesPerGarment: 2 },
        ],
      },
    },
  });

  // ---- Recipe B: Crop Top ----
  await prisma.recipe.upsert({
    where: { recipeCode: "REC-CT02" },
    update: {},
    create: {
      recipeCode: "REC-CT02",
      name: "Crop Top",
      category: "Crop Top",
      stdFabricYards: 1.1,
      wastageCap: 8.0,
      components: {
        create: [
          { componentName: "Front Chest Panel", piecesPerGarment: 1 },
          { componentName: "Back Support Panel", piecesPerGarment: 1 },
          { componentName: "Neck Binding Strip", piecesPerGarment: 1 },
          { componentName: "Hem Elastic Casing", piecesPerGarment: 1 },
          { componentName: "Side Strap Accents", piecesPerGarment: 2 },
        ],
      },
    },
  });

  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());