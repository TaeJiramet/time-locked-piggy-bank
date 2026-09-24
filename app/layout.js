export const metadata = {
  title: "Time-Locked Piggy Bank",
  description: "DApp กระปุกออมสินล็อกเวลา",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body style={{ margin: 0, fontFamily: "sans-serif", backgroundColor: "#f4f7f6" }}>
        <header
          style={{
            backgroundColor: "#1976d2",
            color: "white",
            padding: "15px 20px",
            fontSize: "20px",
            fontWeight: "bold",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>🐷 Time-Locked Piggy Bank</div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}