import { StudioWorkspace } from "@/components/home/studio-workspace";
import { AppShell } from "@/components/shell/app-shell";

export default function Home() {
  return (
    <AppShell nav="full" footer className="studio-workspace-shell">
      <StudioWorkspace />
    </AppShell>
  );
}
