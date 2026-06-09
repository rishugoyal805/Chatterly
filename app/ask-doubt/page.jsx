import { Suspense } from "react";
import AskDoubtClient from "./AskDoubtClient";
import {
  Lightbulb,
  LayoutDashboard,
  MessageCircleMore,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export default function AskDoubtPage() {
  return (
    <Suspense    >
      <AskDoubtClient />
    </Suspense>
  );
}

export const dynamic = "force-dynamic"; // Ensure this page is always dynamic
export const revalidate = 0; // Disable static regeneration for this page
