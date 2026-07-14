"use client";

import CompareContent from "@/components/compare-content";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ids: string[];
};

export default function CompareDialog({ open, onOpenChange, ids }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Operator Comparison</DialogTitle>
        </DialogHeader>

        <CompareContent ids={ids} />
      </DialogContent>
    </Dialog>
  );
}
