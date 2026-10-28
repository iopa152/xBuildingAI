import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { SidebarInset, SidebarProvider } from "@buildingai/ui/components/ui/sidebar";
import { ReactNode } from "react";
import { Outlet } from "react-router-dom";

import AppNavbar from "./_components/app-navbar";
import { AppSidebar } from "./_components/app-sidebar";
import type { ExtensionMenuItem } from "./types";

const ExtensionConsoleLayout = ({
  menus = [],
  identifier,
  children,
}: {
  menus?: ExtensionMenuItem[];
  identifier?: string;
  children?: ReactNode;
}) => {
  // when embedded in the host console iframe, render bare content only —
  // no extension sidebar, no extension navbar, no extra margins
  const embedded = typeof window !== "undefined" && window.parent !== window;

  if (embedded) {
    return (
      <div className="flex h-dvh flex-col overflow-x-hidden">
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full" viewportClassName="[&>div]:block!">
            <div className="flex flex-col p-4">{children ? children : <Outlet />}</div>
          </ScrollArea>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      storageKey="layout-ext-console-sidebar"
      className="bd-ext-console-layout h-dvh"
    >
      <AppSidebar menus={menus} identifier={identifier} />
      <SidebarInset className="flex h-full flex-col overflow-x-hidden md:h-[calc(100%-1rem)] md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-0">
        <AppNavbar menus={menus} />
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full" viewportClassName="[&>div]:block!">
            <div className="min-h-inset m-4 mt-1 flex flex-col">
              {children ? children : <Outlet />}
            </div>
          </ScrollArea>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default ExtensionConsoleLayout;
