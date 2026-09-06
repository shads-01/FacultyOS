import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-semibold tracking-tight">Hello World</h1>
      <p className="text-muted-foreground">
        FacultyOS — Next.js + Tailwind + shadcn/ui + Supabase
      </p>
      <Button>Get started</Button>
    </div>
  );
}
