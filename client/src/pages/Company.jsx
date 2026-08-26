import React from 'react';
export default function Company({ page }) {
  const copy =
    {
      about: {
        title: 'About KICKS',
        text: 'KICKS brings together performance, comfort and street-ready style. We curate footwear for every move, from first mile to last call.',
      },
      contact: {
        title: 'Contact us',
        text: 'Need help with an order, sizing or a product? Our customer care team is ready to help.',
      },
      blogs: {
        title: 'KICKS Journal',
        text: 'Stories, shoe care guides and the latest from the world of footwear.',
      },
    }[page] || {};
  return (
    <section className="max-w-4xl mx-auto px-5 py-16">
      <p className="text-[#4A69E2] font-bold text-xs tracking-[.2em]">KICKS</p>
      <h1 className="mt-3 text-4xl sm:text-5xl font-black uppercase">
        {copy.title}
      </h1>
      <div className="mt-8 bg-white rounded-3xl p-8 sm:p-12 border border-black/5 shadow-sm">
        <p className="text-lg leading-relaxed text-neutral-700">{copy.text}</p>
        {page === 'contact' && (
          <a
            className="inline-block mt-6 rounded-full bg-[#232321] text-white px-6 py-3 font-bold"
            href="mailto:hello@kicks.example"
          >
            hello@kicks.example
          </a>
        )}
        {page === 'blogs' && (
          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            {['How to find your perfect fit', 'Keep your sneakers fresh'].map(
              (x) => (
                <article
                  key={x}
                  className="rounded-2xl bg-[#EAE9E5] p-5 font-bold"
                >
                  {x}
                  <p className="text-sm font-normal mt-2 text-neutral-600">
                    Fresh ideas for every step.
                  </p>
                </article>
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
}
