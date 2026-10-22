import './globals.css'
import BottomNav from './BottomNav'
import InstallCapture from './InstallCapture'

export const metadata = {
  title: 'Aid & Ace Tutoring',
  description: 'Online tutoring in Maths, Applied Maths and Statistics for Wits students, and Maths & Physical Sciences for Gr 10-12.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light" data-bg="lilac" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" />
        <meta name="theme-color" content="#2B1766" />
        <script dangerouslySetInnerHTML={{ __html: "try{var d=document.documentElement,m=localStorage.getItem('aa-mode'),b=localStorage.getItem('aa-bg');d.dataset.mode=m==='dark'?'dark':'light';d.dataset.bg=b||'lilac'}catch(e){}" }} />
      </head>
      <body>
        <nav>
          <div className="wrap row">
            <div className="brand">Aid <span>&</span> Ace</div>
          </div>
        </nav>
        <div className="wrap" style={{ padding: '30px 20px 60px' }}>
          {children}
        </div>
        <InstallCapture />
        <BottomNav />
      </body>
    </html>
  )
}
