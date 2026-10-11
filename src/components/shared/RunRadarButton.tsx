"use client";
import { Radar } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useRadar, type RunOverrides } from "./RadarProvider";

export function RunRadarButton({
  overrides,
  label = "Run radar",
  ...props
}: { overrides?: RunOverrides; label?: string } & Omit<ButtonProps, "onClick">) {
  const { startRun, running } = useRadar();
  return (
    <Button {...props} onClick={() => startRun(overrides)} disabled={running || props.disabled} aria-busy={running}>
      <Radar aria-hidden />
      {running ? "Scanning…" : label}
    </Button>
  );
}
