import { TeacherQuizIndex } from "@/components/editorial-pages";
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) { return <TeacherQuizIndex page={(await searchParams).page} />; }
