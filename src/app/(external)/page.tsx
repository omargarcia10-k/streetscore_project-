import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard/standings");
  return <>Coming Soon</>;
}
