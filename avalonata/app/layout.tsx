import type { Metadata } from 'next';
import './globals.css';
import './table.css';
export const metadata:Metadata={title:'Avalon — Il club dei bugiardi',description:'Otto maschere. Cinque leali. Tre traditori. Un tavolo a cui nessuno dice tutto.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="it"><body>{children}</body></html>;}
