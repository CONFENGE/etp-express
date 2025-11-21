/**
 * Type declarations para estender componentes Radix UI
 *
 * Radix UI v1.1+ removeu `children` e `className` dos tipos base.
 * Estes types reintroduzem essas props de forma type-safe.
 */

import * as React from 'react';

declare module '@radix-ui/react-dialog' {
  export interface DialogOverlayProps {
    className?: string;
  }

  export interface DialogContentProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface DialogCloseProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface DialogTitleProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface DialogDescriptionProps {
    className?: string;
    children?: React.ReactNode;
  }
}

declare module '@radix-ui/react-dropdown-menu' {
  export interface DropdownMenuTriggerProps {
    className?: string;
    children?: React.ReactNode;
    asChild?: boolean;
  }

  export interface DropdownMenuContentProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface DropdownMenuItemProps {
    className?: string;
    children?: React.ReactNode;
    onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
    asChild?: boolean;
  }

  export interface DropdownMenuCheckboxItemProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface DropdownMenuRadioItemProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface DropdownMenuLabelProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface DropdownMenuSeparatorProps {
    className?: string;
  }

  export interface DropdownMenuSubTriggerProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface DropdownMenuSubContentProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface DropdownMenuItemIndicatorProps {
    className?: string;
    children?: React.ReactNode;
  }
}

declare module '@radix-ui/react-select' {
  export interface SelectTriggerProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface SelectIconProps {
    className?: string;
    children?: React.ReactNode;
    asChild?: boolean;
  }

  export interface SelectScrollUpButtonProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface SelectScrollDownButtonProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface SelectContentProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface SelectViewportProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface SelectLabelProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface SelectItemProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface SelectItemTextProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface SelectItemIndicatorProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface SelectSeparatorProps {
    className?: string;
  }
}

declare module '@radix-ui/react-tooltip' {
  export interface TooltipTriggerProps {
    className?: string;
    children?: React.ReactNode;
    asChild?: boolean;
  }

  export interface TooltipContentProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface TooltipArrowProps {
    className?: string;
  }
}

declare module '@radix-ui/react-toast' {
  export interface ToastProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface ToastTitleProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface ToastDescriptionProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface ToastCloseProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface ToastActionProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface ToastViewportProps {
    className?: string;
  }
}

declare module '@radix-ui/react-tabs' {
  export interface TabsProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface TabsListProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface TabsTriggerProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface TabsContentProps {
    className?: string;
    children?: React.ReactNode;
  }
}

declare module '@radix-ui/react-alert-dialog' {
  export interface AlertDialogOverlayProps {
    className?: string;
  }

  export interface AlertDialogContentProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface AlertDialogTitleProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface AlertDialogDescriptionProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface AlertDialogActionProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface AlertDialogCancelProps {
    className?: string;
    children?: React.ReactNode;
  }
}

declare module '@radix-ui/react-checkbox' {
  export interface CheckboxProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface CheckboxIndicatorProps {
    className?: string;
    children?: React.ReactNode;
  }
}
