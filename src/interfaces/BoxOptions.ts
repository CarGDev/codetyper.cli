/**
 * Box options interface
 */

import type { BoxStyle, BoxAlign } from "@/types/components";

export interface BoxOptions {
  title?: string;
  style?: BoxStyle;
  padding?: number;
  color?: string;
  width?: number;
  align?: BoxAlign;
}

export interface KeyValueOptions {
  separator?: string;
  labelColor?: string;
  valueColor?: string;
}

export interface ListOptions {
  bullet?: string;
  indent?: number;
  color?: string;
}

export interface MessageOptions {
  showRole?: boolean;
}
