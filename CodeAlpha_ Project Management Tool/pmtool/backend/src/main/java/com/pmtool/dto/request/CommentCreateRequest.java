package com.pmtool.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class CommentCreateRequest {

    @NotBlank(message = "Comment cannot be empty")
    private String content;

    /** Optional list of usernames mentioned with @username, resolved server-side. */
    private List<String> mentionedUsernames;
}
