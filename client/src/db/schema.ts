import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  price: integer("price").notNull(),
  originalPrice: integer("original_price"),
  gender: text("gender").notNull(), // 'Men' | 'Women' | 'Unisex'
  category: text("category").notNull(), // 'Sneakers' | 'Running' | 'Basketball' | 'Lifestyle' | 'Skateboarding' | 'Training & Gym' | 'Sandals & Slides'
  collection: text("collection").notNull(), // 'New Arrivals' | 'Best Sellers' | 'Icons & Classics' | 'Sale — up to 40%' | 'Street Icons' | 'Air Max Collection' | 'Retro Court Pack'
  img: text("img").notNull(),
  isNewDrop: boolean("is_new_drop").default(false).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  rating: numeric("rating", { precision: 3, scale: 1 }).default("4.8").notNull(),
  reviewsCount: integer("reviews_count").default(24).notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  shippingAddress: text("shipping_address").notNull(),
  totalAmount: integer("total_amount").notNull(),
  itemCount: integer("item_count").notNull(),
  status: text("status").default("Confirmed").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  productBrand: text("product_brand").notNull(),
  productImg: text("product_img").notNull(),
  quantity: integer("quantity").notNull(),
  price: integer("price").notNull(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
