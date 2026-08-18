import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const cities = [
  { name: "San Luis Obispo", slug: "san-luis-obispo", latitude: 35.2828, longitude: -120.6596, sortOrder: 1 },
  { name: "Pismo Beach", slug: "pismo-beach", latitude: 35.1428, longitude: -120.6413, sortOrder: 2 },
  { name: "Grover Beach", slug: "grover-beach", latitude: 35.1218, longitude: -120.6213, sortOrder: 3 },
  { name: "Arroyo Grande", slug: "arroyo-grande", latitude: 35.1186, longitude: -120.5907, sortOrder: 4 },
  { name: "Shell Beach", slug: "shell-beach", latitude: 35.1575, longitude: -120.6702, sortOrder: 5 },
  { name: "Avila Beach", slug: "avila-beach", latitude: 35.18, longitude: -120.7316, sortOrder: 6 },
  { name: "Los Osos", slug: "los-osos", latitude: 35.3111, longitude: -120.8324, sortOrder: 7 },
  { name: "Morro Bay", slug: "morro-bay", latitude: 35.3658, longitude: -120.8499, sortOrder: 8 },
  { name: "Atascadero", slug: "atascadero", latitude: 35.4894, longitude: -120.6707, sortOrder: 9 },
  { name: "Paso Robles", slug: "paso-robles", latitude: 35.6266, longitude: -120.691, sortOrder: 10 },
  { name: "Templeton", slug: "templeton", latitude: 35.5497, longitude: -120.706, sortOrder: 11 },
  { name: "Nipomo", slug: "nipomo", latitude: 35.0428, longitude: -120.476, sortOrder: 12 },
  { name: "Cambria", slug: "cambria", latitude: 35.5641, longitude: -121.0808, sortOrder: 13 },
  { name: "Cayucos", slug: "cayucos", latitude: 35.4497, longitude: -120.9041, sortOrder: 14 },
  { name: "Oceano", slug: "oceano", latitude: 35.0989, longitude: -120.6124, sortOrder: 15 },
  { name: "San Miguel", slug: "san-miguel", latitude: 35.7525, longitude: -120.6963, sortOrder: 16 },
  { name: "Other SLO County", slug: "other-slo-county", latitude: 35.31, longitude: -120.66, sortOrder: 17 },
];

type CategorySeed = {
  name: string;
  slug: string;
  icon: string;
  isProduce?: boolean;
  isFree?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  children?: { name: string; slug: string }[];
};

const categories: CategorySeed[] = [
  {
    name: "Home & Furniture",
    slug: "furniture",
    icon: "sofa",
    seoTitle: "Furniture for Sale in San Luis Obispo County | SLO Market",
    seoDescription: "Buy and sell furniture, decor, kitchen, bedroom, and appliances locally in SLO County.",
    children: [
      { name: "Furniture", slug: "home-furniture" },
      { name: "Decor", slug: "decor" },
      { name: "Kitchen", slug: "kitchen" },
      { name: "Bedroom", slug: "bedroom" },
      { name: "Living Room", slug: "living-room" },
      { name: "Appliances", slug: "appliances" },
    ],
  },
  {
    name: "Tools & Hardware",
    slug: "tools",
    icon: "wrench",
    seoTitle: "Tools & Hardware in SLO County | SLO Market",
    seoDescription: "Local power tools, hand tools, construction gear, and workshop equipment.",
    children: [
      { name: "Power Tools", slug: "power-tools" },
      { name: "Hand Tools", slug: "hand-tools" },
      { name: "Construction", slug: "construction" },
      { name: "Hardware", slug: "hardware" },
      { name: "Workshop Equipment", slug: "workshop-equipment" },
    ],
  },
  {
    name: "Electronics",
    slug: "electronics",
    icon: "smartphone",
    children: [
      { name: "Phones", slug: "phones" },
      { name: "Computers", slug: "computers" },
      { name: "TVs", slug: "tvs" },
      { name: "Audio", slug: "audio" },
      { name: "Cameras", slug: "cameras" },
      { name: "Gaming", slug: "gaming" },
      { name: "Accessories", slug: "electronics-accessories" },
    ],
  },
  {
    name: "Cars & Vehicles",
    slug: "cars",
    icon: "car",
    children: [
      { name: "Cars", slug: "used-cars" },
      { name: "Trucks", slug: "trucks" },
      { name: "Motorcycles", slug: "motorcycles" },
      { name: "Trailers", slug: "trailers" },
      { name: "Parts", slug: "vehicle-parts" },
      { name: "Accessories", slug: "vehicle-accessories" },
    ],
  },
  {
    name: "Clothing",
    slug: "clothing",
    icon: "shirt",
    children: [
      { name: "Men", slug: "mens-clothing" },
      { name: "Women", slug: "womens-clothing" },
      { name: "Kids", slug: "kids-clothing" },
      { name: "Shoes", slug: "shoes" },
      { name: "Accessories", slug: "clothing-accessories" },
    ],
  },
  {
    name: "Kids & Baby",
    slug: "kids-baby",
    icon: "baby",
    children: [
      { name: "Toys", slug: "toys" },
      { name: "Baby Equipment", slug: "baby-equipment" },
      { name: "Clothing", slug: "baby-clothing" },
      { name: "Furniture", slug: "kids-furniture" },
      { name: "Strollers", slug: "strollers" },
    ],
  },
  {
    name: "Sports & Fitness",
    slug: "sports",
    icon: "dumbbell",
    children: [
      { name: "Exercise Equipment", slug: "exercise-equipment" },
      { name: "Camping", slug: "camping" },
      { name: "Fishing", slug: "fishing" },
      { name: "Golf", slug: "golf" },
      { name: "Surfing", slug: "surfing" },
      { name: "Bikes", slug: "bikes" },
      { name: "Outdoor Equipment", slug: "outdoor-equipment" },
    ],
  },
  {
    name: "Music",
    slug: "music",
    icon: "music",
    children: [
      { name: "Guitars", slug: "guitars" },
      { name: "Instruments", slug: "instruments" },
      { name: "Audio Equipment", slug: "music-audio" },
      { name: "Music Accessories", slug: "music-accessories" },
    ],
  },
  {
    name: "Garden & Plants",
    slug: "garden",
    icon: "flower",
    children: [
      { name: "Plants", slug: "garden-plants" },
      { name: "Garden Tools", slug: "garden-tools" },
      { name: "Garden Supplies", slug: "garden-supplies" },
      { name: "Flowers", slug: "garden-flowers" },
      { name: "Seeds", slug: "seeds" },
    ],
  },
  {
    name: "Local Produce",
    slug: "local-produce",
    icon: "apple",
    isProduce: true,
    seoTitle: "Local Produce in San Luis Obispo County | SLO Market",
    seoDescription: "Fruits, vegetables, eggs, honey, herbs, and other permitted local products from SLO County growers.",
    children: [
      { name: "Fruits", slug: "fruits" },
      { name: "Vegetables", slug: "vegetables" },
      { name: "Eggs", slug: "eggs" },
      { name: "Honey", slug: "honey" },
      { name: "Herbs", slug: "herbs" },
      { name: "Flowers", slug: "produce-flowers" },
      { name: "Plants", slug: "produce-plants" },
      { name: "Other permitted local products", slug: "other-produce" },
    ],
  },
  {
    name: "Business & Office",
    slug: "business",
    icon: "briefcase",
    children: [
      { name: "Office Furniture", slug: "office-furniture" },
      { name: "Equipment", slug: "office-equipment" },
      { name: "Supplies", slug: "office-supplies" },
      { name: "Tools", slug: "office-tools" },
    ],
  },
  {
    name: "Free Stuff",
    slug: "free-stuff",
    icon: "gift",
    isFree: true,
    seoTitle: "Free Stuff in San Luis Obispo County | SLO Market",
    seoDescription: "Free furniture, boxes, plants, household items, and more from neighbors across SLO County.",
  },
  {
    name: "Other",
    slug: "other",
    icon: "box",
  },
];

