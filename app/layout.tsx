import './globals.css'

export const metadata = {
  title: 'Lufuno Tutoring',
  description: 'Online tutoring in Maths, Applied Maths and Statistics for Wits students, and Maths & Physical Sciences for Gr 10-12.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <div className="wrap row">
            <div className="brand">Lufuno <span>Tutoring</span></div>
          </div>
        </nav>
        <div className="wrap" style={{ padding: '30px 20px 60px' }}>
          {children}
        </div>
      </body>
    </html>
  )
}
