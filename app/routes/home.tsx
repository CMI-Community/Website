import { redirect } from "react-router";

export function loader() {
  return redirect("/archive/posters", 308);
}

export default function HomeRedirect() {
  return null;
}
