import React from 'react';
import Hero from '../components/home/Hero';
import NewDrops from '../components/home/NewDrops';
import Categories from '../components/home/Categories';
import Reviews from '../components/home/Reviews';

export default function Home() {
  return (
    <>
      <Hero />
      <NewDrops />
      <Categories />
      <Reviews />
    </>
  );
}
