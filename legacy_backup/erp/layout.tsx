import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function ERPRootLayout({ children }: { children: React.ReactNode }) {
    return (
        <TooltipProvider>
            <SidebarProvider defaultOpen={true}>
                <AppSidebar />
                <main className="flex-1 w-full flex flex-col relative bg-zinc-950 text-slate-200">
                    <header className="h-14 border-b border-zinc-800 flex items-center px-4 sticky top-0 bg-black/50 backdrop-blur z-40">
                        <SidebarTrigger className="text-zinc-400 hover:text-white" />
                    </header>
                    <div className="flex-1 p-4 md:p-6 overflow-y-auto">
                        {children}
                    </div>
                </main>
            </SidebarProvider>
        </TooltipProvider>
    )
}
