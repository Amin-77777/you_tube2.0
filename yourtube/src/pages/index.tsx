import CategoryTabs from "@/components/category-tabs";
import Videogrid from "@/components/Videogrid";
import { Suspense } from "react";

export default function Home() {
  return (
    <div className="flex-1 p-3 sm:p-4">
      <CategoryTabs />
      <Suspense fallback={<div>Loading videos...</div>}>
        <Videogrid />
      </Suspense>
    </div>
  );
}
