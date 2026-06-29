package com.vconf.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A single drawing event broadcast to every participant's canvas.
 * type: "draw" | "clear" | "undo"
 * tool: "pen" | "eraser"
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WhiteboardEvent {
    private String type;
    private String tool;
    private double x0;
    private double y0;
    private double x1;
    private double y1;
    private String color;
    private int brushSize;
    private String senderId;
    private String senderName;
}
