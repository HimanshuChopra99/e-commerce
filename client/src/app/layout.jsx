import "./globals.css";

// Next.js consumes this alongside the layout component by design.
// oxlint-disable-next-line react/only-export-components
export const metadata = {
  title: "KICKS — Premium Sneaker Store",
  description:
    "Engineered for the streets. Built for the bold. Shop the newest Men's and Women's sneakers, running shoes, basketball kicks, and street icons.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-paper font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
