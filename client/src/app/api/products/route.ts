import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { products } from '@/db/schema';
import { SEED_PRODUCTS } from '@/db/seed-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gender = searchParams.get('gender');
    const category = searchParams.get('category');
    const collection = searchParams.get('collection');
    const search = searchParams.get('search');
    const isNewDrop = searchParams.get('isNewDrop');
    const onSale = searchParams.get('onSale');

    // Check if table has data
    let allProducts = await db.select().from(products);
    if (allProducts.length === 0) {
      // Seed initial products
      await db.insert(products).values(SEED_PRODUCTS);
      allProducts = await db.select().from(products);
    }

    // Filter in-memory or via SQL (since list is manageable and we want robust matching)
    let filtered = allProducts;

    if (gender) {
      filtered = filtered.filter(
        (p) => p.gender.toLowerCase() === gender.toLowerCase()
      );
    }

    if (category) {
      filtered = filtered.filter(
        (p) => p.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (collection) {
      if (
        collection.toLowerCase() === 'sale — up to 40%' ||
        collection.toLowerCase() === 'sale'
      ) {
        filtered = filtered.filter(
          (p) => p.originalPrice && p.originalPrice > p.price
        );
      } else {
        filtered = filtered.filter(
          (p) => p.collection.toLowerCase() === collection.toLowerCase()
        );
      }
    }

    if (onSale === 'true') {
      filtered = filtered.filter(
        (p) => p.originalPrice && p.originalPrice > p.price
      );
    }

    if (isNewDrop === 'true') {
      filtered = filtered.filter((p) => p.isNewDrop === true);
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.collection.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ products: filtered, total: filtered.length });
  } catch (error) {
    console.error('Error fetching products, using fallback seed data:', error);
    // Graceful fallback if database table is not yet migrated
    let filtered = SEED_PRODUCTS.map((p, idx) => ({
      ...p,
      id: idx + 1,
      createdAt: new Date(),
    }));

    const { searchParams } = new URL(request.url);
    const gender = searchParams.get('gender');
    const category = searchParams.get('category');
    const collection = searchParams.get('collection');
    const search = searchParams.get('search');
    const isNewDrop = searchParams.get('isNewDrop');
    const onSale = searchParams.get('onSale');

    if (gender) {
      filtered = filtered.filter(
        (p) => p.gender.toLowerCase() === gender.toLowerCase()
      );
    }
    if (category) {
      filtered = filtered.filter(
        (p) => p.category.toLowerCase() === category.toLowerCase()
      );
    }
    if (collection) {
      if (
        collection.toLowerCase() === 'sale — up to 40%' ||
        collection.toLowerCase() === 'sale'
      ) {
        filtered = filtered.filter((p) => (p.originalPrice ?? 0) > p.price);
      } else {
        filtered = filtered.filter(
          (p) => p.collection.toLowerCase() === collection.toLowerCase()
        );
      }
    }
    if (onSale === 'true') {
      filtered = filtered.filter((p) => (p.originalPrice ?? 0) > p.price);
    }
    if (isNewDrop === 'true') {
      filtered = filtered.filter((p) => p.isNewDrop === true);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.collection.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ products: filtered, total: filtered.length });
  }
}
