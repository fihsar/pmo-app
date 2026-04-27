import * as React from "react";
import * as AlertDialogPrimitive from "radix-ui";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

function AlertDialog(props: React.ComponentProps<typeof AlertDialogPrimitive.AlertDialog.Root>) {
  return <AlertDialogPrimitive.AlertDialog.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger(
  props: React.ComponentProps<typeof AlertDialogPrimitive.AlertDialog.Trigger>
) {
  return <AlertDialogPrimitive.AlertDialog.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogPortal(
  props: React.ComponentProps<typeof AlertDialogPrimitive.AlertDialog.Portal>
) {
  return <AlertDialogPrimitive.AlertDialog.Portal data-slot="alert-dialog-portal" {...props} />;
}

function AlertDialogOverlay(
  { className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.AlertDialog.Overlay>
) {
  return (
    <AlertDialogPrimitive.AlertDialog.Overlay
      data-slot="alert-dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=closed]:animate-out",
        className
      )}
      {...props}
    />
  );
}

function AlertDialogContent(
  { className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.AlertDialog.Content>
) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.AlertDialog.Content
        data-slot="alert-dialog-content"
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-6 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out",
          className
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-2 text-left", className)}
      {...props}
    />
  );
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn("mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

function AlertDialogTitle(
  { className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.AlertDialog.Title>
) {
  return (
    <AlertDialogPrimitive.AlertDialog.Title
      data-slot="alert-dialog-title"
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  );
}

function AlertDialogDescription(
  {
    className,
    ...props
  }: React.ComponentProps<typeof AlertDialogPrimitive.AlertDialog.Description>
) {
  return (
    <AlertDialogPrimitive.AlertDialog.Description
      data-slot="alert-dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function AlertDialogAction(
  { className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.AlertDialog.Action>
) {
  return (
    <AlertDialogPrimitive.AlertDialog.Action
      data-slot="alert-dialog-action"
      className={cn(buttonVariants({ variant: "destructive" }), className)}
      {...props}
    />
  );
}

function AlertDialogCancel(
  { className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.AlertDialog.Cancel>
) {
  return (
    <AlertDialogPrimitive.AlertDialog.Cancel
      data-slot="alert-dialog-cancel"
      className={cn(buttonVariants({ variant: "outline" }), className)}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