const prohibited = [
  { name: "Weapons and ammunition", description: "Firearms, ammunition, and illegal weapons are not allowed." },
  { name: "Drugs and drug paraphernalia", description: "Illegal drugs and related paraphernalia are prohibited." },
  { name: "Alcohol and tobacco", description: "Do not list alcohol, tobacco, or nicotine products." },
  { name: "Counterfeit goods", description: "Fake or replica branded goods are not allowed." },
  { name: "Stolen property", description: "Only list items you own and have the right to sell." },
  { name: "Animals", description: "Live animals may not be sold on SLO Market." },
  { name: "Hazardous materials", description: "Explosives, chemicals, and other hazardous items are prohibited." },
  { name: "Adult content", description: "Sexually explicit listings are not permitted." },
  { name: "Recalled products", description: "Items under a safety recall may not be listed." },
  { name: "Unpermitted food sales", description: "Only list produce and food items that are legal to sell in California and SLO County. Cottage-food and agricultural rules still apply." },
];

async function main() {
  await prisma.platformSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      commissionPercent: 12,
      commissionOnDelivery: false,
      stripeFeeTreatment: "CONNECT_DEFAULT",
      enhancedDescriptionCents: 100,
      deliveryFeeGoesTo: "SELLER",
    },
  });

  for (const city of cities) {
    await prisma.city.upsert({
      where: { slug: city.slug },
      update: city,
      create: {
        ...city,
        seoTitle: `${city.name} Marketplace | SLO Market`,
        seoDescription: `Buy and sell locally in ${city.name}, San Luis Obispo County. Keep it in SLO.`,
      },
    });
  }

  for (const [index, cat] of categories.entries()) {
    const parent = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        icon: cat.icon,
        isProduce: Boolean(cat.isProduce),
        isFree: Boolean(cat.isFree),
        sortOrder: index,
        seoTitle: cat.seoTitle,
        seoDescription: cat.seoDescription,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        isProduce: Boolean(cat.isProduce),
        isFree: Boolean(cat.isFree),
        sortOrder: index,
        seoTitle: cat.seoTitle,
        seoDescription: cat.seoDescription,
      },
    });

    if (cat.children) {
      for (const [childIndex, child] of cat.children.entries()) {
        await prisma.category.upsert({
          where: { slug: child.slug },
          update: { name: child.name, parentId: parent.id, sortOrder: childIndex, isProduce: Boolean(cat.isProduce) },
          create: {
            name: child.name,
            slug: child.slug,
            parentId: parent.id,
            sortOrder: childIndex,
            isProduce: Boolean(cat.isProduce),
          },
        });
      }
    }
  }

  for (const item of prohibited) {
    const existing = await prisma.prohibitedItem.findFirst({ where: { name: item.name } });
    if (!existing) {
      await prisma.prohibitedItem.create({ data: item });
    }
  }

  const adminEmail = process.env.ADMIN_EMAIL || "admin@slomarket.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin1234";
  const slo = await prisma.city.findUnique({ where: { slug: "san-luis-obispo" } });
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: UserRole.ADMIN, passwordHash },
    create: {
      email: adminEmail,
      name: "SLO Market Admin",
      role: UserRole.ADMIN,
      passwordHash,
      cityId: slo?.id,
    },
  });

  console.log("SLO Market seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
