import './globals.css';
import { Sidebar } from '@/components/sidebar';
export const metadata={title:'GHG Carbon Footprint',description:'Scope 1 & Scope 2 carbon footprint data management'};
export default function RootLayout({children}:{children:React.ReactNode}){return <div className="shell"><Sidebar/><main className="main">{children}</main></div>}
