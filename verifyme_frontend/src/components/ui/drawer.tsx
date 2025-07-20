"use client";
import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";

export function Drawer({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog>
  );
}

export function DrawerContent({ children }: { children: React.ReactNode }) {
  return (
    <DialogContent className="max-w-2xl w-full">
      {children}
    </DialogContent>
  );
}

export function DrawerHeader({ children }: { children: React.ReactNode }) {
  return (
    <DialogHeader>
      {children}
    </DialogHeader>
  );
}

export function DrawerTitle({ children }: { children: React.ReactNode }) {
  return (
    <DialogTitle>
      {children}
    </DialogTitle>
  );
}
