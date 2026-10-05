// The authentication and layout header are handled by the root /admin/layout.tsx
// This (dashboard) group layout only exists to scope the route group
export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
