import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ClarifyDialog({
  open,
  entity,
  onUpdate,
  onKeepBoth,
}: {
  open: boolean;
  entity: string;
  onUpdate: () => void;
  onKeepBoth: () => void;
}) {
  return (
    <Dialog open={open}>
      <DialogContent
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogTitle>Update the existing note about {entity}?</DialogTitle>
        <DialogDescription>One choice only. No review queue.</DialogDescription>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button type="button" variant="primary" onClick={onUpdate}>
            Update
          </Button>
          <Button type="button" variant="secondary" onClick={onKeepBoth}>
            Keep both
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
