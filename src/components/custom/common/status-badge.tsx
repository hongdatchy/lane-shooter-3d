import { Badge } from "@/components/ui/badge";
import { AppStatus } from "@/dto/CommonDTO";
import { vi } from "@/lang/vi";
import { AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";

export function AppStatusBadge({ status }: { status: AppStatus }) {
  switch (status) {
    case "READY":
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          {vi.status.READY}
        </Badge>
      );
    case "LOADING":
      return (
        <Badge variant="info" className="gap-1">
          <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
          {vi.status.LOADING}
        </Badge>
      );
    case "ERROR":
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          {vi.status.ERROR}
        </Badge>
      );
    case "IDLE":
    default:
      return (
        <Badge variant="secondary" className="gap-1 text-slate-600">
          <Clock className="w-3.5 h-3.5" />
          {vi.status.IDLE}
        </Badge>
      );
  }
}
