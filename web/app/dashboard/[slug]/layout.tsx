import { TenantNav } from "@/components/TenantNav";

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <TenantNav />
      {children}
    </div>
  );
}
