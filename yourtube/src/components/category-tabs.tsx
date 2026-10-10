"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const categories = [
  "All",
  "Music",
  "Gaming",
  "Movies",
  "News",
  "Sports",
  "Technology",
  "Comedy",
  "Education",
  "Science",
  "Travel",
  "Food",
  "Fashion",
];

export default function CategoryTabs() {
  const [activeCategory, setActiveCategory] = useState("All");

  return (
    <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar py-1">
      {categories.map((category) => (
        <Button
          key={category}
          variant={activeCategory === category ? "default" : "secondary"}
          className="whitespace-nowrap shrink-0 rounded-lg text-xs sm:text-sm h-8 px-3.5 font-medium transition-colors"
          onClick={() => setActiveCategory(category)}
        >
          {category}
        </Button>
      ))}
    </div>
  );
}
