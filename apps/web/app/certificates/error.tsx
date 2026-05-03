"use client";
import { RouteErrorView } from "../../components/route-error";

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorView area="证书" {...props} />;
}
