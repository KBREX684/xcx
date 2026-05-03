"use client";
import { RouteErrorView } from "../../components/route-error";

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorView area="执行" {...props} />;
}
