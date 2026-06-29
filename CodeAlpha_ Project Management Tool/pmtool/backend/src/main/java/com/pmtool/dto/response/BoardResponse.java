package com.pmtool.dto.response;

import com.pmtool.entity.Board;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BoardResponse {
    private Long id;
    private Long projectId;
    private String name;
    private Integer position;
    private List<TaskResponse> tasks;

    public static BoardResponse from(Board board, List<TaskResponse> tasks) {
        return BoardResponse.builder()
                .id(board.getId())
                .projectId(board.getProject().getId())
                .name(board.getName())
                .position(board.getPosition())
                .tasks(tasks)
                .build();
    }
}
