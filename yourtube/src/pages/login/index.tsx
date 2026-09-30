import { useEffect } from "react";
import { useRouter } from "next/router";

export default function LoginPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace({
      pathname: "/signin",
      query: router.query,
    });
  }, [router]);
  return null;
}
