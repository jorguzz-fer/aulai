import { listCourses } from "@/lib/courses";
import { toCourseVM } from "@/lib/viewModel";
import { Dashboard } from "@/components/Dashboard";
import { signOutAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const courses = await listCourses();
  const vms = courses.map(toCourseVM);

  return (
    <>
      <header className="topbar">
        <div className="brand">
          Aul<span>ai</span>
        </div>
        <form action={signOutAction}>
          <button className="btn ghost" type="submit">
            Sair
          </button>
        </form>
      </header>
      <main className="container">
        <Dashboard courses={vms} />
      </main>
    </>
  );
}
