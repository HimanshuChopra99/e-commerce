export const MAIN_PRODUCT = {
  id: "adidas-4dfwd-x-parley",
  name: "ADIDAS 4DFWD X PARLEY RUNNING SHOES",
  subtitle: "Shadow Navy / Army Green",
  tag: "New Release",
  price: 125,
  originalPrice: 200,
  rating: 4.8,
  reviewCount: 142,
  colors: [
    {
      id: "shadow-navy",
      name: "Shadow Navy / Army Green",
      hex: "#202A36",
      images: [
        "/images/adidas-4dfwd-navy-profile.jpg",
        "/images/adidas-4dfwd-navy-onfoot.jpg",
        "/images/adidas-4dfwd-navy-laces.jpg",
        "/images/adidas-4dfwd-navy-sole.jpg"
      ]
    },
    {
      id: "army-green",
      name: "Army Green / Shadow Navy",
      hex: "#708269",
      images: [
        "/images/adidas-4dfwd-green-profile.jpg",
        "/images/adidas-4dfwd-green-onfoot.jpg",
        "/images/adidas-4dfwd-navy-laces.jpg",
        "/images/adidas-4dfwd-navy-sole.jpg"
      ]
    }
  ],
  sizes: [
    { value: "38", eu: 38, us: 5.5, uk: 5, cm: 23.5, inStock: true },
    { value: "39", eu: 39, us: 6.5, uk: 6, cm: 24.5, inStock: true },
    { value: "40", eu: 40, us: 7.5, uk: 7, cm: 25.5, inStock: true },
    { value: "41", eu: 41, us: 8, uk: 7.5, cm: 26, inStock: true },
    { value: "42", eu: 42, us: 8.5, uk: 8, cm: 26.5, inStock: true },
    { value: "43", eu: 43, us: 9.5, uk: 9, cm: 27.5, inStock: true },
    { value: "44", eu: 44, us: 10, uk: 9.5, cm: 28, inStock: true },
    { value: "45", eu: 45, us: 11, uk: 10.5, cm: 29, inStock: true },
    { value: "46", eu: 46, us: 12, uk: 11.5, cm: 30, inStock: true },
    { value: "47", eu: 47, us: 13, uk: 12.5, cm: 31, inStock: true }
  ],
  description: "Shadow Navy / Army Green\n\nThis product is excluded from all promotional discounts and offers.",
  bulletPoints: [
    "Pay over time in interest-free installments with Affirm, Klarna or Afterpay.",
    "Join adiClub to get unlimited free standard shipping, returns, & exchanges."
  ],
  specs: [
    { label: "Closure", value: "Lace closure" },
    { label: "Upper", value: "adidas PRIMEKNIT textile upper containing at least 50% Parley Ocean Plastic" },
    { label: "Midsole", value: "3D-printed 4DFWD lattice midsole redirecting impact into forward momentum" },
    { label: "Outsole", value: "Continental\u2122 Rubber outsole for maximum traction" },
    { label: "Fit", value: "Sock-like snug performance fit" },
    { label: "Weight", value: "330 g (size 42)" },
    { label: "Midsole Drop", value: "11 mm (heel: 32 mm / forefoot: 21 mm)" }
  ],
  highlights: [
    {
      title: "3D-Printed 4DFWD Midsole",
      description: "Compresses forward upon impact, reducing braking force and transforming impact energy into forward motion.",
      icon: "Cpu"
    },
    {
      title: "Parley Ocean Plastic",
      description: "Upper yarn made with at least 50% Parley Ocean Plastic intercepted on remote islands, beaches, and coastal communities.",
      icon: "Waves"
    },
    {
      title: "Continental\u2122 Traction",
      description: "Extraordinary grip in wet and dry conditions engineered for street and track surfaces.",
      icon: "Zap"
    }
  ]
};
export const REVIEWS_DATA = [
  {
    id: "rev-1",
    author: "Marcus Vance",
    verified: true,
    rating: 5,
    date: "2 weeks ago",
    title: "Unbelievable forward glide feel!",
    content: "The 3D-printed lattice sole looks futuristic and actually feels like it propels you forward with every stride. The Parley ocean plastic knit upper is ultra breathable and fits like a glove.",
    colorway: "Shadow Navy / Army Green",
    sizeBought: "42",
    fitFeedback: "True to Size",
    helpfulCount: 24
  },
  {
    id: "rev-2",
    author: "Elena Rostova",
    verified: true,
    rating: 5,
    date: "1 month ago",
    title: "Aesthetic perfection meets performance",
    content: "Bought these for both gym sessions and urban street style outfits. Color pattern in real life is even richer than photos. Getting compliments everywhere.",
    colorway: "Shadow Navy / Army Green",
    sizeBought: "38",
    fitFeedback: "True to Size",
    helpfulCount: 18
  },
  {
    id: "rev-3",
    author: "David Chen",
    verified: true,
    rating: 4,
    date: "1 month ago",
    title: "Solid cushion for long pavement runs",
    content: "Takes about 1-2 short runs to break in the primeknit fit around the collar, but once set, the dampening on hard asphalt is second to none.",
    colorway: "Army Green / Shadow Navy",
    sizeBought: "44",
    fitFeedback: "True to Size",
    helpfulCount: 11
  }
];
export const RELATED_PRODUCTS = [
  {
    id: "adidas-ultraboost-light",
    name: "ADIDAS ULTRABOOST LIGHT",
    price: 190,
    tag: "Best Seller",
    rating: 4.9,
    image: "/images/adidas-4dfwd-green-profile.jpg",
    colorCount: 4,
    category: "Running Shoes"
  },
  {
    id: "adidas-4dfwd-2",
    name: "ADIDAS 4DFWD 2 RUNNING SHOES",
    price: 150,
    tag: "Trending",
    rating: 4.7,
    image: "/images/adidas-4dfwd-navy-profile.jpg",
    colorCount: 3,
    category: "Performance"
  },
  {
    id: "adidas-nmd-v3",
    name: "ADIDAS NMD_V3 PARLEY EDITION",
    price: 140,
    rating: 4.6,
    image: "/images/adidas-4dfwd-navy-onfoot.jpg",
    colorCount: 2,
    category: "Lifestyle"
  },
  {
    id: "adidas-adizero-boston-12",
    name: "ADIDAS ADIZERO BOSTON 12",
    price: 160,
    tag: "Marathon Tech",
    rating: 4.9,
    image: "/images/adidas-4dfwd-green-onfoot.jpg",
    colorCount: 5,
    category: "Race Day"
  }
];
