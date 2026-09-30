import "./globals.css";
import ThemeSwitcher from "./ThemeSwitcher";

export const metadata = {
  title: "Time-Locked Piggy Bank",
  description: "DApp กระปุกออมสินล็อกเวลาบน Ethereum Sepolia",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var t=localStorage.getItem("pg-theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}',
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />

        <div className="bg-scene" aria-hidden="true">
          <span className="blob blob-1" />
          <span className="blob blob-2" />
          <span className="blob blob-3" />
        </div>

        <header className="site-header">
          <div className="brand">
            <span className="brand-logo">🐷</span>
            <div className="brand-text">
              <strong>Time-Locked Piggy Bank</strong>
              <small>กระปุกออมสินล็อกเวลาบน Ethereum</small>
            </div>
          </div>
          <ThemeSwitcher />
        </header>

        <main className="site-main">{children}</main>
      </body>
    </html>
  );
}
