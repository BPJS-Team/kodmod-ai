import { QuizReviewIndex } from "@/components/editorial-pages";
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) { return <QuizReviewIndex role="admin" page={(await searchParams).page} />; }
