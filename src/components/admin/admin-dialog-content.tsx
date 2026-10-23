"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  useEffect,
  useState,
  type ComponentProps,
  type CSSProperties,
} from "react";

/** Follow the visible viewport when a mobile keyboard opens or pans the page. */
export function AdminDialogContent(
  props: ComponentProps<typeof Dialog.Content>,
) {
  const [viewport, setViewport] = useState<CSSProperties>();

  useEffect(() => {
    const visible = window.visualViewport;
    if (!visible) return;
    const update = () =>
      setViewport({
        "--admin-dialog-top": `${visible.offsetTop + 16}px`,
        "--admin-dialog-height": `${Math.max(0, visible.height - 32)}px`,
      } as CSSProperties);
    update();
    visible.addEventListener("resize", update);
    visible.addEventListener("scroll", update);
    return () => {
      visible.removeEventListener("resize", update);
      visible.removeEventListener("scroll", update);
    };
  }, []);

  return (
    <Dialog.Content
      {...props}
      data-admin-dialog=""
      style={{ ...viewport, ...props.style }}
    />
  );
}
