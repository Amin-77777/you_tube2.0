import HistoryContent from "@/components/HistoryContent";
import LikedContent from "@/components/LikedContent";
import React, { Suspense, useEffect, useState } from "react";

const index = () => {
  return (
    <div className="flex-1 p-3 sm:p-6">
      <div className="max-w-4xl">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Liked videos</h1>
        <Suspense fallback={<div>Loading liked videos...</div>}>
          <LikedContent />
        </Suspense>
      </div>
    </div>
  );
};

export default index;
