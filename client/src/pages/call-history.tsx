import { useCalls } from "@/hooks/use-calls";
import { format } from "date-fns";
import {
  ExternalLink,
  CalendarDays,
  PhoneForwarded,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  Banknote,
  FileText,
  ScrollText,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

function getStatusBadge(status: string | null) {
  switch (status) {
    case "completed":
      return (
        <Badge
          variant="default"
          className="bg-green-500 hover:bg-green-600 shadow-none"
        >
          <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="shadow-none">
          <XCircle className="w-3 h-3 mr-1" /> Failed
        </Badge>
      );
    case "calling":
      return (
        <Badge
          variant="secondary"
          className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-blue-200 shadow-none animate-pulse"
        >
          <PhoneForwarded className="w-3 h-3 mr-1" /> Calling...
        </Badge>
      );
    default:
      if (status) return <Badge variant="outline">{status}</Badge>;
      return <span className="text-muted-foreground text-sm">-</span>;
  }
}

function getResultBadge(result: string | null) {
  if (!result) return <span className="text-muted-foreground text-sm">-</span>;

  switch (result) {
    case "viewing_booked":
      return (
        <Badge
          variant="outline"
          className="border-primary/30 text-primary bg-primary/5 font-semibold"
        >
          Viewing Booked
        </Badge>
      );
    case "no_answer":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          No Answer
        </Badge>
      );
    case "not_interested":
      return (
        <Badge
          variant="outline"
          className="border-orange-200 text-orange-700 bg-orange-50"
        >
          Not Interested
        </Badge>
      );
    default:
      return <Badge variant="outline">{result.replace("_", " ")}</Badge>;
  }
}

export default function CallHistory() {
  const { data: calls, isLoading, error } = useCalls();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <PhoneForwarded className="w-5 h-5" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground">
            Call History
          </h1>
        </div>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Review the outcomes of AI-initiated calls and upcoming viewings.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm shadow-black/5 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <div className="flex gap-4 mb-8">
              <Skeleton className="h-8 w-1/4" />
              <Skeleton className="h-8 w-1/4" />
              <Skeleton className="h-8 w-1/4" />
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-destructive">
            <p className="font-semibold">Failed to load history.</p>
          </div>
        ) : !calls?.length ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="bg-muted p-4 rounded-full mb-4">
              <PhoneForwarded className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground">
              No calls made yet
            </h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
              Head over to the Dashboard to instruct the AI agent to call
              agencies for properties.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold w-[180px]">Date</TableHead>
                  <TableHead className="font-semibold">Property</TableHead>
                  <TableHead className="font-semibold">Call Status</TableHead>
                  <TableHead className="font-semibold">Connection</TableHead>
                  <TableHead className="font-semibold">Next Action</TableHead>
                  <TableHead className="font-semibold">Offered Price</TableHead>
                  <TableHead className="font-semibold text-center">Summary</TableHead>
                  <TableHead className="font-semibold">Viewing Date</TableHead>
                  <TableHead className="font-semibold text-center">Transcript</TableHead>
                  <TableHead className="text-right font-semibold">Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call) => (
                  <TableRow
                    key={call.id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <TableCell className="font-medium text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 opacity-50" />
                        {call.createdAt
                          ? format(new Date(call.createdAt), "MMM d, HH:mm")
                          : "Unknown"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {call.property.address}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {call.property.postcode}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(call.status)}</TableCell>
                    <TableCell>
                      {call.connection ? (
                        <span className="text-sm text-foreground">{call.connection}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {call.nextAction ? (
                        <span className="text-sm text-foreground">{call.nextAction}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {call.offeredPrice ? (
                        <div className="flex items-center gap-1.5 text-foreground font-semibold">
                          <Banknote className="w-4 h-4 text-green-600" />
                          £{call.offeredPrice.toLocaleString()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">No offer</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {call.summary ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg" data-testid={`button-summary-${call.id}`}>
                              <FileText className="w-3.5 h-3.5" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                Call Summary — {call.property.address}
                              </DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="h-[60vh] mt-2 rounded-lg border bg-muted/30 p-4">
                              <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                                {call.summary}
                              </pre>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {call.viewingDate ? (
                        <div className="flex items-center gap-2 text-primary font-medium bg-primary/5 px-3 py-1.5 rounded-md inline-flex border border-primary/10">
                          <CalendarDays className="w-4 h-4" />
                          {format(new Date(call.viewingDate), "MMM d, yyyy, HH:mm")}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {call.transcript ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg" data-testid={`button-transcript-${call.id}`}>
                              <ScrollText className="w-3.5 h-3.5" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <ScrollText className="w-4 h-4 text-primary" />
                                Call Transcript — {call.property.address}
                              </DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="h-[60vh] mt-2 rounded-lg border bg-muted/30 p-4">
                              <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                                {call.transcript}
                              </pre>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 hover-elevate"
                        asChild
                      >
                        <a
                          href={call.property.link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View <ExternalLink className="w-3 h-3 ml-1.5" />
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
