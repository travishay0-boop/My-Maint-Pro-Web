import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TosModalProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
  isLoading?: boolean;
}

export function TosModal({ open, onAccept, onDecline, isLoading = false }: TosModalProps) {
  return (
    <Dialog open={open} modal>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Terms of Service Agreement</DialogTitle>
          <DialogDescription>
            Please read and accept the terms of service to continue using My Maintenance Pro
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="text-sm text-muted-foreground space-y-4 leading-relaxed">
            <p className="font-medium text-foreground">
              Important Legal Notice
            </p>
            <p>
              While this application is designed to provide a comprehensive and proactive maintenance schedule, 
              it is intended solely as a reminder and organisational tool. All notifications, checklists, and 
              suggested timeframes are general guidance only.
            </p>
            <p>
              Many maintenance activities—particularly those involving electrical systems, plumbing, gas, 
              structural timber framing, roofing, and other regulated components—must be inspected, tested, 
              or repaired exclusively by appropriately licensed trades.
            </p>
            <p>
              The app does not replace professional assessment, and users remain responsible for ensuring 
              that all work is carried out by qualified, licensed contractors in accordance with local laws 
              and industry standards.
            </p>
            <p className="font-medium text-foreground pt-2">
              By clicking "I Agree", you acknowledge that you have read, understood, and agree to these terms.
            </p>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onDecline}
            disabled={isLoading}
            data-testid="button-decline-tos"
          >
            I Decline
          </Button>
          <Button
            onClick={onAccept}
            disabled={isLoading}
            data-testid="button-accept-tos"
          >
            {isLoading ? "Processing..." : "I Agree"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
